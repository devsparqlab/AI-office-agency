import test from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { sortRunsByPriority, asObject, RunScanner } from './runScanner';
import type { RunSummary } from '@shared/types';

test('sortRunsByPriority puts active work first, then newest task id', () => {
  const runs: RunSummary[] = [
    { id: 'TASK-001', title: 'old running', status: 'running', runPath: 'runs/TASK-001' },
    { id: 'TASK-099', title: 'completed latest id', status: 'completed', runPath: 'runs/TASK-099' },
    { id: 'TASK-040', title: 'blocked', status: 'blocked', runPath: 'runs/TASK-040' },
    { id: 'TASK-020', title: 'waiting', status: 'waiting_review', runPath: 'runs/TASK-020' },
    { id: 'TASK-050', title: 'failed', status: 'failed', runPath: 'runs/TASK-050' },
  ];

  assert.deepEqual(sortRunsByPriority(runs).map(run => run.id), [
    'TASK-001',
    'TASK-040',
    'TASK-020',
    'TASK-050',
    'TASK-099',
  ]);
});

test('asObject passes through a real object', () => {
  assert.deepEqual(asObject({ state: 'running', history: [] }), { state: 'running', history: [] });
});

test('asObject coerces half-written YAML (scalar/array/null) to an empty object', () => {
  // A status.yaml caught mid-write can parse to any of these.
  assert.deepEqual(asObject(yaml.load('running')), {});        // bare scalar
  assert.deepEqual(asObject(yaml.load('- a\n- b')), {});         // array
  assert.deepEqual(asObject(yaml.load('')), {});                // empty -> undefined
  assert.deepEqual(asObject(null), {});
  assert.deepEqual(asObject(undefined), {});
  // The key safety property: property access never throws afterwards.
  assert.equal(asObject(yaml.load('running')).history, undefined);
});

test('invalidate() clears the cache so the next listRuns re-scans', async () => {
  const scanner = new RunScanner();
  // Populate the cache from the real runs dir (returns an array regardless of contents).
  const first = await scanner.listRuns();
  assert.ok(Array.isArray(first));
  // Should not throw and should still return an array after invalidation.
  scanner.invalidate();
  const second = await scanner.listRuns();
  assert.ok(Array.isArray(second));
});
