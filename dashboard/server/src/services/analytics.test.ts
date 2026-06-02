import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalytics, normalizeFailureReason } from './analytics';
import type { RunSummary } from '@shared/types';

test('normalizeFailureReason groups failure strings consistently', () => {
  assert.equal(normalizeFailureReason(' Missing ENV '), 'missing env');
  assert.equal(normalizeFailureReason(''), 'unknown');
});

test('buildAnalytics calculates rates, score, and daily trend buckets', () => {
  const runs: RunSummary[] = [
    { id: 'TASK-001', title: 'ok', status: 'completed', startedAt: '2026-05-31T08:00:00.000Z', updatedAt: '2026-06-01T10:00:00.000Z', runPath: 'runs/TASK-001' },
    { id: 'TASK-002', title: 'blocked', status: 'blocked', startedAt: '2026-05-31T09:00:00.000Z', updatedAt: '2026-05-31T11:00:00.000Z', runPath: 'runs/TASK-002' },
    { id: 'TASK-003', title: 'failed', status: 'failed', startedAt: '2026-06-01T07:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z', runPath: 'runs/TASK-003', errorReason: 'Missing env' },
  ];

  const analytics = buildAnalytics(runs, [], { now: '2026-06-02T00:00:00.000Z', windowDays: 7 });

  assert.equal(analytics.summary.totalRuns, 3);
  assert.equal(analytics.summary.failedRuns, 1);
  assert.equal(analytics.summary.blockedRuns, 1);
  assert.equal(analytics.topFailureReasons[0].reason, 'missing env');
  assert.ok(analytics.summary.healthScore.score >= 0 && analytics.summary.healthScore.score <= 100);
  assert.deepEqual(
    analytics.trends.find((point: { date: string }) => point.date === '2026-05-31'),
    { date: '2026-05-31', total: 2, completed: 1, failed: 0, blocked: 1 },
  );
  assert.deepEqual(
    analytics.trends.find((point: { date: string }) => point.date === '2026-06-01'),
    { date: '2026-06-01', total: 1, completed: 0, failed: 1, blocked: 0 },
  );
});

test('buildAnalytics handles empty runs without NaN values', () => {
  const analytics = buildAnalytics([], [], { now: '2026-06-02T00:00:00.000Z', windowDays: 7 });

  assert.equal(analytics.summary.totalRuns, 0);
  assert.equal(analytics.summary.successRate, 0);
  assert.equal(analytics.topFailureReasons.length, 0);
  assert.equal(analytics.trends.length, 7);
});

test('buildAnalytics validates invalid options and keeps a bounded trend window', () => {
  const analytics = buildAnalytics([], [], { now: 'not-a-date', windowDays: 0 });

  assert.equal(analytics.windowDays, 1);
  assert.match(analytics.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(analytics.trends.length, 1);
});

test('buildAnalytics healthScore factors reflect the penalties used in the score', () => {
  const analytics = buildAnalytics(
    [
      { id: 'TASK-001', title: 'running', status: 'running', updatedAt: '2026-06-01T09:00:00.000Z', runPath: 'runs/TASK-001' },
      { id: 'TASK-002', title: 'failed', status: 'failed', updatedAt: '2026-06-01T10:00:00.000Z', runPath: 'runs/TASK-002' },
    ],
    [],
    { now: '2026-06-02T00:00:00.000Z', windowDays: 7 },
  );

  const labels = analytics.summary.healthScore.factors.map((factor) => factor.label);
  assert.ok(labels.includes('running-rate'));
  assert.ok(labels.includes('unknown-failure-reasons'));
});
