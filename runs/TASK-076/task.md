# TASK-076: IDG Cancel ReverseRound Turnover Reversal

## Short name
`idg-cancel-reverse-round`

## Type
bugfix

## Priority
high

## Parent / Epic
- Parent: `TASK-069`
- Epic: Quest Daily Turnover / Provider Gameplay Settlement

## Background

`TASK-070` moved IDG gameplay turnover production to bet-time `SettleRound`, which fixed Daily turnover progression for real rounds. The remaining correctness gap is `IDGCancel`: wallet refund succeeds, but Provider only logs that Game `ReverseRound` is not wired, so canceled wagers can leave `round_lifecycles.reversed_at` unset and `turnover.settled` counted indefinitely.

`Games-Labs-Game` already implements internal `ReverseRound` service/repo logic and Missions already understands `turnover.reversed` / `round.reversed`. The missing link is the public contract and adapter path from Provider to Game. Because this changes a cross-service proto in `shared-lib`, the work must sequence contract publication/bump before downstream service rollout.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `shared-lib` | Add Game `ReverseRound` gRPC contract and regenerate shared client/server code. |
| `Games-Labs-Game` | Expose the existing reverse lifecycle logic through gRPC and verify reverse events are emitted once. |
| `Games-Labs-Provider` | Call Game `ReverseRound` from `IDGCancel` only after wallet refund succeeds. |
| `ai-dev-office` | Track verification evidence, rollout sequencing, and blocker notes. |

### Affected files

- `shared-lib/proto/gamepb/game.proto`
- `shared-lib/proto/gamepb/game.pb.go`
- `shared-lib/proto/gamepb/game_grpc.pb.go`
- `Games-Labs-Game/internal/core/handlers/gamehdl/settle_round.go`
- `Games-Labs-Game/internal/core/handlers/gamehdl/settle_round_test.go`
- `Games-Labs-Game/internal/core/services/gamesvc/service.go`
- `Games-Labs-Provider/internal/adapters/gameadt/adapter.go`
- `Games-Labs-Provider/internal/adapters/gameadt/settle_round.go`
- `Games-Labs-Provider/internal/core/services/idg/callback.go`
- `Games-Labs-Provider/internal/core/services/idg/callback_test.go`
- `Games-Labs-Provider/internal/handlers/idghdl/idg_callback.go`
- `Games-Labs-Provider/internal/handlers/idghdl/idg_callback_test.go`
- `Games-Labs-Provider/README.md`
- `ai-dev-office/runs/TASK-076/verification-evidence.md`

### Explicitly out of scope

- Do not change other providers' cancel/refund semantics in this task.
- Do not alter Daily Activities mission rules or make Missions read `wallet_transactions`.
- Do not add a public HTTP mapping for `ReverseRound`; it should remain an internal gRPC-only provider ingress like `SettleRound`.
- Do not backfill historic canceled wagers unless a separate data-fix task is opened.

## Acceptance criteria

- [ ] `shared-lib/proto/gamepb` exposes a gRPC-only `ReverseRound` RPC with request/response fields sufficient for `round_id`, `user_id`, `game_id`, `provider_code`, and `occurred_at`, and generated code is refreshed.
- [ ] `Games-Labs-Game` serves `ReverseRound` by reusing the existing service path, returns `not_found`/invalid-request semantics consistently with `SettleRound`, and emits `round.reversed` plus `turnover.reversed` only on the first successful reverse.
- [ ] `Games-Labs-Provider` calls Game `ReverseRound` from `IntegratorCancel` only after wallet refund succeeds, and skips the reverse call when refund fails or required IDs are missing.
- [ ] Repeated `IDGCancel` callbacks for the same `wager_id` stay idempotent: Game keeps one `reversed_at`, turnover is not double-reversed, and Provider does not fail the callback because the round was already reversed.
- [ ] Provider/Game tests cover wallet-refund success, wallet-refund failure, missing-ID guard, Game already-reversed behavior, and response/status mapping.
- [ ] README and `verification-evidence.md` document the runtime checklist, including fresh cancel-round verification in `round_lifecycles` and downstream `turnover.reversed`.
- [ ] Before downstream implementation lands, the updated `shared-lib` contract is published and each service bumps off any local `replace`, runs `go mod tidy`, and builds with `GOWORK=off go build -mod=readonly ./...`.

## Technical plan

1. Extend `shared-lib/proto/gamepb/game.proto` with a gRPC-only `ReverseRound` RPC and generate the updated Go artifacts.
2. Publish/bump the new `shared-lib` version into `Games-Labs-Game` and `Games-Labs-Provider` before modifying downstream call sites.
3. Add the Game gRPC handler that validates input, maps to `gamesvc.ReverseRound`, and returns the reversed lifecycle payload/status.
4. Extend `gameadt` with `ReverseRoundInput` + `TryReverseRound` helper mirroring the current `SettleRound` no-op/log-only behavior.
5. Replace the current `IDGCancel` warning-only path with a refund-success reverse call and tighten service/handler tests.
6. Update docs/evidence with cancel verification steps and any deployment sequencing notes.

## Risks

| Risk | Mitigation |
| --- | --- |
| Cross-service proto changes drift if downstream services keep stale `shared-lib` versions. | Make publish/bump/build verification an explicit acceptance criterion and first sequencing step. |
| Duplicate cancel callbacks could over-reverse or surface noisy errors. | Reuse Game's `reversed_at IS NULL` gate and treat already-reversed results as successful idempotent completion. |
| Cancel payloads may omit fields needed for direct game lookup. | Keep `round_id=wager_id` authoritative and include provider/game identifiers in the RPC request for validation and logging. |
| Teams may expect historic canceled rounds to self-heal. | Document that this task only fixes forward behavior; historical repair needs a separate backfill plan. |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

Run `./ai-dev-office/run-agent.sh TASK-076 dev-2` after the `shared-lib` `ReverseRound` contract is published and the target repos are bumped to it.
