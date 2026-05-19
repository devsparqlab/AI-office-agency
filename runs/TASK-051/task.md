# TASK-051: Backoffice Daily Activity Smoke Test

## Type
feature

## Priority
high

## Parent / Epic
- Parent: `TASK-049`
- Epic: Mobile Missions integration

## Scope
### Target Services
- `Games-Labs-Missions`
  - Owns Daily Activity admin CRUD, user-facing overview/progress reads, claim flow, and tests for the backoffice contract.
- `docs`
  - Holds operator-facing smoke-test steps and rollout checklist for backoffice verification.

### Affected Files
- `Games-Labs-Missions/README.md`
  - Add a repeatable backoffice smoke-test runbook for create/update/deactivate/verify against Mobile-facing APIs.
- `Games-Labs-Missions/internal/handlers/admin_handler.go`
  - Adjust admin Daily Activity HTTP behavior if smoke-test coverage exposes a contract gap.
- `Games-Labs-Missions/internal/handlers/admin_handler_test.go`
  - Add HTTP coverage for Daily Activity create/list/detail/update/activate/deactivate behavior and immutable-field rejection.
- `Games-Labs-Missions/internal/handlers/mission_handler.go`
  - Adjust user-facing Daily Activity exposure if tests show mismatch in Mobile responses.
- `Games-Labs-Missions/internal/handlers/mission_handler_test.go`
  - Verify inactive Daily Activity rows disappear from quest/overview and missions/progress responses.
- `Games-Labs-Missions/internal/repositories/mission_repo.go`
  - Adjust repository queries if tests expose missing filtering or persistence behavior.
- `Games-Labs-Missions/internal/repositories/mission_repo_test.go`
  - Add persistence and filtering tests for admin-created Daily Activities and user-facing active-row reads.
- `Games-Labs-Missions/internal/services/mission_service.go`
  - Adjust validation/state transitions if immutable condition or deactivate semantics need tightening.
- `Games-Labs-Missions/internal/services/mission_service_test.go`
  - Add service-level tests for immutable condition fields, editable fields, and deactivate/read-path behavior.

### Explicitly Out Of Scope
- Do not add new condition types.
- Do not change Mobile endpoint paths.
- Do not implement weekly/monthly behavior.
- Do not change Game round settlement wiring.

## Description
Prove that Daily Activity v1 works as a production-style backoffice workflow without depending on SQL seed rows.

Validate the existing Missions contract end to end from the operator side: create an activity, update only allowed fields, inspect list/detail responses, deactivate it, and confirm the activity disappears from Mobile-facing `quest/overview` and `missions/progress` responses. The task should also protect immutable condition/scope fields and document a concrete smoke-test sequence for ops/backoffice use.

## Acceptance Criteria
- [ ] Admin create persists the full Daily Activity payload that ops needs, including display data, reward data, condition type, threshold, and any required scope fields.
- [ ] Admin update accepts editable fields and rejects attempts to change immutable condition/scope fields.
- [ ] Admin deactivate prevents the activity from appearing in `GET /api/v1/quest/overview` and `GET /api/v1/missions/progress`.
- [ ] User-facing overview/progress reads reflect activities created through the admin path rather than requiring SQL seed rows.
- [ ] README documents a step-by-step smoke test with exact endpoints, expected status codes, and the create -> verify -> deactivate -> re-verify flow.
- [ ] Focused tests cover the Daily Activity admin and user-facing contract in `Games-Labs-Missions`.

## Plan
### Approach
Keep the work sequential inside `Games-Labs-Missions`. First prove the backoffice contract with focused repository, service, and handler tests, then update the README with a repeatable smoke-test runbook. If tests expose a real contract gap, fix it in the existing Daily Activity service/repository/handler paths and keep admin and Mobile-facing behaviors aligned.

### Subtasks
1. Add or tighten tests across repository, service, and handler layers to prove create/update/detail/list/deactivate behavior, immutable condition protection, and user-facing filtering.
2. Add a concise backoffice smoke-test section to the Missions README with exact operator steps and expected outcomes.
3. Run focused tests and `go test ./...` in `Games-Labs-Missions`.

### Risks
- **Admin list/detail semantics may document richer fields than the code path exposes consistently.**
  - **Mitigation:** Pin real behavior with tests first, then align implementation or docs.
- **Inactive admin rows must remain auditable for backoffice while disappearing from Mobile reads.**
  - **Mitigation:** Preserve admin visibility and filter inactive rows only in user-facing read paths.
- **This touches files previously edited in TASK-049/TASK-050.**
  - **Mitigation:** Read current files before editing and keep changes additive/scoped.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Single-service but multi-layer Daily Activity contract verification across repository, service, handler, tests, and docs.

## Next Action
Run `dev-2`; TASK-050 is complete and no longer blocks this task.
