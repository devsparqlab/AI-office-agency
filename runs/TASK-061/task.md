# TASK-061: Missions Scoped Turnover Consumer

## Short name
`missions-scoped-turnover`

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-058`
- Alias: `TASK-058B`
- Epic: Mobile Missions integration

## Dependency
- **Prerequisite:** `TASK-060` is complete (game-scoped `turnover.settled` / `turnover.reversed` producers, tests, verification). Consumer work assumes events carry `settled_amount`, `game_id`, and `game_type` per that task.

## Scope
### Target services
- **`Games-Labs-Missions`** — Daily Activity consumer (`HandlePlayerActivityEvent` → `mapPlayerActivityEventToDailyProgress`), admin validation (`validateDailyActivityConfig`), repository condition-type constants and derived-field defaults, tests, and README/QA notes.

### Key files (verified 2026-05-20)
- `Games-Labs-Missions/internal/repositories/mission_repo.go` — `DailyActivityConditionType`, `DailyActivityRule`, `populateDailyActivityDerivedFields` (threshold unit defaults for new types).
- `Games-Labs-Missions/internal/services/mission_service.go` — `validateDailyActivityConfig`, `mapPlayerActivityEventToDailyProgress`; existing `turnover.settled` / `turnover.reversed` envelope validation (`validateSupportedPlayerActivityEvent`, `ApplyDailyActivityReverse`).
- `Games-Labs-Missions/internal/services/daily_activity_consumer_test.go` — consumer/mapper table tests.
- `Games-Labs-Missions/internal/services/mission_service_test.go` — `validateDailyActivityConfig` cases (mirror `ROUND_COUNT_*` dual-scope tests).
- `Games-Labs-Missions/internal/handlers/mission_handler_test.go` — optional HTTP 400 coverage for invalid admin payloads.
- `Games-Labs-Missions/README.md` — producer → consumer → overview → claim flow for QA.

### Contract reference (consume only)
- `shared-lib/events/player_activity.go` — `PlayerActivityEvent` with `event_type`, `settled_amount`, `game_id`, `game_type`, `reverse_of_event_id` (no Missions changes expected unless contract gaps are found — escalate rather than fork).

## Description
Add Daily Activity support for **game-scoped turnover** missions so that `player.activity.v1` events emitted after `TASK-060` can advance progress only when scope metadata matches the configured rule.

Implement two new condition types:
- **`TURNOVER_GAME`** — progress only on `turnover.settled` when `settled_amount > 0` and event `game_id` matches the rule’s `game_id` (exact identity match consistent with `ROUND_COUNT_GAME`).
- **`TURNOVER_GAME_TYPE`** — same, but match normalized `game_type` only (consistent with `ROUND_COUNT_GAME_TYPE`).

**Fail closed:** if the event is missing the field required by the rule (e.g. empty `game_id` for `TURNOVER_GAME`), that rule must not produce a delta. Do not infer `game_type` from `game_id` inside Missions.

**Reversals:** `turnover.reversed` must reduce progress via existing `ApplyDailyActivityReverse` / event-application mechanics (same pattern as unscoped turnover today).

**Admin / backoffice:** enforce **one scope mode** per activity:
- `TURNOVER_GAME` requires `game_id`, rejects non-empty `game_type`.
- `TURNOVER_GAME_TYPE` requires `game_type`, rejects non-empty `game_id`.

Producer/domain precedence when both identifiers appear on an event is out of scope here (TASK-060); Missions only compares the field required by the condition type.

## Product / technical rules
- Support both `TURNOVER_GAME` and `TURNOVER_GAME_TYPE`.
- Mapper gates: `event_type == turnover.settled`, `settled_amount > 0`, and scope match.
- No “any game” aggregate turnover mission type in this task.
- Do not change Games-Labs-Game / Order producers in this task.

## Acceptance criteria
- [ ] `DailyActivityConditionType` (or equivalent) defines `TURNOVER_GAME` and `TURNOVER_GAME_TYPE` string constants aligned with admin/API payloads.
- [ ] `validateDailyActivityConfig` requires the correct scope field, rejects dual-scope (forbidden field non-empty), and sets threshold unit to `amount` where appropriate.
- [ ] `mapPlayerActivityEventToDailyProgress` applies scoped turnover only when event type and amount gates pass and the required scope matches; missing required scope yields no delta for that rule.
- [ ] `turnover.reversed` decreases progress for applicable rules using existing reverse application logic.
- [ ] Automated tests cover: matching `game_id`, non-matching `game_id`, matching `game_type`, non-matching `game_type`, missing metadata (no progress), dual-scope admin validation errors, and reversal behavior.
- [ ] `Games-Labs-Missions/README.md` (or `docs/` if preferred) documents producer → Rabbit consumer → daily progress → overview → claim, including scoped turnover specifics and TASK-060 dependency.

## Explicitly out of scope
- Producer wiring or persistence for turnover (`TASK-060`).
- `shared-lib` contract changes unless a hard blocker is discovered (then escalate).
- Inferring or resolving `game_type` from `game_id` in Missions.

## Technical plan (implementation order)
1. **Repository layer** — Add condition type constants; extend `populateDailyActivityDerivedFields` so new types default `threshold_unit` to `amount` (same family as `TURNOVER_AMOUNT`).
2. **Validation** — Extend `validateDailyActivityConfig` with mutual-exclusion rules for `game_id` / `game_type`, mirroring the strictness used for round-count types.
3. **Mapper** — Add `mapPlayerActivityEventToDailyProgress` branches for scoped turnover; reuse string comparison conventions from round-count branches (`game_id` equality, `game_type` case-insensitive).
4. **Tests + docs** — Extend `daily_activity_consumer_test.go` and `mission_service_test.go` (and handler tests if useful); update README for QA flow.

## Risks
- **Ambiguous game_type normalization:** if producers send mixed casing, ensure mapper matches admin normalization (`ToUpper` on rule side vs event side) consistently with `ROUND_COUNT_GAME_TYPE`.
- **Order-sourced `turnover.settled`:** exchange-order events without game scope must not advance `TURNOVER_GAME` / `TURNOVER_GAME_TYPE` rules (fail closed by missing match).
- **Double counting:** unscoped `TURNOVER_AMOUNT` and scoped rules are independent; product should not configure overlapping missions without understanding both advance on the same events where both match.

## Assignment
- Primary: `dev-2`
- Parallel: `false`

## Next action
`dev-2`: implement ordered subtasks in `runs/TASK-061/pm-output.yaml` after confirming `TASK-060` verification evidence in `runs/TASK-060/`.
