# TASK-064: Games-Labs-Game Runtime API URL Wiring

## Short name
`game-runtime-api-url-wiring`

## Type
bugfix

## Priority
medium

## Parent / Epic
- Parent: `TASK-062`
- Epic: Game access runtime hardening

## Background

While validating Golden Pass and authenticated `ListGame` behavior, we found that the
cluster runtime for `Games-Labs-Game` did not inject `USER_API_URL`.

Observed effect:

- `ListGame` only filters by user level when `userID != "" && s.ua != nil`
- with no `USER_API_URL`, the User adapter is not created
- runtime behaves like guest access and returns all games, even when `user_profiles.level`
  and `games.level` data are correct

Follow-up fix already identified and applied in the repo:

- `k3s/configmap.yaml`
  - add default `user-api-url: games-labs-user-service:50055`
  - add default `missions-api-url: games-labs-missions-service:50056`
- `k3s/deployment.yaml`
  - wire `USER_API_URL` from `user-api-url`
  - wire `MISSIONS_API_URL` from `missions-api-url`
- `.github/workflows/deploy.yml`
  - create/apply ConfigMap values for both keys during deploy
  - allow GitHub Secrets overrides for both URLs
- `.env.example`
  - document the same service-name defaults

This task exists to track the runtime hardening explicitly in `ai-dev-office`, verify the
deploy path, and ensure the operational contract is documented.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Game` | Ensure runtime env wiring for `USER_API_URL` and `MISSIONS_API_URL` is present across local examples, k3s manifests, and deploy workflow |

### Explicitly out of scope

- Golden Pass business logic changes
- User service level semantics
- Missions config behavior
- Frontend or Mobile changes

## Product / runtime rules

- `Games-Labs-Game` must receive `USER_API_URL` in cluster runtime so authenticated `ListGame` can resolve user level
- `Games-Labs-Game` must receive `MISSIONS_API_URL` in cluster runtime so Golden Pass runtime checks keep working in the same environment
- default in-cluster targets use Kubernetes service DNS:
  - `games-labs-user-service:50055`
  - `games-labs-missions-service:50056`
- GitHub Secrets may override either URL for non-cluster routing
- deploy workflow must apply ConfigMap values before rollout restart

## Key files

- `Games-Labs-Game/k3s/configmap.yaml`
- `Games-Labs-Game/k3s/deployment.yaml`
- `Games-Labs-Game/.github/workflows/deploy.yml`
- `Games-Labs-Game/.env.example`
- `Games-Labs-Game/cmd/main.go`
- `Games-Labs-Game/internal/core/services/gamesvc/service.go`

## Acceptance criteria

- [ ] `k3s/configmap.yaml` contains default `user-api-url` and `missions-api-url`
- [ ] `k3s/deployment.yaml` exports both values into container env as `USER_API_URL` and `MISSIONS_API_URL`
- [ ] `.github/workflows/deploy.yml` applies both ConfigMap keys and supports GitHub Secrets override
- [ ] `.env.example` documents the same defaults used by cluster manifests
- [ ] Reviewer verifies the runtime root cause is addressed for authenticated `ListGame`
- [ ] Reviewer verifies no unrelated Golden Pass logic changes were introduced in this follow-up

## Risks

| Risk | Mitigation |
| --- | --- |
| Local code looks correct but deployed runtime still misses env | Verify both manifests and deploy workflow, not just `.env.example` |
| Future deploy drift reintroduces guest-like behavior | Keep the URL keys in ConfigMap, Deployment, and workflow together in the same task scope |
| `MISSIONS_API_URL` is forgotten while fixing `USER_API_URL` | Treat both URLs as part of one runtime wiring contract |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

`dev-2`: verify the already-landed manifest/workflow wiring against acceptance criteria, capture any missing doc or rollout caveat, then hand off to reviewer.
