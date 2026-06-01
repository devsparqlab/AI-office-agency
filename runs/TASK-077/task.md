# TASK-077: Turnover Rollout Runtime Hardening

## Short name
`turnover-rollout-hardening`

## Type
devops

## Priority
high

## Parent / Epic
- Parent: `TASK-069`
- Epic: Quest Daily Turnover / Provider Gameplay Settlement

## Background

The provider-lane validation wave is complete: AFB, 1UP, VP, IDG, GGSoft, Sigma, and the IDG cancel reverse path are all locally verified and documented. The remaining risk is no longer provider mapping correctness; it is runtime drift during staging rollouts.

Recent staging incidents showed two concrete failure modes:

1. `Games-Labs-Provider` had `GAME_API_URL` pointed at an in-cluster DNS name from a VPS Docker runtime, so `SettleRound` could not resolve Game.
2. `Games-Labs-Game` and `Games-Labs-Missions` were pointed at different `RABBITMQ_URL` values, so `turnover.settled` / `turnover.reversed` were published and consumed on different brokers.

We now need a rollout-hardening task that turns those lessons into canonical runtime configuration, repeatable post-deploy verification, and guardrails for future shared-lib and settlement rail releases.

## Scope

### Target services

| Service | Role |
| --- | --- |
| `Games-Labs-Provider` | Owns `GAME_API_URL` usage, provider runtime grep patterns, and VPS-side deploy guidance. |
| `Games-Labs-Game` | Owns NodePort/runtime contract and `RABBITMQ_URL` fail-fast expectations. |
| `Games-Labs-Missions` | Must be aligned to the same RabbitMQ broker and consumer expectations as Game. |
| repo-local deploy workflows | Hold deploy-time env propagation and should reflect canonical runtime variables. |
| `ai-dev-office` | Should own the shared rollout runbook/checklist and task evidence for settlement rail runtime verification. |

### Affected files

- `Games-Labs-Provider/README.md`
- `Games-Labs-Game/README.md`
- `Games-Labs-Missions/README.md`
- `Games-Labs-Provider/.github/workflows/dev.yml`
- `Games-Labs-Game/.github/workflows/deploy.yml`
- `Games-Labs-Missions/.github/workflows/deploy.yml`
- `ai-dev-office/docs/turnover-rollout-runbook.md`
- `ai-dev-office/scripts/verify-turnover-rollout.sh`
- `ai-dev-office/runs/TASK-077/verification-evidence.md`

### Explicitly out of scope

- Do not change provider turnover business logic in this task.
- Do not implement Sigma real-wallet integration here.
- Do not add a historical backfill for old rounds/events here.
- Do not introduce production alerting/observability stack changes yet; this task should prepare the runtime verification foundation first.

## Acceptance criteria

- [ ] Canonical staging/runtime values and ownership for `GAME_API_URL` and `RABBITMQ_URL` are documented in one place and reflected consistently across Provider/Game/Missions docs.
- [ ] A single rollout runbook/checklist exists for turnover rails, covering `SettleRound`, `ReverseRound`, `round_lifecycles`, `daily_activity_consumer_events`, and `quest/overview` progress verification.
- [ ] Deploy workflow guidance clearly shows where `GAME_API_URL` and broker values come from, so VPS Docker and k8s environments cannot silently drift.
- [ ] The runbook includes an explicit IDG cancel reverse proof path: bet -> settle -> cancel -> reverse -> `reversed_at` -> `turnover.reversed`.
- [ ] Shared-lib release/bump discipline is documented, including `go mod tidy` and `GOWORK=off go build -mod=readonly ./...` expectations after contract changes.
- [ ] Verification artifacts state what is still intentionally deferred after this task (for example Sigma real-wallet E2E and full monitoring/alerts).

## Technical plan

1. Consolidate the current runtime truth from Provider/Game/Missions READMEs and recent task evidence into one shared rollout runbook.
2. Document the canonical staging values and deploy origins for `GAME_API_URL`, Game NodePort, and the shared RabbitMQ broker used by Game and Missions.
3. Add an operator-friendly verification script or command bundle for the standard checks: Provider logs, Game/Missions env checks, RabbitMQ queues/bindings, SQL for `round_lifecycles`, SQL for `daily_activity_consumer_events`, and final API/UI checks.
4. Update deploy workflow docs/comments so the env sources match the new canonical runbook and reduce drift between Docker-on-VPS and k8s runtime assumptions.
5. Record explicit deferred items so future tasks can branch cleanly into Sigma real-wallet rollout and monitoring/alerts instead of re-discovering scope.

## Risks

| Risk | Mitigation |
| --- | --- |
| Runbook drifts from real deploy behavior. | Verify every documented command against the current repo/workflow files and recent staging evidence. |
| Docs become fragmented again across service READMEs. | Make the new `ai-dev-office` runbook the canonical reference and keep service READMEs concise but linked. |
| Workflow updates could accidentally change live deploy behavior while trying to document it. | Scope workflow edits to clarification/consistency only unless a real env propagation bug is directly confirmed. |
| Task grows into full observability or Sigma runtime work. | Keep those explicitly deferred in the acceptance criteria and evidence. |

## Assignment

- Primary: `dev-2`
- Parallel: `false`

## Next action

Run `./ai-dev-office/run-agent.sh TASK-077 dev-2`.
