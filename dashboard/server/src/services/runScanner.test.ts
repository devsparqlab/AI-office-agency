import test from 'node:test';
import assert from 'node:assert/strict';
import { sortRunsByPriority } from './runScanner';
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
