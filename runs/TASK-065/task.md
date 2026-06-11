# TASK-065: Game Playability Test Coverage And API Docs Sync

## Short name
`game-playability-tests-and-docs`

## Type
refactor

## Priority
medium

## Parent / Epic
- Parent: `TASK-063`
- Epic: Store & Pass economy

## Background

`TASK-063` shipped a broader API split than originally documented:

- `GET /api/v1/game` is a discoverability-first list and annotates games with
  `is_playable` / `playability_reason` for authenticated users
- `GET /api/v1/game/my-games` is the filtered authenticated list
- `GET /api/v1/game/category` remains a public catalog and also exposes playability
  metadata for authenticated users

After reconciling the task artifacts with the current codebase, two follow-up gaps remain:

1. focused service/handler tests for `ListGame`, `ListUserGame`, and `ListCategory`
   are not present in the current `Games-Labs-Game` tree
2. generated swagger already includes `/api/v1/game/my-games`, but the Postman / API
   collection copies have not yet been updated to expose that endpoint to consumers

This task closes those two gaps without changing Golden Pass product semantics again.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Game` | Add focused tests for discoverability metadata, filtered user-game list, and category metadata behavior |
| `api-gateway` | Update the gateway Postman collection copy with `/api/v1/game/my-games` |
| `docs` | Update the duplicate top-level Postman collection copy so both published collections stay aligned |

### Explicitly out of scope

- Golden Pass formula changes
- Missions config or pass ownership changes
- Runtime env/deploy wiring
- Frontend or Mobile implementation

## Product / contract rules

- `ListGame` (`/api/v1/game`)
  - guests receive the full list with no evaluated playability metadata
  - authenticated users receive the full list with `is_playable` / `playability_reason`
- `ListUserGame` (`/api/v1/game/my-games`)
  - authenticated users receive only currently playable games
  - current implementation returns an empty list when user context is absent
- `ListCategory` (`/api/v1/game/category`)
  - remains a public catalog
  - authenticated users receive per-game playability metadata
- `LaunchGame` remains the authoritative enforcement point

## Key files

- `Games-Labs-Game/internal/core/services/gamesvc/service.go`
- `Games-Labs-Game/internal/core/services/gamesvc/level_access.go`
- `Games-Labs-Game/internal/core/handlers/gamehdl/grpc.go`
- `Games-Labs-Game/internal/core/services/gamesvc/*test.go`
- `Games-Labs-Game/internal/core/handlers/gamehdl/*test.go`
- `api-gateway/docs/Games-Labs-APIs.postman_collection.json`
- `docs/Games-Labs-APIs.postman_collection.json`

## Acceptance criteria

- [ ] focused tests cover `ListGame` guest metadata, authenticated metadata, and user lookup failure behavior
- [ ] focused tests cover `ListUserGame` authenticated filtering and guest-empty behavior
- [ ] focused tests cover `ListCategory` guest metadata and authenticated metadata behavior
- [ ] handler-level tests cover metadata forwarding and response mapping for the new/updated list endpoints where practical
- [ ] `api-gateway/docs/Games-Labs-APIs.postman_collection.json` includes `GET /api/v1/game/my-games`
- [ ] `docs/Games-Labs-APIs.postman_collection.json` includes the same endpoint and stays aligned with the gateway copy
- [ ] verification records what was tested and confirms no Golden Pass semantics changed

## Risks

| Risk | Mitigation |
| --- | --- |
| Tests accidentally encode the old `ListGame` filtering semantics | Write assertions against the current shipped split: annotate in `ListGame`, filter in `ListUserGame` |
| Postman copies drift again | Update both collection files in the same task and re-parse both after edits |
| Docs imply `ListUserGame` is public | Keep request examples and notes explicit that it is the authenticated filtered line |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

`dev-2`: add focused tests for the three list endpoints and sync both Postman collection copies with `/api/v1/game/my-games`.
