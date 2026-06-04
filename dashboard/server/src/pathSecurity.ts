import path from 'path';

/**
 * Matches TASK-xxx where xxx is alphanumeric (with optional mid-segment hyphens).
 * Covers: TASK-001, TASK-PKG-001, TASK-abc_def
 */
export const TASK_ID_PATTERN = /^TASK-[A-Za-z0-9][A-Za-z0-9_-]*$/;

export type SafeRunDirResult =
  | { ok: true; runDir: string }
  | { ok: false; code: 400; error: string };

/**
 * Validates a task id and resolves its run directory, ensuring
 * the resolved path cannot escape the runsDir root.
 */
export function resolveRunDir(runsDir: string, taskId: string): SafeRunDirResult {
  if (!TASK_ID_PATTERN.test(taskId)) {
    return { ok: false, code: 400, error: 'Invalid taskId' };
  }

  const runsRoot = path.resolve(runsDir);
  const runDir = path.resolve(runsRoot, taskId);
  const relative = path.relative(runsRoot, runDir);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return { ok: false, code: 400, error: 'Resolved path escapes the runs directory' };
  }

  return { ok: true, runDir };
}
