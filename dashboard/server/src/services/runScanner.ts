import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '../config';
import { 
  RunSummary, 
  RunDetail, 
  RunStatus, 
  AgentName, 
  RunArtifact, 
  AgentTimelineEvent 
} from '../../shared/types';

export class RunScanner {
  async listRuns(): Promise<RunSummary[]> {
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

      return summaries.sort((a, b) => {
        const dateA = a.updatedAt || '';
        const dateB = b.updatedAt || '';
        return dateB.localeCompare(dateA);
      });
    } catch (err) {
      console.error('Error listing runs:', err);
      return [];
    }
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
      const outputFiles = detail.artifacts.filter(a => a.name.endsWith('-output.md'));
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

    return {
      id: taskId,
      title: statusData.task_label || taskId,
      status: this.mapStatus(statusData.state || statusData.phase),
      currentAgent: this.mapAgentName(statusData.current_agent),
      currentStep: statusData.phase,
      updatedAt: statusData.updated_at || stats.mtime.toISOString(),
      startedAt: statusData.created_at,
      runPath: path.join('runs', taskId),
      errorReason: statusData.error_reason
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
