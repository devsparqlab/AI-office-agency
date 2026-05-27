# PR-4: Codex + Cursor Documentation Cleanup Implementation Plan

> **For agentic workers:** Implement task-by-task after PR-1 contract foundation is closed. Keep PR-4 documentation-only unless a doc gap requires a tiny runner comment or template stub.

**Goal:** Make Codex and Cursor usage obvious without guessing. Split generic framework docs from Games Lab operational docs and remove machine-specific examples from portable surfaces.

**Architecture:** Restructure `README.md` into stable sections, add focused guides under `docs/`, and keep runner/config truth in `runners/*.yaml` + `office.config.example.yaml`. Generic docs link to profile-specific docs (`profiles/games-labs.yaml`, dependency guard README section moved behind profile note).

**Tech Stack:** Markdown docs, existing runner YAML, optional integration smoke for doc links/paths.

**Depends on:** PR-1 contract foundation test (`tests/integration/contract-foundation.sh`) passing.

---

## Scope

### In scope

- README restructure (sections, navigation, shorter top-level doc)
- Dedicated Codex guide
- Dedicated Cursor guide (IDE + Cursor Agent CLI)
- Runner documentation for `runners/codex.yaml`, `runners/cursor-agent.yaml`, `runners/cursor.yaml`
- Template docs for `.cursor/rules` and `.cursor/agents`
- SocratiCode docs rewritten around env/profile/local config (no `/Users/earth`, no `d:\llm` in generic docs)
- Move Games Lab / shared-lib / dependency-guard operational detail out of generic README into profile-oriented docs

### Out of scope

- Bootstrap/sync script behavior changes (PR-3)
- New profiles or template content (PR-2)
- Runtime behavior changes in `run-agent.sh` unless required to match documented flags

---

## Target doc layout (after PR-4)

```text
README.md                          # overview + links only
docs/
  getting-started.md               # first task, status, validate-yaml
  codex.md                         # Codex CLI runner, auto mode, env
  cursor.md                        # Cursor IDE + cursor-agent runner
  socraticode.md                   # env/profile/local-config discovery flow
  cursor-templates.md              # .cursor/rules + .cursor/agents install guide
  config-profile-merge-contract.md # existing (link, do not duplicate)
profiles/README.md                 # when to pick generic/go-microservice/games-labs
```

---

### Task 1: README restructure (navigation only)

**Files:**
- Modify: `README.md`
- Create: `docs/getting-started.md`

- [ ] **Step 1: Extract Quick Start + operator helpers**

Move detailed command walkthrough from README into `docs/getting-started.md`. Keep README to:
- Framework contract summary (5–10 lines)
- Link to `AGENTS.md`, merge contract, profiles, templates
- Links to Codex/Cursor/SocratiCode guides
- Integration test index (one table)

- [ ] **Step 2: Remove duplicate long sections**

Relocate to dedicated docs:
- SocratiCode JSON examples → `docs/socraticode.md`
- Runner priority/fallback details → `docs/codex.md` + `docs/cursor.md`
- Dependency guard operational detail → `profiles/README.md` or `docs/profiles/games-labs.md`

- [ ] **Step 3: Verify no generic README references**

Run: `tests/integration/contract-foundation.sh`
Expected: PASS (extend test in Task 5 if README is added to portable scan set selectively)

---

### Task 2: Codex guide

**Files:**
- Create: `docs/codex.md`

- [ ] **Step 1: Document default runner**

Cover:
- `./run-agent.sh TASK-NNN <agent>` defaulting to Codex
- explicit `codex` runner arg
- `runners/codex.yaml` fields (command template, env passthrough, output expectations)
- auto pipeline behavior and when it stops on blocked tasks

- [ ] **Step 2: Document profile usage for Codex sessions**

```bash
./run-agent.sh --profile games-labs TASK-NNN reviewer
OFFICE_PROFILE=generic ./run-agent.sh TASK-NNN pm
```

- [ ] **Step 3: Link to role prompts and output contracts**

Point to `agents/*.md`, `validate-yaml.rb`, and `role-prompt-templates-codex-first.md`.

---

### Task 3: Cursor guide

**Files:**
- Create: `docs/cursor.md`
- Create: `docs/cursor-templates.md`

- [ ] **Step 1: Cursor IDE interactive flow**

Document:
- `./run-agent.sh TASK-NNN dev cursor` generating `.cursor-prompt.md`
- reading `agents/<role>.md` + `runs/<task>/task.md` + `status.yaml`
- saving `<role>-output.yaml` and running `validate-yaml.rb`

- [ ] **Step 2: Cursor Agent CLI (`cursor-agent` runner)**

Document `runners/cursor-agent.yaml`:
- when runner auto-switch selects it
- differences vs IDE flow (terminal agent, same output contract)

- [ ] **Step 3: Cursor templates guide**

In `docs/cursor-templates.md` document:
- optional install via bootstrap/sync
- `.cursor/rules/ai-dev-office.mdc` purpose (always-on orchestration)
- optional per-role `ai-dev-office-<role>.mdc`
- `.cursor/agents/ai-dev-office-*.md` subagent stubs delegating to `agents/*.md`
- what **not** to copy (runs, local config, machine paths)

---

### Task 4: SocratiCode portable documentation

**Files:**
- Create: `docs/socraticode.md`
- Modify: `README.md`, `SKILL.md`, `office.config.example.yaml` (comments only if needed)

- [ ] **Step 1: Env/profile/local-config flow**

Document layers:
1. `SOCRATICODE_PRIMARY_PROJECT` / `SOCRATICODE_FALLBACK_PROJECT`
2. `office.config.local.yaml` and `profiles/*.local.yaml`
3. MCP vs CLI vs TCP wrapper fallback
4. Repository source code remains authoritative

- [ ] **Step 2: Remove machine-specific examples from generic docs**

Replace hardcoded paths with placeholders:
- `${SOCRATICODE_PRIMARY_PROJECT}`
- `${SOCRATICODE_FALLBACK_PROJECT}`

Remove from generic docs:
- `/Users/earth/Documents/GitHub`
- `d:\llm`
- "this Mac" wording where not necessary

- [ ] **Step 3: Keep Games Lab operational notes profile-scoped**

Move dependency guard / shared-lib / `Games-Labs-Provider` exclude notes to games-labs profile doc.

---

### Task 5: Runner YAML reference + doc checks

**Files:**
- Modify: `runners/codex.yaml` (comments only, if unclear)
- Modify: `runners/cursor-agent.yaml` (comments only, if unclear)
- Modify: `runners/cursor.yaml` (comments only, if unclear)
- Modify: `tests/integration/contract-foundation.sh` (optional link check)
- Modify: `README.md` integration test table

- [ ] **Step 1: Add short header comments to runner YAML files**

Each runner file should state: purpose, priority rank, when selected, failure fallback.

- [ ] **Step 2: Add doc link smoke (optional but recommended)**

Extend `contract-foundation.sh` or add `tests/integration/doc-links.sh` to verify README-linked docs exist.

- [ ] **Step 3: Update SKILL.md**

Keep SKILL concise; link to `docs/codex.md`, `docs/cursor.md`, `docs/getting-started.md`.

---

### Task 6: Verification

- [ ] Run `tests/integration/contract-foundation.sh`
- [ ] Run `tests/integration/bootstrap-sync.sh`
- [ ] Run `tests/integration/profile-merge.sh`
- [ ] Manual spot-check: new user can answer "how do I run Reviewer in Codex?" and "how do I use Cursor IDE?" from docs alone

---

## Acceptance criteria (PR-4 done)

- [ ] README is a short index; detailed flows live in `docs/`
- [ ] Dedicated `docs/codex.md` and `docs/cursor.md` exist and are linked from README + SKILL
- [ ] `docs/cursor-templates.md` explains `.cursor/rules` and `.cursor/agents` install/template usage
- [ ] `runners/*.yaml` each have a documented purpose in docs (not only directory tree listing)
- [ ] Generic docs contain no `/Users/earth`, `d:\llm`, or Games-Labs-specific operational assumptions
- [ ] SocratiCode guidance is env/profile/local-config based
- [ ] PR-1 contract test still passes

---

## Suggested PR sequencing reminder

| PR | Status on `main` before this work | Next action |
|----|-----------------------------------|-------------|
| PR-1 | Close with `contract-foundation.sh` | merge/commit |
| PR-2 | Mostly done; defer generic doc scrub to PR-4 | optional small follow-up PR |
| PR-3 | Mostly done | optional manifest-driven sync follow-up |
| PR-4 | This plan | implement after PR-1 gap closed |
