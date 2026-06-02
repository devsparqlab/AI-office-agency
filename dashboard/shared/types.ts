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

export interface RunSummary {
  id: string;
  title: string;
  status: RunStatus;
  currentAgent?: AgentName;
  currentStep?: string;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  runPath: string;
  logPath?: string;
  errorReason?: string;
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
}

export interface AnalyticsSummary {
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
