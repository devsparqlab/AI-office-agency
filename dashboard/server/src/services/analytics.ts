import type {
  AnalyticsHealthStatus,
  AnalyticsResponse,
  FailureReasonStat,
  RunDetail,
  RunSummary,
  RunsTrendPoint,
} from '@shared/types';
import { RunScanner } from './runScanner';

export interface BuildAnalyticsOptions {
  now?: string;
  windowDays?: number;
}

export class AnalyticsService {
  constructor(private readonly scanner: Pick<RunScanner, 'listRuns'> = new RunScanner()) {}

  async getAnalytics(options: BuildAnalyticsOptions = {}): Promise<AnalyticsResponse> {
    const runs = await this.scanner.listRuns();
    return buildAnalytics(runs, [], options);
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
  const trends = buildTrendPoints(runs, now, windowDays);
  const topFailureReasons = buildTopFailureReasons(runs);
  const totalRuns = runs.length;
  const completedRuns = runs.filter((run) => run.status === 'completed').length;
  const failedRuns = runs.filter((run) => run.status === 'failed').length;
  const blockedRuns = runs.filter((run) => run.status === 'blocked').length;
  const runningRuns = runs.filter((run) => run.status === 'running').length;
  const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0;
  const failureRate = totalRuns > 0 ? failedRuns / totalRuns : 0;
  const blockedRate = totalRuns > 0 ? blockedRuns / totalRuns : 0;
  const runningRate = totalRuns > 0 ? runningRuns / totalRuns : 0;
  const unknownFailureReasons = topFailureReasons.find((reason) => reason.reason === 'unknown')?.count ?? 0;
  const unknownFailurePenalty = unknownFailureReasons > 0 ? 10 : 0;
  const failurePenalty = Math.round(failureRate * 45);
  const blockedPenalty = Math.round(blockedRate * 30);
  const runningPenalty = Math.round(runningRate * 15);
  const score = Math.max(
    0,
    Math.min(
      100,
      100
        - failurePenalty
        - blockedPenalty
        - runningPenalty
        - unknownFailurePenalty,
    ),
  );
  const status: AnalyticsHealthStatus = score >= 80 ? 'ok' : score >= 50 ? 'warning' : 'error';

  return {
    generatedAt: now.toISOString(),
    windowDays,
    summary: {
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
            {
              label: 'failure-rate',
              impact: -failurePenalty,
              value: failedRuns,
              detail: `${failedRuns} failed runs`,
            },
            {
              label: 'blocked-rate',
              impact: -blockedPenalty,
              value: blockedRuns,
              detail: `${blockedRuns} blocked runs`,
            },
            {
              label: 'running-rate',
              impact: -runningPenalty,
              value: runningRuns,
              detail: `${runningRuns} running runs`,
            },
            {
              label: 'unknown-failure-reasons',
              impact: -unknownFailurePenalty,
              value: unknownFailureReasons,
              detail: `${unknownFailureReasons} failed or blocked runs without a normalized reason`,
            },
            {
              label: 'base-score',
              impact: 100,
              value: totalRuns,
              detail: 'Score starts at 100 before workflow penalties are applied',
            },
          ],
        },
      },
    trends,
    topFailureReasons,
  };
}

function buildTopFailureReasons(runs: RunSummary[]): FailureReasonStat[] {
  const grouped = new Map<string, FailureReasonStat>();

  for (const run of runs.filter((candidate) => candidate.status === 'failed' || candidate.status === 'blocked')) {
    const reason = normalizeFailureReason(run.errorReason);
    const current = grouped.get(reason);
    grouped.set(reason, {
      reason,
      count: (current?.count ?? 0) + 1,
      latestSeenAt: [current?.latestSeenAt, run.updatedAt].filter(Boolean).sort().at(-1),
    });
  }

  return Array.from(grouped.values()).sort(
    (left, right) => right.count - left.count || (right.latestSeenAt || '').localeCompare(left.latestSeenAt || ''),
  );
}

function buildTrendPoints(runs: RunSummary[], now: Date, windowDays: number): RunsTrendPoint[] {
  const points: RunsTrendPoint[] = [];

  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    const dayRuns = runs.filter((run) => resolveTrendDate(run) === key);

    points.push({
      date: key,
      total: dayRuns.length,
      completed: dayRuns.filter((run) => run.status === 'completed').length,
      failed: dayRuns.filter((run) => run.status === 'failed').length,
      blocked: dayRuns.filter((run) => run.status === 'blocked').length,
    });
  }

  return points;
}

function resolveTrendDate(run: RunSummary): string {
  return (run.startedAt || run.updatedAt || '').slice(0, 10);
}
