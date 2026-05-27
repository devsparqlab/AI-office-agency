# PR-4: Codex + Cursor Documentation Cleanup Implementation Plan

> **For agentic workers:** Implement task-by-task after PR-1 contract foundation is closed. Keep PR-4 documentation-only unless a doc gap requires a tiny runner comment or template stub.

**Goal:** Make Codex and Cursor usage obvious without guessing. Split generic framework docs from Games Lab operational docs and remove machine-specific examples from portable surfaces.

**Architecture:** Restructure `README.md` into a short index, add focused guides under `docs/`, slim `SKILL.md` to an entrypoint, and keep runner/config truth in `runners/*.yaml` + `office.config.example.yaml`. Games Lab / shared-lib policy moves to profile docs — not the generic framework README.

**Tech Stack:** Markdown docs, existing runner YAML, optional integration smoke for doc links/paths.

**Depends on:** PR-1 contract foundation test (`tests/integration/contract-foundation.sh`) passing.

---

## Scope

### In scope

- README restructure (sections, navigation, shorter top-level doc)
- **Remove Games Lab / shared-lib policy from generic README** — e.g. `handler message must live only in shared-lib` (currently at README line ~15) belongs in `profiles/games-labs.md` or the target project's own `AGENTS.md`, not the portable framework README
- Dedicated Codex guide
- Dedicated Cursor guide (IDE + Cursor Agent CLI)
- Runner documentation in **docs** for `runners/codex.yaml`, `runners/cursor-agent.yaml`, `runners/cursor.yaml` (purpose / priority / selected when / fallback — do not duplicate into YAML comments; runner files already have notes)
- Template docs for `.cursor/rules` and `.cursor/agents`
- SocratiCode docs rewritten around env/profile/local config (no `/Users/earth`, no `d:\llm` in generic docs)
- Move Games Lab / shared-lib / dependency-guard operational detail out of generic README into **profile docs** (`profiles/README.md`, `profiles/games-labs.md`)
- **Shorten `SKILL.md` to entrypoint + links** — not a second README

### Out of scope

- Bootstrap/sync script behavior changes (PR-3)
- New profiles or template content beyond doc pointers (PR-2)
- Runtime behavior changes in `run-agent.sh` unless required to match documented flags
- Bulk-editing `docs/superpowers/plans/**` (historical task plans intentionally contain machine paths and Games Lab references)

---

## Generic doc surfaces (portable)

These are the **only** docs that must stay machine/project-neutral after PR-4:

```text
README.md
SKILL.md
docs/getting-started.md
docs/codex.md
docs/cursor.md
docs/socraticode.md
docs/cursor-templates.md
```

Everything else — including `docs/superpowers/plans/**`, `runs/**`, task evidence — is **out of generic scan scope**.

When extending `contract-foundation.sh` for PR-4 doc checks:
- **Do not** scan `docs/` recursively
- **Do** whitelist the generic surfaces above (plus existing PR-1 portable files: `AGENTS.md`, `office.config.example.yaml`, `templates/install-manifest.yaml`, `docs/config-profile-merge-contract.md`, project templates)
- Forbidden patterns in whitelisted files: `../AGENTS.md`, `/Users/earth`, `d:\llm`, `Games-Labs-`, `github.com/SparqLab/shared-lib`, `handler message`

---

## Target doc layout (after PR-4)

```text
README.md                          # short index + links only
SKILL.md                           # entrypoint + links only (not a README clone)
docs/
  getting-started.md               # first task, status, validate-yaml
  codex.md                         # Codex CLI runner, auto mode, profile
  cursor.md                        # Cursor IDE + cursor-agent runner
  socraticode.md                   # env/profile/local-config discovery flow
  cursor-templates.md              # .cursor/rules + .cursor/agents install guide
  config-profile-merge-contract.md # existing (link, do not duplicate)
profiles/
  README.md                        # when to pick generic / go-microservice / games-labs
  games-labs.md                    # Games Lab ops: dependency guard, shared-lib, handler message policy
```

**Profile doc rule:** use `profiles/README.md` for selection guidance. Add `profiles/games-labs.md` only when Games Lab operational detail does not fit in `profiles/games-labs.yaml` comments + README selection table. **Do not** create `docs/profiles/` — keep profile docs next to profile YAML.

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

- [ ] **Step 2: Remove non-portable policy from generic README**

Remove from README (move to `profiles/games-labs.md` with link from `profiles/README.md`):
- `handler message must live only in shared-lib`
- dependency guard / shared-lib / `Games-Labs-Provider` operational detail
- any other Games Lab monorepo assumptions

- [ ] **Step 3: Remove duplicate long sections**

Relocate to dedicated docs:
- SocratiCode JSON examples → `docs/socraticode.md`
- Runner priority/fallback details → `docs/codex.md` + `docs/cursor.md`
- Dependency guard operational detail → `profiles/games-labs.md`

- [ ] **Step 4: Verify generic surfaces**

Run: `tests/integration/contract-foundation.sh` (after Task 5 extends whitelist)

---

### Task 2: Codex guide

**Files:**
- Create: `docs/codex.md`

- [ ] **Step 1: Document default runner**

Cover in **docs** (not runner YAML comments):
- purpose, priority rank (1st), selected when (default / explicit `codex` arg)
- fallback: switches to `cursor-agent`, then `cursor` on quota/auth patterns
- `./run-agent.sh TASK-NNN <agent>` defaulting to Codex
- auto pipeline behavior and when it stops on blocked tasks
- point to `runners/codex.yaml` as source of truth for command template

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

Document in **docs** (purpose / priority / selected when / fallback for `runners/cursor.yaml` and `runners/cursor-agent.yaml`):
- `./run-agent.sh TASK-NNN dev cursor` generating `.cursor-prompt.md`
- reading `agents/<role>.md` + `runs/<task>/task.md` + `status.yaml`
- saving `<role>-output.yaml` and running `validate-yaml.rb`

- [ ] **Step 2: Cursor Agent CLI (`cursor-agent` runner)**

- priority rank (2nd), selected when Codex fails with switchable patterns or explicit `cursor-agent` arg
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
- Create: `profiles/games-labs.md` (Games Lab ops moved out of README)

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

Remove from **whitelisted generic surfaces only**:
- `/Users/earth/Documents/GitHub`
- `d:\llm`
- "this Mac" wording where not necessary

- [ ] **Step 3: Profile-scoped Games Lab operational notes**

In `profiles/games-labs.md` document:
- dependency guard / shared-lib alignment / `Games-Labs-Provider` exclude policy
- `handler message must live only in shared-lib` (target-project rule when using games-labs profile)
- link from `profiles/README.md`; do not duplicate in generic README

---

### Task 5: Generic doc scan + link checks

**Files:**
- Modify: `tests/integration/contract-foundation.sh`
- Modify: `README.md` integration test table

- [ ] **Step 1: Extend contract-foundation with whitelisted generic doc scan**

Add whitelisted files (see **Generic doc surfaces** above) to forbidden-pattern scan.

**Do not** scan `docs/` recursively or `docs/superpowers/plans/**`.

- [ ] **Step 2: Add doc link smoke (recommended)**

Verify README-linked generic docs exist (`docs/getting-started.md`, `docs/codex.md`, etc.) after Task 1–4 create them.

- [ ] **Step 3: Slim `SKILL.md` to entrypoint + links**

Target structure (~80–120 lines max):
- frontmatter + one-paragraph what this is
- link table: getting-started, codex, cursor, socraticode, profiles
- minimal command examples (3–5 lines total)
- link to README integration tests

**Do not** copy long README sections (SocratiCode JSON, runner fallback tables, dependency guard) into SKILL.

---

### Task 6: Verification

- [ ] Run `tests/integration/contract-foundation.sh` (with extended whitelist scan)
- [ ] Run `tests/integration/bootstrap-sync.sh`
- [ ] Run `tests/integration/profile-merge.sh`
- [ ] Confirm `SKILL.md` line count materially shorter than pre-PR-4 README-style SKILL
- [ ] Manual spot-check: new user can answer "how do I run Reviewer in Codex?" and "how do I use Cursor IDE?" from docs alone

---

## Acceptance criteria (PR-4 done)

- [ ] README is a short index; detailed flows live in `docs/`
- [ ] Generic README contains **no** `handler message`, shared-lib policy, or Games-Labs operational assumptions
- [ ] `profiles/games-labs.md` holds Games Lab / shared-lib policy; linked from `profiles/README.md`
- [ ] Dedicated `docs/codex.md` and `docs/cursor.md` exist and are linked from README + SKILL
- [ ] `docs/cursor-templates.md` explains `.cursor/rules` and `.cursor/agents` install/template usage
- [ ] Runner purpose / priority / selected when / fallback documented in **docs**, not duplicated as new YAML comments
- [ ] Whitelisted generic docs contain no `/Users/earth`, `d:\llm`, or Games-Labs-specific operational assumptions
- [ ] `docs/superpowers/plans/**` left unchanged (historical content exempt)
- [ ] SocratiCode guidance is env/profile/local-config based
- [ ] `SKILL.md` is entrypoint + links only — not a second README
- [ ] PR-1 contract test still passes (extended whitelist included)

---

## Suggested PR sequencing reminder

| PR | Status on `main` before this work | Next action |
|----|-----------------------------------|-------------|
| PR-1 | Closed with `contract-foundation.sh` | done |
| PR-2 | Mostly done; generic doc scrub deferred to PR-4 | optional small follow-up PR |
| PR-3 | Mostly done | optional manifest-driven sync follow-up |
| PR-4 | This plan | implement Task 1 next |
