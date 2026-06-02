# Dashboard Phase 2 Analytics And Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only workflow analytics to the dashboard with explicit shared contracts, a dedicated backend metrics engine, and a separate analytics API without introducing cache or control-center behavior.

**Architecture:** Keep the current file-based source of truth under `ai-dev-office/runs`, but separate responsibilities cleanly. `RunScanner` remains responsible for reading raw run data, a new analytics service converts run summaries/details into metrics and trends, and a new analytics route exposes those results to the client. Phase 2 starts with a single read-only `GET /api/analytics` endpoint to avoid duplicate filesystem work without cache, while keeping the response shape decomposed enough to split later into `/api/analytics/summary`, `/api/analytics/trends`, and `/api/analytics/failures` if the frontend needs separate loading behavior. Dashboard health and workflow health remain separate concepts.

**Tech Stack:** Express, TypeScript, node:test, React, Vite, shared dashboard types, file-based run data, existing `RunScanner`.

---

### Task 1: Define Shared Analytics Contracts

**Files:**
- Modify: `dashboard/shared/types.ts`
- Test: `dashboard/server/src/services/analytics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalytics } from './analytics';
import type { RunSummary } from '@shared/types';

test('buildAnalytics returns a workflow health score and top failure reasons', () => {
  const runs: RunSummary[] = [
    { id: 'TASK-001', title: 'ok', status: 'completed', updatedAt: '2026-06-01T10:00:00.000Z', runPath: 'runs/TASK-001' },
    { id: 'TASK-002', title: 'failed', status: 'failed', updatedAt: '2026-06-01T11:00:00.000Z', runPath: 'runs/TASK-002', errorReason: 'Missing env' },
  ];

  const analytics = buildAnalytics(runs, []);

  assert.equal(typeof analytics.summary.healthScore.score, 'number');
  assert.equal(analytics.topFailureReasons[0].reason, 'missing env');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/analytics.test.ts`
Expected: FAIL because `./analytics` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add shared contracts to `dashboard/shared/types.ts`:

```ts
export type AnalyticsHealthStatus = 'ok' | 'warning' | 'error';

export interface HealthScoreFactor {
  label: string;
  impact: number;
  value: number;
  detail: string;
}

export interface HealthScoreBreakdown {
  score: number;
  status: AnalyticsHealthStatus;
  factors: HealthScoreFactor[];
}

export interface RunsTrendPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
  blocked: number;
}

export interface FailureReasonStat {
  reason: string;
  count: number;
  latestSeenAt?: string;
}

export interface AnalyticsSummary {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  blockedRuns: number;
  runningRuns: number;
  successRate: number;
  failureRate: number;
  blockedRate: number;
  healthScore: HealthScoreBreakdown;
}

export interface AnalyticsResponse {
  generatedAt: string;
  windowDays: number;
  summary: AnalyticsSummary;
  trends: RunsTrendPoint[];
  topFailureReasons: FailureReasonStat[];
}
```

Contract note: keep `summary`, `trends`, and `topFailureReasons` as separate top-level fields so the frontend can later switch to split endpoints without changing the core data model.

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run: `npm test -- src/services/analytics.test.ts`
Expected: FAIL because `buildAnalytics` is still missing, but type import issues are gone.

- [ ] **Step 5: Commit**

```bash
git add dashboard/shared/types.ts
git commit -m "feat(dashboard): add analytics shared contracts"
```

### Task 2: Build The Analytics Service With TDD

**Files:**
- Create: `dashboard/server/src/services/analytics.ts`
- Create: `dashboard/server/src/services/analytics.test.ts`
- Modify: `dashboard/server/package.json`

- [ ] **Step 1: Write the failing test**

Create `dashboard/server/src/services/analytics.test.ts`:

```ts
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
    { id: 'TASK-001', title: 'ok', status: 'completed', updatedAt: '2026-05-31T10:00:00.000Z', runPath: 'runs/TASK-001' },
    { id: 'TASK-002', title: 'blocked', status: 'blocked', updatedAt: '2026-05-31T11:00:00.000Z', runPath: 'runs/TASK-002' },
    { id: 'TASK-003', title: 'failed', status: 'failed', updatedAt: '2026-06-01T09:00:00.000Z', runPath: 'runs/TASK-003', errorReason: 'Missing env' },
  ];

  const analytics = buildAnalytics(runs, [], { now: '2026-06-02T00:00:00.000Z', windowDays: 7 });

  assert.equal(analytics.summary.totalRuns, 3);
  assert.equal(analytics.summary.failedRuns, 1);
  assert.equal(analytics.summary.blockedRuns, 1);
  assert.equal(analytics.topFailureReasons[0].reason, 'missing env');
  assert.ok(analytics.summary.healthScore.score >= 0 && analytics.summary.healthScore.score <= 100);
  assert.ok(analytics.trends.some(point => point.date === '2026-06-01'));
});

test('buildAnalytics handles empty runs without NaN values', () => {
  const analytics = buildAnalytics([], [], { now: '2026-06-02T00:00:00.000Z', windowDays: 7 });

  assert.equal(analytics.summary.totalRuns, 0);
  assert.equal(analytics.summary.successRate, 0);
  assert.equal(analytics.topFailureReasons.length, 0);
  assert.equal(analytics.trends.length, 7);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/analytics.test.ts`
Expected: FAIL because `analytics.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `dashboard/server/src/services/analytics.ts` with focused pure helpers:

```ts
import type {
  AnalyticsResponse,
  AnalyticsHealthStatus,
  FailureReasonStat,
  RunDetail,
  RunSummary,
  RunsTrendPoint,
} from '@shared/types';

export interface BuildAnalyticsOptions {
  now?: string;
  windowDays?: number;
}

export function normalizeFailureReason(reason?: string): string {
  const normalized = reason?.trim().toLowerCase();
  return normalized ? normalized : 'unknown';
}

export function buildAnalytics(
  runs: RunSummary[],
  _details: RunDetail[],
  options: BuildAnalyticsOptions = {},
): AnalyticsResponse {
  const windowDays = options.windowDays ?? 7;
  const now = new Date(options.now ?? new Date().toISOString());
  const trends = buildTrendPoints(runs, now, windowDays);
  const topFailureReasons = buildTopFailureReasons(runs);
  const totalRuns = runs.length;
  const completedRuns = runs.filter(run => run.status === 'completed').length;
  const failedRuns = runs.filter(run => run.status === 'failed').length;
  const blockedRuns = runs.filter(run => run.status === 'blocked').length;
  const runningRuns = runs.filter(run => run.status === 'running').length;
  const successRate = totalRuns > 0 ? completedRuns / totalRuns : 0;
  const failureRate = totalRuns > 0 ? failedRuns / totalRuns : 0;
  const blockedRate = totalRuns > 0 ? blockedRuns / totalRuns : 0;
  const score = Math.max(0, Math.min(100,
    100
      - Math.round(failureRate * 45)
      - Math.round(blockedRate * 30)
      - Math.round((runningRuns > 0 ? runningRuns / Math.max(totalRuns, 1) : 0) * 15)
      - Math.round((topFailureReasons[0]?.reason === 'unknown' ? 10 : 0))
  ));
  const status: AnalyticsHealthStatus = score >= 80 ? 'ok' : score >= 50 ? 'warning' : 'error';

  return {
    generatedAt: now.toISOString(),
    windowDays,
    summary: {
      totalRuns,
      completedRuns,
      failedRuns,
      blockedRuns,
      runningRuns,
      successRate,
      failureRate,
      blockedRate,
      healthScore: {
        score,
        status,
        factors: [
          { label: 'success-rate', impact: Math.round(successRate * 100), value: completedRuns, detail: `${completedRuns}/${totalRuns} completed` },
          { label: 'failure-rate', impact: -Math.round(failureRate * 45), value: failedRuns, detail: `${failedRuns} failed runs` },
          { label: 'blocked-rate', impact: -Math.round(blockedRate * 30), value: blockedRuns, detail: `${blockedRuns} blocked runs` },
        ],
      },
    },
    trends,
    topFailureReasons,
  };
}

function buildTopFailureReasons(runs: RunSummary[]): FailureReasonStat[] {
  const grouped = new Map<string, FailureReasonStat>();
  for (const run of runs.filter(run => run.status === 'failed' || run.status === 'blocked')) {
    const reason = normalizeFailureReason(run.errorReason);
    const current = grouped.get(reason);
    grouped.set(reason, {
      reason,
      count: (current?.count ?? 0) + 1,
      latestSeenAt: [current?.latestSeenAt, run.updatedAt].filter(Boolean).sort().at(-1),
    });
  }
  return Array.from(grouped.values()).sort((a, b) => b.count - a.count || (b.latestSeenAt || '').localeCompare(a.latestSeenAt || ''));
}

function buildTrendPoints(runs: RunSummary[], now: Date, windowDays: number): RunsTrendPoint[] {
  const points: RunsTrendPoint[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    const dayRuns = runs.filter(run => (run.updatedAt || '').slice(0, 10) === key);
    points.push({
      date: key,
      total: dayRuns.length,
      completed: dayRuns.filter(run => run.status === 'completed').length,
      failed: dayRuns.filter(run => run.status === 'failed').length,
      blocked: dayRuns.filter(run => run.status === 'blocked').length,
    });
  }
  return points;
}
```

Normalization rule: group semantically identical failure reasons by trimming whitespace, lowercasing, and falling back to `'unknown'`. Do not introduce fuzzy matching in this phase.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/analytics.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full server test suite**

Run: `npm test`
Expected: PASS, including existing watcher, sorting, logs, health, and analytics tests.

- [ ] **Step 6: Commit**

```bash
git add dashboard/server/src/services/analytics.ts dashboard/server/src/services/analytics.test.ts dashboard/shared/types.ts
git commit -m "feat(dashboard): add analytics metrics engine"
```

### Task 3: Add The Analytics API Route

**Files:**
- Create: `dashboard/server/src/routes/analytics.ts`
- Modify: `dashboard/server/src/index.ts`
- Test: `dashboard/server/src/routes/analytics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `dashboard/server/src/routes/analytics.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsRouter } from './analytics';

test('createAnalyticsRouter exposes a read-only analytics endpoint', async () => {
  const router = createAnalyticsRouter({
    listRuns: async () => [
      { id: 'TASK-001', title: 'ok', status: 'completed', updatedAt: '2026-06-01T10:00:00.000Z', runPath: 'runs/TASK-001' },
    ],
    listRunDetails: async () => [],
  });

  assert.ok(router);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/routes/analytics.test.ts`
Expected: FAIL because the route file does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `dashboard/server/src/routes/analytics.ts`:

```ts
import { Router } from 'express';
import { RunScanner } from '../services/runScanner';
import { buildAnalytics } from '../services/analytics';

export interface AnalyticsRouteDeps {
  listRuns: () => ReturnType<RunScanner['listRuns']>;
  listRunDetails: () => Promise<[]>;
}

export function createAnalyticsRouter(
  deps: AnalyticsRouteDeps = {
    listRuns: () => new RunScanner().listRuns(),
    listRunDetails: async () => [],
  },
) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const runs = await deps.listRuns();
    const details = await deps.listRunDetails();
    res.json(buildAnalytics(runs, details));
  });

  return router;
}

export default createAnalyticsRouter();
```

Update `dashboard/server/src/index.ts`:

```ts
import analyticsRoutes from './routes/analytics';
app.use('/api/analytics', analyticsRoutes);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/routes/analytics.test.ts`
Expected: PASS

- [ ] **Step 5: Run full server verification**

Run: `npm test && npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add dashboard/server/src/routes/analytics.ts dashboard/server/src/routes/analytics.test.ts dashboard/server/src/index.ts
git commit -m "feat(dashboard): add analytics api route"
```

### Task 4: Wire The Client To Read Analytics

**Files:**
- Modify: `dashboard/client/src/App.tsx`
- Test: `dashboard/client/src/App.tsx` via build verification

- [ ] **Step 1: Write the failing test surrogate**

Because the client currently has no test runner, use a build-time type check as the red step by first adding analytics fetch usage that references types not yet consumed in the component.

Run: `npm run build`
Expected: FAIL after introducing incomplete analytics state usage.

- [ ] **Step 2: Write minimal implementation**

Update `dashboard/client/src/App.tsx`:

```tsx
import type { AnalyticsResponse } from '../../shared/types';

const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

const fetchInitialData = async () => {
  const [healthRes, runsRes, analyticsRes] = await Promise.all([
    fetch('/api/health'),
    fetch('/api/runs'),
    fetch('/api/analytics'),
  ]);

  setAnalytics(await analyticsRes.json());
};
```

Render read-only overview cards for:
- workflow health score
- success rate
- failed runs
- top failure reason

Do not add charts or controls yet. Keep the UI to summary cards and a compact failure list.

- [ ] **Step 3: Run build to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add dashboard/client/src/App.tsx
git commit -m "feat(dashboard): surface analytics summary in client"
```

### Task 5: Document The Phase 2 Analytics Surface

**Files:**
- Modify: `dashboard/README.md`

- [ ] **Step 1: Write the failing docs checklist**

Verify the README does not yet mention:
- `/api/analytics`
- workflow health score
- no-cache limitation

Expected: all three are missing or incomplete.

- [ ] **Step 2: Write minimal documentation**

Add a short section to `dashboard/README.md` covering:

```md
## Analytics API

- `GET /api/analytics`
- Read-only workflow metrics generated from `runs/`
- No cache layer yet; every request recomputes analytics from filesystem data
- Response is split into `summary`, `trends`, and `topFailureReasons` so the API can be broken into dedicated endpoints later if needed

## Workflow Health Score

- Distinct from dashboard server health
- Derived from completion, failure, blocked, and running run ratios
```

- [ ] **Step 3: Run final verification**

Run:
- `cd dashboard/server && npm test`
- `cd dashboard/server && npm run build`
- `cd dashboard/client && npm run build`

Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add dashboard/README.md
git commit -m "docs(dashboard): describe analytics api"
```

### Task 6: Final Review And Scope Guard

**Files:**
- Review only: `dashboard/server/src/services/analytics.ts`
- Review only: `dashboard/server/src/routes/analytics.ts`
- Review only: `dashboard/client/src/App.tsx`
- Review only: `dashboard/shared/types.ts`

- [ ] **Step 1: Re-read requirements against implementation**

Checklist:
- shared analytics contracts added
- backend metrics engine separated from run scanning
- dedicated analytics API added
- workflow health score separated from server health
- no cache introduced
- no auth introduced
- no control-center actions introduced

- [ ] **Step 2: Confirm final verification output**

Run:

```bash
cd dashboard/server && npm test && npm run build
cd ../client && npm run build
```

Expected: PASS

- [ ] **Step 3: Prepare handoff summary**

Include:
- changed files
- verification commands
- remaining risks: filesystem scan cost on large run histories, client has build-only verification until a dedicated UI test runner is added
