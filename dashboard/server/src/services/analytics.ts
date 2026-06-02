import type {
  AnalyticsHealthStatus,
  AnalyticsResponse,
  AnalyticsSummary,
  AnalyticsTrends,
  AnalyticsFailures,
  AnalyticsAgents,
  AnalyticsLongRunning,
  FailureReasonStat,
  RunDetail,
  RunSummary,
  RunsTrendPoint,
  AgentActivitySummary,
} from '@shared/types';
import { RunScanner, globalScanner } from './runScanner';

export interface BuildAnalyticsOptions {
  now?: string;
  windowDays?: number;
}

export class AnalyticsService {
  constructor(private readonly scanner: RunScanner = globalScanner) {}

  async getSummary(options: BuildAnalyticsOptions = {}): Promise<AnalyticsSummary> {
    const runs = await this.scanner.listRuns();
    return buildSummary(runs, options);
  }

  async getTrends(options: BuildAnalyticsOptions = {}): Promise<AnalyticsTrends> {
    const runs = await this.scanner.listRuns();
    return buildTrends(runs, options);
  }

  async getFailures(): Promise<AnalyticsFailures> {
    const runs = await this.scanner.listRuns();
    return buildFailures(runs);
  }

  async getAgents(): Promise<AnalyticsAgents> {
    const runs = await this.scanner.listRuns();
    return buildAgents(runs);
  }

  async getLongRunning(): Promise<AnalyticsLongRunning> {
    const runs = await this.scanner.listRuns();
    return buildLongRunning(runs);
  }

  async getAnalytics(options: BuildAnalyticsOptions = {}): Promise<AnalyticsResponse> {
    const runs = await this.scanner.listRuns();
    const now = options.now ?? new Date().toISOString();
    return {
      generatedAt: now,
      windowDays: options.windowDays ?? 7,
      summary: buildSummary(runs, options),
      trends: buildTrends(runs, options).trends,
      topFailureReasons: buildFailures(runs).topFailureReasons,
    };
  }
}

export function normalizeFailureReason(reason?: string): string {
  const normalized = reason?.trim().toLowerCase();
  return normalized ? normalized : 'unknown';
}

export function buildAnalytics(
  runs: RunSummary[],
  _details: RunDetail[],
  options: BuildAnalyticsOptions = {},
): AnalyticsResponse {
  const windowDays = Number.isFinite(options.windowDays) ? Math.max(1, Math.floor(options.windowDays as number)) : 7;
  const parsedNow = options.now ? new Date(options.now) : new Date();
  const now = Number.isNaN(parsedNow.getTime()) ? new Date() : parsedNow;
  
  const summary = buildSummary(runs, options);
  const trends = buildTrends(runs, options);
  const failures = buildFailures(runs);

  return {
    generatedAt: now.toISOString(),
    windowDays,
    summary,
    trends: trends.trends,
    topFailureReasons: failures.topFailureReasons,
  };
}

export function buildSummary(runs: RunSummary[], options: BuildAnalyticsOptions = {}): AnalyticsSummary {
  const now = options.now ? new Date(options.now) : new Date();
  const totalRuns = runs.length;
  const completedRuns = runs.filter((run) => run.status === 'completed').length;
  const failedRuns = runs.filter((run) => run.status === 'failed').length;
  const blockedRuns = runs.filter((run) => run.status === 'blocked').length;
  const runningRuns = runs.filter((run) => run.status === 'running').length;
  
  const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0;
  const failureRate = totalRuns > 0 ? failedRuns / totalRuns : 0;
  const blockedRate = totalRuns > 0 ? blockedRuns / totalRuns : 0;
  const runningRate = totalRuns > 0 ? runningRuns / totalRuns : 0;

  // Health Score Logic
  const failurePenalty = Math.round(failureRate * 45);
  const blockedPenalty = Math.round(blockedRate * 30);
  const runningPenalty = Math.round(runningRate * 15);
  
  const score = Math.max(0, Math.min(100, 100 - failurePenalty - blockedPenalty - runningPenalty));
  const status: AnalyticsHealthStatus = score >= 80 ? 'ok' : score >= 50 ? 'warning' : 'error';

  return {
    generatedAt: now.toISOString(),
    totalRuns,
    completedRuns,
    failedRuns,
    blockedRuns,
    runningRuns,
    successRate,
    failureRate,
    blockedRate,
    healthScore: {
      score,
      status,
      factors: [
        { label: 'failure-rate', impact: -failurePenalty, value: failedRuns, detail: `${failedRuns} failed runs` },
        { label: 'blocked-rate', impact: -blockedPenalty, value: blockedRuns, detail: `${blockedRuns} blocked runs` },
        { label: 'running-rate', impact: -runningPenalty, value: runningRuns, detail: `${runningRuns} running runs` },
      ]
    }
  };
}

export function buildTrends(runs: RunSummary[], options: BuildAnalyticsOptions = {}): AnalyticsTrends {
  const windowDays = options.windowDays ?? 7;
  const now = options.now ? new Date(options.now) : new Date();
  const trends: RunsTrendPoint[] = [];

  for (let i = windowDays - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    
    const dayRuns = runs.filter(r => (r.startedAt || r.updatedAt || '').slice(0, 10) === dateStr);
    
    trends.push({
      date: dateStr,
      total: dayRuns.length,
      completed: dayRuns.filter(r => r.status === 'completed').length,
      failed: dayRuns.filter(r => r.status === 'failed').length,
      blocked: dayRuns.filter(r => r.status === 'blocked').length,
    });
  }

  return {
    generatedAt: now.toISOString(),
    windowDays,
    trends
  };
}

export function buildFailures(runs: RunSummary[]): AnalyticsFailures {
  const failureMap = new Map<string, FailureReasonStat>();
  
  const failedOrBlocked = runs.filter(r => r.status === 'failed' || r.status === 'blocked');
  
  for (const run of failedOrBlocked) {
    const reason = run.normalizedReason || 'unknown';
    const existing = failureMap.get(reason);
    
    if (existing) {
      existing.count++;
      existing.affectedTasks.push(run.id);
      if (!existing.latestSeenAt || (run.updatedAt && run.updatedAt > existing.latestSeenAt)) {
        existing.latestSeenAt = run.updatedAt;
      }
    } else {
      failureMap.set(reason, {
        reason,
        count: 1,
        latestSeenAt: run.updatedAt,
        affectedTasks: [run.id]
      });
    }
  }

  const topFailureReasons = Array.from(failureMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    topFailureReasons
  };
}

export function buildAgents(runs: RunSummary[]): AnalyticsAgents {
  return {
    generatedAt: new Date().toISOString(),
    agentMetrics: []
  };
}

export function buildLongRunning(runs: RunSummary[]): AnalyticsLongRunning {
  const runningTasks = runs.filter(r => r.status === 'running' && r.durationSeconds !== undefined);
  
  const tasks = runningTasks
    .sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0))
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    tasks
  };
}
