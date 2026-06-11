# TASK-083: Add Tier-2 DevOps / Delivery Skills (GitOps, Incident, Secrets)

## Short name
`devops-tier2-skills`

## Type
chore

## Priority
medium

## Parent / Epic
- Parent: `TASK-082`
- Epic: AI Office Capability Coverage

## Status

TASK-082 added the Tier-1 delivery skills (container/CI/k8s) and explicitly
excluded Tier 2. This task adds the three Tier-2 skills that close the remaining
gaps surfaced by the real stack: GitOps drift, incident/runbook reasoning, and
secret management. VERSION.md already lists these as planned.

## PM Contract

```yaml
task:
  id: TASK-083
  title: Add Tier-2 DevOps / Delivery Skills (GitOps, Incident, Secrets)
  short_name: devops-tier2-skills
  parent: TASK-082
  epic: AI Office Capability Coverage
  type: chore
  priority: medium
  created_at: '2026-06-10'
```

## Scope

### Affected files

| Path | Action | Description |
| --- | --- | --- |
| `ai-skills/skills/gitops-deploy-review/SKILL.md` | created | ArgoCD / GitOps sync, drift, image-version-in-git review. |
| `ai-skills/skills/incident-response/SKILL.md` | created | Incident triage, runbook, rollback decision, blast radius, comms. |
| `ai-skills/skills/secrets-management/SKILL.md` | created | Secret provisioning, rotation, no-plaintext, OIDC/external-secrets. |
| `ai-skills/VERSION.md` | modified | Promote the three skills from planned to present. |
| `ai-skills/README.md` | modified | Add the three skills to the Delivery / Infra table. |
| `ai-dev-office/agents/devops.md` | modified | Route the agent into the new skills. |
| `ai-dev-office/runs/TASK-083/*` | created | Task status and handoff artifacts. |

### Explicitly excluded

- Any change to Games-Labs service repos (no manifest/CI edits here; thinking layer only).

## Acceptance Criteria

- [ ] Three new skills exist with valid SKILL.md frontmatter and all required sections.
- [ ] Each skill's frontmatter `name` matches its folder name.
- [ ] VERSION.md and README.md list all three skills as present.
- [ ] `agents/devops.md` routes into the new skills.
- [ ] `scripts/validate-skills.sh` passes.

## Verification

- `cd ai-skills && bash scripts/validate-skills.sh`

## Assignment

- Primary: `devops`
- Parallel: `false`

## Next Action

Create the three skills, promote them in VERSION.md/README.md, wire devops.md,
then run the validator.
