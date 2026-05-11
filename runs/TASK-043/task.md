# TASK-043: Add Event claim write path

## Type
feature

## Priority
high

## Parent / Epic
- Depends on: `TASK-041` Event production read APIs.
- Epic: Quest phase 2.1 event completion

## Scope
### Target Services
- `shared-lib`
  - Add public `missionspb` contract for event claim.
- `Games-Labs-Missions`
  - Own event reward claim persistence, duplicate-safe protection, and reward issuance flow.
- `docs`
  - Add the event claim endpoint to the Postman collection.

### Explicitly Out Of Scope
- Do not redesign event read list/detail contracts unless strictly needed for claim state wiring.
- Do not add new quest overview tabs or reorder overview behavior.
- Do not broaden into referral/invite or weekly claim changes.

## Description
Complete the Event UX by adding the write path for reward collection:

`POST /api/v1/missions/events/{event_id}/claim`

This endpoint must be safe under retries and concurrent requests. If Mobile retries the same claim or two requests race, the backend must not double-credit rewards.

## Acceptance Criteria
- [ ] `shared-lib/proto/missionspb/missions.proto` has an additive event claim RPC with grpc-gateway annotation `POST /api/v1/missions/events/{event_id}/claim`.
- [ ] Generated `missionspb` artifacts are regenerated.
- [ ] `Games-Labs-Missions` persists event claim state behind an explicit repository boundary.
- [ ] Claim path is duplicate-safe under retries and concurrent requests.
- [ ] Reward issuance uses a deterministic idempotency strategy for downstream wallet/reward crediting.
- [ ] Re-claim attempts return a stable already-claimed outcome without double-crediting.
- [ ] Focused tests cover success, re-claim, retry/idempotency, concurrent claim, and non-claimable event behavior.
- [ ] `docs/Games-Labs-APIs.postman_collection.json` includes the claim request.

## Affected Files
- `shared-lib/proto/missionspb/missions.proto` - modify contract.
- `shared-lib/proto/missionspb/*` generated artifacts - regenerate.
- `Games-Labs-Missions/internal/repositories/*` - add/modify event claim persistence boundary.
- `Games-Labs-Missions/internal/services/event_service.go` - extend claim behavior.
- `Games-Labs-Missions/internal/handlers/event_handler.go` - add claim handler.
- `Games-Labs-Missions/internal/routes/apiv1.go` - register claim route.
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go` - dispatch claim RPC.
- `Games-Labs-Missions/cmd/main.go` - wire dependencies.
- `Games-Labs-Missions/migrations/*` - add event claim persistence if needed.
- `Games-Labs-Missions/internal/services/*test.go` - add claim tests.
- `Games-Labs-Missions/internal/handlers/*test.go` - add handler tests.
- `docs/Games-Labs-APIs.postman_collection.json` - add Postman request.

## Plan
### Approach
Extend the existing Event domain with a dedicated claim write path that mirrors the safety guarantees already used for Weekly claim: persisted claim state, deterministic idempotency, and concurrency protection.

### Subtasks
1. Inspect the Weekly claim flow and reuse the safe persistence/idempotency pattern where appropriate.
2. Update `missionspb.proto` and regenerate generated artifacts.
3. Add event claim persistence and repository methods.
4. Implement event claim service behavior with duplicate-safe reward issuance.
5. Add HTTP handler, route registration, gRPC dispatch, and main wiring.
6. Add tests for success, re-claim, retries, concurrency, and non-claimable cases.
7. Add Postman request and run focused verification.

### Risks
- **Duplicate rewards:** Event claim is financially sensitive.
  - **Mitigation:** Transactional claim state + deterministic wallet idempotency + concurrency tests.
- **Inconsistent state vs read API:** Event detail must reflect claim result immediately.
  - **Mitigation:** Keep read/write claim state under the same repository boundary.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Stateful reward-claim work with concurrency and idempotency risk.

## Next Action
Run `dev-2`, then hand off to `reviewer`.
