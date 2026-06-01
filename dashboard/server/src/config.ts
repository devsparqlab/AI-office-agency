import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const AI_OFFICE_ROOT = process.env.AI_OFFICE_ROOT || path.resolve(__dirname, '../../..');

export interface DashboardConfig {
  aiOfficeRoot: string;
  runsDir: string;
  logsDir: string;
  port: number;
  sseHeartbeatMs: number;
  logTailLines: number;
}

export const config: DashboardConfig = {
  aiOfficeRoot: AI_OFFICE_ROOT,
  runsDir: path.join(AI_OFFICE_ROOT, 'runs'),
  logsDir: path.join(AI_OFFICE_ROOT, 'logs'),
  port: parseInt(process.env.DASHBOARD_PORT || '4310', 10),
  sseHeartbeatMs: parseInt(process.env.SSE_HEARTBEAT_MS || '15000', 10),
  logTailLines: parseInt(process.env.LOG_TAIL_LINES || '500', 10),
};
