# Project Rules

This file is the target project's own `AGENTS.md`.

## Source of Truth

- The project repository is the source of truth for code, tests, and runtime behavior.
- This framework provides reusable workflow guidance, but project-specific rules win for the target repo.

## Working Rules

- Keep changes scoped to the task at hand.
- Prefer the project's existing patterns and conventions.
- Treat generated artifacts, logs, and task history as runtime data unless the task explicitly says otherwise.
- Put local config and machine-specific values in ignored files.

## Review Priorities

- Correctness first.
- Match the project contract and test suite.
- Avoid introducing unnecessary dependencies or broad refactors.
