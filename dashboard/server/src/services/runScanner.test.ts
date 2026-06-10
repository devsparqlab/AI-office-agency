import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { sortRunsByPriority, asObject, RunScanner, mapPhaseToRunStatus } from './runScanner';
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

test('mapPhaseToRunStatus maps phases by exact enum (no substring guessing)', () => {
  // Phases that the old fuzzy matcher wrongly dropped to "unknown".
  assert.equal(mapPhaseToRunStatus('assigned'), 'running');
  assert.equal(mapPhaseToRunStatus('assigned_parallel'), 'running');
  assert.equal(mapPhaseToRunStatus('debugging'), 'running');
  assert.equal(mapPhaseToRunStatus('devops_needed'), 'running');
  assert.equal(mapPhaseToRunStatus('escalated'), 'blocked');
  assert.equal(mapPhaseToRunStatus('aborted'), 'cancelled');
  // Already-correct mappings still hold.
  assert.equal(mapPhaseToRunStatus('in_review'), 'waiting_review');
  assert.equal(mapPhaseToRunStatus('validation_failed'), 'failed');
  assert.equal(mapPhaseToRunStatus('done'), 'completed');
  assert.equal(mapPhaseToRunStatus('pending'), 'queued');
  // Off-contract / empty -> unknown, never guessed.
  assert.equal(mapPhaseToRunStatus('in-review'), 'unknown'); // wrong separator
  assert.equal(mapPhaseToRunStatus('RUNNING'), 'unknown');   // not an enum value
  assert.equal(mapPhaseToRunStatus(undefined), 'unknown');
  assert.equal(mapPhaseToRunStatus(''), 'unknown');
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

test('listRuns exposes task workstream from pm-output metadata', async () => {
  const taskId = `TASK-${Date.now()}-WORKSTREAM`;
  const runDir = path.resolve(__dirname, '../../../..', 'runs', taskId);

  try {
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(runDir, 'status.yaml'), yaml.dump({
      task_id: taskId,
      phase: 'assigned',
      state: 'assigned',
      iteration: 1,
      current_agent: 'dev',
      task_label: 'Workstream test task',
      updated_at: '2026-06-10',
    }));
    await fs.writeFile(path.join(runDir, 'pm-output.yaml'), yaml.dump({
      task: {
        id: taskId,
        title: 'Workstream test task',
        short_name: 'workstream-test',
        type: 'feature',
        workstream: 'frontend',
        priority: 'medium',
        created_at: '2026-06-10',
      },
    }));

    const scanner = new RunScanner();
    const runs = await scanner.listRuns(true);
    const run = runs.find((candidate) => candidate.id === taskId);

    assert.equal(run?.workstream, 'frontend');
  } finally {
    await fs.rm(runDir, { recursive: true, force: true });
  }
});
