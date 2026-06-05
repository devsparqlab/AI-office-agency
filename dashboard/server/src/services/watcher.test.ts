import test from 'node:test';
import assert from 'node:assert/strict';
import { Watcher } from './watcher';
import type { WatcherUpdate } from '@shared/types';

test('Watcher debounces multiple file events into one typed update', async () => {
  const watcher = new Watcher({ debounceMs: 10, autoStart: false });
  const updates: WatcherUpdate[] = [];
  watcher.on('update', update => updates.push(update));

  watcher.queueUpdate('add', '/tmp/runs/TASK-001/status.yaml');
  watcher.queueUpdate('change', '/tmp/runs/TASK-001/task.md');

  await new Promise(resolve => setTimeout(resolve, 25));

  assert.equal(updates.length, 1);
  assert.equal(updates[0].type, 'runs.changed');
  assert.deepEqual(updates[0].events, ['add', 'change']);
  assert.deepEqual(updates[0].paths, [
    '/tmp/runs/TASK-001/status.yaml',
    '/tmp/runs/TASK-001/task.md',
  ]);
  assert.match(updates[0].timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test('Watcher flushes within maxWaitMs under continuous events (no starvation)', async () => {
  // Debounce never gets a quiet window because events arrive faster than debounceMs.
  // The max-wait cap must still force an update out so SSE clients stay live.
  const watcher = new Watcher({ debounceMs: 50, maxWaitMs: 80, autoStart: false });
  const updates: WatcherUpdate[] = [];
  watcher.on('update', update => updates.push(update));

  // Fire an event every 20ms (< debounceMs) for 200ms — debounce alone would never fire.
  const interval = setInterval(() => {
    watcher.queueUpdate('change', '/tmp/runs/TASK-001/agent.log');
  }, 20);
  await new Promise(resolve => setTimeout(resolve, 200));
  clearInterval(interval);

  // Without the cap this would be 0; with it we get at least one mid-burst flush.
  assert.ok(updates.length >= 1, `expected >=1 flush during burst, got ${updates.length}`);
  assert.equal(updates[0].type, 'runs.changed');

  watcher.stop();
});
