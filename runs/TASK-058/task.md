# TASK-058: Turnover Scoped By Game

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-049`
- Epic: Mobile Missions integration

## Scope
### Target Services
- `Games-Labs-Missions`
  - Add turnover-by-game or turnover-by-game-type conditions if events provide reliable metadata.
- `Games-Labs-Order`
  - Verify turnover events carry `game_id`/`game_type` where needed.

## Description
Support missions like “collect turnover on game X” or “collect SLOT turnover” by adding scoped turnover condition types after verifying event metadata quality.

## Split Plan (completed)

This parent task is the umbrella for scoped turnover missions. Implementation was delivered via child tasks:

- **`TASK-060`** (`TASK-058A`): Producer readiness — Game-scoped `turnover.settled` / `turnover.reversed` with `settled_amount`, `game_id`, and `game_type`. **Done** (`runs/TASK-060/reviewer-output.yaml`).
- **`TASK-061`** (`TASK-058B`): Missions consumer — `TURNOVER_GAME` and `TURNOVER_GAME_TYPE` mapping, admin validation, tests, and docs. **Done** (`runs/TASK-061/reviewer-output.yaml`).

`TASK-061` started only after `TASK-060` reached `done`.

## Product / technical decisions

1. **Scope types required**
   - Support both `TURNOVER_GAME` and `TURNOVER_GAME_TYPE`.
   - `TURNOVER_GAME` requires `game_id`.
   - `TURNOVER_GAME_TYPE` requires `game_type`.

2. **Producer readiness (baseline at split vs delivered)**
   - **At split (2026-05-20):** exchange-order `turnover.settled` had no game scope; `round.settled` had scope but no `settled_amount`.
   - **Delivered via TASK-060:** Game publishes game-scoped `turnover.settled` / `turnover.reversed` from `SettleRound` when `settled_amount > 0`, with canonical `game_id` / `game_type` from persisted round lifecycle.
   - **Order rail:** exchange `turnover.settled` remains unscoped by design; it must not advance scoped turnover rules (fail closed).

3. **Missing scope behavior**
   - Fail closed: if an event lacks the metadata required by the condition type, it must not progress that scoped mission.
   - Do not infer scope or treat missing fields as “any game”.

4. **Conflict behavior**
   - `game_id` wins at producer/domain level when game metadata conflicts.
   - Missions consumer does not reconcile conflicts; it only matches the field required by the condition type.

5. **Backoffice validation**
   - One scoped turnover mission may have only one scope mode.
   - `TURNOVER_GAME` requires `game_id` and must not set `game_type`.
   - `TURNOVER_GAME_TYPE` requires `game_type` and must not set `game_id`.

## Acceptance Criteria
- [x] Turnover event metadata reliability is verified (TASK-060 producer contract + tests).
- [x] A producer plan exists for game-scoped turnover events that include both `settled_amount` and the required scope field (`game_id` or `game_type`) — see `TASK-060`.
- [x] New condition types are defined: `TURNOVER_GAME` and `TURNOVER_GAME_TYPE` — see `TASK-061`.
- [x] Mapper applies turnover only when scope matches — see `TASK-061`.
- [x] Events missing required scope fail closed and do not progress scoped turnover missions.
- [x] Backoffice/admin validation enforces required scope fields.
- [x] Backoffice/admin validation rejects missions that set both `game_id` and `game_type`.
- [x] Tests cover scoped and non-matching events.

## Staging / production follow-up (outside this umbrella close)

- Apply Games-Labs-Game migration `019_round_lifecycle_settled_amount.sql` in target environments.
- Confirm production `SettleRound` ingress maps provider `valid_turnover` into `RoundLifecycle.SettledAmount` (see Games-Labs-Game README).

## Assignment
- Primary: `dev-2`
- Parallel: `false`

## Next Action
**Closed.** Scoped turnover delivered via `TASK-060` (producer) and `TASK-061` (Missions consumer). Use staging follow-up above before production E2E validation.
