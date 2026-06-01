import { Router } from 'express';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';
import type { LogTailResponse } from '@shared/types';

const router = Router();

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

router.get('/:taskId/:logFile', async (req, res) => {
  const { taskId, logFile } = req.params;
  const logPath = path.join(config.runsDir, taskId, logFile);

  try {
    res.json(await readLogTail(logPath, config.logTailLines));
  } catch (err) {
    res.status(404).json({ error: 'Log not found' });
  }
});

export default router;
