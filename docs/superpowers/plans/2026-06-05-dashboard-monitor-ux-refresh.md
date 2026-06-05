# Dashboard Monitor UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the dashboard's first-screen usability and visual clarity by tightening the `Monitor` experience without changing routes, backend contracts, or the current file-system-based architecture.

**Architecture:** Keep `dashboard/client/src/App.tsx` as the owner of shared app state and top-level section switching. Concentrate the UX refresh in `MonitorView.tsx` and `globals.css`, using a small shared set of layout and presentation classes so the new monitor patterns can later be reused by `AnalyticsView.tsx` and `ReportsView.tsx` without rewriting data flow.

**Tech Stack:** React, TypeScript, Vite, existing dashboard shared types, existing Express APIs, CSS in `dashboard/client/src/styles/globals.css`

---

## File Structure

- `dashboard/server/src/config.ts`
  - Preserve the current auth and environment-driven dashboard behavior.
- `dashboard/server/src/index.ts`
  - Preserve route protection boundaries, open `/api/health`, and existing middleware order.
- `dashboard/server/src/services/runScanner.ts`
  - Preserve current scan behavior and summary derivation.
- `dashboard/server/src/services/watcher.ts`
  - Preserve current watcher/SSE update behavior.
- `dashboard/server/src/pathSecurity.ts`
  - Preserve current path guardrails for log access.
- `dashboard/client/src/App.tsx`
  - Keep shared fetch/state ownership.
  - Reduce inline styling in the app shell.
  - Improve sidebar structure, section tabs, and bottom health summary.
- `dashboard/client/src/views/MonitorView.tsx`
  - Rework monitor presentation only.
  - Clarify health warning, empty state, selected-run summary, and detail sections.
- `dashboard/client/src/styles/globals.css`
  - Add reusable shell, sidebar, panel, state, and metadata classes.
  - Add responsive rules for stacked monitor layouts.
- `dashboard/client/src/views/AnalyticsView.tsx`
  - Touch only if needed for shared utility classes so analytics does not visually regress.
- `dashboard/client/src/views/ReportsView.tsx`
  - Touch only if needed for shared utility classes so reports does not visually regress.

---

### Task 0: Lock Current Dashboard Safety Baseline

**Files:**
- Verify only: `dashboard/client/src/App.tsx`
- Verify only: `dashboard/client/src/views/MonitorView.tsx`
- Verify only: `dashboard/client/src/styles/globals.css`
- Verify only: `dashboard/server/src/config.ts`
- Verify only: `dashboard/server/src/index.ts`
- Verify only: `dashboard/server/src/services/runScanner.ts`
- Verify only: `dashboard/server/src/services/watcher.ts`
- Verify only: `dashboard/server/src/pathSecurity.ts`
- Test: `dashboard/client` build verification
- Test: `dashboard/server` build verification
- Test: `dashboard/server` automated tests

- [ ] **Step 1: Run the client build before any UX edits**

Run: `cd dashboard/client && npm run build`

Expected: PASS

- [ ] **Step 2: Run the server build before any UX edits**

Run: `cd dashboard/server && npm run build`

Expected: PASS

- [ ] **Step 3: Run the server test suite before any UX edits**

Run: `cd dashboard/server && npm test`

Expected: PASS

- [ ] **Step 4: Perform a manual smoke baseline against the current dashboard**

Verify all of the following before opening the UX branch:
- `/api/health` works without a token
- `/api/runs` requires a token when `DASHBOARD_AUTH_TOKEN` is set
- `Monitor` loads with a valid token
- SSE still updates the dashboard
- no-run-selected state works
- run-selected state works

Expected: all checks behave exactly as they do before the UX refresh.

- [ ] **Step 5: Record the baseline and commit only if there are intentional test artifacts**

If this task adds no files, do not create a no-op commit. Instead, carry the verification results into the branch notes or PR description.

If you do add verification artifacts intentionally, commit with:

```bash
git commit -m "test(dashboard): lock monitor safety baseline"
```

### Task 1: Establish A Reusable Dashboard Shell Style Layer

**Guardrail:** Do not modify `dashboard/server/src/config.ts`, `dashboard/server/src/index.ts`, `dashboard/server/src/services/runScanner.ts`, `dashboard/server/src/services/watcher.ts`, or `dashboard/server/src/pathSecurity.ts` in this task.

**Files:**
- Modify: `dashboard/client/src/styles/globals.css`
- Modify: `dashboard/client/src/App.tsx`
- Test: `dashboard/client` build verification

- [ ] **Step 1: Inventory the inline shell styles that should become reusable classes**

Focus on the current app-shell areas that are repeated or visually important:
- sidebar header block
- search box wrapper
- section tab row
- run-list empty/loading state
- sidebar footer health summary
- main-content top spacing rhythm

Expected result: a short mapping from inline styles in `App.tsx` to named classes in `globals.css`.

- [ ] **Step 2: Add shell-level CSS classes and variables in `dashboard/client/src/styles/globals.css`**

Add classes for:
- `.sidebar-header`
- `.sidebar-title-row`
- `.search-input-shell`
- `.section-tabs`
- `.section-tab`
- `.section-tab.active`
- `.sidebar-footer`
- `.muted-meta`
- `.panel-empty-state`

Also add a few neutral spacing/radius tokens if needed, but do not replace the current color system or introduce a new theme.

- [ ] **Step 3: Update `dashboard/client/src/App.tsx` to use the new shell classes**

Replace the most prominent inline layout/presentation styles with the new classes while preserving:
- current fetch behavior
- current section switching behavior
- current search behavior
- current backend health computation and labels

Keep inline style only where values are truly one-off and local.

- [ ] **Step 4: Run build verification**

Run: `cd dashboard/client && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard/client/src/App.tsx dashboard/client/src/styles/globals.css
git commit -m "refactor(dashboard): add reusable shell styling primitives"
```

### Task 2: Improve Sidebar Scanability And Run Selection Clarity

**Guardrail:** Keep current route structure, token behavior, and run-fetching behavior unchanged.

**Files:**
- Modify: `dashboard/client/src/App.tsx`
- Modify: `dashboard/client/src/styles/globals.css`
- Test: `dashboard/client` build verification

- [ ] **Step 1: Tighten the sidebar information hierarchy**

Adjust the run list item presentation so a user can scan:
- task id first
- status second
- title third
- updated time last

Visually strengthen:
- selected row state
- hover state
- status badge contrast
- timestamp readability

Do not add new filters or backend-derived grouping yet.

- [ ] **Step 2: Improve section-tab affordance without changing IA**

Keep `Monitor | Analytics | Reports` exactly as local tab-style navigation, but make the active state more obvious through:
- stronger background contrast
- consistent height/padding
- clearer inactive/active text contrast

Do not add routing, URL params, or badges in this phase.

- [ ] **Step 3: Make the footer health summary feel operational rather than decorative**

Keep the existing health facts, but restyle the footer so it reads as a compact status module:
- backend state label
- uptime
- run count

If the current warning color is reused here, ensure it does not fight with the health banner in monitor content.

- [ ] **Step 4: Run build verification**

Run: `cd dashboard/client && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard/client/src/App.tsx dashboard/client/src/styles/globals.css
git commit -m "feat(dashboard): improve sidebar scanability"
```

### Task 3: Clarify Monitor Entry States

**Guardrail:** No API payload changes, no new routes, no backend-side loading semantics changes.

**Files:**
- Modify: `dashboard/client/src/views/MonitorView.tsx`
- Modify: `dashboard/client/src/styles/globals.css`
- Test: `dashboard/client` build verification

- [ ] **Step 1: Refine the health warning banner**

Keep the current backend health data and warning semantics, but present them in a more actionable way:
- prominent state label
- short summary line
- separate machine facts from the headline

The warning banner should answer:
- what is wrong
- what is still working
- what area is affected

- [ ] **Step 2: Improve the no-selection empty state**

Replace the current generic empty state with a more directive one:
- clear heading
- one-sentence explanation of what selecting a run unlocks
- small hint that live updates are already active

Do not add buttons if they do not trigger a real action yet.

- [ ] **Step 3: Tune loading and missing-selection states for consistency**

Make sure these three states feel related:
- loading selected run
- selected run missing
- no run selected

Use the same spacing, panel framing, and copy tone so the monitor area feels intentionally designed instead of stitched together.

- [ ] **Step 4: Run build verification**

Run: `cd dashboard/client && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard/client/src/views/MonitorView.tsx dashboard/client/src/styles/globals.css
git commit -m "feat(dashboard): clarify monitor entry states"
```

### Task 4: Rework Selected Run Detail Layout For Readability

**Guardrail:** Presentation-only changes. Preserve the current selected-run fields, log loading flow, and markdown/log/artifact data sources.

**Files:**
- Modify: `dashboard/client/src/views/MonitorView.tsx`
- Modify: `dashboard/client/src/styles/globals.css`
- Test: `dashboard/client` build verification

- [ ] **Step 1: Reframe the selected run header**

Keep the same data, but make the header easier to parse:
- run id and title as the primary heading
- status badge aligned as a top-level summary signal
- path and updated time grouped as secondary metadata

- [ ] **Step 2: Make the summary cards feel like a compact overview row**

Keep the same fields for now:
- current agent
- phase
- artifacts

Improve only presentation:
- stronger labels
- more consistent card height
- less visual noise

- [ ] **Step 3: Separate the detail body into clearer reading zones**

Retain the current information set, but improve the layout order so it reads naturally:
1. task description
2. output summary
3. timeline
4. logs
5. artifacts / error reason rail

Add shared section wrappers or titles where needed. Do not change the actual fetched data structure in this task.

- [ ] **Step 4: Make the log viewer and artifact list feel part of the same system**

Improve:
- select input framing
- log terminal padding/contrast
- artifact item spacing
- error reason card emphasis

Do not add download/open actions yet.

- [ ] **Step 5: Run build verification**

Run: `cd dashboard/client && npm run build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add dashboard/client/src/views/MonitorView.tsx dashboard/client/src/styles/globals.css
git commit -m "feat(dashboard): improve selected run detail readability"
```

### Task 5: Add Responsive Guardrails And Final Visual Regression Check

**Guardrail:** Responsive protection only. Do not expand scope into mobile redesign, analytics redesign, or new interaction patterns.

**Files:**
- Modify: `dashboard/client/src/styles/globals.css`
- Modify: `dashboard/client/src/views/MonitorView.tsx` if layout hooks are needed
- Test: `dashboard/client` build verification

- [ ] **Step 1: Add responsive breakpoints for the monitor detail layout**

At smaller widths:
- collapse the two-column detail body into one column
- let summary cards wrap cleanly
- keep sidebar readable without crushing text

Do not redesign the app for mobile-first behavior in this phase; just prevent obvious breakage.

- [ ] **Step 2: Add defensive CSS for overflow-heavy content**

Ensure these areas do not break the layout:
- long run titles
- long paths
- long markdown lines
- long artifact names
- long failure reasons

- [ ] **Step 3: Run final verification commands**

Run:
- `cd dashboard/client && npm run build`
- `cd dashboard/server && npm run build`

Expected:
- client build PASS
- server build PASS

The server build is included here to catch any accidental shared-type regressions.

- [ ] **Step 4: Manual smoke-check in the dashboard**

Verify these visible states in the browser:
- no run selected
- run selected
- health warning visible
- long log selected
- narrow viewport stacked layout

Expected: no overlap, no unreadable controls, no broken spacing.

- [ ] **Step 5: Commit**

```bash
git add dashboard/client/src/styles/globals.css dashboard/client/src/views/MonitorView.tsx
git commit -m "fix(dashboard): add monitor responsive guardrails"
```

---

## Self-Review

- Spec coverage:
  - baseline regression protection covered by Task 0
  - visual polish covered by Tasks 1-2
  - monitor flow clarity covered by Tasks 3-4
  - constrained mixed-scope approach covered by Task 5 without routing or contract changes
- Placeholder scan:
  - no `TODO` or `TBD`
  - each task has exact file targets and verification commands
- Type consistency:
  - keeps existing `DashboardSection`, `HealthStatus`, `RunDetail`, and current section ownership in `App.tsx`
  - avoids renaming existing API contracts or shared types

## Acceptance Criteria

- `Monitor` first screen is understandable within 5 seconds by a teammate who has not used the dashboard recently.
- The sidebar lets a user scan task id and status without depending on long titles.
- The no-run-selected state reads as an empty/instructional state, not an error.
- A selected run shows its primary status and key summary information without forcing immediate downward scrolling.
- The health warning explains impact, not just that a warning exists.
- Long log content, artifact names, markdown content, paths, and error text do not break the layout.
- `cd dashboard/client && npm run build` passes.
- `cd dashboard/server && npm run build` passes.
- `cd dashboard/server && npm test` passes.
- No API contract changes are introduced.
- No new routes are introduced.
- No backend behavior changes are introduced.
