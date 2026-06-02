# P2.5 Analytics Stabilization v2 Design

## Goal

Stabilize the existing dashboard analytics behavior without expanding the product surface, adding new metrics, or refactoring the Analytics page heavily.

## Scope

Included:

- fixture-first analytics tests,
- conservative failure normalization,
- health score band tuning,
- lightweight overview fetch reuse for `summary`, `trends`, and `topFailureReasons`.

Excluded:

- new metrics,
- new endpoints,
- route-based navigation,
- report generator expansion,
- aggressive semantic grouping,
- full `AnalyticsView` state rewrite.

## Current Problems

- Health score weights are fixed and not yet locked against realistic mixed-status fixtures.
- Failure grouping is too shallow for harmless string noise, but aggressive grouping would be risky.
- `AnalyticsView` still issues separate initial requests for data already available from `GET /api/analytics`.

## Design

### 1. Fixture-First Analytics Tests

Add reusable fixture sets for the existing analytics service tests in:

- `dashboard/server/src/services/analytics.fixtures.ts`

The fixtures should represent:

- all completed runs,
- mostly completed runs with a few failed or blocked runs,
- many failed or blocked runs,
- running tasks below the stale threshold,
- running tasks above the stale threshold,
- failure reason variants with safe formatting noise.

The tests should prefer behavioral assertions over brittle exact snapshots. For health scoring, lock the expected status band and key pressure signals instead of overfitting to one exact score unless the value is intentionally deterministic.

### 2. Conservative Failure Normalization

Keep normalization deterministic and low-risk:

- trim surrounding whitespace,
- lowercase,
- collapse repeated internal whitespace,
- remove trailing punctuation,
- keep different semantic phrases separated.

Safe variants such as `Missing ENV.`, `missing env`, `missing   env`, and ` missing env ` should normalize together. Distinct phrases such as `missing env`, `missing test`, `missing payload`, and `dependency guard failed` must remain separate.

Do not reorder tokens or infer semantic equivalence from word overlap. Alias handling should stay minimal; if an alias is not clearly safe, leave it out.

### 3. Health Score Band Tuning

Tune the current score formula and thresholds so the output aligns with operator expectations:

- all completed => `ok`,
- mostly completed with a few failed or blocked => `warning`,
- many failed or blocked => `error`,
- running work below stale threshold => no major penalty,
- stale running work above threshold => visible warning pressure.

This work should stay inside the existing health score model rather than introducing new factors or additional metrics.

### 4. Lightweight Overview Fetch

Reduce duplicate initial fetches in `AnalyticsView` without a broad rewrite.

`GET /api/analytics` already returns:

- `summary`,
- `trends`,
- `topFailureReasons`.

Use that overview response for the panels that can consume it directly, while leaving `agents` and `long-running` as separate fetches for now. The implementation should preserve the current page structure and avoid introducing a large shared-state architecture.

Do not change the `AnalyticsResponse` contract unless required by an existing type error.

## Testing

Add or expand tests so they explicitly verify:

- conservative normalization groups only safe string variants,
- over-grouping is rejected for `missing env` != `missing test`,
- over-grouping is rejected for `missing env` != `missing payload`,
- over-grouping is rejected for `missing test` != `missing test evidence`,
- health band behavior for the agreed fixture cases,
- stale-running pressure is present only when the threshold is crossed,
- overview-based initial load still supports the existing analytics panels that rely on summary, trends, and top failure reasons.

Verification for completion:

- `cd dashboard/server && npm test`
- `cd dashboard/server && npm run build`
- `cd dashboard/client && npm run build`
