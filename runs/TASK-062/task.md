# TASK-062: Golden Pass Configurable Game Access

## Short name
`golden-pass-config-access`

## Type
feature

## Priority
medium

## Parent / Epic
- Epic: Store & Pass economy

## Background

Golden Pass (`pass_type = golden_pass`) is sold via Missions store (`pass_golden`, 249 Diamond, 7 days). A baseline already exists in the monorepo:

- **Done (baseline):** `Games-Labs-Game` filters authenticated `List` and enforces `LaunchGame` using user level from User API; pass ownership is checked via Missions gRPC `HasActivePass`.
- **Gap (this task):** Access bonus was initially hardcoded as `user_level + 11`. Product requires **admin-tunable** `level_offset` and `max_game_level` owned by Missions, consumed by Game with fail-safe behavior and a short config cache.

> **Note for assignee:** As of task creation (2026-05-21), the workspace may already contain exploratory commits toward this feature (proto, migration `022`, Missions handlers, Game adapter cache). **Start with a gap audit** against acceptance criteria below; complete only missing items and add tests/docs before review.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `shared-lib` | Proto contract: internal `GetGoldenPassConfig`, admin golden-pass config HTTP annotations, generated gRPC/gateway artifacts |
| `Games-Labs-Missions` | Persist global Golden Pass access config; admin GET/PUT; internal gRPC; keep `HasActivePass` unchanged |
| `Games-Labs-Game` | Replace hardcoded offset with config-driven rule; 60s TTL cache for config only; live pass checks |

### Explicitly out of scope

- Pass catalog pricing, duration, `active` sale flags (`/api/v1/admin/store/passes/config`) — unchanged
- Global “disable Golden Pass benefits” flag — not in this task
- Mobile/UI copy or storefront presentation
- `ListCategory` level filtering — **open product decision** (see blockers); document if deferred

## Product rules

### Config shape (Missions-owned, global)

```json
{
  "level_offset": 11,
  "max_game_level": 16
}
```

- Both fields **required** on admin update
- Validation: `level_offset >= 1`, `max_game_level >= 1`
- Reject missing, zero, or negative values (no silent partial updates)
- No separate `enabled` flag — selling/activating the pass remains pass catalog + `HasActivePass`

### Effective playable level (Game)

When Golden Pass is **active** and config is **valid**:

```text
effective_max = max(user_level, min(user_level + level_offset, max_game_level))
```

Examples:

| user_level | offset | cap | effective_max |
| --- | --- | --- | --- |
| 5 | 11 | 16 | 16 |
| 5 | 5 | 16 | 10 |
| 20 | 5 | 16 | 20 (never below normal entitlement) |

Fail-safe (no bonus — use `user_level` only):

- No active `golden_pass`
- `MISSIONS_API_URL` unset or Missions adapter unavailable
- `GetGoldenPassConfig` errors
- Config malformed (`level_offset < 1` or `max_game_level < 1`)

`HasActivePass` must remain a **live** check (not cached with config).

### Cache (Game adapter)

- TTL **60 seconds** for `GetGoldenPassConfig` only
- On cache miss: fetch from Missions gRPC
- On cache **expired** and refresh **fails**: no bonus (do **not** use stale config)
- Pass ownership: always live via `HasActivePass`

## API surfaces

### Admin HTTP (Missions)

- `GET /api/v1/admin/store/golden-pass/config`
- `PUT /api/v1/admin/store/golden-pass/config`

Response envelope:

```json
{
  "status": "success",
  "data": {
    "level_offset": 11,
    "max_game_level": 16
  }
}
```

### Internal gRPC (Missions → Game)

Keep:

- `HasActivePass(HasActivePassRequest) → HasActivePassResponse`

Add:

- `GetGoldenPassConfig(Empty) → GoldenPassConfigResponse` with `level_offset`, `max_game_level`

Do **not** return config from `HasActivePass`.

### Game env

- `MISSIONS_API_URL` — gRPC dial target (same pattern as Wallet → Missions)

## Persistence

- Store `level_offset` and `max_game_level` on Missions `mission_config` (singleton `id = 1`) via migration with defaults `11` and `16`
- Separate from `store_passes` catalog rows

## Key files (expected touch points)

- `shared-lib/proto/missionspb/missions.proto`
- `Games-Labs-Missions/migrations/022_golden_pass_access_config.sql` (or next migration if 022 already applied differently)
- `Games-Labs-Missions/internal/models/models.go`
- `Games-Labs-Missions/internal/repositories/mission_repo.go`
- `Games-Labs-Missions/internal/services/mission_service.go`
- `Games-Labs-Missions/internal/handlers/admin_handler.go`
- `Games-Labs-Missions/internal/routes/apiv1.go`
- `Games-Labs-Missions/internal/grpc/missiongrpc/server.go`
- `Games-Labs-Missions/cmd/main.go` (wire `MissionSvc` on gRPC server if not already)
- `Games-Labs-Game/internal/core/services/gamesvc/level_access.go`
- `Games-Labs-Game/internal/core/services/gamesvc/service.go`
- `Games-Labs-Game/internal/adapters/missionsadt/adapter.go`
- `Games-Labs-Game/internal/core/ports/adapters.go`
- `Games-Labs-Game/configs/config.go`, `Games-Labs-Game/.env.example`
- `Games-Labs-Missions/README.md`, `Games-Labs-Game/README.md`

## Acceptance criteria

### Missions

- [ ] Migration adds `golden_pass_level_offset` and `golden_pass_max_game_level` with defaults 11 / 16 on `mission_config`
- [ ] Admin GET returns current config in `data`
- [ ] Admin PUT with valid payload persists and returns updated config
- [ ] Admin PUT rejects missing, zero, or negative `level_offset` / `max_game_level` with 400
- [ ] gRPC `GetGoldenPassConfig` returns persisted values
- [ ] gRPC `HasActivePass` behavior unchanged
- [ ] Automated tests cover admin GET/PUT validation and gRPC config read

### Game

- [ ] `List` (authenticated) and `LaunchGame` (non-demo) use the same `effective_max` formula
- [ ] Level 5, no pass → only games with `level <= 5`
- [ ] Level 5, pass + `{offset:11, cap:16}` → games up to level 16
- [ ] Level 5, pass + `{offset:5, cap:16}` → games up to level 10
- [ ] Level 20, pass + `{offset:5, cap:16}` → at least level 20 content still accessible
- [ ] Config read failure or invalid config → no bonus
- [ ] Config cache: hit within TTL avoids extra fetch; expired + failed refresh → no bonus; pass check not cached
- [ ] Unit/integration tests cover formula, list filter, launch gate, and cache behavior

### Cross-cutting

- [ ] `shared-lib` regenerated (`make buf`); consuming services use locked module version (no `replace` in committed `go.mod`)
- [ ] README sections updated for admin + internal gRPC + Game env
- [ ] Build and tests pass for Missions and Game

## Risks

| Risk | Mitigation |
| --- | --- |
| `shared-lib` proto not published before CI | Bump module pseudo-version in Missions/Game `go.mod` after proto merge; verify `go build ./...` |
| `ListCategory` shows level-locked games | Confirm with product; defer or add user-aware filter in follow-up |
| Partial exploratory code in tree | Gap audit first; do not duplicate handlers |

## Assignment

- Primary: `dev-2`
- Parallel: `false` (shared-lib must land before service bumps)

## Next action

`dev-2`: Run gap audit against acceptance criteria, then execute subtasks in `pm-output.yaml` order.
