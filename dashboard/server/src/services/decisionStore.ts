import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '../config';
import { asObject } from './runScanner';
import { TASK_ID_PATTERN } from '../pathSecurity';
import type { DecisionAction, DecisionRecord, ReviewVerdict, RunPhase } from '@shared/types';

const REVIEW_VERDICTS: readonly ReviewVerdict[] = [
  'approved', 'changes_requested', 'escalate', 'infra_failure',
];

function normalizeAgainstVerdict(value: unknown): ReviewVerdict | null {
  return typeof value === 'string' && (REVIEW_VERDICTS as readonly string[]).includes(value)
    ? (value as ReviewVerdict)
    : null;
}

const DECISION_ACTIONS: readonly DecisionAction[] = [
  'approve', 'request_changes', 'escalate', 'reject',
];

export function isDecisionAction(value: unknown): value is DecisionAction {
  return typeof value === 'string' && (DECISION_ACTIONS as readonly string[]).includes(value);
}

// decision.yaml is snake_case (consistent with the rest of the office files);
// the API surface is camelCase. These map between the two.
function toRecord(raw: any): DecisionRecord | null {
  if (!raw || !isDecisionAction(raw.decision)) return null;
  if (typeof raw.actor !== 'string' || typeof raw.decided_at !== 'string') return null;
  return {
    decision: raw.decision,
    actor: raw.actor,
    note: typeof raw.note === 'string' ? raw.note : undefined,
    decidedAt: raw.decided_at,
    againstVerdict: (raw.against_verdict ?? null) as ReviewVerdict | null,
    againstPhase: (raw.against_phase ?? null) as RunPhase | null,
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
    ? input.actor.trim()
    : 'dashboard-user';
  const note = typeof input.note === 'string' && input.note.trim() ? input.note : undefined;

  return {
    decision: input.decision,
    actor,
    note,
    decidedAt: input.now,
    againstVerdict: normalizeAgainstVerdict(input.reviewerData?.review_verdict),
    againstPhase: typeof input.statusData?.phase === 'string' ? input.statusData.phase : null,
  };
}

export class DecisionStore {
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
   * Appends a decision to decision.yaml (atomic write). The dashboard is the only
   * writer of this file, so there is no race with the driver. Concurrent dashboard
   * POSTs are read-modify-write; acceptable for human-paced supervision.
   */
  async append(taskId: string, record: DecisionRecord): Promise<DecisionRecord> {
    const existing = await this.read(taskId);
    const decisions = [...existing, record];
    const doc = { task_id: taskId, decisions: decisions.map(toYamlEntry) };

    const target = this.decisionPath(taskId);
    const tmp = `${target}.tmp.${process.pid}`;
    await fs.writeFile(tmp, yaml.dump(doc), 'utf8');
    await fs.rename(tmp, target);
    return record;
  }
}

export const globalDecisionStore = new DecisionStore();
