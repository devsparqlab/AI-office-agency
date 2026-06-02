import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readLogTail, resolveRunLogPath } from './logs';

test('readLogTail reads the requested tail without returning the whole file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-office-log-'));
  const logPath = path.join(dir, 'agent.log');
  await fs.writeFile(logPath, Array.from({ length: 200 }, (_, i) => `line-${i + 1}`).join('\n'));

  const result = await readLogTail(logPath, 5, 64);

  assert.deepEqual(result.content.split('\n'), ['line-196', 'line-197', 'line-198', 'line-199', 'line-200']);
  assert.equal(result.strategy, 'reverse-chunk-tail');
  assert.equal(result.truncated, true);
  assert.ok(result.bytesRead < result.size);
});

test('resolveRunLogPath accepts a direct log file inside the run directory', () => {
  const resolved = resolveRunLogPath('/workspace/runs', 'TASK-101', 'agent.log');

  assert.equal(resolved.ok, true);
  if (resolved.ok) {
    assert.equal(resolved.logPath, path.join('/workspace/runs', 'TASK-101', 'agent.log'));
    assert.equal(resolved.runDir, path.join('/workspace/runs', 'TASK-101'));
  }
});

test('resolveRunLogPath rejects malformed task ids', () => {
  const resolved = resolveRunLogPath('/workspace/runs', '../TASK-101', 'agent.log');

  assert.equal(resolved.ok, false);
  if (!resolved.ok) {
    assert.equal(resolved.code, 400);
    assert.match(resolved.error, /invalid taskId/i);
  }
});

test('resolveRunLogPath rejects nested or traversal log paths', () => {
  for (const logFile of ['../agent.log', 'nested/agent.log']) {
    const resolved = resolveRunLogPath('/workspace/runs', 'TASK-101', logFile);

    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.equal(resolved.code, 400);
      assert.match(resolved.error, /invalid logFile/i);
    }
  }
});
