# Office Usability Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only office status command and align v2 documentation.

**Architecture:** Keep `run-agent.sh` as the entry point and add a status command before normal task-agent argument validation. Use Ruby snippets for YAML parsing, reuse `validate-yaml.rb` for validation status, and keep docs changes scoped to active runtime behavior.

**Tech Stack:** Bash, Ruby YAML parsing, existing integration shell tests.

---

### Task 1: Status Command Integration Test

**Files:**
- Create: `tests/integration/status-command.sh`

- [ ] **Step 1: Write the failing test**

Create `tests/integration/status-command.sh` with temporary tasks that cover all-task summaries, single-task summaries, blocked tasks, suggested next commands, validation state, and missing task handling.

- [ ] **Step 2: Run the test to verify it fails**

Run: `tests/integration/status-command.sh`
Expected: FAIL because `run-agent.sh status` is not implemented yet.

### Task 2: Status Command Implementation

**Files:**
- Modify: `run-agent.sh`

- [ ] **Step 1: Add `status [TASK_ID]` usage text**

Update usage output to include:

```text
./run-agent.sh status [TASK_ID]
```

- [ ] **Step 2: Add read-only status handling before normal argument validation**

When `$1` is `status`, call a status helper and exit before requiring an agent argument.

- [ ] **Step 3: Implement YAML-backed summary helpers**

Use Ruby to read `runs/*/status.yaml`, print concise fields, derive next command from `current_agent`, and call `validate-yaml.rb` for validation state.

- [ ] **Step 4: Run the status integration test**

Run: `tests/integration/status-command.sh`
Expected: PASS.

### Task 3: Documentation Alignment

**Files:**
- Modify: `README.md`
- Modify: `QUICKSTART.md`
- Modify: `SKILL.md`
- Modify: `../AGENTS.md`
- Create: `docs/skills/office-intake.md`
- Create: `docs/skills/office-verify.md`
- Create: `docs/skills/office-cleanup.md`

- [ ] **Step 1: Document the status command**

Add concise status command examples to README, QUICKSTART, and SKILL.

- [ ] **Step 2: Align runner priority**

Change parent AGENTS guidance to Codex-first: `codex`, `cursor-agent`, `cursor`.

- [ ] **Step 3: Mark legacy roles clearly**

Update QUICKSTART so `planner` and `tester` are described as legacy files, not active v2 runner roles.

- [ ] **Step 4: Add future skill guides**

Create short guide docs for office intake, verification planning, and cleanup with goals, inputs, outputs, and phase-2 implementation notes.

### Task 4: Verification

**Files:**
- Test: `tests/integration/status-command.sh`
- Test: `ruby validate-yaml.rb TASK-047`

- [ ] **Step 1: Run targeted integration test**

Run: `tests/integration/status-command.sh`
Expected: PASS.

- [ ] **Step 2: Run existing validation spot check**

Run: `ruby validate-yaml.rb TASK-047`
Expected: PASS for the existing runtime files or report existing validation failures without hiding them.

- [ ] **Step 3: Inspect git diff**

Run: `git diff --stat`
Expected: only planned files changed.
