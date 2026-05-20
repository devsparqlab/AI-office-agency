# TASK-060: Game-Scoped Turnover Producer Readiness

## Type
feature

## Priority
medium

## Parent / Epic
- Parent: `TASK-058`
- Alias: `TASK-058A`
- Epic: Mobile Missions integration

## Short name
game-turnover-producer

## Scope
### Target Services
- `Games-Labs-Game`
  - Identify settlement ingress and implement or extend the authoritative path so idempotent inserts can emit game-scoped `turnover.settled` with both `settled_amount` and `game_id` / `game_type` (see existing `SettleRound` + `publishRoundSettled` gate).
- `Games-Labs-Provider`
  - Inspect provider callbacks and payload models (`valid_turnover` and related fields); likely source for authoritative stake/turnover at settlement time.
- `Games-Labs-Order`
  - Today publishes exchange-order `turnover.settled` without game scope (`ordersvc/player_activity.go`); verify no unintended overlap with new semantics.
- `Games-Labs-Wallet`
  - Inspect only if product decides ledger is the authoritative turnover counter instead of provider or lifecycle payloads.
- `shared-lib`
  - Prefer existing `events.PlayerActivityEvent`; additive fields require strong justification (`shared-lib/events/player_activity.go`).

### Key files (discovery snapshot 2026-05-20)
- `Games-Labs-Game/internal/core/services/gamesvc/service.go` — `SettleRound` / `ReverseRound`
- `Games-Labs-Game/internal/core/services/gamesvc/player_activity.go` — `round.*` emission
- `Games-Labs-Game/internal/models/game.go` — `RoundLifecycle` lacks turnover amount column today
- `Games-Labs-Game/migrations/007_round_lifecycles_table.sql` — persistence shape for settlements
- `Games-Labs-Order/internal/core/services/ordersvc/player_activity.go` — existing `turnover.*` producers
- `shared-lib/events/player_activity.go` — JSON contract carrying `SettledAmount`, `GameID`, `GameType`

### Out of Scope
- Missions `TURNOVER_GAME` / `TURNOVER_GAME_TYPE` mapper logic (`TASK-061`).
- Admin/backoffice validation for mission conditions.
- Reinterpreting `round.settled` as turnover unless the forward contract also emits `settled_amount` via `turnover.settled`.

## Description
Prepare the producer side for scoped turnover missions by defining and wiring a reliable `player.activity.v1` `turnover.settled` event that carries both canonical game scope metadata (`game_id`, `game_type`) and a positive authoritative `settled_amount`, aligning with TASK-058’s producer semantics (“`game_id` wins”).

Current state:
- Existing `turnover.settled` is exchange-order–based (`diamond -> coin` via Games-Labs-Order) and not game-scoped.
- Existing `round.settled` from Game exposes `game_id` and `game_type` (`round_count=1`), but deliberately omits turnover amounts (`RoundActivityInput`/`PlayerActivityEvent` builders only set counts for round events).

Therefore TASK-058 / TASK-061 remain blocked until this phase proves trustworthy scoped turnover producers plus tests/documentation.

## Decisions To Lock Before Implementation
1. Single source of truth for turnover amount entering the settlement pipeline (provider payloads vs persisted lifecycle vs ledger).
2. Exact numeric field mapped into `PlayerActivityEvent.SettledAmount` plus currency/unit assumptions captured in README.
3. Whether reversals emit `turnover.reversed` with `reverse_of_event_id` tying back to scoped `turnover.settled` IDs (recommended parity with Daily Activity reversal patterns elsewhere).
4. Deterministic idempotent `event_id` naming and duplicate settlement behavior (reuse insert gate from TASK-052 where possible).
5. Producer precedence when metadata conflicts (`game_id` wins at producer/domain boundary).

## Technical Plan (high level)
1. **Trace ingress** — Map Provider → Game invocation path for round settlement currently absent from surfaced code search; enumerate production transports (HTTP adapters, Rabbit consumers, cron replays).
2. **Model + persistence** — If replay protection or auditing requires persisted turnover totals, migrate `round_lifecycles`, extend `RoundLifecycle`, and hydrate repository accessors before publishing.
3. **Emit turnover** — Mirror `publishRoundSettled` with a deterministic `turnover.*` publisher invoked only once per newly inserted lifecycle; omit publish when identifiers or amount prerequisites fail validation.
4. **Reversal** — Mirror `ReverseRound` / `publishRoundReversed`, optionally gated on whether turnover forward events exist.
5. **Verify** — Automated tests validating positive payloads, duplicate suppression, and omission paths; README handoff blocks for TASK-061 QA.

### Implementation Subtasks (sequential — `dev-2`)
| Order | ID | Goal |
| --- | --- | --- |
| 1 | `trace-sot-turnover-source` | Document authoritative turnover input + ingress map in `Games-Labs-Game/README.md`; annotate provider models as needed (`afb.ValidTurnover` etc.). |
| 2 | `schema-and-models-turnover-sot` | Add Goose migration + repository mapping + structs when persistence is mandated. |
| 3 | `emit-turnover-settled-reverse` | Implement `games-labs-game` turnover producers bound to lifecycle idempotency. |
| 4 | `tests-and-cross-readme` | Expand publisher tests + synchronize `shared-lib/README.md` producer table if semantics shift. |

## Risks / Mitigations
- **Invisible caller wiring**: `rg SettleRound` currently hits Game service internals/tests only; validate staging traces or ancillary binaries before trusting local tree completeness. Mitigate via first subtask + DevOps corroboration.
- **Contradictory turnover definitions**: Exchange-order turnover versus gameplay turnover may represent different notions of `settled_amount`; document divergence and avoid double counting.
- **Double publish regressions**: Any secondary publisher must obey the existing `UpsertRoundSettlement(... inserted bool)` semantics or equivalent transaction boundary.

## Acceptance Criteria
- [ ] Producer emits `player.activity.v1` `turnover.settled` with positive `settled_amount`, canonical `game_id`, `game_type`, `source_reference_id`, `source_reference_type`, deterministic `event_id`, and timestamps consistent with Daily Activities partitioning.
- [ ] Duplicate settlements do not double-publish or reopen idempotently applied progress.
- [ ] Reversal design documented; if implemented, emits `turnover.reversed` with `reverse_of_event_id` anchored to originating turnover events.
- [ ] Automated tests demonstrate complete metadata emission and omission when turnover or identifiers are unavailable.
- [ ] README / QA notes (Game + optionally shared-lib) document producer contract hooks for TASK-061.

## Assignment
- Primary: `dev-2`
- Parallel: `false`

## Next Action
Proceed with `trace-sot-turnover-source`; unblock TASK-061 after producer contract + guard tests land.
