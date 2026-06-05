import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, ClipboardCopy, ShieldAlert } from 'lucide-react';
import type {
  ReviewModelResponse, ReviewSummary, RiskLevel, ReviewVerdict, ConfidenceLevel,
} from '../../../shared/types';
import { apiFetchJson } from '../api';

// All colors map from contracted enums only — the UI renders signals, never guesses.
const RISK_COLOR: Record<RiskLevel, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e', none: '#6b7280',
};
const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = {
  high: '#22c55e', medium: '#f59e0b', low: '#ef4444',
};
function verdictColor(v: ReviewVerdict | null): string {
  if (v === 'approved') return '#22c55e';
  if (v === 'changes_requested') return '#f59e0b';
  if (v === 'escalate' || v === 'infra_failure') return '#ef4444';
  return '#6b7280';
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12,
      color, border: `1px solid ${color}`, backgroundColor: `${color}1a`, whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

function riskText(r: ReviewSummary): string {
  const { error, warning, suggestion } = r.issueCounts;
  return `${r.riskLevel} (e:${error} w:${warning} s:${suggestion})`;
}

function buildReport(data: ReviewModelResponse): string {
  const lines: string[] = [];
  lines.push(`AI Dev Office — Needs Review (${data.needsReviewCount}/${data.total})`);
  lines.push(`Generated: ${data.generatedAt}`);
  lines.push('');
  for (const r of data.reviews.filter((x) => x.needsReview)) {
    lines.push(
      `[${r.taskId}] phase=${r.phase ?? '—'} verdict=${r.verdict ?? '—'} ` +
      `risk=${r.riskLevel} (err:${r.issueCounts.error} warn:${r.issueCounts.warning} sug:${r.issueCounts.suggestion}) ` +
      `confidence=${r.confidence ?? '—'}`,
    );
  }
  return lines.join('\n');
}

export const ReviewView: React.FC = () => {
  const [data, setData] = useState<ReviewModelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await apiFetchJson<ReviewModelResponse>('/api/review');
        if (active) { setData(res); setError(null); }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load review model');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    // Refresh in lockstep with the rest of the dashboard (SSE-driven).
    const onRefresh = () => load();
    window.addEventListener('dashboard:refresh', onRefresh);
    return () => { active = false; window.removeEventListener('dashboard:refresh', onRefresh); };
  }, []);

  const copyReport = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildReport(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Clipboard not available');
    }
  };

  if (loading) {
    return <div className="view-state"><Loader2 className="animate-spin" /> Loading review model…</div>;
  }
  if (error) {
    return <div className="view-state"><AlertCircle color="#ef4444" /> {error}</div>;
  }
  if (!data) return null;

  const queue = data.reviews.filter((r) => r.needsReview);
  const rest = data.reviews.filter((r) => !r.needsReview);

  return (
    <div style={{ padding: 20, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <ShieldAlert size={20} /> Review
          <span style={{ fontSize: 14, color: '#6b7280' }}>
            {data.needsReviewCount} need review · {data.total} total
          </span>
        </h2>
        <button type="button" onClick={copyReport} disabled={queue.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', cursor: queue.length ? 'pointer' : 'not-allowed' }}>
          <ClipboardCopy size={14} /> {copied ? 'Copied' : 'Copy review report'}
        </button>
      </div>

      <ReviewTable title={`Needs Review (${queue.length})`} rows={queue} emptyText="Nothing awaiting review." />
      <div style={{ height: 20 }} />
      <ReviewTable title={`All runs (${rest.length})`} rows={rest} emptyText="No other runs." />
    </div>
  );
};

function ReviewTable({ title, rows, emptyText }: { title: string; rows: ReviewSummary[]; emptyText: string }) {
  return (
    <section>
      <h3 style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 8px' }}>{title}</h3>
      {rows.length === 0 ? (
        <div className="muted-meta" style={{ color: '#6b7280' }}>{emptyText}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#9ca3af' }}>
              <th style={{ padding: '6px 8px' }}>Task</th>
              <th style={{ padding: '6px 8px' }}>Phase</th>
              <th style={{ padding: '6px 8px' }}>Verdict</th>
              <th style={{ padding: '6px 8px' }}>Risk</th>
              <th style={{ padding: '6px 8px' }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.taskId} style={{ borderTop: '1px solid #ffffff14' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.taskId}</td>
                <td style={{ padding: '6px 8px' }}>{r.phase ?? '—'}</td>
                <td style={{ padding: '6px 8px' }}>
                  <Badge text={r.verdict ?? '—'} color={verdictColor(r.verdict)} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <Badge text={riskText(r)} color={RISK_COLOR[r.riskLevel]} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <Badge text={r.confidence ?? '—'} color={r.confidence ? CONFIDENCE_COLOR[r.confidence] : '#6b7280'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
