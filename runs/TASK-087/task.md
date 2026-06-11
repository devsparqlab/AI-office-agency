# TASK-087: Roll Out SHA-Pin GitOps Fix to Remaining 7 Directory-Mode Services

## Short name
`sha-pin-rollout-remaining`

## Type
chore

## Priority
high

## Parent / Epic
- Parent: `TASK-086`
- Epic: AI Office Capability Coverage

## Status

Wallet (kustomize, PR #5) and Logs (directory-mode template, PR #1) are merged and
passed. Apply the proven directory-mode template to the remaining 7 services, one
PR each for the human DevOps to review.

## Scope

### Subtasks (one PR per service)

| ID | Repo | Image | Group |
| --- | --- | --- | --- |
| s1 | `Games-Labs-Game` | games-labs-game | B (configmap) |
| s2 | `Games-Labs-User` | games-labs-user | B (configmap) |
| s3 | `Games-Labs-Order` | games-labs-order | B (configmap) |
| s4 | `api-gateway` | api-gateway | B (configmap) |
| s5 | `Games-Labs-Auth` | games-labs-auth | B (configmap) |
| s6 | `Games-Labs-Missions` | games-labs-missions | A (no configmap) |
| s7 | `Games-Labs-backoffice` | games-labs-backoffice | A (no configmap) |

### Transformation (per service, matches merged Logs template)

- Merge `build-push` + `rollout-restart` into one ordered `build-deploy` job.
- `IMAGE_LATEST`/`IMAGE_SHA` -> `IMAGE_REPO`/`IMAGE_TAG`; push `:latest` + `:sha-<short>`.
- Preserve the existing ConfigMap/Secret apply block VERBATIM (service-specific keys).
- Remove `sleep`, the wait loop, `rollout restart`, and `continue-on-error`.
- Apply ConfigMap/Secret BEFORE pinning+committing the image tag (ordering).
- Pin `image:` in `k3s/deployment.yaml` via yq + commit back; `paths-ignore: [k3s/**]`; `permissions: contents: write`.

### Excluded

- Dockerfile/base-image/action-pinning/OIDC findings (separate follow-ups).
- Provider (no k3s) and shared-lib (library).

## Acceptance Criteria

- [ ] Each service has a PR pinning the image to `sha-<short>` in git with ArgoCD-driven rollout.
- [ ] Each service's ConfigMap/Secret apply logic preserved unchanged.
- [ ] Each deploy.yml validates as YAML.
- [ ] No app code changed.

## Assignment

- Primary: `devops`
- Parallel: `true` (independent repos)
