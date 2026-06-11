# Games-Labs-Wallet Delivery Review — Findings

Reviewed with the Delivery / Infra skills: `cicd-pipeline-review`,
`k8s-deploy-review`, `gitops-deploy-review`, `container-build-review`,
`secrets-management`. Severity: 🔴 high · 🟠 medium · 🟡 low.

## 🔴 High

1. **Mutable `:latest` deploy + GitOps cannot see new builds** (`gitops-deploy-review`, `k8s-deploy-review`)
   - `k3s/deployment.yaml` pins `image: ...games-labs-wallet:latest`; the ArgoCD app
     (`automated` + `selfHeal: true` + `prune: true`) tracks `path: k3s`.
   - A new image push does not change any tracked file, so ArgoCD sees no diff and
     never syncs the new build. The deployed version is undefined and not
     recoverable from git.
   - **FIXED in this task** via kustomize `images.newTag` pinned to `sha-<short>`, committed to git.

2. **Imperative `rollout restart` fights `selfHeal`** (`gitops-deploy-review`)
   - CI runs `kubectl rollout restart` out-of-band to force `:latest` to re-pull,
     while ArgoCD `selfHeal` reconciles the workload back to the manifest.
     Two controllers driving the same workload.
   - **FIXED**: rollout is now driven only by ArgoCD syncing the committed tag.

3. **Deploy step is `continue-on-error: true`** (`cicd-pipeline-review`)
   - A failed rollout reported a green run — deploy failures were invisible.
   - **FIXED**: the critical path (build → push → pin tag → commit) now fails loudly;
     the remaining best-effort secret-sync no longer masks deploy status.

## 🟠 Medium

4. **Long-lived `KUBECONFIG` + `GH_PAT` secrets** (`secrets-management`, `cicd-pipeline-review`)
   - Static cluster + registry credentials with no rotation story; prefer short-lived
     OIDC where the platform supports it. *Not auto-applied — needs platform decision.*

5. **Secret provisioned imperatively / inconsistent source of truth** (`secrets-management`)
   - Header comment says `games-labs-wallet-secret` is created manually on k3s, but the
     workflow re-creates it from GitHub secrets every deploy. `ghcr-secret` is manual and
     undocumented. Recommend Sealed Secrets / External Secrets so a reference (not the
     value) lives in git for the GitOps-managed cluster. *Documented, not auto-applied.*

6. **Third-party actions pinned to floating major tags** (`cicd-pipeline-review`)
   - `checkout@v4`, `setup-buildx-action@v3`, `login-action@v3`, `build-push-action@v5`,
     `setup-kubectl@v4` should be pinned to commit SHAs for supply-chain safety.
     *Documented, not auto-applied.*

7. **Runtime container runs as root** (`container-build-review`)
   - Final `alpine:latest` stage has no non-root `USER` and a writable root filesystem;
     no `securityContext` in the Deployment. *Documented, not auto-applied.*

## 🟡 Low

8. **Floating base images** (`container-build-review`)
   - `golang:1.24-alpine` (floats patch) and `alpine:latest` (floats fully) make builds
     non-reproducible. Pin to a digest. A static `CGO_ENABLED=0` binary could also ship on
     `scratch`/distroless instead of alpine.

9. **No explicit rollout strategy / startupProbe** (`k8s-deploy-review`)
   - Defaults are acceptable at `replicas: 2`; consider an explicit `RollingUpdate`
     (`maxUnavailable: 0`) for zero-downtime, and a `startupProbe` for slow starts.

## Confirmed healthy

- Dockerfile is multi-stage and uses `--mount=type=secret` for `GH_PAT` (no token in layers),
  builds with `-mod=readonly`, no `go mod tidy`, no `go.work`. ✅ (`container-build-review`)
- Deployment sets resource requests + limits and real liveness/readiness probes;
  `replicas: 2`, `revisionHistoryLimit: 3`. ✅ (`k8s-deploy-review`)
- App reads secrets via `secretKeyRef`, not plaintext in the manifest. ✅ (`secrets-management`)
- Workflow `permissions` were already scoped (now `contents: write` only because CI must
  commit the tag bump). ✅ (`cicd-pipeline-review`)

## Fix applied (this task)

- `k3s/kustomization.yaml`: added `images: [{name: ghcr.io/sparqlab/games-labs-wallet, newTag: latest}]`.
- `.github/workflows/deploy.yml`: build-push now also `yq`-pins the `sha-<short>` tag into
  `k3s/kustomization.yaml` and commits it back to `main`; trigger gains `paths-ignore: [k3s/**]`;
  `permissions: contents: write`; the `rollout-restart` job becomes a best-effort `sync-secret`
  job with the imperative restart removed.

## Rollback of the fix

- Revert the tag-bump commit (or this change) — image promotion returns to whatever git declares.
