import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, Terminal, Loader2, LayoutDashboard } from 'lucide-react';
import type { HealthStatus, RunDetail } from '../../../shared/types';

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

export function MonitorView({
  loading,
  health,
  healthAccent,
  selectedRunId,
  runDetail,
  runDetailLoading,
  runDetailError,
  selectedLogFile,
  logContent,
  logError,
  onSelectLogFile,
}: MonitorViewProps) {
  return (
    <div>
      {!health && !loading && (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--status-error)', border: '1px solid var(--status-error)', marginBottom: '24px' }}>
          <AlertCircle size={48} style={{ marginBottom: '16px' }} />
          <h2 style={{ margin: '0 0 8px 0' }}>Backend Server Offline</h2>
          <p>Cannot connect to the dashboard API. Please ensure the server is running on port 4310.</p>
        </div>
      )}

      {health && health.status !== 'ok' && (
        <div className="card" style={{ marginBottom: '24px', border: `1px solid ${healthAccent}` }}>
          <div className="card-title" style={{ color: healthAccent }}>
            <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Dashboard health {health.status}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Runs directory: {health.runsDirExists ? 'available' : 'missing'} | Logs directory: {health.logsDirExists ? 'available' : 'missing'} | Watcher: {health.watcherActive ? 'active' : 'inactive'}
          </div>
        </div>
      )}

      {selectedRunId ? (
        runDetailLoading ? (
          <div style={{ textAlign: 'center', marginTop: '100px' }}><Loader2 className="animate-spin" size={48} /></div>
        ) : runDetailError ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={40} style={{ marginBottom: '16px', color: 'var(--status-error)' }} />
            <h3 style={{ marginBottom: '8px' }}>{runDetailError}</h3>
            <p>Choose another run from the sidebar to continue.</p>
          </div>
        ) : runDetail ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h1 style={{ margin: '0 0 8px 0' }}>{runDetail.id}: {runDetail.title}</h1>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Path: {runDetail.runPath} | Updated: {new Date(runDetail.updatedAt || '').toLocaleString()}
                </div>
              </div>
              <span className={`status-badge status-${runDetail.status}`} style={{ padding: '6px 12px', fontSize: '14px' }}>{runDetail.status}</span>
            </div>

            <div className="summary-cards">
              <div className="card">
                <div className="card-title">Current Agent</div>
                <div className="card-value" style={{ textTransform: 'uppercase' }}>{runDetail.currentAgent || 'None'}</div>
              </div>
              <div className="card">
                <div className="card-title">Phase</div>
                <div className="card-value">{runDetail.currentStep || 'Unknown'}</div>
              </div>
              <div className="card">
                <div className="card-title">Artifacts</div>
                <div className="card-value">{runDetail.artifacts.length}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
              <div>
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="card-title"><Terminal size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Task Description</div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <ReactMarkdown>{runDetail.taskMarkdown || 'No description available'}</ReactMarkdown>
                  </div>
                </div>

                {runDetail.outputMarkdown && (
                  <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-title">Output Summary</div>
                    <ReactMarkdown>{runDetail.outputMarkdown}</ReactMarkdown>
                  </div>
                )}

                <div className="card">
                  <div className="card-title">Timeline</div>
                  <div className="timeline">
                    {runDetail.timeline.map((event: any) => (
                      <div key={event.id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{event.agent.toUpperCase()} - {event.action}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{event.message}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{event.timestamp}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {runDetail.artifacts.some((a: any) => a.type === 'log') && (
                  <div className="card" style={{ marginTop: '24px' }}>
                    <div className="card-title"><Terminal size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Live Logs</div>
                    <select 
                      value={selectedLogFile}
                      style={{ marginBottom: '12px', padding: '4px', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      onChange={(e) => onSelectLogFile(e.target.value)}
                    >
                      <option value="">Select a log file...</option>
                      {runDetail.artifacts.filter((a: any) => a.type === 'log').map((a: any) => (
                        <option key={a.name} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                    <div className="log-terminal" id="log-viewer">
                      {logError || logContent || 'Select a log file to view content'}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="card-title">Artifacts</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {runDetail.artifacts.map((a: any) => (
                      <li key={a.name} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                        <div style={{ fontWeight: 500 }}>{a.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Type: {a.type}</div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {runDetail.errorReason && (
                  <div className="card" style={{ border: '1px solid var(--status-error)' }}>
                    <div className="card-title" style={{ color: 'var(--status-error)' }}>Error Reason</div>
                    <div style={{ fontSize: '14px' }}>{runDetail.errorReason}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={40} style={{ marginBottom: '16px', color: 'var(--status-error)' }} />
            <h3 style={{ marginBottom: '8px' }}>Selected run not found.</h3>
            <p>Choose another run from the sidebar to continue.</p>
          </div>
        )
      ) : (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <LayoutDashboard size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3>Select a run from the sidebar to see details</h3>
          <p>Real-time updates are active via File Watcher.</p>
        </div>
      )}
    </div>
  );
}
