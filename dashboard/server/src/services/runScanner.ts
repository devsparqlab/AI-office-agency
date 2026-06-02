import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '../config';
import type { 
  RunSummary, 
  RunDetail, 
  RunStatus, 
  AgentName, 
  RunArtifact, 
  AgentTimelineEvent 
} from '@shared/types';

const RUN_STATUS_PRIORITY: Record<RunStatus, number> = {
  running: 0,
  blocked: 1,
  waiting_review: 2,
  failed: 3,
  queued: 4,
  unknown: 5,
  completed: 6,
  cancelled: 7,
};

function taskIdNumber(taskId: string): number | null {
  const match = taskId.match(/^TASK-(\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export function sortRunsByPriority(runs: RunSummary[]): RunSummary[] {
  return [...runs].sort((a: RunSummary, b: RunSummary) => {
    const priorityDiff = RUN_STATUS_PRIORITY[a.status] - RUN_STATUS_PRIORITY[b.status];
    if (priorityDiff !== 0) return priorityDiff;

    const numA = taskIdNumber(a.id);
    const numB = taskIdNumber(b.id);
    if (numA !== null && numB !== null && numA !== numB) {
      return numB - numA;
    }

    if (a.updatedAt !== b.updatedAt) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }

    return b.id.localeCompare(a.id);
  });
}

export class RunScanner {
  private cache: RunSummary[] | null = null;
  private cacheTimestamp: number = 0;
  private pendingRequest: Promise<RunSummary[]> | null = null;
  private readonly CACHE_TTL = 1000; // 1 second cache for concurrent requests

  async listRuns(forceRefresh = false): Promise<RunSummary[]> {
    const now = Date.now();
    
    // 1. Check TTL cache if not forcing refresh
    if (!forceRefresh && this.cache && (now - this.cacheTimestamp < this.CACHE_TTL)) {
      return this.cache;
    }

    // 2. Return existing in-flight promise to coalesce concurrent requests
    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    // 3. Create new scan promise
    this.pendingRequest = (async () => {
      try {
        const entries = await fs.readdir(config.runsDir, { withFileTypes: true });
        const taskDirs = entries
          .filter(entry => entry.isDirectory() && entry.name.startsWith('TASK'))
          .map(entry => entry.name);

        const summaries = await Promise.all(
          taskDirs.map(async taskId => {
            try {
              return await this.getRunSummary(taskId);
            } catch (err) {
              console.error(`Error scanning task ${taskId}:`, err);
              return this.getFallbackSummary(taskId);
            }
          })
        );

        const result = sortRunsByPriority(summaries);
        this.cache = result;
        this.cacheTimestamp = Date.now();
        return result;
      } catch (err) {
        console.error('Error listing runs:', err);
        return [];
      } finally {
        this.pendingRequest = null;
      }
    })();

    return this.pendingRequest;
  }

  async getRunDetail(taskId: string): Promise<RunDetail | null> {
    const runPath = path.join(config.runsDir, taskId);
    try {
      const summary = await this.getRunSummary(taskId);
      const detail: RunDetail = {
        ...summary,
        artifacts: [],
        timeline: []
      };

      // Read task.md
      try {
        detail.taskMarkdown = await fs.readFile(path.join(runPath, 'task.md'), 'utf8');
      } catch (e) { /* ignore */ }

      // Read status.yaml for more details
      const statusPath = path.join(runPath, 'status.yaml');
      try {
        const statusContent = await fs.readFile(statusPath, 'utf8');
        const statusData = yaml.load(statusContent) as any;
        detail.statusRaw = statusData;
        
        if (statusData.history) {
          detail.timeline = statusData.history.map((h: any, index: number) => ({
            id: `${taskId}-h-${index}`,
            agent: this.mapAgentName(h.agent),
            action: h.phase || 'action',
            message: h.reason || h.message,
            timestamp: h.timestamp || summary.updatedAt
          }));
        }
      } catch (e) { /* ignore */ }

      // List artifacts
      const files = await fs.readdir(runPath);
      detail.artifacts = files.map(file => {
        const ext = path.extname(file).toLowerCase();
        let type: RunArtifact['type'] = 'other';
        if (ext === '.md') type = 'markdown';
        else if (ext === '.patch') type = 'patch';
        else if (ext === '.log') type = 'log';
        else if (ext === '.json') type = 'json';
        else if (ext === '.yaml' || ext === '.yml') type = 'yaml';

        return {
          name: file,
          path: path.join('runs', taskId, file),
          type
        };
      });

      // Try to find output markdown
      const outputFiles = detail.artifacts.filter((a: RunArtifact) => a.name.endsWith('-output.md'));
      if (outputFiles.length > 0) {
        detail.outputMarkdown = await fs.readFile(path.join(runPath, outputFiles[0].name), 'utf8');
      }

      return detail;
    } catch (err) {
      console.error(`Error getting run detail for ${taskId}:`, err);
      return null;
    }
  }

  private async getRunSummary(taskId: string): Promise<RunSummary> {
    const runPath = path.join(config.runsDir, taskId);
    const statusPath = path.join(runPath, 'status.yaml');
    
    let statusData: any = {};
    try {
      const content = await fs.readFile(statusPath, 'utf8');
      statusData = yaml.load(content) || {};
    } catch (e) {
      // If status.yaml is missing, we still want to show the task
    }

    const stats = await fs.stat(runPath);
    const status = this.mapStatus(statusData.state || statusData.phase);
    const updatedAt = statusData.updated_at || stats.mtime.toISOString();
    const startedAt = statusData.created_at;

    // Precedence: Explicit status.yaml completed_at -> terminal status updatedAt -> null
    const completedAt = statusData.completed_at || 
      (['completed', 'failed', 'cancelled'].includes(status) ? updatedAt : undefined);

    // Precedence: error_reason -> history[last].reason -> history[last].message -> "unknown"
    let normalizedReason = "unknown";
    if (statusData.error_reason) {
      normalizedReason = statusData.error_reason.trim().toLowerCase();
    } else if (statusData.history && statusData.history.length > 0) {
      const lastHistory = statusData.history[statusData.history.length - 1];
      normalizedReason = (lastHistory.reason || lastHistory.message || "unknown").trim().toLowerCase();
    }

    // Only calculated if startedAt and completedAt (or now for running) are valid.
    // Metric: now - startedAt for tasks where status === 'running'.
    // If startedAt is missing, duration is unknown (DO NOT guess from updatedAt).
    let durationSeconds: number | undefined;
    if (startedAt) {
      const start = new Date(startedAt).getTime();
      const end = completedAt ? new Date(completedAt).getTime() : (status === 'running' ? Date.now() : NaN);
      if (!isNaN(start) && !isNaN(end)) {
        durationSeconds = Math.max(0, Math.floor((end - start) / 1000));
      }
    }

    return {
      id: taskId,
      title: statusData.task_label || taskId,
      status,
      currentAgent: this.mapAgentName(statusData.current_agent),
      currentStep: statusData.phase,
      updatedAt,
      startedAt,
      completedAt,
      durationSeconds,
      runPath: path.join('runs', taskId),
      errorReason: statusData.error_reason,
      normalizedReason
    };
  }

  private getFallbackSummary(taskId: string): RunSummary {
    return {
      id: taskId,
      title: taskId,
      status: 'unknown',
      runPath: path.join('runs', taskId)
    };
  }

  private mapStatus(s: string): RunStatus {
    if (!s) return 'unknown';
    s = s.toLowerCase();
    if (s.includes('running')) return 'running';
    if (s.includes('done') || s.includes('completed') || s.includes('success')) return 'completed';
    if (s.includes('fail') || s.includes('error')) return 'failed';
    if (s.includes('block')) return 'blocked';
    if (s.includes('wait') || s.includes('review')) return 'waiting_review';
    if (s.includes('cancel')) return 'cancelled';
    if (s.includes('queue') || s.includes('pending')) return 'queued';
    return 'unknown';
  }

  private mapAgentName(a: string): AgentName {
    if (!a) return 'unknown';
    a = a.toLowerCase();
    const agents: AgentName[] = ['pm', 'dev', 'dev-2', 'reviewer', 'debugger', 'devops', 'free-roam'];
    if (agents.includes(a as AgentName)) return a as AgentName;
    return 'unknown';
  }
}

export const globalScanner = new RunScanner();
