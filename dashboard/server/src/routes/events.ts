import { Router } from 'express';
import { globalWatcher } from '../services/watcher';
import { config } from '../config';
import type { WatcherUpdate } from '@shared/types';

const router = Router();

interface SseWatcher {
  on(event: 'update', listener: (data: WatcherUpdate) => void): void;
  off(event: 'update', listener: (data: WatcherUpdate) => void): void;
}

export interface SseConnectionOptions {
  req: {
    once(event: 'close' | 'end', listener: () => void): unknown;
  };
  res: {
    setHeader(name: string, value: string): unknown;
    write(chunk: string): unknown;
    flushHeaders?(): unknown;
  };
  watcher: SseWatcher;
  heartbeatMs: number;
  setIntervalFn?: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearIntervalFn?: (timer: NodeJS.Timeout) => void;
}

export function createSseConnection({
  req,
  res,
  watcher,
  heartbeatMs,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}: SseConnectionOptions) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const onUpdate = (data: WatcherUpdate) => {
    res.write(`event: ${data.type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  watcher.on('update', onUpdate);

  const heartbeat = setIntervalFn(() => {
    res.write(': heartbeat\n\n');
  }, heartbeatMs);

  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    watcher.off('update', onUpdate);
    clearIntervalFn(heartbeat);
  };

  req.once('close', cleanup);
  req.once('end', cleanup);
  return cleanup;
}

router.get('/', (req, res) => {
  createSseConnection({
    req,
    res,
    watcher: globalWatcher,
    heartbeatMs: config.sseHeartbeatMs,
  });
});

export default router;
