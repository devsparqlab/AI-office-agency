# Claude Gemini Manual Advisory Lanes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-pass Claude and Gemini documentation support as manual advisory lanes while keeping the existing Codex-first automation and YAML workflow unchanged.

**Architecture:** This work is documentation-first and runtime-preserving. New Claude/Gemini guidance lives in standalone docs, existing repo entrypoints gain discovery links and explicit boundaries, and verification focuses on preventing wording drift that would make Claude/Gemini sound like supported runners or fallback paths.

**Tech Stack:** Markdown docs, YAML config comments, existing shell-based integration verification

---

## File Structure

- `docs/claude.md`
  - New Claude guide for manual advisory lane usage.
  - Must define `advice mode` and `role response mode`.
  - Must state that output is non-official until normalize + validate.

- `docs/gemini.md`
  - New Gemini guide mirroring the same contract and terminology as the Claude guide.

- `README.md`
  - Docs index entrypoint.
  - Must expose the new guides without changing the repo's Codex-first claim.

- `SKILL.md`
  - Skill entrypoint doc.
  - Must surface the new guides as optional companions, not primary runtime docs.

- `model-routing-codex-first.md`
  - Routing policy doc.
  - Must preserve Codex-first automation and add a short manual advisory lane note for Claude/Gemini.

- `role-prompt-templates-codex-first.md`
  - Role starter prompt doc.
  - Must mention where Claude/Gemini help as critique partners while keeping Codex-first wording intact.

- `office.config.example.yaml`
  - Optional touch only.
  - Add a clarifying comment only if it helps and does not imply runtime support.

- `docs/superpowers/specs/2026-06-05-claude-gemini-manual-advisory-lanes-design.md`
  - Approved design reference.
  - Use this as the scope boundary and terminology source during implementation.

---

### Task 1: Author The Claude And Gemini Manual Advisory Lane Guides

**Files:**
- Create: `docs/claude.md`
- Create: `docs/gemini.md`
- Reference: `docs/codex.md`
- Reference: `docs/cursor.md`
- Reference: `docs/superpowers/specs/2026-06-05-claude-gemini-manual-advisory-lanes-design.md`

- [ ] **Step 1: Write the guide outline before drafting content**

Create the same section structure in both new docs:

```md
# <Provider> Manual Advisory Lane Guide

## Purpose
## What This Is Not
## Operating Modes
## Best Role Fit
## Manual Workflow
## Starter Prompt Pattern
## Normalization And Validation Boundary
## Limitations
## Related Docs
```

- [ ] **Step 2: Draft `docs/claude.md` with the required boundary language**

Include all of the following points in the actual doc text:

```md
- Claude is a `manual advisory lane`, not a configured runner.
- Use `advice mode` for critique, questions, alternative approaches, and second-opinion review.
- Use `role response mode` when you want Claude to draft an AI Dev Office role-shaped response.
- Claude output is non-official until a human operator normalizes it into `runs/<task-id>/<agent>-output.yaml` and runs `ruby ai-dev-office/validate-yaml.rb <task-id>`.
- Do not describe Claude as part of `runner_selector.priority`, `fallback`, `auto`, or `dispatch`.
```

- [ ] **Step 3: Draft `docs/gemini.md` with the same contract and terminology**

Mirror the Claude guide structure, but keep provider-specific wording neutral:

```md
- Gemini is a `manual advisory lane`, not a configured runner.
- Keep the same two operating modes: `advice mode` and `role response mode`.
- Keep the same normalize + validate boundary before any output becomes official workflow state.
- Keep the same warnings against `fallback`, `priority`, `auto`, or `dispatch` language.
```

- [ ] **Step 4: Add a starter prompt pattern for both guides**

Use a shared prompt shape like this in both files:

```text
You are assisting within AI Dev Office as a manual advisory lane.
Read:
1. agents/<role>.md
2. runs/<task-id>/task.md
3. runs/<task-id>/status.yaml
4. prior output files if relevant

Mode: <advice mode | role response mode>

Constraints:
- Do not assume you are the official runner.
- Keep recommendations evidence-oriented.
- If producing a role-shaped response, match the AI Dev Office output contract as closely as possible.
- The response will remain draft until normalized and validated by a human operator.
```

- [ ] **Step 5: Review the two guides for terminology consistency**

Run:

```bash
rg -n "manual advisory lane|advice mode|role response mode|non-official|normalize|validate" docs/claude.md docs/gemini.md
```

Expected: both files contain all required boundary terms.

- [ ] **Step 6: Commit**

```bash
git add docs/claude.md docs/gemini.md
git commit -m "docs: add Claude and Gemini advisory lane guides"
```

### Task 2: Update Repo Entrypoints To Surface The New Guides Without Changing Runtime Claims

**Files:**
- Modify: `README.md`
- Modify: `SKILL.md`
- Modify: `model-routing-codex-first.md`
- Modify: `role-prompt-templates-codex-first.md`
- Reference: `docs/claude.md`
- Reference: `docs/gemini.md`
- Reference: `docs/codex.md`

- [ ] **Step 1: Update `README.md` documentation index**

Add new rows to the docs table with wording shaped like:

```md
| [docs/claude.md](docs/claude.md) | Claude manual advisory lane |
| [docs/gemini.md](docs/gemini.md) | Gemini manual advisory lane |
```

Do not change the top-level repo description away from Codex-first orchestration.

- [ ] **Step 2: Update `SKILL.md` docs list**

Add the new docs to the "Docs (read these first)" table with wording that keeps them secondary to runtime docs:

```md
| [docs/claude.md](docs/claude.md) | Claude manual advisory lane |
| [docs/gemini.md](docs/gemini.md) | Gemini manual advisory lane |
```

Keep `docs/codex.md` and `docs/cursor.md` as the true runtime docs.

- [ ] **Step 3: Update `model-routing-codex-first.md` with a dedicated advisory-lane note**

Add a short section shaped like:

```md
## Secondary Manual Advisory Lanes

- Claude and Gemini may be used as `manual advisory lanes` for PM critique, reviewer second opinion, and selective dev/debugger cross-checks.
- They are not part of automated runner routing.
- They do not replace reviewer/debugger gates.
- Any role-shaped output remains draft until normalized into AI Dev Office artifacts and validated.
```

- [ ] **Step 4: Update `role-prompt-templates-codex-first.md` with light role guidance**

For `pm`, `reviewer`, `dev`, and `debugger`, add one short sentence each that says when Claude/Gemini are useful as critique partners.

Use wording shaped like:

```md
Claude or Gemini may be used as a manual advisory lane for second-opinion critique, but Codex remains the primary execution path.
```

Do not rewrite the whole file into a multi-runner matrix.

- [ ] **Step 5: Build a wording safety pass over the modified entrypoints**

Run:

```bash
rg -n "Claude|Gemini|manual advisory lane|fallback|priority|dispatch|auto" README.md SKILL.md model-routing-codex-first.md role-prompt-templates-codex-first.md
```

Expected:
- Claude/Gemini mentions exist
- `manual advisory lane` wording is present
- no sentence implies Claude/Gemini are part of automated fallback or dispatch

- [ ] **Step 6: Commit**

```bash
git add README.md SKILL.md model-routing-codex-first.md role-prompt-templates-codex-first.md
git commit -m "docs: surface Claude and Gemini advisory lanes"
```

### Task 3: Decide Whether A Config Comment Is Necessary

**Files:**
- Verify only: `office.config.example.yaml`
- Reference: `docs/claude.md`
- Reference: `docs/gemini.md`

- [ ] **Step 1: Inspect whether the current example config already implies runner support**

Read the `runner_selector` section and answer:
- Would a new reader assume Claude or Gemini should be added here immediately?
- Is there any ambiguity that a one-line comment would materially reduce?

Expected: a yes/no decision with justification.

- [ ] **Step 2: If needed, add one comment and nothing else**

If ambiguity is real, add only a comment near `runner_selector` shaped like:

```yaml
# Claude and Gemini are documented as manual advisory lanes, not configured auto-runners.
```

If ambiguity is low, skip this edit entirely.

- [ ] **Step 3: Re-check config wording after the decision**

Run:

```bash
rg -n "Claude|Gemini|runner_selector|auto-runners" office.config.example.yaml
```

Expected:
- either no Claude/Gemini mention at all
- or exactly one clarifying comment with no runtime claims

- [ ] **Step 4: Commit only if the file changed**

If `office.config.example.yaml` changed:

```bash
git add office.config.example.yaml
git commit -m "docs: clarify advisory lane config boundary"
```

If it did not change, do not create a no-op commit.

### Task 4: Run Verification Against Overpromise And Portable Contract Drift

**Files:**
- Verify: `docs/claude.md`
- Verify: `docs/gemini.md`
- Verify: `README.md`
- Verify: `SKILL.md`
- Verify: `model-routing-codex-first.md`
- Verify: `role-prompt-templates-codex-first.md`
- Verify: `office.config.example.yaml`
- Verify: `tests/integration/contract-foundation.sh`

- [ ] **Step 1: Run the explicit overpromise grep**

Run:

```bash
rg -n "Claude|Gemini|manual advisory lane|fallback|priority|dispatch|auto runner|auto-switch|runner_selector" README.md SKILL.md model-routing-codex-first.md role-prompt-templates-codex-first.md docs/claude.md docs/gemini.md office.config.example.yaml
```

Expected:
- `manual advisory lane` appears in the new docs and relevant entrypoints
- any `fallback`, `priority`, `dispatch`, `auto runner`, or `runner_selector` mention appears only in clarifying negative statements, never as supported behavior for Claude/Gemini

- [ ] **Step 2: Run a second grep for official-state boundary wording**

Run:

```bash
rg -n "non-official|draft|normalize|validated|official workflow state" docs/claude.md docs/gemini.md model-routing-codex-first.md
```

Expected: the normalization and validation boundary is stated explicitly.

- [ ] **Step 3: Run the portable contract integration test if contract-facing docs or config changed**

Run:

```bash
bash tests/integration/contract-foundation.sh
```

Expected: PASS

- [ ] **Step 4: Inspect git diff for accidental runtime drift**

Run:

```bash
git diff -- README.md SKILL.md model-routing-codex-first.md role-prompt-templates-codex-first.md docs/claude.md docs/gemini.md office.config.example.yaml run-agent.sh
```

Expected:
- docs-only changes
- no `run-agent.sh` changes
- no change that inserts Claude/Gemini into runner priority or fallback logic

- [ ] **Step 5: Create the final integration commit**

```bash
git add README.md SKILL.md model-routing-codex-first.md role-prompt-templates-codex-first.md docs/claude.md docs/gemini.md office.config.example.yaml
git commit -m "docs: add manual advisory lanes for Claude and Gemini"
```

If `office.config.example.yaml` was unchanged, omit it from `git add`.

## Self-Review

- Spec coverage:
  - manual advisory lane terminology is covered in Tasks 1, 2, and 4
  - advice mode vs role response mode is covered in Task 1
  - non-official until normalize + validate is covered in Tasks 1 and 4
  - no `run-agent.sh` / runner priority / fallback changes is covered in Tasks 2, 3, and 4
  - grep verification is covered in Task 4

- Placeholder scan:
  - no `TODO`, `TBD`, or abstract "write tests for it later" steps remain

- Type consistency:
  - terminology is fixed to `manual advisory lane`, `advice mode`, `role response mode`, `normalize`, and `validate`

