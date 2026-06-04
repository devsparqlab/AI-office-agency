import { Router } from 'express';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';
import type { LogTailResponse } from '@shared/types';
import { TASK_ID_PATTERN, resolveRunDir } from '../pathSecurity';

const router = Router();
const LOG_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

type ResolveRunLogPathResult =
  | { ok: true; runDir: string; logPath: string }
  | { ok: false; code: 400 | 404; error: string };

export async function readLogTail(logPath: string, maxLines: number, chunkSize = 64 * 1024): Promise<LogTailResponse> {
  const stats = await fs.stat(logPath);
  if (stats.size === 0 || maxLines <= 0) {
    return {
      content: '',
      size: stats.size,
      bytesRead: 0,
      truncated: false,
      strategy: 'full-read-tail',
    };
  }

  const handle = await fs.open(logPath, 'r');
  const chunks: Buffer[] = [];
  let position = stats.size;
  let bytesReadTotal = 0;
  let newlineCount = 0;

  try {
    while (position > 0 && newlineCount <= maxLines) {
      const readSize = Math.min(chunkSize, position);
      position -= readSize;
      const buffer = Buffer.alloc(readSize);
      const { bytesRead } = await handle.read(buffer, 0, readSize, position);
      const chunk = buffer.subarray(0, bytesRead);
      chunks.unshift(chunk);
      bytesReadTotal += bytesRead;

      for (const byte of chunk) {
        if (byte === 10) newlineCount += 1;
      }
    }
  } finally {
    await handle.close();
  }

  const content = Buffer.concat(chunks).toString('utf8');
  const lines = content.split('\n');
  const tail = lines.slice(-maxLines).join('\n');

  return {
    content: tail,
    size: stats.size,
    bytesRead: bytesReadTotal,
    truncated: bytesReadTotal < stats.size,
    strategy: bytesReadTotal < stats.size ? 'reverse-chunk-tail' : 'full-read-tail',
  };
}

export function resolveRunLogPath(runsDir: string, taskId: string, logFile: string): ResolveRunLogPathResult {
  const dirResult = resolveRunDir(runsDir, taskId);
  if (!dirResult.ok) {
    return dirResult;
  }

  if (!LOG_FILE_PATTERN.test(logFile)) {
    return { ok: false, code: 400, error: 'Invalid logFile' };
  }

  const { runDir } = dirResult;
  const logPath = path.resolve(runDir, logFile);
  const relativeLogPath = path.relative(runDir, logPath);

  if (relativeLogPath.startsWith('..') || path.isAbsolute(relativeLogPath)) {
    return { ok: false, code: 400, error: 'Resolved log path escapes the run directory' };
  }

  return { ok: true, runDir, logPath };
}

router.get('/:taskId/:logFile', async (req, res) => {
  const { taskId, logFile } = req.params;
  const resolved = resolveRunLogPath(config.runsDir, taskId, logFile);

  if (!resolved.ok) {
    res.status(resolved.code).json({ error: resolved.error });
    return;
  }

  try {
    await fs.access(resolved.runDir);
  } catch (err) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  try {
    res.json(await readLogTail(resolved.logPath, config.logTailLines));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      res.status(404).json({ error: 'Log not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

export default router;
