# Office Usability Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add non-mutating intake, verify, and cleanup operator commands.

**Architecture:** Extend `run-agent.sh` with early command dispatch before normal `<TASK_ID> <AGENT>` validation. Keep implementation in Ruby snippets inside the runner, following the existing style used by status and validation helpers.

**Tech Stack:** Bash, Ruby YAML parsing, shell integration tests.

---

### Task 1: Failing Integration Test

**Files:**
- Create: `tests/integration/operator-commands.sh`

- [ ] **Step 1: Write failing scenarios**

Cover `intake`, `verify`, and `cleanup` with temporary tasks under `runs/`.

- [ ] **Step 2: Run test to verify RED**

Run: `tests/integration/operator-commands.sh`
Expected: FAIL because commands are not implemented.

### Task 2: Implement Commands

**Files:**
- Modify: `run-agent.sh`

- [ ] **Step 1: Add usage lines**

Add usage for `intake`, `verify`, and `cleanup`.

- [ ] **Step 2: Add command dispatch**

Dispatch these commands before normal task-agent argument validation.

- [ ] **Step 3: Implement non-mutating Ruby helpers**

Add deterministic helpers for task id selection, request classification, verification recommendation, and cleanup reporting.

- [ ] **Step 4: Run test to verify GREEN**

Run: `tests/integration/operator-commands.sh`
Expected: PASS.

### Task 3: Documentation

**Files:**
- Modify: `README.md`
- Modify: `QUICKSTART.md`
- Modify: `SKILL.md`
- Modify: `docs/skills/office-intake.md`
- Modify: `docs/skills/office-verify.md`
- Modify: `docs/skills/office-cleanup.md`

- [ ] **Step 1: Document command examples**

Add examples for all three commands and clarify that they are read-only/previews.

### Task 4: Verification

**Files:**
- Test: `tests/integration/operator-commands.sh`
- Test: `tests/integration/status-command.sh`

- [ ] **Step 1: Run targeted tests**

Run both integration tests and `bash -n` for runner/test scripts.

- [ ] **Step 2: Run runtime validation spot check**

Run `ruby validate-yaml.rb TASK-047`.

- [ ] **Step 3: Inspect diff scope**

Run `git status --short` and confirm only phase 1/2 planned files changed.
