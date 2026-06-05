# Design

## Goal

Add first-pass Claude and Gemini support to AI Dev Office as manual advisory lanes, not automated runners.
The change should make it easy for teams to use Claude or Gemini for PM/reviewer guidance and selective dev/debugger cross-checks while keeping the existing Codex-first orchestration intact.

## Constraints

- `run-agent.sh` must remain limited to the current automated runners: `codex`, `cursor-agent`, and `cursor`.
- `runner_selector.priority`, retry logic, and fallback behavior must not imply that Claude or Gemini can be auto-dispatched.
- The existing YAML handoff contract under `runs/<task-id>/` must remain the integration point for all model outputs.
- Portable framework files must stay generic and must not depend on machine-specific Claude or Gemini installation details.
- Documentation must use the term `manual advisory lane` consistently so users do not confuse Claude/Gemini with supported runners or fallback paths.

## Options

- Option 1: docs only.
  Add `docs/claude.md` and `docs/gemini.md` with basic usage instructions and leave the rest of the framework unchanged.
  This is the smallest change, but it leaves routing language, templates, and repo entrypoints still looking Codex/Cursor-only.

- Option 2: docs and templates for equal-manual role coverage.
  Add Claude/Gemini docs plus role starter prompts that treat all roles equally.
  This improves flexibility, but it risks overpromising support and blurring the difference between advisory use and primary orchestration.

- Option 3: mixed manual advisory lanes with guardrails.
  Keep Codex-first automation exactly as-is, then add Claude/Gemini docs and prompt guidance focused on PM/reviewer first, with controlled use for dev/debugger when extra reasoning is helpful.
  Update repo-level docs and routing language so the new support is discoverable but explicitly manual.

## Decision

Choose Option 3.

It gives the team practical Claude/Gemini support without paying the cost of first-class runner integration. It also matches the current architecture more honestly: Codex remains the automated execution engine, while Claude and Gemini become optional manual advisory lanes that can help as a second-thinking partner without becoming unofficial runners in the workflow.

## Architecture

The runtime model stays unchanged:

- Automated execution remains `codex -> cursor-agent -> cursor`.
- `run-agent.sh` continues to assemble prompts, apply fallback rules, and write outputs without any Claude/Gemini invocation path.
- Claude and Gemini are documented as external/manual collaborators that can consume the same role prompts and task artifacts, then produce output that an operator may normalize back into the same `runs/<task-id>/` contract.

The documentation model expands:

- `docs/claude.md` explains when Claude is useful, how to use role prompts manually, how to return output into AI Dev Office artifacts, and what is not supported.
- `docs/gemini.md` does the same for Gemini.
- Existing entrypoint docs gain brief references so users can discover these lanes from the README and skill entrypoint without assuming automation.

The operating modes are explicit:

- `advice mode`
  Claude or Gemini returns critique, questions, alternative approaches, or review notes.
  This output informs the human operator but does not become task state directly.

- `role response mode`
  Claude or Gemini is asked to produce a response shaped like an AI Dev Office role output.
  Even in this mode, the result is still non-official until a human normalizes it into the expected YAML structure and runs validation.

## Components

- `README.md`
  Add Claude/Gemini docs to the documentation index and describe them as manual advisory lanes.

- `SKILL.md`
  Mention Claude/Gemini guides as optional companions to the core Codex/Cursor runtime docs.

- `model-routing-codex-first.md`
  Preserve Codex-first policy while adding a concise section for secondary manual advisory use.

- `role-prompt-templates-codex-first.md`
  Keep Codex-first wording, but add short hints for when Claude/Gemini are helpful as review or critique partners.

- `docs/claude.md`
  New guide for manual usage, role fit, advice mode vs role response mode, output expectations, and guardrails.

- `docs/gemini.md`
  New guide for manual usage, role fit, advice mode vs role response mode, output expectations, and guardrails.

- `office.config.example.yaml`
  Optional: add a short comment clarifying that Claude/Gemini are not configured auto-runners.
  This should only be added if the comment helps avoid confusion without polluting the portable config surface.

## Role Fit

- `pm`
  Strong fit for scope critique, ambiguity reduction, and acceptance criteria review.

- `reviewer`
  Strong fit for second-opinion review, regression-risk questioning, and architecture sanity checks.

- `dev`
  Allowed as a manual cross-check for implementation ideas, tradeoff review, or refactor critique, but not positioned as the default execution path.

- `debugger`
  Allowed for RCA cross-checking and alternate hypotheses when a Codex pass is inconclusive.

- `dev-2`, `devops`, `free-roam`
  Mention only as possible advanced/manual usage, not as headline use cases for the first pass.

## Data Flow

1. AI Dev Office continues generating role prompts and task artifacts the same way it does today.
2. A human operator may manually bring the relevant role prompt plus `task.md`, `status.yaml`, and prior outputs into Claude or Gemini.
3. Claude or Gemini produces either advice mode output or a role response mode draft.
4. That output remains non-official until a human operator normalizes it into `runs/<task-id>/<agent>-output.yaml`.
5. The operator runs existing validation before treating the artifact as official workflow state.
6. Existing downstream orchestration continues unchanged.

## Error Handling

- If a user wants fully automated Claude or Gemini dispatch, the docs must say this is not yet supported.
- If Claude or Gemini output does not fit the YAML contract, the operator must normalize it before treating it as official task state.
- If Claude or Gemini output has been copied into a task artifact but not yet validated, it must still be treated as draft, not official workflow output.
- If manual advisory output conflicts with Codex findings, the documented expectation should be to resolve the disagreement through evidence such as code, tests, logs, or a reviewer pass rather than by model preference alone.

## Verification

- Review all updated docs for consistent terminology: `runner` only for real automation paths, `manual advisory lane` for Claude/Gemini.
- Ensure README and SKILL references point to the new docs.
- Add grep-based verification that scans the updated docs for overpromising words such as `fallback`, `priority`, `auto runner`, or unsupported dispatch language around Claude/Gemini.
- Re-run the portable contract check if any contract-facing doc or config language is changed in a way that could affect framework guarantees.

## Plan

1. Add `docs/claude.md` and `docs/gemini.md` with manual workflow, role fit, advice mode vs role response mode, starter prompts, and limitations.
2. Update `README.md`, `SKILL.md`, `model-routing-codex-first.md`, and `role-prompt-templates-codex-first.md` to reference the new manual advisory lanes without changing runtime claims.
3. Do not modify `run-agent.sh`, runner priority, or fallback behavior.
4. Optionally add a minimal clarifying note in `office.config.example.yaml` only if it materially reduces confusion and does not imply runtime support.
5. Run doc-focused verification, including grep checks for overpromising language, and run `tests/integration/contract-foundation.sh` if the final edits touch portable contract expectations.

## Risks

- Main risk: documentation drift makes Claude/Gemini sound more automated than they are.
  Check by scanning for language like `fallback`, `runner`, `auto`, or `priority` in the new docs.

- Main risk: repo entrypoints remain too Codex/Cursor-centric, so users never discover the new lane.
  Check by ensuring README and SKILL both surface the new guides.

- Main risk: role coverage becomes too broad and creates support expectations for every agent.
  Check by keeping PM/reviewer as the primary use cases and describing dev/debugger as selective.

- Main risk: users mistake model output for official task state before normalization and validation.
  Check by stating this boundary in both new docs and by separating advice mode from role response mode explicitly.
