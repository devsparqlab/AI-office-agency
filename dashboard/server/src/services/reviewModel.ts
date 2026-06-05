import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '../config';
import { asObject } from './runScanner';
import type { ReviewSummary, RunPhase, ReviewVerdict } from '@shared/types';

// Exact enum membership — these mirror the producer schemas. We match by exact
// equality (never substring), so the read model reflects the contract, not a guess.
const RUN_PHASES: readonly RunPhase[] = [
  'pending', 'blocked', 'assigned', 'assigned_parallel', 'review', 'in_review',
  'debugging', 'debugging_complete', 'devops_needed', 'devops_complete',
  'escalated', 'free_roam_complete', 'done', 'aborted',
];

const REVIEW_VERDICTS: readonly ReviewVerdict[] = [
  'approved', 'changes_requested', 'escalate', 'infra_failure',
];

const IN_REVIEW_PHASES: readonly RunPhase[] = ['review', 'in_review'];
const ATTENTION_VERDICTS: readonly ReviewVerdict[] = [
  'changes_requested', 'escalate', 'infra_failure',
];

function normalizePhase(value: unknown): RunPhase | null {
  return typeof value === 'string' && (RUN_PHASES as readonly string[]).includes(value)
    ? (value as RunPhase)
    : null;
}

function normalizeVerdict(value: unknown): ReviewVerdict | null {
  return typeof value === 'string' && (REVIEW_VERDICTS as readonly string[]).includes(value)
    ? (value as ReviewVerdict)
    : null;
}

/**
 * Pure projection from contracted producer fields to a ReviewSummary.
 * `reviewerData` is null when reviews-output.yaml is absent (task never reviewed).
 */
export function buildReviewSummary(
  taskId: string,
  statusData: Record<string, any>,
  reviewerData: Record<string, any> | null,
): ReviewSummary {
  const phase = normalizePhase(statusData.phase);
  const verdict = reviewerData ? normalizeVerdict(reviewerData.review_verdict) : null;

  const inReviewQueue = phase !== null && IN_REVIEW_PHASES.includes(phase);
  const verdictNeedsAttention = verdict !== null && ATTENTION_VERDICTS.includes(verdict);

  return {
    taskId,
    phase,
    verdict,
    inReviewQueue,
    verdictNeedsAttention,
    needsReview: inReviewQueue || verdictNeedsAttention,
    lastReviewedAt: reviewerData
      ? (typeof statusData.updated_at === 'string' ? statusData.updated_at : null)
      : null,
  };
}

async function readYamlObject(filePath: string): Promise<Record<string, any> | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return asObject(yaml.load(content));
  } catch (e) {
    return null;
  }
}

export class ReviewModelService {
  constructor(private readonly runsDir: string = config.runsDir) {}

  async getReviewSummaries(): Promise<ReviewSummary[]> {
    let taskDirs: string[] = [];
    try {
      const entries = await fs.readdir(this.runsDir, { withFileTypes: true });
      taskDirs = entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('TASK'))
        .map((entry) => entry.name);
    } catch (e) {
      return [];
    }

    const summaries = await Promise.all(
      taskDirs.map(async (taskId) => {
        const runPath = path.join(this.runsDir, taskId);
        const statusData = (await readYamlObject(path.join(runPath, 'status.yaml'))) ?? {};
        // null (not {}) means "no reviewer-output" → verdict stays null.
        const reviewerData = await readYamlObject(path.join(runPath, 'reviewer-output.yaml'));
        return buildReviewSummary(taskId, statusData, reviewerData);
      }),
    );

    return summaries;
  }
}

export const globalReviewModel = new ReviewModelService();
