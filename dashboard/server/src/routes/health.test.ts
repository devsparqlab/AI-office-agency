import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHealthStatus } from './health';

test('buildHealthStatus includes diagnostics needed to inspect dashboard wiring', () => {
  const status = buildHealthStatus({
    aiOfficeRoot: '/workspace/ai-dev-office',
    runsDir: '/workspace/ai-dev-office/runs',
    logsDir: '/workspace/ai-dev-office/logs',
    port: 4310,
    sseHeartbeatMs: 15000,
    logTailLines: 500,
    runsDirExists: true,
    logsDirExists: false,
    watcherActive: true,
  });

  assert.equal(status.ok, true);
  assert.equal(status.paths.runsDir, '/workspace/ai-dev-office/runs');
  assert.equal(status.config.logTailLines, 500);
  assert.equal(status.watcher.active, true);
  assert.match(status.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
