import { Router } from 'express';
import { config } from '../config';
import { globalWatcher } from '../services/watcher';
import { TASK_ID_PATTERN } from '../pathSecurity';
import type { HealthStatus } from '@shared/types';
import fs from 'fs/promises';

const router = Router();

export interface HealthStatusInput {
  aiOfficeRoot: string;
  runsDir: string;
  logsDir: string;
  port: number;
  sseHeartbeatMs: number;
  logTailLines: number;
  runsDirExists: boolean;
  logsDirExists: boolean;
  watcherActive: boolean;
  watcherDebounceMs?: number;
  totalRuns?: number;
  error?: string;
}

function resolveHealthSeverity(input: HealthStatusInput): HealthStatus['status'] {
  if (!input.runsDirExists || input.error) {
    return 'error';
  }
  if (!input.logsDirExists || !input.watcherActive) {
    return 'warning';
  }
  return 'ok';
}

export function buildHealthStatus(input: HealthStatusInput): HealthStatus {
  const status = resolveHealthSeverity(input);
  return {
    ok: input.runsDirExists,
    status,
    aiOfficeRoot: input.aiOfficeRoot,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalRuns: input.totalRuns,
    runsDirExists: input.runsDirExists,
    logsDirExists: input.logsDirExists,
    watcherActive: input.watcherActive,
    paths: {
      runsDir: input.runsDir,
      logsDir: input.logsDir,
    },
    config: {
      port: input.port,
      sseHeartbeatMs: input.sseHeartbeatMs,
      logTailLines: input.logTailLines,
    },
    watcher: {
      active: input.watcherActive,
      debounceMs: input.watcherDebounceMs ?? 0,
    },
    error: input.error,
  };
}

router.get('/', async (req, res) => {
  let runsDirExists = false;
  let logsDirExists = false;
  let totalRuns = 0;

  try {
    const entries = await fs.readdir(config.runsDir);
    runsDirExists = true;
    totalRuns = entries.filter(e => TASK_ID_PATTERN.test(e)).length;
  } catch (e) {}

  try {
    await fs.access(config.logsDir);
    logsDirExists = true;
  } catch (e) {}

  const status = buildHealthStatus({
    aiOfficeRoot: config.aiOfficeRoot,
    runsDir: config.runsDir,
    logsDir: config.logsDir,
    port: config.port,
    sseHeartbeatMs: config.sseHeartbeatMs,
    logTailLines: config.logTailLines,
    runsDirExists,
    logsDirExists,
    watcherActive: globalWatcher.isActive(),
    watcherDebounceMs: globalWatcher.getDebounceMs(),
    totalRuns,
  });

  res.json(status);
});

export default router;
