# TASK-077 — turnover rollout runtime hardening verification

## Runbook and helper validation

```bash
bash -n ai-dev-office/scripts/verify-turnover-rollout.sh
./ai-dev-office/scripts/verify-turnover-rollout.sh --help
```

Expected: script is syntactically valid, executable, and documents the standard rollout checks without requiring a live cluster just to read usage.

## Workflow / doc consistency checks

Review the following files together:

- `Games-Labs-Provider/.github/workflows/dev.yml`
- `Games-Labs-Game/.github/workflows/deploy.yml`
- `Games-Labs-Missions/.github/workflows/deploy.yml`
- `Games-Labs-Provider/README.md`
- `Games-Labs-Game/README.md`
- `Games-Labs-Missions/README.md`
- `ai-dev-office/docs/turnover-rollout-runbook.md`

Expected:

- Provider workflow/docs point to `GAME_API_URL=84.247.150.206:30553`
- Game workflow/docs treat `RABBITMQ_URL` as required for player activity publish
- Missions docs/workflow make it explicit that the broker must match Game exactly
- Service READMEs point back to the canonical `ai-dev-office` runbook

## Diff hygiene

```bash
git -C Games-Labs-Provider diff --check
git -C Games-Labs-Game diff --check
git -C Games-Labs-Missions diff --check
git -C ai-dev-office diff --check -- docs/turnover-rollout-runbook.md scripts/verify-turnover-rollout.sh runs/TASK-077
```

Expected: all pass.

## Deferred items after this hardening pass

- Sigma real-wallet E2E rollout is still deferred
- historical turnover/reverse backfill is still deferred
- monitoring / alerting automation is still deferred

This task intentionally stops at runtime source-of-truth, operator runbook, and workflow/documentation guardrails.
