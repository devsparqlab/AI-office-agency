import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRunDir, TASK_ID_PATTERN } from './pathSecurity';

// --- TASK_ID_PATTERN ---

test('TASK_ID_PATTERN accepts valid task ids', () => {
  for (const id of ['TASK-001', 'TASK-PKG-001', 'TASK-abc_def', 'TASK-A1-B2-C3']) {
    assert.ok(TASK_ID_PATTERN.test(id), `expected ${id} to match`);
  }
});

test('TASK_ID_PATTERN rejects traversal and invalid ids', () => {
  for (const id of ['../TASK-001', 'TASK-', '', '..', 'TASK-001/../../etc', 'task-001']) {
    assert.ok(!TASK_ID_PATTERN.test(id), `expected ${id} to NOT match`);
  }
});

// --- resolveRunDir ---

test('resolveRunDir accepts TASK-001', () => {
  const result = resolveRunDir('/workspace/runs', 'TASK-001');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.match(result.runDir, /TASK-001$/);
  }
});

test('resolveRunDir accepts TASK-PKG-001 (multi-segment)', () => {
  const result = resolveRunDir('/workspace/runs', 'TASK-PKG-001');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.match(result.runDir, /TASK-PKG-001$/);
  }
});

test('resolveRunDir rejects plain dot-dot traversal', () => {
  const result = resolveRunDir('/workspace/runs', '../etc');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 400);
  }
});

test('resolveRunDir rejects URL-encoded traversal ..%2f..%2fetc', () => {
  // Express decodes %2f to / in params, so the decoded value would be
  // "../../etc" — but it still must fail the regex.
  const decoded = decodeURIComponent('..%2f..%2fetc');
  const result = resolveRunDir('/workspace/runs', decoded);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 400);
});

test('resolveRunDir rejects %2e%2e (URL-encoded dots)', () => {
  const decoded = decodeURIComponent('%2e%2e');
  const result = resolveRunDir('/workspace/runs', decoded);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 400);
});

test('resolveRunDir rejects encoded nested traversal ..%2f..%2f..%2fetc%2fpasswd', () => {
  const decoded = decodeURIComponent('..%2f..%2f..%2fetc%2fpasswd');
  const result = resolveRunDir('/workspace/runs', decoded);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 400);
});

test('resolveRunDir rejects TASK-001/../../etc (slash inside id)', () => {
  // Even if somehow the full string arrived, the regex blocks slashes
  const result = resolveRunDir('/workspace/runs', 'TASK-001/../../etc');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 400);
});

test('resolveRunDir rejects empty string', () => {
  const result = resolveRunDir('/workspace/runs', '');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 400);
});
