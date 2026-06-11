# TASK-086: SHA-Pin GitOps Fix Template for Directory-Mode Services (Games-Labs-Logs)

## Short name
`logs-sha-pin-template`

## Type
chore

## Priority
high

## Parent / Epic
- Parent: `TASK-084`
- Epic: AI Office Capability Coverage

## Status

TASK-084 fixed Wallet (kustomize mode). The other 8 services use ArgoCD
**directory mode** (no `kustomization.yaml`) and a more complex deploy.yml that
bootstraps the ArgoCD app, overwrites ConfigMap/Secret from GitHub Secrets, waits,
then `rollout restart`s. This task builds and validates the directory-mode fix
template on the lowest-risk service (Games-Labs-Logs) before rolling out to the
remaining 7.

## Scope

### Affected files

| Path | Action | Description |
| --- | --- | --- |
| `Games-Labs-Logs/.github/workflows/deploy.yml` | modified | Pin the built `sha-<short>` tag into `k3s/deployment.yaml` and commit it back; preserve ConfigMap/Secret apply; drop the imperative `rollout restart` + wait loop; let ArgoCD drive rollout. |
| `ai-dev-office/runs/TASK-086/*` | created | Task status, findings, handoff. |

### Key design decisions

- Directory mode → pin the image directly in `k3s/deployment.yaml` (no kustomize introduced).
- **Single job, ordered**: build → push → apply ArgoCD app + ConfigMap + Secret → THEN pin image + commit. ConfigMap/Secret must be fresh before the image change triggers the ArgoCD rollout, so new pods read current config.
- ConfigMap/Secret apply preserved verbatim (service-specific keys); ArgoCD `ignoreDifferences` on ConfigMap `/data` already prevents selfHeal revert.
- Trigger `paths-ignore: [k3s/**]`; `permissions: contents: write`.

### Explicitly excluded

- The other 7 services (roll out after this template merges and passes).
- Dockerfile/base-image/action-pinning/OIDC findings (separate follow-ups).

## Acceptance Criteria

- [ ] Deployed image is declared as an immutable `sha-<short>` tag in git (`k3s/deployment.yaml`), written by CI.
- [ ] ConfigMap/Secret apply logic preserved unchanged (same keys/defaults/validation).
- [ ] Imperative `rollout restart` + wait loop removed; ArgoCD drives rollout via the committed image change.
- [ ] Config/Secret applied before the image commit (ordering correct).
- [ ] No app code changed.

## Verification

- A push to `main` builds, pushes `sha-<short>`, applies config/secret, pins the tag into
  `deployment.yaml`, commits it, and ArgoCD rolls out that exact tag.
- `git revert` of the tag-pin commit rolls back to the previous immutable image.

## Assignment

- Primary: `devops`
- Parallel: `false`

## Notes

Edits applied to the working tree, then opened as a PR for the human DevOps to
review — nothing reaches production until they merge. Same caveats as Wallet:
ArgoCD must be the live controller; `GITHUB_TOKEN` must be allowed to push to main;
config-only changes (no image change) won't auto-roll until the next code deploy.

(Note: TASK-085 was already taken by an unrelated dashboard task; this work uses TASK-086.)
