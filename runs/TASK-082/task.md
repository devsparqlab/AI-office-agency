# TASK-082: Add DevOps / Delivery Skill Layer to ai-skills

## Short name
`devops-delivery-skill-layer`

## Type
chore

## Priority
medium

## Parent / Epic
- Parent: none
- Epic: AI Office Capability Coverage

## Status

The AI Dev Office has a `devops` agent contract but `ai-skills` has no
DevOps/delivery thinking layer. The closest skills (`dependency-guard`,
`release-checklist`, `datadog-observability`) only touch the edges of the real
delivery surface. The actual stack is GHCR + GitHub Actions (build-push +
rollout-restart) + k3s + Kustomize + ArgoCD, and none of it has a review skill.
This task adds the Tier-1 delivery skills and wires the `devops` agent to route
into them.

## PM Contract

```yaml
task:
  id: TASK-082
  title: Add DevOps / Delivery Skill Layer to ai-skills
  short_name: devops-delivery-skill-layer
  parent: none
  epic: AI Office Capability Coverage
  type: chore
  priority: medium
  created_at: '2026-06-10'
```

## Scope

### Target repos

| Repo | Reason |
| --- | --- |
| `ai-skills` | Add the three Tier-1 delivery skills, update VERSION.md and README.md, pass the validator. |
| `ai-dev-office` | Route the `devops` agent into the new skills and record task status. |

### Affected files

| Path | Action | Description |
| --- | --- | --- |
| `ai-skills/skills/container-build-review/SKILL.md` | created | Dockerfile / multi-stage / image build review skill. |
| `ai-skills/skills/cicd-pipeline-review/SKILL.md` | created | GitHub Actions / CI/CD pipeline review skill. |
| `ai-skills/skills/k8s-deploy-review/SKILL.md` | created | k3s + Kustomize deployment manifest review skill. |
| `ai-skills/VERSION.md` | modified | Add a Delivery / Infra skill layer and list the three skills. |
| `ai-skills/README.md` | modified | Document the new skills in the skill tables. |
| `ai-dev-office/agents/devops.md` | modified | Route the agent into the new skills. |
| `ai-dev-office/runs/TASK-082/*` | created | Task status and handoff artifacts. |

### Explicitly excluded

- Tier-2 skills (`gitops-deploy-review`, `incident-response`, `secrets-management`) — separate follow-up task.
- Any change to the Games-Labs service repos themselves (no Dockerfile/CI edits here; this is the thinking layer only).

## Acceptance Criteria

- [ ] Three new skills exist under `ai-skills/skills/` with valid SKILL.md frontmatter and all required sections.
- [ ] Each skill's frontmatter `name` matches its folder name.
- [ ] `ai-skills/VERSION.md` lists all three skills and reflects a Delivery / Infra layer.
- [ ] `ai-skills/README.md` lists all three skills.
- [ ] `ai-dev-office/agents/devops.md` references the new skills as its thinking layer.
- [ ] `scripts/validate-skills.sh` passes.

## Verification

- `cd ai-skills && bash scripts/validate-skills.sh`

## Assignment

- Primary: `devops`
- Parallel: `false`

## Artifacts

- `ai-dev-office/runs/TASK-082/task.md`
- `ai-dev-office/runs/TASK-082/status.yaml`

## Next Action

Create the three skills, update VERSION.md/README.md, wire devops.md, then run
the validator.
