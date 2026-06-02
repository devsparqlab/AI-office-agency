# P2.5 Analytics Stabilization v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the existing dashboard analytics behavior with fixture-driven tests, conservative failure normalization, health-band tuning, and lightweight overview fetch reuse without expanding the current API surface.

**Architecture:** Keep the existing dashboard server and client structure intact. Add a shared analytics fixture module for deterministic service tests, tune only the current health-score heuristics, preserve the current `AnalyticsResponse` contract, and make a narrow client-side fetch change so overview-backed panels reuse `/api/analytics` while `agents` and `long-running` stay separate.

**Tech Stack:** TypeScript, Node test runner, Express, React, Vite

---

### Task 1: Add Shared Analytics Fixtures

**Files:**
- Create: `dashboard/server/src/services/analytics.fixtures.ts`
- Modify: `dashboard/server/src/services/analytics.test.ts`
- Test: `dashboard/server/src/services/analytics.test.ts`

- [ ] **Step 1: Write the failing test imports for shared fixtures**

```ts
import {
  allCompletedRunsFixture,
  mixedWarningRunsFixture,
  degradedErrorRunsFixture,
  runningThresholdFixture,
  failureReasonVariantsFixture,
} from './analytics.fixtures';
```

Add assertions that use these names inside `dashboard/server/src/services/analytics.test.ts` before the fixture file exists.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard/server && npm test`
Expected: FAIL with a TypeScript import error for `./analytics.fixtures` or missing exported fixture names.

- [ ] **Step 3: Write the minimal fixture module**

```ts
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
```

- [ ] **Step 4: Run test to verify the fixture module compiles**

Run: `cd dashboard/server && npm test`
Expected: FAIL in later assertions about health bands or normalization behavior, but no missing-import failure.

- [ ] **Step 5: Commit**

```bash
git add dashboard/server/src/services/analytics.fixtures.ts dashboard/server/src/services/analytics.test.ts
git commit -m "test(dashboard): add analytics stabilization fixtures"
```

### Task 2: Lock Conservative Failure Normalization

**Files:**
- Modify: `dashboard/server/src/services/analytics.test.ts`
- Modify: `dashboard/server/src/services/runScanner.ts`
- Test: `dashboard/server/src/services/analytics.test.ts`

- [ ] **Step 1: Write failing normalization tests for safe grouping and over-grouping rejection**

```ts
test('normalizeFailureReason groups only safe formatting variants', () => {
  assert.equal(normalizeFailureReason('Missing ENV.'), 'missing env');
  assert.equal(normalizeFailureReason('missing env'), 'missing env');
  assert.equal(normalizeFailureReason('missing   env'), 'missing env');
  assert.equal(normalizeFailureReason(' missing env '), 'missing env');
});

test('normalizeFailureReason does not over-group distinct phrases', () => {
  assert.notEqual(normalizeFailureReason('missing env'), normalizeFailureReason('missing test'));
  assert.notEqual(normalizeFailureReason('missing env'), normalizeFailureReason('missing payload'));
  assert.notEqual(normalizeFailureReason('missing test'), normalizeFailureReason('missing test evidence'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard/server && npm test`
Expected: FAIL if the current normalizer leaves punctuation, spacing, or over-grouping behavior different from the new assertions.

- [ ] **Step 3: Implement only conservative normalization in `runScanner.ts`**

```ts
export function normalizeFailureReason(reason?: string): string {
  if (!reason) return 'unknown';

  const normalized = reason
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/, '')
    .trim();

  return normalized || 'unknown';
}
```

Keep the implementation deterministic. Do not reorder tokens. Do not add broad aliases. Do not merge phrases based on semantic guesses.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard/server && npm test`
Expected: PASS for both normalization tests and no regressions in the existing analytics service tests.

- [ ] **Step 5: Commit**

```bash
git add dashboard/server/src/services/analytics.test.ts dashboard/server/src/services/runScanner.ts
git commit -m "fix(dashboard): harden failure normalization"
```

### Task 3: Tune Health Score Bands with Fixture-Driven Tests

**Files:**
- Modify: `dashboard/server/src/services/analytics.test.ts`
- Modify: `dashboard/server/src/services/analytics.ts`
- Test: `dashboard/server/src/services/analytics.test.ts`

- [ ] **Step 1: Write failing health-band tests against the fixtures**

```ts
test('buildSummary returns ok for all completed runs', () => {
  const summary = buildSummary(allCompletedRunsFixture, { now: '2026-06-02T00:00:00.000Z' });
  assert.equal(summary.healthScore.status, 'ok');
});

test('buildSummary returns warning for mostly completed mixed runs', () => {
  const summary = buildSummary(mixedWarningRunsFixture, { now: '2026-06-02T00:00:00.000Z' });
  assert.equal(summary.healthScore.status, 'warning');
});

test('buildSummary returns error for degraded runs', () => {
  const summary = buildSummary(degradedErrorRunsFixture, { now: '2026-06-02T00:00:00.000Z' });
  assert.equal(summary.healthScore.status, 'error');
});

test('buildSummary does not heavily penalize fresh running work', () => {
  const summary = buildSummary([allCompletedRunsFixture[0], runningThresholdFixture[0]], { now: '2026-06-02T00:00:00.000Z' });
  assert.notEqual(summary.healthScore.status, 'error');
});

test('buildSummary adds warning pressure for stale running work', () => {
  const summary = buildSummary([allCompletedRunsFixture[0], runningThresholdFixture[1]], { now: '2026-06-02T00:00:00.000Z' });
  assert.ok(summary.healthScore.factors.some((factor) => factor.label === 'stale-running' && factor.impact < 0));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard/server && npm test`
Expected: FAIL on at least one health-band assertion, proving the current weight or threshold choices do not match the agreed operator expectations.

- [ ] **Step 3: Make the smallest health-score tuning change in `analytics.ts`**

```ts
const FAILURE_WEIGHT = 35;
const BLOCKED_WEIGHT = 20;
const STALE_RUNNING_WEIGHT = 20;
const WARNING_THRESHOLD = 70;
const ERROR_THRESHOLD = 45;

const failurePenalty = Math.round(failureRate * FAILURE_WEIGHT);
const blockedPenalty = Math.round(blockedRate * BLOCKED_WEIGHT);
const stalePenalty = Math.round(staleRate * STALE_RUNNING_WEIGHT);

const score = Math.max(0, Math.min(100, 100 - failurePenalty - blockedPenalty - stalePenalty));
const status: AnalyticsHealthStatus =
  score >= WARNING_THRESHOLD ? 'ok' : score >= ERROR_THRESHOLD ? 'warning' : 'error';
```

Adjust the exact constants only as needed to satisfy the fixture expectations. Do not add new health factors. Keep the existing factor labels and returned shape.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard/server && npm test`
Expected: PASS for the new health-band coverage and the existing analytics service tests.

- [ ] **Step 5: Commit**

```bash
git add dashboard/server/src/services/analytics.test.ts dashboard/server/src/services/analytics.ts
git commit -m "fix(dashboard): tune analytics health bands"
```

### Task 4: Reuse Overview Fetch for Analytics Initial Load

**Files:**
- Modify: `dashboard/client/src/views/AnalyticsView.tsx`
- Test: `dashboard/client/src/views/AnalyticsView.tsx`

- [ ] **Step 1: Write the intended fetch-shape comments and local state plan directly in the file before changing logic**

```ts
// Reuse /api/analytics for initial load of summary, trends, and topFailureReasons.
// Keep agents and long-running as separate requests to avoid widening the response contract.
```

Add local overview state in `AnalyticsView` first so the narrow fetch-sharing target is explicit.

- [ ] **Step 2: Run build to verify the unchanged file still passes before the refactor**

Run: `cd dashboard/client && npm run build`
Expected: PASS

- [ ] **Step 3: Implement the lightweight overview reuse without changing `AnalyticsResponse`**

```ts
const [overview, setOverview] = useState<AnalyticsResponse | null>(null);

const fetchOverview = () => {
  fetchJson<AnalyticsResponse>('/api/analytics')
    .then(setOverview)
    .catch((err) => {
      console.error('Error loading analytics overview:', err);
      setOverview(null);
    });
};

useEffect(() => {
  fetchOverview();
}, []);

useDashboardRefresh(fetchOverview);
```

Then thread `overview?.summary`, `overview?.trends`, and `overview?.topFailureReasons` into the existing `WorkflowHealthPanel`, `DailyTrendsPanel`, `TopFailuresPanel`, and `StatusDistributionPanel` via optional props such as:

```ts
function WorkflowHealthPanel({ initialData }: { initialData?: AnalyticsSummary | null }) { /* ... */ }
function TopFailuresPanel({ initialData }: { initialData?: AnalyticsFailures['topFailureReasons'] | null }) { /* ... */ }
function DailyTrendsPanel({ initialData }: { initialData?: AnalyticsTrends | null }) { /* ... */ }
function StatusDistributionPanel({ initialData }: { initialData?: AnalyticsSummary | null }) { /* ... */ }
```

Inside those panels:

- initialize state from the optional prop,
- skip the panel-specific initial fetch if the overview prop is already present,
- keep the existing panel refresh fallback so the page still recovers if overview data is temporarily unavailable.

Do not change `AnalyticsResponse`. Do not move `AgentActivityPanel` or `LongRunningPanel` onto the overview response.

- [ ] **Step 4: Run build to verify it passes**

Run: `cd dashboard/client && npm run build`
Expected: PASS with no TypeScript errors and no change to the shared response contract.

- [ ] **Step 5: Commit**

```bash
git add dashboard/client/src/views/AnalyticsView.tsx
git commit -m "perf(dashboard): reuse analytics overview fetch"
```

### Task 5: Final Verification

**Files:**
- Verify: `dashboard/server/src/services/analytics.fixtures.ts`
- Verify: `dashboard/server/src/services/analytics.test.ts`
- Verify: `dashboard/server/src/services/analytics.ts`
- Verify: `dashboard/server/src/services/runScanner.ts`
- Verify: `dashboard/client/src/views/AnalyticsView.tsx`

- [ ] **Step 1: Run the full server test suite**

Run: `cd dashboard/server && npm test`
Expected: PASS with `0` failures.

- [ ] **Step 2: Run the server build**

Run: `cd dashboard/server && npm run build`
Expected: PASS with exit code `0`.

- [ ] **Step 3: Run the client build**

Run: `cd dashboard/client && npm run build`
Expected: PASS with exit code `0`.

- [ ] **Step 4: Review the changed surface against the spec**

Checklist:

- no new metrics added,
- no new endpoint added,
- `AnalyticsResponse` unchanged unless a type error forced it,
- failure normalization remains conservative,
- `agents` and `long-running` still fetch separately,
- no full `AnalyticsView` state rewrite.

- [ ] **Step 5: Commit the final stabilization pass**

```bash
git add dashboard/server/src/services/analytics.fixtures.ts \
  dashboard/server/src/services/analytics.test.ts \
  dashboard/server/src/services/analytics.ts \
  dashboard/server/src/services/runScanner.ts \
  dashboard/client/src/views/AnalyticsView.tsx
git commit -m "fix(dashboard): stabilize analytics phase 2.5"
```
