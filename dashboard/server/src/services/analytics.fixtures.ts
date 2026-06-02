import type { RunSummary } from '@shared/types';

export const allCompletedRunsFixture: RunSummary[] = [
  {
    id: 'TASK-100',
    title: 'completed one',
    status: 'completed',
    startedAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:20:00.000Z',
    completedAt: '2026-06-01T08:20:00.000Z',
    durationSeconds: 1200,
    runPath: 'runs/TASK-100',
    normalizedReason: 'unknown',
  },
];

export const mixedWarningRunsFixture: RunSummary[] = [
  {
    id: 'TASK-200',
    title: 'completed one',
    status: 'completed',
    startedAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:20:00.000Z',
    completedAt: '2026-06-01T08:20:00.000Z',
    durationSeconds: 1200,
    runPath: 'runs/TASK-200',
    normalizedReason: 'unknown',
  },
  {
    id: 'TASK-201',
    title: 'completed two',
    status: 'completed',
    startedAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:10:00.000Z',
    completedAt: '2026-06-01T09:10:00.000Z',
    durationSeconds: 600,
    runPath: 'runs/TASK-201',
    normalizedReason: 'unknown',
  },
  {
    id: 'TASK-202',
    title: 'blocked one',
    status: 'blocked',
    startedAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:45:00.000Z',
    completedAt: '2026-06-01T10:45:00.000Z',
    durationSeconds: 2700,
    runPath: 'runs/TASK-202',
    normalizedReason: 'missing env',
  },
  {
    id: 'TASK-203',
    title: 'failed one',
    status: 'failed',
    startedAt: '2026-06-01T11:00:00.000Z',
    updatedAt: '2026-06-01T11:12:00.000Z',
    completedAt: '2026-06-01T11:12:00.000Z',
    durationSeconds: 720,
    runPath: 'runs/TASK-203',
    normalizedReason: 'missing env',
  },
];

export const degradedErrorRunsFixture: RunSummary[] = [
  {
    id: 'TASK-300',
    title: 'failed one',
    status: 'failed',
    startedAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:10:00.000Z',
    completedAt: '2026-06-01T08:10:00.000Z',
    durationSeconds: 600,
    runPath: 'runs/TASK-300',
    normalizedReason: 'missing payload',
  },
  {
    id: 'TASK-301',
    title: 'blocked one',
    status: 'blocked',
    startedAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:30:00.000Z',
    completedAt: '2026-06-01T09:30:00.000Z',
    durationSeconds: 1800,
    runPath: 'runs/TASK-301',
    normalizedReason: 'dependency guard failed',
  },
  {
    id: 'TASK-302',
    title: 'failed two',
    status: 'failed',
    startedAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:40:00.000Z',
    completedAt: '2026-06-01T10:40:00.000Z',
    durationSeconds: 2400,
    runPath: 'runs/TASK-302',
    normalizedReason: 'missing test evidence',
  },
];

export const runningThresholdFixture: RunSummary[] = [
  {
    id: 'TASK-400',
    title: 'fresh running',
    status: 'running',
    startedAt: '2026-06-01T11:30:00.000Z',
    updatedAt: '2026-06-01T11:45:00.000Z',
    durationSeconds: 900,
    runPath: 'runs/TASK-400',
    normalizedReason: 'unknown',
  },
  {
    id: 'TASK-401',
    title: 'stale running',
    status: 'running',
    startedAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T11:45:00.000Z',
    durationSeconds: 13500,
    runPath: 'runs/TASK-401',
    normalizedReason: 'unknown',
  },
];

export const failureReasonVariantsFixture: RunSummary[] = [
  { id: 'TASK-500', title: 'fail one', status: 'failed', runPath: 'runs/TASK-500', normalizedReason: 'missing env' },
  { id: 'TASK-501', title: 'fail two', status: 'failed', runPath: 'runs/TASK-501', normalizedReason: 'missing env' },
  { id: 'TASK-502', title: 'fail three', status: 'failed', runPath: 'runs/TASK-502', normalizedReason: 'missing test' },
  { id: 'TASK-503', title: 'fail four', status: 'failed', runPath: 'runs/TASK-503', normalizedReason: 'missing payload' },
  { id: 'TASK-504', title: 'fail five', status: 'failed', runPath: 'runs/TASK-504', normalizedReason: 'missing test evidence' },
];
