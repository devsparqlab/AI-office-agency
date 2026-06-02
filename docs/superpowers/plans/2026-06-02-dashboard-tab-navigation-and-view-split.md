# Dashboard Tab Navigation And View Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the dashboard UI from a single long page into top-level in-app sections (`Monitor`, `Analytics`, `Reports`) without introducing route-based navigation yet.

**Architecture:** Keep the existing app mounted in `App.tsx`, but move screen-level rendering into focused view components under `dashboard/client/src/views/`. `App.tsx` should own the top-level section state and shared data fetches, while each view receives only the props it needs. This changes information architecture now and preserves a clean path to real routes later.

**Tech Stack:** React, TypeScript, Vite, existing dashboard shared types, existing Express APIs (`/api/runs`, `/api/health`, `/api/logs`, `/api/analytics`).

---

### Task 1: Add Section Navigation State And Contract

**Files:**
- Create: `dashboard/client/src/views/types.ts`
- Modify: `dashboard/client/src/App.tsx`
- Test: `dashboard/client/src/App.tsx` via build verification

- [ ] **Step 1: Write the failing test surrogate**

Add a new `activeSection` state in `App.tsx` that references a missing shared view type.

```tsx
import type { DashboardSection } from './views/types';

const [activeSection, setActiveSection] = useState<DashboardSection>('monitor');
```

Run: `npm run build`
Expected: FAIL because `./views/types` does not exist yet.

- [ ] **Step 2: Write minimal implementation**

Create `dashboard/client/src/views/types.ts`:

```ts
export type DashboardSection = 'monitor' | 'analytics' | 'reports';
```

Update `dashboard/client/src/App.tsx` to import the type and define:

```tsx
const [activeSection, setActiveSection] = useState<DashboardSection>('monitor');
```

- [ ] **Step 3: Add top-level tab navigation**

Inside the existing sidebar header area, add three top-level buttons:

```tsx
const sections: Array<{ id: DashboardSection; label: string }> = [
  { id: 'monitor', label: 'Monitor' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'reports', label: 'Reports' },
];
```

Render them as a segmented row below the search input:

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
  {sections.map((section) => (
    <button
      key={section.id}
      type="button"
      onClick={() => setActiveSection(section.id)}
      style={{
        padding: '8px 10px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        backgroundColor: activeSection === section.id ? 'var(--card-bg)' : 'transparent',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {section.label}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Run build to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard/client/src/App.tsx dashboard/client/src/views/types.ts
git commit -m "feat(dashboard): add top-level section navigation state"
```

### Task 2: Extract Monitor View

**Files:**
- Create: `dashboard/client/src/views/MonitorView.tsx`
- Modify: `dashboard/client/src/App.tsx`
- Test: `dashboard/client/src/App.tsx` via build verification

- [ ] **Step 1: Write the failing test surrogate**

Move the current monitor-oriented JSX usage in `App.tsx` behind a missing component import:

```tsx
import { MonitorView } from './views/MonitorView';
```

Run: `npm run build`
Expected: FAIL because `MonitorView.tsx` does not exist yet.

- [ ] **Step 2: Write minimal implementation**

Create `dashboard/client/src/views/MonitorView.tsx` with a focused props interface:

```tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, Clock, Loader2, Terminal } from 'lucide-react';
import type { HealthStatus, RunDetail, RunSummary } from '../../../shared/types';

export interface MonitorViewProps {
  loading: boolean;
  health: HealthStatus | null;
  healthAccent: string;
  selectedRunId: string | null;
  runDetail: RunDetail | null;
  runDetailLoading: boolean;
  runDetailError: string | null;
  selectedLogFile: string;
  logContent: string | null;
  logError: string | null;
  onSelectLogFile: (fileName: string) => void;
}

export function MonitorView(props: MonitorViewProps) {
  // Move the existing selected-run detail UI here:
  // dashboard health warning/error banner
  // run detail
  // timeline
  // logs
  // artifacts
  // selected run not found state
}
```

Keep all current monitor behavior intact. Do not render analytics summary cards, top failures, or trend widgets here.

- [ ] **Step 3: Wire App.tsx to MonitorView**

Replace the current main-content monitor branch with:

```tsx
{activeSection === 'monitor' && (
  <MonitorView
    loading={loading}
    health={health}
    healthAccent={healthAccent}
    selectedRunId={selectedRunId}
    runDetail={runDetail}
    runDetailLoading={runDetailLoading}
    runDetailError={runDetailError}
    selectedLogFile={selectedLogFile}
    logContent={logContent}
    logError={logError}
    onSelectLogFile={(fileName) => {
      setSelectedLogFile(fileName);
      if (runDetail) fetchLogContent(runDetail.id, fileName);
    }}
  />
)}
```

- [ ] **Step 4: Run build to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard/client/src/App.tsx dashboard/client/src/views/MonitorView.tsx
git commit -m "refactor(dashboard): extract monitor view"
```

### Task 3: Extract Analytics View And Move Analytics UI Out Of Monitor

**Files:**
- Create: `dashboard/client/src/views/AnalyticsView.tsx`
- Modify: `dashboard/client/src/App.tsx`
- Test: `dashboard/client/src/App.tsx` via build verification

- [ ] **Step 1: Write the failing test surrogate**

Add a missing analytics view import:

```tsx
import { AnalyticsView } from './views/AnalyticsView';
```

Run: `npm run build`
Expected: FAIL because `AnalyticsView.tsx` does not exist yet.

- [ ] **Step 2: Write minimal implementation**

Create `dashboard/client/src/views/AnalyticsView.tsx`:

```tsx
import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { AnalyticsResponse, RunSummary } from '../../../shared/types';

export interface AnalyticsViewProps {
  analytics: AnalyticsResponse | null;
  runs: RunSummary[];
}

export function AnalyticsView({ analytics, runs }: AnalyticsViewProps) {
  if (!analytics) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <AlertCircle size={40} style={{ marginBottom: '16px', color: 'var(--status-error)' }} />
        <h3 style={{ marginBottom: '8px' }}>Analytics unavailable</h3>
        <p>The analytics API did not return data.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Workflow Health hero */}
      {/* Top Failures */}
      {/* Long Running Tasks placeholder */}
      {/* Runs Per Day */}
      {/* Status Distribution placeholder */}
      {/* Agent Activity placeholder */}
    </div>
  );
}
```

- [ ] **Step 3: Implement the Analytics layout**

Build the screen in this order:

1. Hero card:

```tsx
<div className="card" style={{ marginBottom: '24px' }}>
  <div className="card-title">Workflow Health</div>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <div style={{ fontSize: '48px', fontWeight: 700 }}>{analytics.summary.healthScore.score} / 100</div>
    <div style={{ fontSize: '18px', fontWeight: 600 }}>{analytics.summary.healthScore.status}</div>
  </div>
</div>
```

2. Two-column row:
- left: `Top Failure Reasons`
- right: `Longest Active Runs`

For `Longest Active Runs`, use current `runs` from `App.tsx` as a stopgap and rank `status === 'running'` by `updatedAt` age. Label this as active-duration approximation until duration data improves.

3. Full-width:
- `Runs Per Day` (move the existing trend widget here)

4. Placeholder cards:
- `Status Distribution`
- `Agent Activity`

Keep these as cards with “coming next” copy for now.

- [ ] **Step 4: Wire App.tsx to AnalyticsView**

Render:

```tsx
{activeSection === 'analytics' && (
  <AnalyticsView analytics={analytics} runs={runs} />
)}
```

Also remove analytics summary cards, top failures list, and trends from the old default overview branch in `App.tsx`.

- [ ] **Step 5: Run build to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add dashboard/client/src/App.tsx dashboard/client/src/views/AnalyticsView.tsx
git commit -m "refactor(dashboard): extract analytics view"
```

### Task 4: Add Reports Placeholder View

**Files:**
- Create: `dashboard/client/src/views/ReportsView.tsx`
- Modify: `dashboard/client/src/App.tsx`
- Test: `dashboard/client/src/App.tsx` via build verification

- [ ] **Step 1: Write the failing test surrogate**

Add a missing reports view import:

```tsx
import { ReportsView } from './views/ReportsView';
```

Run: `npm run build`
Expected: FAIL because `ReportsView.tsx` does not exist yet.

- [ ] **Step 2: Write minimal implementation**

Create `dashboard/client/src/views/ReportsView.tsx`:

```tsx
import React from 'react';
import { FileText } from 'lucide-react';

export function ReportsView() {
  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Reports</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
        <div className="card">
          <div className="card-title">Daily Summary</div>
          <div style={{ color: 'var(--text-secondary)' }}>Coming soon</div>
        </div>
        <div className="card">
          <div className="card-title">Weekly Summary</div>
          <div style={{ color: 'var(--text-secondary)' }}>Coming soon</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire App.tsx to ReportsView**

Render:

```tsx
{activeSection === 'reports' && <ReportsView />}
```

- [ ] **Step 4: Run build to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard/client/src/App.tsx dashboard/client/src/views/ReportsView.tsx
git commit -m "feat(dashboard): add reports placeholder view"
```

### Task 5: Clean Up App.tsx Into App Shell Responsibilities Only

**Files:**
- Modify: `dashboard/client/src/App.tsx`
- Test: `dashboard/client/src/App.tsx` via build verification

- [ ] **Step 1: Write the failing cleanup checkpoint**

Before cleanup, confirm `App.tsx` still contains screen-level JSX for monitor and analytics cards.

Expected: true

- [ ] **Step 2: Write minimal implementation**

Reduce `App.tsx` responsibilities to:
- shared fetch/state
- sidebar search and run list
- section navigation
- section switch

It should not directly render:
- workflow health hero
- top failure reasons
- trends chart
- run detail timeline/logs/artifacts
- reports placeholder body

- [ ] **Step 3: Run build to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add dashboard/client/src/App.tsx
git commit -m "refactor(dashboard): turn app into section shell"
```

### Task 6: Verification And IA Guardrails

**Files:**
- Review only: `dashboard/client/src/App.tsx`
- Review only: `dashboard/client/src/views/MonitorView.tsx`
- Review only: `dashboard/client/src/views/AnalyticsView.tsx`
- Review only: `dashboard/client/src/views/ReportsView.tsx`
- Review only: `dashboard/client/src/views/types.ts`

- [ ] **Step 1: Verify information architecture**

Checklist:
- `Monitor` contains active runs, selected run detail, timeline, logs, artifacts, and health banners only
- `Analytics` contains workflow health hero, top failures, long running tasks, trends, and placeholders for status distribution and agent activity
- `Reports` is present as a placeholder, not empty
- no route-based navigation introduced
- no `react-router` dependency introduced
- no new API work introduced in this task

- [ ] **Step 2: Run final verification**

Run:

```bash
cd dashboard/client && npm run build
```

Expected: PASS

- [ ] **Step 3: Prepare handoff summary**

Include:
- changed files
- final section structure
- note that URLs still do not deep-link by section or selected run
- next upgrade trigger: migrate to routes when analytics/reports need shareable URLs or selected-run deep links
