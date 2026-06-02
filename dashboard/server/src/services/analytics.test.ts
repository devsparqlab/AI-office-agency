import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, buildTrends, buildFailures, buildLongRunning, normalizeFailureReason } from './analytics';
import type { RunSummary } from '@shared/types';

test('normalizeFailureReason groups failure strings consistently', () => {
  assert.equal(normalizeFailureReason(' Missing ENV '), 'missing env');
  assert.equal(normalizeFailureReason(''), 'unknown');
});

test('buildSummary calculates rates, score, and factors correctly', () => {
  const runs: RunSummary[] = [
    { id: 'TASK-001', title: 'ok', status: 'completed', startedAt: '2026-05-31T08:00:00.000Z', updatedAt: '2026-06-01T10:00:00.000Z', runPath: 'runs/TASK-001' },
    { id: 'TASK-002', title: 'blocked', status: 'blocked', startedAt: '2026-05-31T09:00:00.000Z', updatedAt: '2026-05-31T11:00:00.000Z', runPath: 'runs/TASK-002' },
    { id: 'TASK-003', title: 'failed', status: 'failed', startedAt: '2026-06-01T07:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z', runPath: 'runs/TASK-003', errorReason: 'Missing env' },
  ];

  const summary = buildSummary(runs, { now: '2026-06-02T00:00:00.000Z' });

  assert.equal(summary.totalRuns, 3);
  assert.equal(summary.failedRuns, 1);
  assert.equal(summary.blockedRuns, 1);
  assert.ok(summary.healthScore.score >= 0 && summary.healthScore.score <= 100);
});

test('buildTrends calculates daily trend buckets', () => {
  const runs: RunSummary[] = [
    { id: 'TASK-001', title: 'ok', status: 'completed', startedAt: '2026-05-31T10:00:00.000Z', updatedAt: '2026-05-31T10:00:00.000Z', runPath: 'runs/TASK-001' },
    { id: 'TASK-002', title: 'blocked', status: 'blocked', startedAt: '2026-05-31T11:00:00.000Z', updatedAt: '2026-05-31T11:00:00.000Z', runPath: 'runs/TASK-002' },
    { id: 'TASK-003', title: 'failed', status: 'failed', startedAt: '2026-06-01T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z', runPath: 'runs/TASK-003' },
  ];

  const trends = buildTrends(runs, { now: '2026-06-02T00:00:00.000Z', windowDays: 7 });

  assert.deepEqual(
    trends.trends.find(point => point.date === '2026-05-31'),
    { date: '2026-05-31', total: 2, completed: 1, failed: 0, blocked: 1 },
  );
  assert.deepEqual(
    trends.trends.find(point => point.date === '2026-06-01'),
    { date: '2026-06-01', total: 1, completed: 0, failed: 1, blocked: 0 },
  );
});

test('buildFailures groups failure reasons and tracks affected tasks', () => {
  const runs: RunSummary[] = [
    { id: 'TASK-001', title: 'fail', status: 'failed', runPath: 'runs/TASK-001', normalizedReason: 'missing env' },
    { id: 'TASK-002', title: 'fail', status: 'failed', runPath: 'runs/TASK-002', normalizedReason: 'missing env' },
  ];

  const failures = buildFailures(runs);
  assert.equal(failures.topFailureReasons[0].reason, 'missing env');
  assert.equal(failures.topFailureReasons[0].count, 2);
  assert.ok(failures.topFailureReasons[0].affectedTasks.includes('TASK-001'));
});

test('buildLongRunning sorts running tasks by duration', () => {
  const runs: RunSummary[] = [
    { id: 'TASK-001', title: 'run', status: 'running', runPath: 'runs/TASK-001', durationSeconds: 100 },
    { id: 'TASK-002', title: 'run', status: 'running', runPath: 'runs/TASK-002', durationSeconds: 500 },
  ];

  const longRunning = buildLongRunning(runs);
  assert.equal(longRunning.tasks[0].id, 'TASK-002');
});
