# TASK-056: Complete All Daily Bonus

## Metadata

| Field | Value |
|-------|-------|
| **Type** | feature |
| **Priority** | medium |
| **Parent** | TASK-049 |
| **Epic** | Mobile Missions integration |
| **Primary assignee** | dev-2 |
| **Parallel** | false |
| **Short name** | daily-completion-bonus |

## Summary

Add a configurable reward for completing every **eligible Daily Activity** in the Bangkok daily window. This must be **orthogonal** to the existing top-level `bonus_reward` on `GET /api/v1/quest/overview`, which today reflects the **monthly** check-in challenge (`MonthlyChallenge` / logins count). Implement persistence for **once-per-Bangkok-day** claim idempotency, expose explicit overview JSON for Mobile, document the contract in `Games-Labs-Missions/README.md`, and wire a new gateway-facing RPC + HTTP route following existing `ClaimDaily` / `ClaimMonthlyReward` patterns.

## Product decisions (authoritative)

1. **Complete** means `DailyActivity` progress has reached its configured target (`CurrentValue >= TargetValue`), aligned with existing `IsComplete` derivation — **even if** the per-activity child reward has **not** been claimed.
2. **Eligible set** = only **active** and **admin-configured** `DailyActivity` rows that are included when `quest/overview` is built for the Daily tab at **that** moment:
   - Standalone activities: `Active == true`, not only a member of a group.
   - Grouped activities: child appears under an **active** `DailyActivityGroup` with `Active == true` on the group and child (mirror `buildDailyTab` / `membershipSetFromDailyGroups` rules).
   - **Exclude** synthetic Daily-tab rows that are not backed by `daily_activities` (e.g. `watch-ad`, `streak`) unless product explicitly expands scope later.
3. Child **claim** state does **not** affect complete-all-daily eligibility (only progress vs target).
4. Bonus **claim** is **idempotent**: at most **one** successful wallet credit per `(user_id, Bangkok calendar day)`; repeats return a stable conflict / already-claimed outcome without double pay.
5. Overview must expose this as a **separate JSON object** from `bonus_reward` (monthly).

## Current codebase anchors

- Overview shape: `QuestOverview` in `internal/services/quest_overview_service.go` — `bonus_reward` is populated from `progress.Monthly` + `cfg.MonthlyChallenge*`.
- Daily tab assembly: `buildDailyTab` — groups, standalone activities, then synthetic items.
- Bangkok window: existing daily logic uses `bangkokLocation` / daily reset policy (reuse for “Bangkok day” and claim keys).
- gRPC: `GetQuestOverview` returns `google.protobuf.Struct`; additive JSON fields remain valid without changing the RPC signature (same as TASK-055). **New claim** requires a new `rpc` + HTTP annotation in `shared-lib/proto/missionspb/missions.proto`, codegen, and `internal/grpc/missiongrpc/server.go` dispatch.

## Acceptance criteria

- [ ] **Config separation**: Mission config stores daily-completion bonus parameters (reward amount, currency, enable flag) on **`mission_config`** (or equivalent single-row config), distinct from `MonthlyChallengeReward` / `MonthlyChallengeCurrency`. Disabled or zero-eligible-day behavior is defined and tested (e.g. `claimable=false`, `total=0`).
- [ ] **Eligibility**: Backend computes eligible activities using the **same inclusion rules** as the Daily tab’s `DailyActivity`-backed rows at overview generation time; completion uses progress-vs-target (not claim state).
- [ ] **Overview JSON**: `GET /api/v1/quest/overview` includes a **new top-level field** (name TBD in impl, e.g. `daily_completion_bonus`) with at least: `total`, `completed`, `claimable`, `claimed`, `reward` `{type, amount}`, and stable semantics when config is off or no eligible missions exist.
- [ ] **Claim**: New authenticated `POST` route (path aligned with proto + gateway) credits wallet once per Bangkok day when `claimable`; duplicate claims same day do not credit again; errors are structured consistently with `claim-daily`.
- [ ] **Persistence**: New migration records claims per user + Bangkok day (unique constraint); compatible with existing transaction/idempotency patterns used by daily claims.
- [ ] **Tests**: Unit tests for eligibility aggregation, overview field, and claim idempotency; extend `quest_overview_service_test.go` as appropriate.
- [ ] **Docs**: `Games-Labs-Missions/README.md` — clearly distinguishes **monthly** `bonus_reward` vs **daily completion** bonus object + claim endpoint; remove or narrow “Phase 2 Gaps” bullet once implemented.
- [ ] **Postman / gateway**: Regenerate missions protobuf artifacts in `shared-lib`; bump `Games-Labs-Missions` (and **api-gateway** if pinned) `shared-lib` version; update `api-gateway/docs/Games-Labs-APIs.postman_collection.json` with overview + claim examples.

## Technical plan

### Approach

1. **Schema**: Extend `mission_config` with daily-completion bonus columns; add a claim ledger table `(user_id, bangkok_day, …)` with uniqueness on `(user_id, bangkok_day)`.
2. **Domain helper**: Pure function (package services) listing eligible `*DailyActivity` from `MissionProgress` consistent with `buildDailyTab` filtering; compute `completed` count via existing `IsComplete` / progress rule.
3. **MissionService**: Load/save config; implement `ClaimDailyCompletionBonus` — validate enabled, eligibility, insert-or-conflict claim row, wallet credit (mirror `ClaimDaily` / monthly patterns).
4. **QuestOverviewService**: Populate new struct field next to `BonusReward`; read whether today’s Bangkok bonus was already claimed via repo/service.
5. **HTTP + gRPC**: Register mux route, handler, and `missions.proto` RPC + `grpc-gateway` annotation; implement server dispatch stub.
6. **Docs & QA**: README contract, Postman, migration notes.

### Ordered subtasks

| Order | ID | Agent | Description |
|-------|-----|-------|-------------|
| 1 | `056-schema-config` | dev-2 | Migration(s), `MissionConfig` / model fields, repository load/update for new columns + claim table accessors. |
| 2 | `056-eligibility-claim` | dev-2 | Eligible-activity enumeration helper; `MissionService` claim flow + wallet + idempotency; handler + route registration. |
| 3 | `056-overview-json` | dev-2 | Extend `QuestOverview` Go struct + `GetOverview` population + tests. |
| 4 | `056-proto-gateway-docs` | dev-2 | `missions.proto` RPC + codegen in `shared-lib`; `missiongrpc/server.go` dispatch; `go.mod` bumps; README + Postman. |

### Risks

| Risk | Mitigation |
|------|------------|
| Ambiguity counting activities inside inactive groups | Strictly mirror `buildDailyTab` / membership filters; add regression tests with mixed active/inactive groups. |
| Float comparison for progress | Reuse existing `IsComplete` derivation (`CurrentValue >= TargetValue`) — do not invent new rounding. |
| Proto / shared-lib ripple | Single subtask owns proto + regenerate + module version bumps to avoid drift. |
| Zero eligible activities | Product-safe behavior: not claimable, documented in README and tests. |

### Estimated complexity

**High** (new persistence, overview contract, claim path, proto + multi-module version alignment).

## Assignment

- **Primary**: dev-2  
- **Parallel**: false  

## Next action

Hand to **dev-2** for implementation per subtasks above.
