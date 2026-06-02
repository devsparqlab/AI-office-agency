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

export interface HealthStatus {
  ok: boolean;
  status: "ok" | "warning" | "error";
  aiOfficeRoot: string;
  timestamp: string;
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
