# TASK-084: DevOps Review + SHA-Pin Fix for Games-Labs-Wallet Delivery

## Short name
`wallet-delivery-review-fix`

## Type
chore

## Priority
high

## Parent / Epic
- Parent: `TASK-082`
- Epic: AI Office Capability Coverage

## Status

First real use of the new Delivery / Infra skills. The `devops` agent reviews the
Games-Labs-Wallet delivery surface (Dockerfile, GitHub Actions, k3s manifests,
ArgoCD, secrets) using the six skills, records findings, and applies the
user-approved fix: replace the mutable `:latest` deploy with immutable
`sha-<short>` image pinning driven through GitOps, removing the imperative
`rollout restart` that fights ArgoCD `selfHeal`.

## Scope

### Target repo

| Repo | Reason |
| --- | --- |
| `Games-Labs-Wallet` | Apply the SHA-pin GitOps fix to CI + k3s manifests. |
| `ai-dev-office` | Store review findings and task status. |

### Affected files

| Path | Action | Description |
| --- | --- | --- |
| `Games-Labs-Wallet/k3s/kustomization.yaml` | modified | Add `images:` transformer so the deployed tag is declared in git. |
| `Games-Labs-Wallet/.github/workflows/deploy.yml` | modified | Pin the built `sha-` tag into git after push; let ArgoCD drive rollout; drop imperative `rollout restart`. |
| `ai-dev-office/runs/TASK-084/findings.md` | created | Full review findings, ranked. |
| `ai-dev-office/runs/TASK-084/*` | created | Task status and artifacts. |

### Explicitly excluded (documented as findings, not auto-applied)

- Dockerfile non-root user + pinned base images.
- Pinning GitHub Actions to commit SHAs.
- Moving long-lived `KUBECONFIG`/`GH_PAT` to OIDC.
- Moving secret provisioning to Sealed / External Secrets.
- Other Games-Labs services (Wallet only, per user scope).

## Acceptance Criteria

- [ ] Deployed image is declared as an immutable `sha-<short>` tag in git (kustomize `images`).
- [ ] CI writes the new tag back to git after build-push; ArgoCD syncs it.
- [ ] The imperative `kubectl rollout restart` deploy path is removed (no selfHeal fight, no silent-failure deploy).
- [ ] No app code or service behavior changed; only delivery wiring.
- [ ] Findings recorded with severity and recommended follow-ups.

## Verification

- `kustomize build Games-Labs-Wallet/k3s` renders the pinned image (after a CI run sets the tag).
- A push to `main` builds, pushes `sha-<short>`, commits the tag, and ArgoCD rolls out that exact tag.
- `git revert` of the tag-bump commit rolls back to the previous immutable image.

## Assignment

- Primary: `devops`
- Parallel: `false`

## Notes

Edits are applied to the working tree only; committing/pushing to
`Games-Labs-Wallet` is left to the user. CI commit-back to `main` assumes the
default `GITHUB_TOKEN` may push (no blocking branch protection); if protected,
grant the workflow push access or use a deploy key.
