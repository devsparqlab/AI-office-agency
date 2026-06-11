# TASK-057: Spend Diamonds Mission (SPEND_DIAMOND_AMOUNT)

## Metadata

| Field | Value |
| --- | --- |
| Type | feature |
| Priority | medium |
| Parent | TASK-049 |
| Epic | Mobile Missions integration |
| Primary agent | dev-2 |
| Parallel | false |

## Summary

Introduce a **new daily-activity condition type** (working name: `SPEND_DIAMOND_AMOUNT`) so “Spend N Diamonds” missions are tracked separately from **`SPEND_AMOUNT`**, which remains **THB cash spend** only. Progress must be driven by **authoritative wallet/economy events** on `player.activity.v1`, using **settled net** Diamond amounts, with **reverse/refund** reducing progress for the same Bangkok-day mission window. Product and economy rules are **confirmed** (see below).

## Current system (verified in repo)

- **Canonical event**: `shared-lib/events/player_activity.go` defines `PlayerActivityEvent` and event types `spend.settled` / `spend.reversed` with `SettledAmount` (float64).
- **THB mapping**: `Games-Labs-Missions` `mapPlayerActivityEventToDailyProgress` applies `spend.settled` only to rules with condition `SPEND_AMOUNT` and `spend_currency` THB (or empty defaulting to THB in upsert validation). `Games-Labs-Order` publishes THB spend via `ordersvc/player_activity.go` without a wallet source.
- **Diamond guard**: `mission_service.go` rejects admin configs that look like Diamond spend under `SPEND_AMOUNT` (name/description keyword check + currency must be THB).
- **Wallet**: `Games-Labs-Wallet` **does not** publish `PlayerActivity` events today; RabbitMQ is used for consumers (`infrastructure/rabbitmq.go`). Diamond debits occur in wallet core (publish points must be added).
- **`PlayerActivitySourceService`**: today only `games-labs-order` and `games-labs-game`; **wallet must be added** for Diamond spend provenance.

## Contract direction (implementation strategy)

1. **Extend** `PlayerActivityEvent` in **shared-lib** with an optional field, e.g. **`SpendCurrency`** JSON `spend_currency`, applicable to **`spend.settled` / `spend.reversed` only**.
   - **Backward compatibility**: omit or empty ⇒ treat as **THB** for mission mapping (matches today’s Order-published events).
   - **Diamond**: producers set **`DIAMOND`** (align with `models.CurrencyDiamond` in Missions = `"DIAMOND"`).
   - **Future variants**: same field can later distinguish other spend rails, but mission **condition type** still separates THB vs Diamond vs Coin/Points-style missions. Do not treat all spend currencies as one generic pool.

2. **Spend classification is required for future-safe counting**. Use a consistent `source_reference_type` value (or add an explicit `SpendCategory` / `spend_category` field if the implementation finds `source_reference_type` too overloaded) to classify the business action behind the debit.
   - Diamond mission scope may include all **settled net DIAMOND consumption debits** for items/props, passes, avatars, revive, and entry fees.
   - **Exclude Diamond-to-Coin exchange by default** because it is a conversion, not consumption, unless product explicitly opts it into Spend Diamonds later.
   - **Coin spend must not be mixed with turnover/bet progress by default**. If `SPEND_COIN_AMOUNT` is added later, it must be settled ledger debit only and filtered by category/source reference so bets, shop purchases, entry fees, adjustments, and refunds cannot be accidentally blended.
   - Points/redemption flows are not generic spend; model them as a separate future condition if needed.

3. **Add** `PlayerActivitySourceService` value for **wallet** (e.g. `games-labs-wallet`).

4. **Games-Labs-Wallet**: After **settled** Diamond debits (purchases, passes, avatars, revive, entry fees, etc.), publish **`spend.settled`** with **`spend_currency=DIAMOND`**, positive **`settled_amount`** = net settled Diamond amount, **`occurred_at`** = settlement time for Bangkok partitioning, idempotent **`event_id`**, and **`source_reference_id` / `type`** pointing to ledger/transaction references. On reversal/refund, publish **`spend.reversed`** with **`reverse_of_event_id`** matching the forward event, same amount semantics as Order (positive amount, missions subtracts via existing reverse pipeline).

5. **Games-Labs-Missions**:
   - Add condition type constant **`SPEND_DIAMOND_AMOUNT`** (string value must match admin API and DB).
   - **Validation**: `SPEND_AMOUNT` ⇒ `spend_currency` **THB** only (unchanged intent). **`SPEND_DIAMOND_AMOUNT`** ⇒ fixed Diamond semantics (document whether `spend_currency` column must be `DIAMOND` or is ignored with implied Diamond—pick one and enforce consistently in `UpsertDailyActivity` + handler).
   - **Mapper**: For `SPEND_DIAMOND_AMOUNT`, apply progress only when `event_type` is spend forward/reverse **and** `spend_currency` is **DIAMOND** (and mirror reverse handling already used for THB spend reversals—repository applies deltas by event applications, so pairing forward/reverse remains consistent).
   - **Tests**: Extend `daily_activity_consumer_test.go` and repo tests for Diamond rules; keep THB tests valid without new fields on old events.

6. **Games-Labs-Order** (small follow-up): Optionally set **`spend_currency=THB`** explicitly on publish for clarity and docs; behavior should remain identical when Missions defaults omitted field to THB.

7. **Documentation**: Update `Games-Labs-Missions/README.md` (Daily Activities table: condition types vs event types, THB vs Diamond). Any **mobile-facing** copy/labels live in README or product-owned docs—state that admin/mobile must avoid “spend” without currency where both exist.

## Product / economy rules (confirmed)

1. Diamond spend includes: items/props, passes, avatars, **revive**, **entry fees** (definitions per original task).
2. **Authoritative** source: **wallet/economy**, not client/UI alone.
3. **Amount**: **settled net** Diamond spend (not holds); **gross / net / settled** terms per product definitions.
4. **Reversals**: subtract progress in the applicable mission window (same Bangkok-day bucketing as existing spend).
5. **New condition type** distinct from **`SPEND_AMOUNT`**; design should allow future spend variants (field + validation matrix, not one hardcoded hack).
6. Diamond spend can be broad, but only for **settled net DIAMOND consumption debits**. Diamond-to-Coin exchange is **not counted by default**. Future Coin or Points missions must be separate conditions and **settled only**, with category/source-reference filtering to avoid mixing with turnover, bets, conversions, or adjustments.

## Acceptance criteria

- [ ] **Contract**: `PlayerActivityEvent` carries optional `spend_currency` for spend events; documented default THB when omitted. Wallet source constant available. Spend events have a consistent category/source-reference strategy so Diamond, Coin, Points, exchange, turnover, and adjustment-like flows do not blend accidentally.
- [ ] **Wallet**: Settled Diamond debit flows emit `spend.settled` with `spend_currency=DIAMOND` and net settled amount; matching `spend.reversed` for refunds with correct `reverse_of_event_id` and idempotency.
- [ ] **Missions**: New `SPEND_DIAMOND_AMOUNT` condition progresses only from Diamond spend events; `SPEND_AMOUNT` remains THB-only; admin validation prevents mixing types or ambiguous currency.
- [ ] **Scope guard**: Diamond-to-Coin exchange is ignored unless explicitly configured later; Coin spend and Points redemption are not implemented as generic spend in this task.
- [ ] **Reverse**: Refund/reversal reduces Diamond spend progress where the forward event had been applied (same mechanics as existing spend reverse idempotency).
- [ ] **Tests**: Unit/integration coverage for THB (unchanged), Diamond forward, Diamond reverse, and invalid/ignored combinations (e.g. Diamond event vs THB-only rule).
- [ ] **Docs**: README / operator notes distinguish THB vs Diamond spend missions; no ambiguous labels in documented JSON examples.

## Ordered subtasks (all dev-2, sequential)

| Order | ID | Description | Owned areas |
| --- | --- | --- | --- |
| 1 | `057-player-activity-contract` | Extend `shared-lib/events/player_activity.go`; bump **shared-lib** module tag consumed by Wallet, Missions, Order, Game as per repo policy. | shared-lib |
| 2 | `057-wallet-player-activity-producer` | Add RabbitMQ **publisher** (mirror Order pattern), config/env, wire `PublishPlayerActivity` after **settled** Diamond movements; cover **all** debit categories in scope or explicitly document gaps. | Games-Labs-Wallet |
| 3 | `057-missions-spend-diamond-condition` | New condition type, validation, mapper + reverse compatibility, tests, README. Bump Missions `go.mod` shared-lib. | Games-Labs-Missions |
| 4 | `057-order-explicit-thb-spend-currency` | (Optional but recommended) Order `player_activity.go` sets `spend_currency=THB` on spend events; tests updated. | Games-Labs-Order |

**Parallel**: `false` — shared contract and producer/consumer rollout are ordered; `go.mod` / shared-lib bumps are not split across parallel agents.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Missed wallet code path → under-counted missions | Audit all Diamond **debit** / reversal entry points; acceptance checklist per flow (item, pass, avatar, revive, entry fee). |
| Double count or wrong day bucket | Reuse `OccurredAt` Bangkok partitioning; reuse idempotent `event_id` insertion patterns from Missions consumer. |
| Breaking JSON consumers | Optional field with THB default; coordinate shared-lib version bump across services. |
| Float vs integer Diamond amounts | Align with wallet ledger representation and Missions `progress_value` type (float64 today); document rounding. |

## Definition of done

- `make test` / `go test ./...` (or project standard) passes for touched modules.
- Lint where applicable.
- No local `replace` for shared-lib in committed `go.mod`.
- README and acceptance criteria above satisfied.
