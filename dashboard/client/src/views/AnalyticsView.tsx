import React from 'react';
import { AlertCircle, Clock, BarChart3, Activity } from 'lucide-react';
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

  // Calculate longest active runs
  const longestActiveRuns = runs
    .filter(run => run.status === 'running')
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || 0).getTime();
      const bTime = new Date(b.updatedAt || 0).getTime();
      return aTime - bTime; // Oldest first
    })
    .slice(0, 5);

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Analytics</h1>

      {/* Workflow Health hero */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">Workflow Health</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: '48px', fontWeight: 700, color: analytics.summary.healthScore.status === 'error' ? 'var(--status-error)' : analytics.summary.healthScore.status === 'warning' ? '#f59e0b' : 'var(--status-success)' }}>
            {analytics.summary.healthScore.score} / 100
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, textTransform: 'capitalize' }}>
            {analytics.summary.healthScore.status}
          </div>
        </div>
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Success Rate</div>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{(analytics.summary.successRate * 100).toFixed(1)}%</div>
            </div>
            <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Failed Runs</div>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{analytics.summary.failedRuns}</div>
            </div>
            <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Blocked Runs</div>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{analytics.summary.blockedRuns}</div>
            </div>
            <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Runs</div>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{analytics.summary.runningRuns}</div>
            </div>
        </div>
      </div>

      {/* Two-column row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Top Failure Reasons */}
        <div className="card">
          <div className="card-title">Top Failure Reasons</div>
          {analytics.topFailureReasons.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {analytics.topFailureReasons.slice(0, 5).map((failure) => (
                <li key={`${failure.reason}-${failure.latestSeenAt || 'none'}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
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

        {/* Longest Active Runs */}
        <div className="card">
          <div className="card-title">Longest Active Runs</div>
          {longestActiveRuns.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {longestActiveRuns.map((run) => (
                <li key={run.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 500 }}>{run.id}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <Clock size={10} style={{ marginRight: '4px' }} />
                        Active since {new Date(run.updatedAt || 0).toLocaleTimeString()}
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
            *Duration approximated by last update time
          </div>
        </div>
      </div>

      {/* Runs Per Day (Trends) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">Runs Per Day (Last {analytics.windowDays} Days)</div>
        {analytics.trends && analytics.trends.length > 0 ? (
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
              {analytics.trends.map((point) => {
                const maxCount = Math.max(...analytics.trends.map(p => p.total), 1);
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

      {/* Placeholder cards */}
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
