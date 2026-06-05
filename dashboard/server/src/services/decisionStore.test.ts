import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import { DecisionStore, isDecisionAction, buildDecisionRecord } from './decisionStore';
import { ReviewModelService } from './reviewModel';
import type { DecisionRecord } from '@shared/types';

async function tempTask(): Promise<{ runsDir: string; taskId: string }> {
  const runsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'decisions-'));
  const taskId = 'TASK-001';
  await fs.mkdir(path.join(runsDir, taskId), { recursive: true });
  return { runsDir, taskId };
}

const sample: DecisionRecord = {
  decision: 'approve',
  actor: 'alice',
  note: 'looks good',
  decidedAt: '2026-06-05T00:00:00.000Z',
  againstVerdict: 'changes_requested',
  againstPhase: 'done',
};

test('isDecisionAction accepts only the contracted enum', () => {
  assert.equal(isDecisionAction('approve'), true);
  assert.equal(isDecisionAction('reject'), true);
  assert.equal(isDecisionAction('yolo'), false);
  assert.equal(isDecisionAction(undefined), false);
});

test('append then read round-trips (snake_case on disk, camelCase in API)', async () => {
  const { runsDir, taskId } = await tempTask();
  const store = new DecisionStore(runsDir);

  await store.append(taskId, sample);
  const read = await store.read(taskId);
  assert.equal(read.length, 1);
  assert.deepEqual(read[0], sample);

  // On disk it must be snake_case to match the rest of the office files.
  const raw = yaml.load(await fs.readFile(path.join(runsDir, taskId, 'decision.yaml'), 'utf8')) as any;
  assert.equal(raw.task_id, taskId);
  assert.equal(raw.decisions[0].decided_at, sample.decidedAt);
  assert.equal(raw.decisions[0].against_verdict, 'changes_requested');
});

test('append is additive; latest() returns the most recent', async () => {
  const { runsDir, taskId } = await tempTask();
  const store = new DecisionStore(runsDir);

  await store.append(taskId, { ...sample, decision: 'request_changes', decidedAt: '2026-06-05T01:00:00.000Z' });
  await store.append(taskId, { ...sample, decision: 'approve', decidedAt: '2026-06-05T02:00:00.000Z' });

  const all = await store.read(taskId);
  assert.equal(all.length, 2);
  const latest = await store.latest(taskId);
  assert.equal(latest?.decision, 'approve');
  assert.equal(latest?.decidedAt, '2026-06-05T02:00:00.000Z');
});

test('read returns [] for missing file and drops malformed/unknown entries', async () => {
  const { runsDir, taskId } = await tempTask();
  const store = new DecisionStore(runsDir);
  assert.deepEqual(await store.read(taskId), []);

  // Hand-write a file with one valid and one bogus entry.
  await fs.writeFile(
    path.join(runsDir, taskId, 'decision.yaml'),
    yaml.dump({
      task_id: taskId,
      decisions: [
        { decision: 'approve', actor: 'a', decided_at: 'x' },
        { decision: 'not_a_real_action', actor: 'b', decided_at: 'y' }, // dropped
        { decision: 'reject' },                                          // missing fields -> dropped
      ],
    }),
  );
  const read = await store.read(taskId);
  assert.equal(read.length, 1);
  assert.equal(read[0].decision, 'approve');
});

test('decisionPath rejects invalid taskId: read stays safe, append throws', async () => {
  const { runsDir } = await tempTask();
  const store = new DecisionStore(runsDir);
  // read swallows the invalid-id error and returns [] (never builds a bad path).
  assert.deepEqual(await store.read('../../etc'), []);
  // append surfaces it (defense in depth — routes guard before reaching here).
  await assert.rejects(() => store.append('../../etc', sample), /Invalid taskId/);
});

test('buildDecisionRecord: defaults actor, trims note, normalizes againstVerdict', () => {
  const r = buildDecisionRecord({
    decision: 'approve',
    actor: '   ',           // blank -> default
    note: '  ',             // blank -> undefined
    statusData: { phase: 'done' },
    reviewerData: { review_verdict: 'changes_requested' },
    now: '2026-06-05T00:00:00Z',
  });
  assert.equal(r.actor, 'dashboard-user');
  assert.equal(r.note, undefined);
  assert.equal(r.againstVerdict, 'changes_requested');
  assert.equal(r.againstPhase, 'done');
});

test('buildDecisionRecord: bogus verdict and non-string phase drop to null (never fail own schema)', () => {
  const r = buildDecisionRecord({
    decision: 'reject',
    actor: 'bob',
    statusData: { phase: 42 },
    reviewerData: { review_verdict: 'totally_bogus' },
    now: 'now',
  });
  assert.equal(r.againstVerdict, null);
  assert.equal(r.againstPhase, null);
  assert.equal(r.actor, 'bob');
});

test('decision surfaces in the review read model (store -> read-model vertical)', async () => {
  const { runsDir, taskId } = await tempTask();
  await fs.writeFile(
    path.join(runsDir, taskId, 'status.yaml'),
    yaml.dump({ task_id: taskId, phase: 'done', updated_at: '2026-06-05' }),
  );
  await new DecisionStore(runsDir).append(taskId, { ...sample, decision: 'approve' });

  const summaries = await new ReviewModelService(runsDir).getReviewSummaries();
  const row = summaries.find((s) => s.taskId === taskId);
  assert.ok(row);
  assert.equal(row?.latestDecision?.decision, 'approve');
  assert.equal(row?.latestDecision?.actor, 'alice');
});
