import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewSummary } from './reviewModel';

test('approved + done: not in queue, no attention, not needsReview', () => {
  const r = buildReviewSummary('TASK-001', { phase: 'done', updated_at: '2026-06-01' }, { review_verdict: 'approved' });
  assert.equal(r.phase, 'done');
  assert.equal(r.verdict, 'approved');
  assert.equal(r.inReviewQueue, false);
  assert.equal(r.verdictNeedsAttention, false);
  assert.equal(r.needsReview, false);
  assert.equal(r.lastReviewedAt, '2026-06-01');
});

test('in_review phase: in queue and needsReview, even without a verdict yet', () => {
  const r = buildReviewSummary('TASK-002', { phase: 'in_review' }, null);
  assert.equal(r.verdict, null);
  assert.equal(r.inReviewQueue, true);
  assert.equal(r.verdictNeedsAttention, false);
  assert.equal(r.needsReview, true);
  assert.equal(r.lastReviewedAt, null); // no reviewer-output yet
});

test('changes_requested verdict flags attention even when phase moved on', () => {
  const r = buildReviewSummary('TASK-003', { phase: 'debugging', updated_at: '2026-06-02' }, { review_verdict: 'changes_requested' });
  assert.equal(r.inReviewQueue, false);
  assert.equal(r.verdictNeedsAttention, true);
  assert.equal(r.needsReview, true);
});

test('escalate and infra_failure also need attention', () => {
  assert.equal(buildReviewSummary('T', { phase: 'escalated' }, { review_verdict: 'escalate' }).verdictNeedsAttention, true);
  assert.equal(buildReviewSummary('T', { phase: 'devops_needed' }, { review_verdict: 'infra_failure' }).verdictNeedsAttention, true);
});

test('no status / no reviewer output degrades to a safe, empty summary', () => {
  const r = buildReviewSummary('TASK-004', {}, null);
  assert.equal(r.phase, null);
  assert.equal(r.verdict, null);
  assert.equal(r.inReviewQueue, false);
  assert.equal(r.verdictNeedsAttention, false);
  assert.equal(r.needsReview, false);
  assert.equal(r.lastReviewedAt, null);
});

test('unrecognized enum values are dropped to null (no fuzzy matching / no guessing)', () => {
  // A typo or future value must not leak through as a real signal.
  const r = buildReviewSummary('TASK-005', { phase: 'in-review' /* wrong: hyphen */ }, { review_verdict: 'APPROVED' /* wrong case */ });
  assert.equal(r.phase, null);
  assert.equal(r.verdict, null);
  assert.equal(r.needsReview, false);
});

test('lastReviewedAt is null when reviewer output exists but updated_at is absent', () => {
  const r = buildReviewSummary('TASK-006', { phase: 'done' }, { review_verdict: 'approved' });
  assert.equal(r.lastReviewedAt, null);
});
