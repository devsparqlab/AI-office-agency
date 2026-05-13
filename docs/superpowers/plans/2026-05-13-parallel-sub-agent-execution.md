# Parallel Sub-Agent Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `./run-agent.sh <TASK-ID> auto` to run `dev` and `dev-2` in parallel when PM explicitly marks subtasks as parallel-safe with non-overlapping ownership.

**Architecture:** Keep `run-agent.sh` as the single orchestrator. After PM completes, validate the PM output; valid parallel plans run `dev` and `dev-2` as background jobs with separate logs, then route to `reviewer`. Invalid parallel plans fail clearly instead of guessing.

**Tech Stack:** Bash orchestration, Ruby YAML parsing, existing `validate-yaml.rb`, integration shell tests.

---

### Task 1: Add Parallel Auto Integration Coverage

**Files:**
- Create: `tests/integration/auto-parallel.sh`

- [ ] Write an integration test that uses a fake `codex` binary to create deterministic PM/dev/dev-2/reviewer outputs.
- [ ] Cover valid parallel routing, duplicate `owned_files`, shared-file conflicts, sequential fallback, and per-agent log creation.
- [ ] Run `bash tests/integration/auto-parallel.sh` and confirm it fails before implementation because auto mode remains sequential.

### Task 2: Implement Parallel Plan Validation And Execution

**Files:**
- Modify: `run-agent.sh`

- [ ] Add a Ruby-backed helper that reads `pm-output.yaml` and validates `assignment.parallel`, `plan.subtasks[].agent`, `owned_files`, `parallel_safe`, duplicate file ownership, and shared-file conflicts.
- [ ] Add a background runner that writes `runs/<TASK-ID>/<agent>-parallel.log`, staggers the second agent by 1-3 seconds by default, waits for both agents, and summarizes success/failure.
- [ ] Update PM status sync so parallel PM output enters `assigned_parallel`.
- [ ] Allow `dev` and `dev-2` route enforcement bypass only when invoked by the internal parallel auto runner.
- [ ] Update auto mode to run the parallel dev lanes after PM when validation succeeds, then route to `reviewer`.

### Task 3: Update Agent And Operator Documentation

**Files:**
- Modify: `agents/pm.md`
- Modify: `agents/dev.md`
- Modify: `agents/dev-2.md`
- Modify: `QUICKSTART.md`
- Modify: `docs/skills/office-intake.md`
- Modify: `docs/skills/office-verify.md`

- [ ] Document the PM parallel contract and “if in doubt, choose sequential” rule.
- [ ] Tell dev agents to work only on their assigned parallel subtasks when PM supplies them.
- [ ] Document auto sequential vs parallel behavior, log files, shared-file constraints, and verification expectations.

### Task 4: Verify

**Files:**
- Test: `tests/integration/auto-parallel.sh`
- Test: `tests/integration/status-command.sh`
- Test: `tests/integration/dependency-policy.sh`

- [ ] Run `bash tests/integration/auto-parallel.sh`.
- [ ] Run `bash tests/integration/status-command.sh`.
- [ ] Run `bash tests/integration/dependency-policy.sh`.
- [ ] Run `./run-agent.sh status` as a smoke check.
