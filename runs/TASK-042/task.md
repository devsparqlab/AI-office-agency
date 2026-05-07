# TASK-042: Integrate Quest overview v2 tabs

## Type
feature

## Priority
high

## Parent / Epic
- Depends on: `TASK-039`, `TASK-040`, and `TASK-041`.
- Epic: Quest overview phase 2

## Scope
### Target Services
- `shared-lib`
  - Update overview contract only if needed for the final ordered tab response.
- `Games-Labs-Missions`
  - Compose existing Daily/Monthly plus Invite/Weekly/Event outputs into Quest overview.
- `docs`
  - Update Postman example/summary for Quest overview v2 response.

### Explicitly Out Of Scope
- Do not add new Weekly business logic.
- Do not add new Event business logic.
- Do not add referral/invite business logic.
- Do not change reward claim semantics.

## Description
Upgrade `GET /api/v1/quest/overview` from Phase 1 placeholders to Phase 2 integration. This task is integration-only and should compose outputs from the existing domain APIs/services:

Ordered tabs:
1. `daily`
2. `weekly`
3. `monthly`
4. `event`
5. `invite`

## Acceptance Criteria
- [ ] `GET /api/v1/quest/overview?user_id=...` returns tabs in exact order: `daily`, `weekly`, `monthly`, `event`, `invite`.
- [ ] `daily` remains populated from existing daily logic.
- [ ] `weekly` is populated from TASK-040 weekly service/API behavior.
- [ ] `monthly` remains populated from existing monthly/check-in logic.
- [ ] `event` is populated from TASK-041 event service/API behavior.
- [ ] `invite` is populated from TASK-039 invite overview behavior.
- [ ] No new domain/business logic is introduced beyond composition/mapping.
- [ ] Missing optional sections degrade predictably without changing tab order.
- [ ] Tests cover ordered tab composition and partial section fallback.
- [ ] Postman collection documents the v2 overview response shape.

## Affected Files
- `shared-lib/proto/missionspb/missions.proto` - modify only if response contract needs additive fields.
- `shared-lib/proto/missionspb/*` generated artifacts - regenerate if proto changes.
- `Games-Labs-Missions/internal/services/quest_overview_service.go` - update composition only.
- `Games-Labs-Missions/internal/handlers/quest_handler.go` - update mapping only if needed.
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go` - update only if contract changes require it.
- `Games-Labs-Missions/cmd/main.go` - wire dependencies for existing services if needed.
- `Games-Labs-Missions/internal/services/*test.go` - update overview composition tests.
- `Games-Labs-Missions/internal/handlers/*test.go` - update handler tests.
- `docs/Games-Labs-APIs.postman_collection.json` - update Quest overview example.

## Plan
### Approach
Keep this card as a composition layer. Reuse the services introduced by TASK-039, TASK-040, and TASK-041 and map them into the existing overview response shape.

### Subtasks
1. Inspect completed Invite, Weekly, and Event service APIs.
2. Update overview composition tests to expect populated ordered tabs.
3. Implement minimal composition/mapping changes.
4. Add fallback behavior for unavailable optional tab providers while preserving tab order.
5. Update Postman overview example.
6. Run focused overview tests, Missions tests, and dependency guard.

### Risks
- **Business logic duplication:** Overview may accidentally reimplement Weekly/Event/Invite logic.
  - **Mitigation:** Acceptance criteria requires reuse/composition only.
- **Tab order drift:** Mobile relies on exact tab order.
  - **Mitigation:** Tests must assert exact ordered keys.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Cross-card integration after Invite/Weekly/Event production APIs are ready.

## Next Action
Run after TASK-039, TASK-040, and TASK-041 are done, then hand off to `reviewer`.
