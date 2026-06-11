# TASK-050: Verify Turnover/Spend Daily Missions End-to-End

## Type
investigation

## Priority
high

## Parent / Epic
- Parent: `TASK-049`
- Epic: Mobile Missions integration

## Scope
### Target Services
- `Games-Labs-Missions`
  - Verify Daily Activity consumer, progress read model, and claim flow.
- `Games-Labs-Order`
  - Verify `turnover.settled` and `spend.settled` player activity events are published with fields Missions expects.
- `docs`
  - Add or refine staging QA checklist for Mobile.

### Explicitly Out Of Scope
- Do not wire Game round settlement.
- Do not add new condition types.
- Do not change Mobile endpoint paths.

## Description
Prove Phase 1 Daily Activities work end-to-end in staging/dev for turnover and THB spend missions: configured activity -> backend event -> `daily_activity_progress` -> `quest/overview` status -> `claim-daily` -> claimed state.

## Acceptance Criteria
- [ ] Order event producers for `TURNOVER_AMOUNT` and `SPEND_AMOUNT` are verified against `player.activity.v1`.
- [ ] Missions consumer updates `daily_activity_progress` for seeded/admin-configured turnover/spend activities.
- [ ] `GET /api/v1/quest/overview` shows status progression through `not_started`, `in_progress`, `claimable`, and `claimed`.
- [ ] `POST /api/v1/missions/claim-daily` succeeds only when claimable.
- [ ] Staging QA checklist documents repeatable steps.
- [ ] Focused tests or scripts are added where practical.

## Plan
### Approach
Trace existing Order event publishing and Missions consumer behavior, then add focused verification coverage and documentation rather than changing the core Phase 1 contract.

### Subtasks
1. Inspect Order player activity publish paths for turnover/spend.
2. Verify Missions consumer mapping and progress persistence for those event types.
3. Add focused integration-style tests or QA scripts where the codebase supports them.
4. Update README QA checklist with exact staging steps.

### Risks
- **Environment-specific RabbitMQ wiring may be hard to test locally.**
  - **Mitigation:** Use unit/integration tests for code paths and document staging checks explicitly.

## Assignment
- Primary: `dev-2`
- Parallel: `false`
- Reason: Cross-service verification between Order and Missions.

## Next Action
Run PM to refine implementation scope, then hand to `dev-2`.
