import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '../config';
import { asObject } from './runScanner';
import { TASK_ID_PATTERN } from '../pathSecurity';
import type { DecisionAction, DecisionRecord, ReviewVerdict } from '@shared/types';

const REVIEW_VERDICTS: readonly ReviewVerdict[] = [
  'approved', 'changes_requested', 'escalate', 'infra_failure',
];

// Bounds on free-text fields so a hand-edited file or a hostile body can't
// balloon memory or the log. Enforced on write (reject) and on read (truncate).
export const ACTOR_MAX_LEN = 120;
export const NOTE_MAX_LEN = 2000;

// Decisions that change the course of the work must explain why.
const NOTE_REQUIRED_ACTIONS: readonly DecisionAction[] = [
  'request_changes', 'escalate', 'reject',
];

function normalizeAgainstVerdict(value: unknown): ReviewVerdict | null {
  return typeof value === 'string' && (REVIEW_VERDICTS as readonly string[]).includes(value)
    ? (value as ReviewVerdict)
    : null;
}

function normalizeAgainstPhase(value: unknown): string | null {
  // Loose string (any phase, incl. future ones) per decision.schema.yaml.
  return typeof value === 'string' && value ? value.slice(0, ACTOR_MAX_LEN) : null;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

const DECISION_ACTIONS: readonly DecisionAction[] = [
  'approve', 'request_changes', 'escalate', 'reject',
];

export function isDecisionAction(value: unknown): value is DecisionAction {
  return typeof value === 'string' && (DECISION_ACTIONS as readonly string[]).includes(value);
}

export type DecisionInputValidation = { ok: true } | { ok: false; error: string };

/**
 * Validates a raw POST body for a decision. Pure and testable.
 * - decision must be a valid action
 * - note is required (non-empty) for request_changes/escalate/reject
 * - actor/note must be within length caps
 */
export function validateDecisionInput(body: any): DecisionInputValidation {
  const b = body ?? {};
  if (!isDecisionAction(b.decision)) {
    return { ok: false, error: 'Invalid decision; expected approve|request_changes|escalate|reject' };
  }
  if (b.actor !== undefined && typeof b.actor !== 'string') {
    return { ok: false, error: 'actor must be a string' };
  }
  if (typeof b.actor === 'string' && b.actor.length > ACTOR_MAX_LEN) {
    return { ok: false, error: `actor exceeds ${ACTOR_MAX_LEN} characters` };
  }
  if (b.note !== undefined && typeof b.note !== 'string') {
    return { ok: false, error: 'note must be a string' };
  }
  if (typeof b.note === 'string' && b.note.length > NOTE_MAX_LEN) {
    return { ok: false, error: `note exceeds ${NOTE_MAX_LEN} characters` };
  }
  if ((NOTE_REQUIRED_ACTIONS as readonly string[]).includes(b.decision)) {
    if (typeof b.note !== 'string' || !b.note.trim()) {
      return { ok: false, error: `note is required for "${b.decision}"` };
    }
  }
  return { ok: true };
}

// decision.yaml is snake_case (consistent with the rest of the office files);
// the API surface is camelCase. These map between the two.
function toRecord(raw: any): DecisionRecord | null {
  if (!raw || !isDecisionAction(raw.decision)) return null;
  if (typeof raw.actor !== 'string' || typeof raw.decided_at !== 'string') return null;
  return {
    decision: raw.decision,
    actor: truncate(raw.actor, ACTOR_MAX_LEN),
    note: typeof raw.note === 'string' ? truncate(raw.note, NOTE_MAX_LEN) : undefined,
    decidedAt: raw.decided_at,
    // Normalize on read too: a hand-edited file can't leak an off-contract value.
    againstVerdict: normalizeAgainstVerdict(raw.against_verdict),
    againstPhase: normalizeAgainstPhase(raw.against_phase),
  };
}

function toYamlEntry(record: DecisionRecord): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    decision: record.decision,
    actor: record.actor,
    decided_at: record.decidedAt,
  };
  if (record.note) entry.note = record.note;
  if (record.againstVerdict !== undefined) entry.against_verdict = record.againstVerdict;
  if (record.againstPhase !== undefined) entry.against_phase = record.againstPhase;
  return entry;
}

/**
 * Builds a normalized decision record from request input + the contracted
 * signals it was made against. Pure and testable; the route just persists it.
 * againstVerdict is normalized to a valid enum (or null) so the written
 * decision.yaml can never fail its own schema.
 */
export function buildDecisionRecord(input: {
  decision: DecisionAction;
  actor?: unknown;
  note?: unknown;
  statusData: Record<string, any>;
  reviewerData: Record<string, any>;
  now: string;
}): DecisionRecord {
  const actor = typeof input.actor === 'string' && input.actor.trim()
    ? truncate(input.actor.trim(), ACTOR_MAX_LEN)
    : 'dashboard-user';
  const note = typeof input.note === 'string' && input.note.trim()
    ? truncate(input.note, NOTE_MAX_LEN)
    : undefined;

  return {
    decision: input.decision,
    actor,
    note,
    decidedAt: input.now,
    againstVerdict: normalizeAgainstVerdict(input.reviewerData?.review_verdict),
    againstPhase: normalizeAgainstPhase(input.statusData?.phase),
  };
}

export class DecisionStore {
  // Per-task append serialization: chains appends so concurrent POSTs for the
  // same task can't interleave read-modify-write and lose entries.
  private readonly queues = new Map<string, Promise<unknown>>();
  // Monotonic counter for unique tmp filenames within this process.
  private tmpCounter = 0;

  constructor(private readonly runsDir: string = config.runsDir) {}

  private decisionPath(taskId: string): string {
    // Defense in depth: never build an FS path from an unvalidated id, even
    // though the HTTP routes already guard with resolveRunDir.
    if (!TASK_ID_PATTERN.test(taskId)) {
      throw new Error(`Invalid taskId: ${taskId}`);
    }
    return path.join(this.runsDir, taskId, 'decision.yaml');
  }

  async read(taskId: string): Promise<DecisionRecord[]> {
    try {
      const content = await fs.readFile(this.decisionPath(taskId), 'utf8');
      const data = asObject(yaml.load(content));
      const list = Array.isArray(data.decisions) ? data.decisions : [];
      return list.map(toRecord).filter((r): r is DecisionRecord => r !== null);
    } catch (e) {
      return [];
    }
  }

  async latest(taskId: string): Promise<DecisionRecord | null> {
    const all = await this.read(taskId);
    return all.length ? all[all.length - 1] : null;
  }

  /**
   * Appends a decision to decision.yaml. Serialized per task so concurrent
   * appends never lose entries; durable (fsync before rename). The dashboard is
   * the only writer of this file, so there is no race with the driver.
   */
  async append(taskId: string, record: DecisionRecord): Promise<DecisionRecord> {
    const prev = this.queues.get(taskId) ?? Promise.resolve();
    // Chain after the previous append (swallowing its error so one failure
    // doesn't poison the queue), then run ours.
    const next = prev.catch(() => undefined).then(() => this.appendUnsafe(taskId, record));
    this.queues.set(taskId, next);
    // Drop the map entry once settled, if no newer append has replaced the tail.
    next.catch(() => undefined).finally(() => {
      if (this.queues.get(taskId) === next) this.queues.delete(taskId);
    });
    return next;
  }

  private async appendUnsafe(taskId: string, record: DecisionRecord): Promise<DecisionRecord> {
    const existing = await this.read(taskId);
    const decisions = [...existing, record];
    const doc = { task_id: taskId, decisions: decisions.map(toYamlEntry) };

    const target = this.decisionPath(taskId);
    // Unique per write: pid (cross-process) + monotonic counter (in-process).
    const tmp = `${target}.tmp.${process.pid}.${this.tmpCounter++}`;

    const handle = await fs.open(tmp, 'w');
    try {
      await handle.writeFile(yaml.dump(doc), 'utf8');
      await handle.sync(); // fsync: durable before the rename publishes it
    } finally {
      await handle.close();
    }
    await fs.rename(tmp, target);
    return record;
  }
}

export const globalDecisionStore = new DecisionStore();
