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
  aiOfficeRoot: string;
  runsDirExists: boolean;
  logsDirExists: boolean;
  watcherActive: boolean;
  error?: string;
}
