import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseConnection } from './events';
import type { WatcherUpdate } from '@shared/types';

test('createSseConnection removes update listeners and heartbeat on close', () => {
  const requestListeners = new Map<string, Set<() => void>>();
  const updateListeners = new Set<(data: WatcherUpdate) => void>();
  const clearedIntervals: NodeJS.Timeout[] = [];
  let intervalCallback: (() => void) | undefined;
  const writes: string[] = [];

  const watcher = {
    on(event: 'update', listener: (data: WatcherUpdate) => void) {
      updateListeners.add(listener);
    },
    off(event: 'update', listener: (data: WatcherUpdate) => void) {
      updateListeners.delete(listener);
    },
  };

  const req = {
    once(event: string, listener: () => void) {
      requestListeners.set(event, new Set([listener]));
    },
  };

  createSseConnection({
    req,
    res: {
      setHeader() {},
      flushHeaders() {},
      write(chunk: string) {
        writes.push(chunk);
        return true;
      },
    },
    watcher,
    heartbeatMs: 1000,
    setIntervalFn(callback: () => void) {
      intervalCallback = callback;
      return 123 as unknown as NodeJS.Timeout;
    },
    clearIntervalFn(timer: NodeJS.Timeout) {
      clearedIntervals.push(timer);
    },
  });

  assert.equal(updateListeners.size, 1);
  const update: WatcherUpdate = {
    type: 'runs.changed',
    events: ['change'],
    paths: ['/tmp/runs/TASK-001/status.yaml'],
    timestamp: new Date().toISOString(),
  };
  updateListeners.forEach(listener => listener(update));
  intervalCallback?.();
  requestListeners.get('close')?.forEach(listener => listener());

  assert.equal(updateListeners.size, 0);
  assert.deepEqual(clearedIntervals, [123 as unknown as NodeJS.Timeout]);
  assert.match(writes.join(''), /event: runs.changed/);
});
