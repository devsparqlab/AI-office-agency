# TASK-048: Add Daily mission item status contract

## Type
feature

## Priority
medium

## Parent / Epic
- Depends on: TASK-031 Daily Activities v1 groundwork
- Related: TASK-047 DEV-only daily reset override
- Epic: Mission UX contract alignment for Mobile

## Scope
### Target Services
- `Games-Labs-Missions`
  - Add per-user Daily Activity status and progress fields to mission progress.
  - Pass Daily Activity status through Quest overview Daily tab.
- `docs`
  - Document the mobile button-state mapping.

### Explicitly Out Of Scope
- Do not enforce claim gating in `POST /api/v1/missions/claim-daily`.
- Do not change Weekly, Monthly, Event, Invite, Store, or Mission Boost behavior.
- Do not introduce new migrations unless existing Daily Activities v1 tables are insufficient.
- Do not remove existing response fields.

## Description
Mobile needs a stable per-item status on Daily missions so the Quest UX can map
buttons consistently:

- `not_started` / `in_progress` => `Go`
- `claimable` => `Collect`
- `claimed` => `Done`

The response change must be additive and backward compatible for:

- `GET /api/v1/missions/progress`
- `GET /api/v1/quest/overview`

## Acceptance Criteria
- [x] `GET /api/v1/missions/progress` returns Daily Activity item `status`.
- [x] Daily Activity progress rows missing for the current reset window resolve to `current_value = 0` and `status = not_started`.
- [x] Partial progress resolves to `in_progress`.
- [x] Complete but unclaimed progress resolves to `claimable`.
- [x] Claimed items in the current Daily reset window resolve to `claimed`.
- [x] `GET /api/v1/quest/overview` Daily tab items pass through Daily Activity status.
- [x] Existing response fields remain additive/backward compatible.
- [x] Focused tests cover all four statuses.
- [x] Docs show status and the mobile button mapping.
- [x] `go test ./...` passes in `Games-Labs-Missions`.

## Affected Files
- `Games-Labs-Missions/internal/models/models.go`
- `Games-Labs-Missions/internal/repositories/mission_repo.go`
- `Games-Labs-Missions/internal/services/mission_service.go`
- `Games-Labs-Missions/internal/services/quest_overview_service.go`
- `Games-Labs-Missions/internal/services/mission_service_test.go`
- `Games-Labs-Missions/internal/services/quest_overview_service_test.go`
- `Games-Labs-Missions/README.md`

## Plan
### Approach
Use the existing Daily Activities v1 storage model as source of truth. Join active
`daily_activities` with current-day `daily_activity_progress`, then derive
claimed state from `mission_logs` where `mission_type = daily_mission` and
`reference_id = activity_id` within the current reset window.

### Subtasks
1. Add Daily Activity response fields for `status`, `progress`, `claimed`,
   `is_complete`, `can_claim`, `claimed_count_today`, and `claim_limit_per_day`.
2. Add repository read model for current-window Daily Activity progress and claims.
3. Derive status in `MissionService.GetProgress`.
4. Pass Daily Activity status and progress through `QuestOverviewService`.
5. Add TDD coverage for all four statuses and Quest overview pass-through.
6. Update README Daily Activities v1 response example.

### Risks
- **Status drift from claim behavior:** `claim-daily` still does not enforce
  claimable gating.
  - **Mitigation:** keep this task additive only and track claim gating separately.
- **Reset-window inconsistency:** claimed state must use the same Daily reset policy
  as progress.
  - **Mitigation:** derive the query window from the existing `dailyReset` policy.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: This is a focused Missions backend contract change with service/repo/tests/docs.

## Current State
Implemented and verified in Codex session on 2026-05-14.

## Next Action
Use this task as tracking history. Open a follow-up task if Mobile wants backend
claim gating for `POST /api/v1/missions/claim-daily`.
