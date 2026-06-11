# TASK-069 Verification Evidence

Date: 2026-05-29

## Scope verified
- `Games-Labs-Provider`: multi-provider `SettleRound` wiring for AFB, 1UP, VP, IDG, GGSoft, Sigma
- `Games-Labs-Game`: startup guard requiring `RABBITMQ_URL` for player activity publishing

## Commands run

```bash
cd /Users/earth/Documents/GitHub/Games-Labs-Provider
GOCACHE=/private/tmp/gocache-task-069-provider GOWORK=off go test ./...
GOCACHE=/private/tmp/gocache-task-069-provider GOWORK=off go build -mod=readonly ./...

cd /Users/earth/Documents/GitHub/Games-Labs-Game
GOCACHE=/private/tmp/gocache-task-069-game GOWORK=off go build -mod=readonly ./...
```

## Results
- `go test ./...`: passed
- `go build -mod=readonly ./...`: passed
- `Games-Labs-Game go build -mod=readonly ./...`: passed

## Implementation evidence checked
- Shared fire-and-forget helper: `Games-Labs-Provider/internal/adapters/gameadt/settle_round.go`
- AFB refactor to shared helper: `Games-Labs-Provider/internal/core/services/providers/afb.go`
- 1UP settlement hook + mapper tests: `Games-Labs-Provider/internal/handlers/providerhdl/oneup_callback.go`, `Games-Labs-Provider/internal/handlers/providerhdl/oneup_turnover_test.go`
- VP settlement hook + mapper tests: `Games-Labs-Provider/internal/handlers/vphdl/vp_seamless.go`, `Games-Labs-Provider/internal/handlers/vphdl/vp_turnover_test.go`
- IDG wager stake cache + win hook tests: `Games-Labs-Provider/internal/handlers/idghdl/idg_callback.go`, `Games-Labs-Provider/internal/handlers/idghdl/idg_turnover_test.go`
- GGSoft type-4 end-round hook tests: `Games-Labs-Provider/internal/core/services/providers/ggsoft.go`, `Games-Labs-Provider/internal/core/services/providers/ggsoft_turnover_test.go`
- Sigma end-round hook tests: `Games-Labs-Provider/internal/core/services/providers/sigma.go`, `Games-Labs-Provider/internal/core/services/providers/sigma_turnover_test.go`
- Game RabbitMQ guard: `Games-Labs-Game/cmd/main.go`

## Remaining staging checks
- Provider runtime must set `GAME_API_URL`
- Game runtime must set `RABBITMQ_URL`
- Sigma real-wallet E2E remains dependent on live Sigma wallet implementation; code hook is wired and unit coverage passes

## Staging DB incident (user `f737e6f3-466b-4db5-b86e-70ac4772b660`)
Observed: no `round_lifecycles`, no `turnover.settled`, no turnover `daily_activity_event_applications`; only
`spend.settled` from `games-labs-wallet` with `ignored_no_matching_activity`.

Interpretation:
- Wallet `spend.settled` is the **Diamond debit** rail (or unrelated spend dailies) — it must **not** advance
  `TURNOVER_AMOUNT` / Quest Collect turnover.
- Gameplay turnover requires Provider → Game `SettleRound` after COIN wallet settlement; that chain was a no-op when
  `GAME_API_URL` was unset on Provider (previously missing from `docker-compose.dev.yml` / `dev.yml` deploy env list).
- Fix: deploy Provider+Game with `GAME_API_URL` + `RABBITMQ_URL`, redeploy, replay one provider round, then re-check DB.

## Provider trace playbook (`f737e6f3-466b-4db5-b86e-70ac4772b660`)

### 1) Wallet DB — ระบุ provider จาก gameplay debit

```sql
SELECT
  id,
  type,
  amount,
  source,
  provider_id,
  idempotency_key,
  COALESCE(metadata->>'currency', 'COIN') AS currency,
  created_at
FROM wallet_transactions
WHERE user_id = 'f737e6f3-466b-4db5-b86e-70ac4772b660'
ORDER BY created_at DESC
LIMIT 50;
```

| ถ้า `source` / `idempotency_key` เป็น | Provider | Settlement hook | Log prefix หลัง deploy |
| --- | --- | --- | --- |
| `1up_bet_*` / `1up:bet:*` | 1UP | `OneUpBetResult` | `[1up:bets/result] game SettleRound` |
| `vp_betnsettle_*` / `vp:betnsettle:*` | VP | `betnsettle` | `[vp:betnsettle] game SettleRound` |
| `idg_bet_*` + `idg_win_*` / `idg:bet:*` | IDG | `IDGWin` (stake จาก redis ตอน bet) | `[idg:win] game SettleRound` |
| `ggsoft_bet_*` / `ggsoft:bet:*` หรือ settle key | GGSoft | type 4 + `end_round` | `[ggsoft:settle] game SettleRound` |
| `afb_round_*` / `afb:bet:*` / `afb:win:*` | AFB | `Payout` | `[afb:payout] game SettleRound` |

- ถ้า **ไม่มีแถว** `source` ขึ้นต้น `1up_` / `vp_` / `idg_` / `ggsoft_` / `afb_` → user อาจไม่ได้เล่นผ่าน seamless provider (หรือเล่นก่อนมี ledger)
- ถ้ามีแต่ `metadata.currency = DIAMOND` และไม่มี COIN debit → wallet ยิง `spend.settled` (Diamond) ซึ่ง Missions จะ `ignored_no_matching_activity` สำหรับ `TURNOVER_AMOUNT` (ถูกต้อง)

Optional (Provider DB แยก): `SELECT id, code FROM providers WHERE code IN ('1UP','VP','IDG','GGSOFT','AFB');` แล้วเทียบกับ `wallet_transactions.provider_id`

### 2) Missions DB — ยืนยัน rail ที่เข้ามา

```sql
SELECT event_id, event_type, status, source_service, source_reference_type,
       source_reference_id, occurred_at
FROM daily_activity_consumer_events
WHERE user_id = 'f737e6f3-466b-4db5-b86e-70ac4772b660'
ORDER BY occurred_at DESC
LIMIT 30;
```

- `spend.settled` + `source_service = games-labs-wallet` + `ignored_no_matching_activity` → Diamond spend (ไม่ใช่ turnover mission)
- ต้องเห็น `turnover.settled` + `source_service = games-labs-game` หลัง fix deploy + เล่นรอบใหม่

### 3) Provider container logs (หลังรู้ provider)

```bash
docker logs games-labs-provider-dev 2>&1 | grep -E 'f737e6f3|SettleRound|GAME_API_URL'
```

| Provider | grep เพิ่ม |
| --- | --- |
| 1UP | `1up:bets/result` |
| VP | `vp:betnsettle` |
| IDG | `idg:win` |
| GGSoft | `ggsoft:settle` |
| AFB | `afb:payout` |

ถ้ามี wallet debit แต่ **ไม่มี** `game SettleRound` และ startup log มี `GAME_API_URL not set` → ยืนยัน config gap (แก้ใน `docker-compose.dev.yml` / `dev.yml` แล้ว ต้อง redeploy)

## IDG incident (`8d01e1c5-c4de-4d0d-b239-567275675f7e`)

Evidence: `idg:win:%` wallet rows exist; `round_lifecycles` empty → wallet win OK, Game `SettleRound` not effective.

Path: `idghdl.IDGWin` → `idg.IntegratorWin` → `TrySettleRound` (`idg:win` prefix).

| Check | What to look for |
| --- | --- |
| `GAME_API_URL` / `gameClient` | Log: `[idg:win] skip SettleRound: GAME_API_URL not configured` |
| Stake cache | Log: `[idg:win] missing wager stake wager_id=... ref_transaction_id=...`; Redis keys `idg:wager:stake:*`, `idg:txn:stake:*` |
| Game gRPC | Log: `[idg:win] game SettleRound round_id=... err=...` |
| Bet before win | SQL: `idempotency_key LIKE 'idg:bet:%'` for same user |

Code fix in branch: dual stake cache (wagerId + bet transactionId), win fallback via `refTransactionId`, nil-client log in `TrySettleRound`.

## DevOps runtime triage (`8d01e1c5-c4de-4d0d-b239-567275675f7e`) — 2026-05-29

### Deploy / build (TASK-069 on `main`)

| Item | Result |
| --- | --- |
| TASK-069 code on `main` | `8ba849c` (SettleRound wiring), `99bdf77` (GAME_API_URL in deploy), `74d1ffa` (refactor; `TrySettleRound` retained in `idg/callback.go`, `afb/service.go`) |
| Latest successful `dev.yml` deploy | Run `26625580708` @ 2026-05-29T08:58:44Z (after refactor) |
| GitHub Actions variable | `GAME_API_URL` present (created 2026-05-29T08:58:17Z); value not readable via API from this agent |

### Topology mismatch (likely root cause)

| Service | Runtime |
| --- | --- |
| Provider | VPS `docker compose -f docker-compose.dev.yml` |
| Wallet | k8s (`games-labs-wallet`) — wallet txs prove Provider → Wallet gRPC/HTTP works |
| Game | k8s (`games-labs-game`) — **not** in Provider compose |

Default / example `GAME_API_URL=games-labs-game-dev:50053` is a **Docker DNS name with no `games-labs-game-dev` service** in this monorepo. If the VPS variable matches that default, `gameClient` may be **non-nil** (URL set) but `SettleRound` RPC fails at call time → look for `[idg:win] game SettleRound ... err=` (Unavailable / connection refused / name not known), not the nil-client skip line.

`WALLET_API_URL` in GitHub secrets is presumably a **reachable** host (NodePort / LB / public gRPC). `GAME_API_URL` must use the **same class** of target (k8s Service DNS only works from inside the cluster; from VPS Docker use node IP:NodePort, ingress, or tailnet IP).

### Provider hook vs wallet keys (this user)

| Observation | Meaning |
| --- | --- |
| `idg:win:*` in wallet, no `round_lifecycles` | Win path ran; check Provider logs for `idg:win` + `SettleRound` |
| `afb:bet:*` only | **Expected** no round row yet — `TrySettleRound` runs on **`afb:payout`** (`Payout` callback), not bet |

### VPS commands (run on deploy host)

```bash
cd ~/Games-Labs-Provider
docker ps --filter name=provider
docker inspect games-labs-provider-dev --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^GAME_API_URL=|^WALLET_API_URL='
docker logs games-labs-provider-dev 2>&1 | grep -E '8d01e1c5|GAME_API_URL|idg:win|afb:payout|SettleRound' | tail -80
```

| Log line | Interpretation |
| --- | --- |
| `GAME_API_URL not set; ... SettleRound ... disabled` (startup) | Env empty → all providers skip settle |
| `[idg:win] skip SettleRound: GAME_API_URL not configured` | `gameClient` nil at win time |
| `[idg:win] game SettleRound ... err=` | Client exists; Game unreachable, wrong DB env, or Game business error |
| No `SettleRound` lines after win timestamp | Image predates TASK-069 or win handler not hit |

### Game DB parity

Confirm Game `POSTGRES_*` (k8s `games-labs-game-secret`) is the same database you query for `round_lifecycles`. Provider settle is a no-op for your DB if Game writes elsewhere.

### GAME_API_URL → k8s (configured 2026-05-29)

| Step | Action |
| --- | --- |
| k8s | `Games-Labs-Game/k3s/service.yaml` → NodePort grpc **30553**, http **30803** |
| Provider | `GAME_API_URL=84.247.150.206:30553` (same node IP as Wallet; mirror `WALLET_API_URL` host) |
| GitHub | Repo variable `GAME_API_URL` set on `Games-Labs-Provider` |
| Apply | `kubectl apply -f Games-Labs-Game/k3s/service.yaml` then redeploy Provider on VPS |
