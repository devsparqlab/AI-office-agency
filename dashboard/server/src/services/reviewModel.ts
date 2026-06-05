import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '../config';
import { asObject } from './runScanner';
import type {
  ReviewSummary, RunPhase, ReviewVerdict, ConfidenceLevel, RiskLevel, IssueCounts,
} from '@shared/types';

// Exact enum membership — these mirror the producer schemas. We match by exact
// equality (never substring), so the read model reflects the contract, not a guess.
const RUN_PHASES: readonly RunPhase[] = [
  'pending', 'blocked', 'assigned', 'assigned_parallel', 'review', 'in_review',
  'debugging', 'debugging_complete', 'devops_needed', 'devops_complete',
  'escalated', 'free_roam_complete', 'validation_failed', 'done', 'aborted',
];

const REVIEW_VERDICTS: readonly ReviewVerdict[] = [
  'approved', 'changes_requested', 'escalate', 'infra_failure',
];

const CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = ['high', 'medium', 'low'];
const ISSUE_SEVERITIES = ['error', 'warning', 'suggestion'] as const;

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

function normalizeConfidence(value: unknown): ConfidenceLevel | null {
  return typeof value === 'string' && (CONFIDENCE_LEVELS as readonly string[]).includes(value)
    ? (value as ConfidenceLevel)
    : null;
}

/**
 * Counts issues by contracted severity across reviewer-output artifacts.
 * Only exact enum severities are counted — unknown values are ignored, never guessed.
 */
function countIssues(reviewerData: Record<string, any> | null): IssueCounts {
  const counts: IssueCounts = { error: 0, warning: 0, suggestion: 0 };
  if (!reviewerData || !Array.isArray(reviewerData.artifacts)) return counts;

  for (const artifact of reviewerData.artifacts) {
    const issues = artifact && Array.isArray(artifact.issues) ? artifact.issues : [];
    for (const issue of issues) {
      const severity = issue && issue.severity;
      if ((ISSUE_SEVERITIES as readonly string[]).includes(severity)) {
        counts[severity as keyof IssueCounts] += 1;
      }
    }
  }
  return counts;
}

/**
 * Server-owned risk rule. Derives only from contracted issue severities (and
 * whether a review happened) — not from prose. `none` = not yet review-assessed.
 */
function deriveRiskLevel(reviewerData: Record<string, any> | null, counts: IssueCounts): RiskLevel {
  if (!reviewerData) return 'none';
  if (counts.error > 0) return 'high';
  if (counts.warning > 0) return 'medium';
  return 'low';
}

/**
 * Pure projection from contracted producer fields to a ReviewSummary.
 * `reviewerData`/`debuggerData` are null when the respective output is absent.
 */
export function buildReviewSummary(
  taskId: string,
  statusData: Record<string, any>,
  reviewerData: Record<string, any> | null,
  debuggerData: Record<string, any> | null = null,
): ReviewSummary {
  const phase = normalizePhase(statusData.phase);
  const verdict = reviewerData ? normalizeVerdict(reviewerData.review_verdict) : null;

  const inReviewQueue = phase !== null && IN_REVIEW_PHASES.includes(phase);
  const verdictNeedsAttention = verdict !== null && ATTENTION_VERDICTS.includes(verdict);

  const confidence = debuggerData
    ? normalizeConfidence(debuggerData?.diagnosis?.confidence)
    : null;
  const issueCounts = countIssues(reviewerData);
  const riskLevel = deriveRiskLevel(reviewerData, issueCounts);

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
    confidence,
    issueCounts,
    riskLevel,
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
        // null (not {}) means the output is absent → that signal stays null.
        const reviewerData = await readYamlObject(path.join(runPath, 'reviewer-output.yaml'));
        const debuggerData = await readYamlObject(path.join(runPath, 'debugger-output.yaml'));
        return buildReviewSummary(taskId, statusData, reviewerData, debuggerData);
      }),
    );

    return summaries;
  }
}

export const globalReviewModel = new ReviewModelService();
