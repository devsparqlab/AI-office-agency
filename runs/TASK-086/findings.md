# Games-Labs-Logs Delivery Review — Findings (directory-mode template)

Same finding class as Wallet (TASK-084), confirmed against the directory-mode setup.
Severity: 🔴 high · 🟠 medium.

## 🔴 High — fixed in this task

1. **Mutable `:latest` + ArgoCD directory mode cannot see new builds** (`gitops-deploy-review`)
   - `k3s/deployment.yaml` pins `:latest`; ArgoCD tracks `path: k3s` (automated + selfHeal + prune).
   - New image push does not change git → ArgoCD never syncs the build; deployed version undefined, no git rollback.
   - **FIXED**: CI now `yq`-pins `sha-<short>` into `deployment.yaml` and commits it; ArgoCD syncs the exact tag.

2. **Imperative `rollout restart` + wait loop fights `selfHeal`** (`gitops-deploy-review`)
   - CI bootstrapped the ArgoCD app, slept 30s, then `rollout restart`ed `:latest` while selfHeal reconciled.
   - **FIXED**: rollout is driven only by ArgoCD syncing the committed image; wait loop + restart removed.

3. **Deploy job `continue-on-error: true`** (`cicd-pipeline-review`)
   - Failed deploy reported green.
   - **FIXED**: single ordered job fails loudly; a missing required secret blocks the image commit.

## 🟠 Medium — documented, not in this PR

4. Long-lived `KUBECONFIG`/`GH_PAT`; ConfigMap/Secret provisioned imperatively from GitHub Secrets
   (consider OIDC + Sealed/External Secrets). Preserved as-is here to avoid behavior change.
5. Actions pinned to floating major tags (supply-chain) — pin to commit SHA.
6. Runtime container likely root; base images floating — same as Wallet, separate follow-up.

## Healthy / preserved

- ConfigMap/Secret apply logic kept verbatim (9 config keys + 2 secret keys, defaults, validation).
- ArgoCD `ignoreDifferences` on ConfigMap `/data` + `RespectIgnoreDifferences=true` already prevents
  selfHeal from reverting CI-applied config — the design is sound and untouched.
- replicas 2, resource limits, tcpSocket probes intact.

## Directory-mode mechanism (vs Wallet kustomize)

- No `kustomization.yaml` → pin image directly in `deployment.yaml` (no kustomize introduced).
- **Single ordered job**: build → push → apply ArgoCD app + ConfigMap + Secret → pin image + commit.
  Config/secret are applied before the image commit so ArgoCD-rolled pods read fresh config.

## Limitation (same as Wallet)

- A config-only change (no image change) produces no `deployment.yaml` diff → no ArgoCD rollout until the
  next code deploy. Add a Reloader later if hot config reload is needed.

## Rollback

- `git revert` the tag-pin commit → ArgoCD returns to the previous immutable image.
