# TASK-069: Multi-Provider Gameplay Turnover Settlement (Post-AFB)

## Short name
`provider-turnover-settle`

## Type
feature

## Priority
high

## Parent / Epic
- Parent: `TASK-060` (Game-scoped turnover producer readiness; AFB reference path validated)
- Epic: Mobile Missions integration (`TASK-049` / `TASK-052`)

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Provider` | Wire `Game SettleRound` gRPC after wallet-success settlement callbacks for non-AFB providers; per-provider turnover/stake mapping. |
| `Games-Labs-Game` | Require `RABBITMQ_URL` at startup so `turnover.settled` / `round.settled` publish to Missions; `SettleRound` producer already implemented (inspect-only for contract gaps). |

### Out of scope
- `Games-Labs-Missions` consumer/mapper changes (`TASK-061` territory). **Do not** map `spend.settled` (Order rail) onto `TURNOVER_AMOUNT` / Quest Collect turnover — turnover dailies advance **only** from `turnover.settled` with `source_service=games-labs-game`.
- `shared-lib` proto/event contract changes unless dev-2 finds a blocking gap (not expected).
- Sigma real wallet implementation (separate work); this task wires settlement **after existing wallet ops succeed** where wallet is already live.
- Reversal / `turnover.reversed` wiring for non-AFB providers (document as follow-up unless trivial at settlement hook).

---

## Background

AFB is the only provider currently calling Game `SettleRound` after wallet settlement:

```477:492:Games-Labs-Provider/internal/core/services/providers/afb.go
func (s *service) settleGameplayRound(ctx context.Context, req afbmodels.PayoutRequest) {
	if s.gameClient == nil {
		return
	}
	turnover := afbPayoutTurnover(req)
	if err := s.gameClient.SettleRound(ctx, gameadt.SettleRoundInput{ ... }); err != nil {
		log.Printf("[afb:payout] game SettleRound ... err=%v", err)
	}
}
```

Downstream flow (already implemented in `Games-Labs-Game`):

`Provider settlement → Game SettleRound → round_lifecycles insert → player.activity round.settled / turnover.settled → Missions`

`gameClient` is constructed in `cmd/main.go` but injected **only** into the AFB service today. Non-AFB seamless handlers perform wallet debit/credit but never call Game.

---

## Provider settlement matrix (PM discovery — dev-2 must verify against provider specs)

| Provider | Authoritative settlement hook | Round ID | Game ID field | Turnover / stake mapping (proposed) | Notes |
| --- | --- | --- | --- | --- | --- |
| **AFB** ✅ | `Payout` after all wallet txs | `round_id` | `game_id` | `valid_turnover` → tx `valid_turnover` → max debit magnitude | Reference implementation + `afb_turnover_test.go` |
| **1UP** | `OneUpBetResult` (`/bets/result`) after debit+win wallet ops succeed | `betID` | `gameID` | `req.Bet` converted to major units (`utils.MinorToMajor`); redis `oneup:bet:amount:{betID}` is fallback if bet deferred | Combined bet+win callback; do **not** settle on refund |
| **VP** | `betnsettle` / `retryBet` after net wallet delta succeeds | `roundId` | `gameCode` | `validBetAmt` if `> 0`, else `actualBetAmt` | Single combined settlement; skip `balance` / `rollback` actions |
| **IDG** | `IDGWin` after wallet credit path succeeds (including `amount=0` loss) | `wagerId` | `gameId` | Stake from `IDGBet.Amount` — **persist at bet time** keyed by `wagerId` (redis TTL, mirror 1UP pattern); skip on `IDGCancel` | Split bet/win API; `roundClosed` on win payload should be recorded in mapper notes |
| **GGSoft** | `SeamlessChangeBalance` **type 4** when `end_round=true` after wallet op | `order_id` | `game_id` | `req.Bet` (explicit bet field); do **not** settle type 1 bet-only or type 2 cancel | Type 3 award is mid-round credit, not round end |
| **Sigma** | `DebitAndCredit` when `tx.isEndRound=true`, or `ArcadeSettle`, or `Credit`+`isEndRound` (dev-2 confirms spec) | `roundId` | `gameCode` | `tx.Debit` as stake (confirm minor/major units vs wallet) | **Risk:** `sigma.go` wallet ops are currently stubbed (`balance: 0`); wire settlement only where real wallet path exists or document deferral |

### Non-negotiable behavior (all providers)
- Call `SettleRound` **only after** wallet operation(s) for that settlement succeed.
- `SettleRound` failure: **log structured error; do not rollback wallet/player funds** (match AFB).
- Pass `provider_code` matching `utils.providerCode` keys (`1up`, `vp`, `idg`, `sigma`, `ggsoft`) so Game resolves canonical UUID.
- Pass **positive** `SettledAmount` on every gameplay settlement path where stake/turnover is known (mapper must not rely on Order `spend.settled`).
- `Games-Labs-Game` must have `RABBITMQ_URL` configured in runtime (fail fast if missing) so `turnover.settled` reaches Missions.
- Idempotency: rely on Game `UpsertRoundSettlement` insert gate; duplicate callbacks must not double-publish.

---

## Technical plan

### Phase 1 — Shared settlement scaffold (sequential)
1. Extract a reusable fire-and-forget helper (e.g. `gameadt.TrySettleRound` or `settlement.NotifyRoundSettled`) encapsulating:
   - nil-safe `gameClient` check
   - input validation (`round_id`, `user_id`, `game_id`)
   - error logging with provider prefix
   - no error propagation to wallet response path
2. Refactor AFB `settleGameplayRound` to use the helper (no behavior change).
3. Extend DI: inject optional `*gameadt.Adapter` into 1UP handler, VP handler, IDG handler, GGSoft service, Sigma service (constructors + `cmd/main.go`). Keep graceful no-op when `GAME_API_URL` unset.

### Phase 2 — Per-provider wiring (parallel-safe after Phase 1)
Implement provider-specific turnover mappers + hook calls at the matrix hook points above. Prefer colocated `*_turnover.go` + table tests (mirror `afb_turnover_test.go`).

### Phase 3 — Verification
- Unit tests per provider turnover mapper (positive, zero, fallback paths).
- Handler/service tests with mocked `gameClient` asserting: called once on success, not called on wallet failure, not called on refund/cancel paths.
- Update `Games-Labs-Provider` README section documenting settlement hook + turnover source per provider.
- Run `GOWORK=off go build -mod=readonly ./...` and `go test ./...` in `Games-Labs-Provider`.

---

## Subtasks

| Order | ID | Agent | Description | Owned files | Parallel safe |
| --- | --- | --- | --- | --- | --- |
| 1 | `settlement-scaffold-di` | dev-2 | Shared TrySettleRound helper; refactor AFB; constructor DI + `main.go` wiring for all providers | `Games-Labs-Provider/internal/adapters/gameadt/settle_round.go`, `Games-Labs-Provider/internal/core/services/providers/afb.go`, `Games-Labs-Provider/cmd/main.go`, handler/service constructors | false |
| 2 | `wire-1up-settle-round` | dev-2 | Hook `OneUpBetResult`; mapper from `bet` / redis fallback; tests | `Games-Labs-Provider/internal/handlers/providerhdl/oneup_callback.go`, `oneup_runtime.go`, `oneup_turnover_test.go` | true |
| 3 | `wire-vp-settle-round` | dev-2 | Hook `betnsettle`; mapper from `validBetAmt`/`actualBetAmt`; tests | `Games-Labs-Provider/internal/handlers/vphdl/vp_seamless.go`, `vp_turnover_test.go` | true |
| 4 | `wire-idg-settle-round` | dev-2 | Persist wager stake at `IDGBet`; hook `IDGWin`; skip cancel; tests | `Games-Labs-Provider/internal/handlers/idghdl/idg_callback.go`, `idg_turnover_test.go` | true |
| 5 | `wire-ggsoft-settle-round` | dev-2 | Hook type 4 + `end_round`; mapper from `bet`; tests | `Games-Labs-Provider/internal/core/services/providers/ggsoft.go`, `ggsoft_turnover_test.go` | true |
| 6 | `wire-sigma-settle-round` | dev-2 | Hook end-round paths; mapper from `debit`; document/defer if wallet stub blocks E2E | `Games-Labs-Provider/internal/core/services/providers/sigma.go`, `Games-Labs-Provider/internal/handlers/sigmahdl/sigma.go`, `sigma_turnover_test.go` | true |
| 7 | `provider-settlement-docs-verify` | dev-2 | README provider matrix; build/test evidence | `Games-Labs-Provider/README.md`, `ai-dev-office/runs/TASK-069/verification-evidence.md` | false |

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Provider specs differ on what constitutes “round end” (IDG split bet/win vs VP combined) | Use matrix above; split mappers per provider; do not force AFB `valid_turnover` semantics |
| Unit mismatch (1UP/Sigma int64 minor vs float major) | Document conversion at mapper; test with known amounts |
| IDG win without prior bet cache | Settle with `SettledAmount=0` or skip turnover; still emit round if product accepts; log warning |
| Sigma wallet stub | Wire settlement hook + tests with mock client; flag E2E staging blocked until Sigma wallet live |
| Duplicate settlement from provider retries | Rely on Game insert gate; log `inserted=false` at debug level only |
| `GAME_API_URL` unset in dev | No-op like AFB today; missions progress simply absent locally |

---

## Acceptance criteria

- [ ] AFB behavior unchanged (refactored to shared helper); existing `afb_turnover_test.go` still passes.
- [ ] **1UP, VP, IDG, GGSoft** call Game `SettleRound` after successful wallet settlement at the hook points defined in the provider matrix (or documented exception with PM approval).
- [ ] Each wired provider has table-driven tests for turnover mapping (primary field, fallback, zero/omit path).
- [ ] Wallet failure paths do **not** call `SettleRound`; refund/cancel paths do **not** call `SettleRound`.
- [ ] `SettleRound` errors are logged and do **not** alter wallet HTTP/gRPC success responses.
- [ ] `provider_code` passed on every call; provider string game id used as `game_id` input (Game resolves UUID).
- [ ] Sigma: either wired with tests at end-round hook, or explicit deferral documented in task evidence with hook point ready.
- [ ] `GOWORK=off go build -mod=readonly ./...` and `go test ./...` pass in `Games-Labs-Provider`.
- [ ] Provider README updated with settlement hook + turnover source table for QA/staging.

---

## Assignment
- Primary: `dev-2`
- Parallel: `true` (subtasks 2–6 after scaffold)

## Next action
`dev-2` begins with `settlement-scaffold-di`, then parallel provider lanes.

## Depends on
- `TASK-060` complete (Game turnover producer).
- AFB reference path validated in staging (user confirmation).
