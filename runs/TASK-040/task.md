# TASK-040: Add Weekly production mission APIs

## Type
feature

## Priority
high

## Parent / Epic
- Depends on: `TASK-039` may run first but is not a hard technical blocker.
- Epic: Quest overview phase 2

## Scope
### Target Services
- `shared-lib`
  - Add public `missionspb` contracts for weekly list and claim.
- `Games-Labs-Missions`
  - Own weekly mission definitions, user progress, weekly reset boundary, and claim state.
- `docs`
  - Add weekly endpoints to the Postman collection.

### Explicitly Out Of Scope
- Do not integrate weekly into `/api/v1/quest/overview`; TASK-042 owns overview v2 integration.
- Do not add Event or Invite production logic.
- Do not redesign existing Daily/Monthly mission behavior.

## Description
Replace the Weekly placeholder with production Weekly mission APIs:

- `GET /api/v1/missions/weekly?user_id=...`
- `POST /api/v1/missions/weekly/{mission_id}/claim`

Weekly must have real mission cards, progress, claimability, claimed state, and reset logic based on weekly boundaries.

## Acceptance Criteria
- [ ] `shared-lib/proto/missionspb/missions.proto` has additive weekly list and weekly claim RPCs with grpc-gateway annotations.
- [ ] Generated `missionspb` artifacts are regenerated.
- [ ] Weekly mission definitions can be read by service code.
- [ ] User weekly progress and claim state are persisted or otherwise stored using an explicit repository boundary.
- [ ] Weekly reset logic handles week boundary correctly.
- [ ] `GET /api/v1/missions/weekly` returns mission cards with progress, target, reward, claimable, claimed, and reset metadata.
- [ ] `POST /api/v1/missions/weekly/{mission_id}/claim` prevents re-claim and is safe for repeated/idempotent user attempts.
- [ ] Tests cover reset boundary, re-claim protection, and idempotency behavior.
- [ ] Postman collection includes both weekly requests.

## Affected Files
- `shared-lib/proto/missionspb/missions.proto` - modify contract.
- `shared-lib/proto/missionspb/*` generated artifacts - regenerate.
- `Games-Labs-Missions/internal/repositories/*` - add/modify weekly progress and claim storage boundary.
- `Games-Labs-Missions/internal/services/weekly_service.go` - create weekly domain service.
- `Games-Labs-Missions/internal/handlers/weekly_handler.go` - create HTTP handler.
- `Games-Labs-Missions/internal/routes/apiv1.go` - register routes.
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go` - dispatch gRPC methods.
- `Games-Labs-Missions/cmd/main.go` - wire repositories/services/handlers.
- `Games-Labs-Missions/internal/services/*test.go` - add weekly tests.
- `Games-Labs-Missions/internal/handlers/*test.go` - add weekly handler tests.
- `docs/Games-Labs-APIs.postman_collection.json` - add Postman requests.

## Plan
### Approach
Implement Weekly as its own domain slice. Keep overview integration out of scope and expose direct weekly APIs first.

### Subtasks
1. Inspect existing Missions storage/repository patterns for progress and claims.
2. Update `missionspb.proto` and regenerate generated artifacts.
3. Add weekly repository/storage boundary for progress and claim state.
4. Implement weekly service list and claim behavior.
5. Add HTTP handler, route registration, gRPC dispatch, and main wiring.
6. Add tests for weekly boundary reset, re-claim protection, idempotency, and handler behavior.
7. Add Postman requests and run focused verification.

### Risks
- **Ambiguous weekly boundary:** Timezone and week start must be deterministic.
  - **Mitigation:** Define and test the exact boundary in service code.
- **Duplicate rewards:** Claim endpoint must not double-issue rewards.
  - **Mitigation:** Persist claim state and make repeated claim attempts deterministic.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Higher-risk stateful Missions domain work with storage and claim behavior.

## Next Action
Run `dev-2`, then hand off to `reviewer`.
