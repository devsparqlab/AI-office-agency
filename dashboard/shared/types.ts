export type RunStatus =
  | "queued"
  | "running"
  | "waiting_review"
  | "blocked"
  | "failed"
  | "completed"
  | "cancelled"
  | "unknown";

export type AgentName =
  | "pm"
  | "dev"
  | "dev-2"
  | "reviewer"
  | "debugger"
  | "devops"
  | "free-roam"
  | "unknown";

/**
 * Raw workflow phase from runs/<id>/status.yaml `phase`.
 * Mirrors the enum in schemas/status.schema.yaml exactly (no fuzzy mapping).
 */
export type RunPhase =
  | "pending"
  | "blocked"
  | "assigned"
  | "assigned_parallel"
  | "review"
  | "in_review"
  | "debugging"
  | "debugging_complete"
  | "devops_needed"
  | "devops_complete"
  | "escalated"
  | "free_roam_complete"
  | "done"
  | "aborted";

/**
 * Reviewer verdict from runs/<id>/reviewer-output.yaml `review_verdict`.
 * Mirrors the enum in schemas/reviewer-output.schema.yaml exactly.
 */
export type ReviewVerdict =
  | "approved"
  | "changes_requested"
  | "escalate"
  | "infra_failure";

/**
 * Read-only Review read model. Every field is a projection of a contracted
 * producer field — the dashboard renders these, it never infers them from prose.
 * See schemas/run-summary.schema.yaml and docs/run-summary-read-model.md.
 */
export interface ReviewSummary {
  taskId: string;
  /** Provenance: status.yaml `phase` (exact enum; null if missing/unrecognized). */
  phase: RunPhase | null;
  /** Provenance: reviewer-output.yaml `review_verdict` (null if never reviewed). */
  verdict: ReviewVerdict | null;
  /** Projection: phase ∈ {review, in_review}. */
  inReviewQueue: boolean;
  /** Projection: verdict ∈ {changes_requested, escalate, infra_failure}. */
  verdictNeedsAttention: boolean;
  /** Queue rule (server-owned, not client-derived): inReviewQueue || verdictNeedsAttention. */
  needsReview: boolean;
  /** Provenance: status.yaml `updated_at` when a reviewer-output exists; else null. */
  lastReviewedAt: string | null;
}

export interface ReviewModelResponse {
  generatedAt: string;
  total: number;
  needsReviewCount: number;
  reviews: ReviewSummary[];
}

export interface RunSummary {
  id: string;
  title: string;
  status: RunStatus;
  currentAgent?: AgentName;
  currentStep?: string;
  startedAt?: string;
  updatedAt?: string;
  /**
   * Precedence: Explicit status.yaml completed_at -> terminal status updatedAt -> null
   */
  completedAt?: string;
  /**
   * Only calculated if startedAt and completedAt (or now for running) are valid.
   * If missing startedAt, this should be null/undefined.
   */
  durationSeconds?: number;
  runPath: string;
  logPath?: string;
  errorReason?: string;
  /**
   * Precedence: error_reason -> history[last].reason -> history[last].message -> "unknown"
   */
  normalizedReason?: string;
}

export interface RunDetail extends RunSummary {
  taskMarkdown?: string;
  statusRaw?: unknown;
  outputMarkdown?: string;
  artifacts: RunArtifact[];
  timeline: AgentTimelineEvent[];
}

export interface RunArtifact {
  type: "markdown" | "patch" | "log" | "json" | "yaml" | "other";
  name: string;
  path: string;
}

export interface AgentTimelineEvent {
  id: string;
  agent: AgentName;
  action: string;
  status?: RunStatus;
  timestamp?: string;
  message?: string;
}

export interface DashboardStats {
  totalRuns: number;
  running: number;
  completed: number;
  failed: number;
  blocked: number;
  successRate: number;
}

export type AnalyticsHealthStatus = "ok" | "warning" | "error";

export interface HealthScoreFactor {
  label: string;
  impact: number;
  value: number;
  detail: string;
}

export interface HealthScoreBreakdown {
  score: number;
  status: AnalyticsHealthStatus;
  factors: HealthScoreFactor[];
}

export interface RunsTrendPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
  blocked: number;
}

export interface FailureReasonStat {
  reason: string;
  count: number;
  latestSeenAt?: string;
  affectedTasks: string[];
}

export interface AgentActivitySummary {
  agent: AgentName;
  totalActions: number;
  successCount: number;
  blockageCount: number;
}

export interface AnalyticsSummary {
  generatedAt: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  blockedRuns: number;
  runningRuns: number;
  successRate: number;
  failureRate: number;
  blockedRate: number;
  healthScore: HealthScoreBreakdown;
}

export interface AnalyticsTrends {
  generatedAt: string;
  windowDays: number;
  trends: RunsTrendPoint[];
}

export interface AnalyticsFailures {
  generatedAt: string;
  topFailureReasons: FailureReasonStat[];
}

export interface AnalyticsAgents {
  generatedAt: string;
  agentMetrics: AgentActivitySummary[];
}

export interface AnalyticsLongRunning {
  generatedAt: string;
  tasks: RunSummary[];
}

export interface AnalyticsResponse {
  generatedAt: string;
  windowDays: number;
  summary: AnalyticsSummary;
  trends: RunsTrendPoint[];
  topFailureReasons: FailureReasonStat[];
}

export interface HealthStatus {
  ok: boolean;
  status: "ok" | "warning" | "error";
  aiOfficeRoot: string;
  timestamp: string;
  uptime?: number;
  totalRuns?: number;
  runsDirExists: boolean;
  logsDirExists: boolean;
  watcherActive: boolean;
  paths: {
    runsDir: string;
    logsDir: string;
  };
  config: {
    port: number;
    sseHeartbeatMs: number;
    logTailLines: number;
  };
  watcher: {
    active: boolean;
    debounceMs: number;
  };
  error?: string;
}

export type WatcherEventType = "add" | "change" | "unlink";

export interface WatcherUpdate {
  type: "runs.changed";
  events: WatcherEventType[];
  paths: string[];
  timestamp: string;
}

export type DashboardSseEvent = WatcherUpdate;

export interface LogTailResponse {
  content: string;
  size: number;
  bytesRead: number;
  truncated: boolean;
  strategy: "full-read-tail" | "reverse-chunk-tail";
}
