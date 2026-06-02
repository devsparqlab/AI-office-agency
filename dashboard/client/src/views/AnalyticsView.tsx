import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, BarChart3, Activity, Loader2, Terminal } from 'lucide-react';
import type { 
  AnalyticsSummary, 
  AnalyticsTrends, 
  AnalyticsFailures, 
  AnalyticsLongRunning
} from '../../../shared/types';

export function AnalyticsView() {
  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Analytics</h1>
      
      <WorkflowHealthPanel />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <TopFailuresPanel />
        <LongRunningPanel />
      </div>

      <DailyTrendsPanel />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-title">Status Distribution</div>
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <BarChart3 size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>Coming next: Success/Failure breakdown by agent type</div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Agent Activity</div>
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Activity size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>Coming next: Most active agents and task throughput</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function useDashboardRefresh(callback: () => void) {
  useEffect(() => {
    window.addEventListener('dashboard:refresh', callback);
    return () => window.removeEventListener('dashboard:refresh', callback);
  }, [callback]);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  return res.json();
}

function WorkflowHealthPanel() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchJson<
AnalyticsSummary>('/api/analytics/summary')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useDashboardRefresh(fetchData);

  if (loading && !data) return <div className="card" style={{ marginBottom: '24px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--status-error)' }}>
    <div className="card-title" style={{ color: 'var(--status-error)' }}>Error loading Workflow Health</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{error}</div>
  </div>;
  if (!data) return null;

  const { healthScore, successRate, failedRuns, blockedRuns, runningRuns } = data;

  return (
    <div className="card" style={{ marginBottom: '24px', opacity: loading ? 0.7 : 1 }}>
      <div className="card-title">Workflow Health</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: '48px', fontWeight: 700, color: healthScore.status === 'error' ? 'var(--status-error)' : healthScore.status === 'warning' ? '#f59e0b' : 'var(--status-success)' }}>
          {healthScore.score} / 100
        </div>
        <div style={{ fontSize: '18px', fontWeight: 600, textTransform: 'capitalize' }}>
          {healthScore.status}
        </div>
      </div>
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Success Rate</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>{(successRate * 100).toFixed(1)}%</div>
          </div>
          <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Failed Runs</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>{failedRuns}</div>
          </div>
          <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Blocked Runs</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>{blockedRuns}</div>
          </div>
          <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Runs</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>{runningRuns}</div>
          </div>
      </div>
    </div>
  );
}

function TopFailuresPanel() {
  const [data, setData] = useState<AnalyticsFailures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchJson<AnalyticsFailures>('/api/analytics/failures')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useDashboardRefresh(fetchData);

  if (loading && !data) return <div className="card" style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="card" style={{ height: '250px', border: '1px solid var(--status-error)' }}>
    <div className="card-title" style={{ color: 'var(--status-error)' }}>Error loading Failures</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{error}</div>
  </div>;

  return (
    <div className="card" style={{ opacity: loading ? 0.7 : 1 }}>
      <div className="card-title">Top Failure Reasons</div>
      {data?.topFailureReasons && data.topFailureReasons.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data.topFailureReasons.slice(0, 5).map((failure) => (
            <li key={failure.reason} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
              <div style={{ fontWeight: 500 }}>{failure.reason}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Count: {failure.count}{failure.latestSeenAt ? ` | Latest: ${new Date(failure.latestSeenAt).toLocaleString()}` : ''}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>No failures recorded</div>
      )}
    </div>
  );
}

function LongRunningPanel() {
  const [data, setData] = useState<AnalyticsLongRunning | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchJson<AnalyticsLongRunning>('/api/analytics/long-running')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useDashboardRefresh(fetchData);

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined) return 'unknown';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading && !data) return <div className="card" style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="card" style={{ height: '250px', border: '1px solid var(--status-error)' }}>
    <div className="card-title" style={{ color: 'var(--status-error)' }}>Error loading Long Running</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{error}</div>
  </div>;

  return (
    <div className="card" style={{ opacity: loading ? 0.7 : 1 }}>
      <div className="card-title">Longest Active Runs</div>
      {data?.tasks && data.tasks.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data.tasks.map((run) => (
            <li key={run.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 500 }}>{run.id}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <Clock size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {formatDuration(run.durationSeconds)}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {run.title}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>No active runs</div>
      )}
      <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        *Calculated from now - startedAt
      </div>
    </div>
  );
}

function DailyTrendsPanel() {
  const [data, setData] = useState<AnalyticsTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchJson<AnalyticsTrends>('/api/analytics/trends')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useDashboardRefresh(fetchData);

  if (loading && !data) return <div className="card" style={{ marginBottom: '24px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--status-error)' }}>
    <div className="card-title" style={{ color: 'var(--status-error)' }}>Error loading Trends</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{error}</div>
  </div>;

  return (
    <div className="card" style={{ marginBottom: '24px', opacity: loading ? 0.7 : 1 }}>
      <div className="card-title">Runs Per Day (Last {data?.windowDays || 7} Days)</div>
      {data?.trends && data.trends.length > 0 ? (
        <>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            height: '200px', 
            gap: '8px', 
            paddingTop: '20px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '10px'
          }}>
            {data.trends.map((point) => {
              const maxCount = Math.max(...data.trends.map(p => p.total), 1);
              const height = (point.total / maxCount) * 100;
              
              return (
                <div key={point.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', position: 'relative', height: `${height}%`, display: 'flex', flexDirection: 'column-reverse', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                    <div title={`Completed: ${point.completed}`} style={{ height: `${(point.completed / point.total) * 100 || 0}%`, backgroundColor: 'var(--status-success)' }}></div>
                    <div title={`Failed: ${point.failed}`} style={{ height: `${(point.failed / point.total) * 100 || 0}%`, backgroundColor: 'var(--status-error)' }}></div>
                    <div title={`Blocked: ${point.blocked}`} style={{ height: `${(point.blocked / point.total) * 100 || 0}%`, backgroundColor: 'var(--status-warning)' }}></div>
                    <div title={`Other: ${point.total - point.completed - point.failed - point.blocked}`} style={{ flex: 1, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}></div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px', transform: 'rotate(-45deg)', transformOrigin: 'top center', height: '20px', whiteSpace: 'nowrap' }}>
                    {point.date.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '20px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', backgroundColor: 'var(--status-success)' }}></div> Completed</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', backgroundColor: 'var(--status-error)' }}></div> Failed</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', backgroundColor: 'var(--status-warning)' }}></div> Blocked</div>
          </div>
        </>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No trend data available</div>
      )}
    </div>
  );
}
