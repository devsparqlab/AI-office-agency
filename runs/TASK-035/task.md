# TASK-035 — 1UP seamless invalid player should return ERR_USER_NOT_FOUND

## Summary

Align `Games-Labs-Provider` 1UP seamless callbacks with external certification matrix **v3** for invalid player cases (`tc01004`, `tc02004`, `tc03010`, `tc04004`): **`404`** with `code: ERR_USER_NOT_FOUND`, with message consistent with current session/user-not-found behavior.

## Background

CSV v3 shows the invalid `playerID` cases as **FAILED** because the current response body is `ERR_GAME_NOT_FOUND`, while the **Expected Result** column requires `ERR_USER_NOT_FOUND`.
Invalid game cases (`tc01005`, `tc02005`, `tc03011`, `tc04005`) correctly expect `ERR_GAME_NOT_FOUND`.

## Scope

- **Service:** `Games-Labs-Provider` only.
- **Files:** `internal/handlers/providerhdl/oneup_runtime.go`, `oneup_callback.go`, `oneup_callback_test.go`.

## Acceptance criteria

1. `POST /player/info/get`, `/player/balance/get`, `/bets/result`, `/bets/refund` return **`404` + `ERR_USER_NOT_FOUND`** for invalid player cases from CSV v3:
   - `tc01004`
   - `tc02004`
   - `tc03010`
   - `tc04004`
2. Invalid game cases remain **`404` + `ERR_GAME_NOT_FOUND`**:
   - `tc01005`
   - `tc02005`
   - `tc03011`
   - `tc04005`
3. Existing valid success, invalid signature, invalid session, duplicate bet, invalid bet, and insufficient balance behaviors remain unchanged.
4. Tests pass:
   - `go test ./internal/handlers/providerhdl/...`
   - `go test ./...`

## Risk

Be careful not to classify missing session context for invalid player as invalid game. The regression risk is specifically between invalid player and invalid game handling.

## Relation to TASK-034

Extends TASK-034 callback contract work specifically for partner certification row expectations in CSV v3.
