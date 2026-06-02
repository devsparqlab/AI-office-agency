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
  AgentName,
} from '@shared/types';
import { RunScanner, globalScanner, normalizeFailureReason } from './runScanner';

export interface BuildAnalyticsOptions {
  now?: string;
  windowDays?: number;
}

const STALE_RUNNING_THRESHOLD_SEC = 3600; // 1 hour

export class AnalyticsService {
  constructor(private readonly scanner: RunScanner = globalScanner) {}

  async getSummary(options: BuildAnalyticsOptions = {}): Promise<AnalyticsSummary> {
    const runs = await this.scanner.listRuns();
    const filtered = filterRunsByWindow(runs, options);
    return buildSummary(filtered, options);
  }

  async getTrends(options: BuildAnalyticsOptions = {}): Promise<AnalyticsTrends> {
    const runs = await this.scanner.listRuns();
    return buildTrends(runs, options);
  }

  async getFailures(options: BuildAnalyticsOptions = {}): Promise<AnalyticsFailures> {
    const runs = await this.scanner.listRuns();
    const filtered = filterRunsByWindow(runs, options);
    return buildFailures(filtered);
  }

  async getAgents(options: BuildAnalyticsOptions = {}): Promise<AnalyticsAgents> {
    const runs = await this.scanner.listRuns();
    const filtered = filterRunsByWindow(runs, options);
    return buildAgents(filtered);
  }

  async getLongRunning(): Promise<AnalyticsLongRunning> {
    const runs = await this.scanner.listRuns();
    return buildLongRunning(runs);
  }

  async getAnalytics(options: BuildAnalyticsOptions = {}): Promise<AnalyticsResponse> {
    const runs = await this.scanner.listRuns();
    const now = options.now ?? new Date().toISOString();
    const filtered = filterRunsByWindow(runs, options);
    
    return {
      generatedAt: now,
      windowDays: options.windowDays ?? 7,
      summary: buildSummary(filtered, options),
      trends: buildTrends(runs, options).trends,
      topFailureReasons: buildFailures(filtered).topFailureReasons,
    };
  }
}

function filterRunsByWindow(runs: RunSummary[], options: BuildAnalyticsOptions): RunSummary[] {
  if (!options.windowDays) return runs;
  
  const now = options.now ? new Date(options.now) : new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - options.windowDays);
  
  return runs.filter(run => {
    const date = new Date(run.startedAt || run.updatedAt || 0);
    return date >= cutoff;
  });
}

export function buildSummary(runs: RunSummary[], options: BuildAnalyticsOptions = {}): AnalyticsSummary {
  const now = options.now ? new Date(options.now) : new Date();
  const totalRuns = runs.length;
  const completedRuns = runs.filter((run) => run.status === 'completed').length;
  const failedRuns = runs.filter((run) => run.status === 'failed').length;
  const blockedRuns = runs.filter((run) => run.status === 'blocked').length;
  const runningRuns = runs.filter((run) => run.status === 'running').length;
  
  const staleRunningRuns = runs.filter(run => 
    run.status === 'running' && 
    (run.durationSeconds || 0) > STALE_RUNNING_THRESHOLD_SEC
  ).length;

  const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0;
  const failureRate = totalRuns > 0 ? failedRuns / totalRuns : 0;
  const blockedRate = totalRuns > 0 ? blockedRuns / totalRuns : 0;
  
  // Health Score Logic (Refined)
  const failurePenalty = Math.round(failureRate * 45);
  const blockedPenalty = Math.round(blockedRate * 30);
  
  // Stale Running Penalty
  const staleRate = totalRuns > 0 ? staleRunningRuns / totalRuns : 0;
  const stalePenalty = Math.round(staleRate * 25);
  
  const score = Math.max(0, Math.min(100, 100 - failurePenalty - blockedPenalty - stalePenalty));
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
        { label: 'stale-running', impact: -stalePenalty, value: staleRunningRuns, detail: `${staleRunningRuns} tasks running > 1h` },
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
  const agentMap = new Map<string, AgentActivitySummary>();
  
  for (const run of runs) {
    const agentName = run.currentAgent || 'unknown';
    const existing = agentMap.get(agentName);
    
    if (existing) {
      existing.totalActions++;
      if (run.status === 'completed') existing.successCount++;
      if (run.status === 'blocked') existing.blockageCount++;
    } else {
      agentMap.set(agentName, {
        agent: agentName as AgentName,
        totalActions: 1,
        successCount: run.status === 'completed' ? 1 : 0,
        blockageCount: run.status === 'blocked' ? 1 : 0
      });
    }
  }

  const agentMetrics = Array.from(agentMap.values())
    .sort((a, b) => b.totalActions - a.totalActions);

  return {
    generatedAt: new Date().toISOString(),
    agentMetrics
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

export { normalizeFailureReason };
