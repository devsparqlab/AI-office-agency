import React, { useState, useEffect, useRef } from 'react';
import './styles/globals.css';
import type { 
  RunSummary, 
  RunDetail, 
  DashboardStats, 
  HealthStatus,
  DashboardSseEvent
} from '../../shared/types';
import ReactMarkdown from 'react-markdown';
import { Activity, Terminal, LayoutDashboard, Search, Filter, AlertCircle, CheckCircle2, Clock, PlayCircle, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [logContent, setLogContent] = useState<string | null>(null);
  const selectedRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchInitialData();
    return setupSSE();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetail(selectedRunId);
    }
    selectedRunIdRef.current = selectedRunId;
  }, [selectedRunId]);

  const fetchInitialData = async () => {
    try {
      const [healthRes, runsRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/runs')
      ]);
      const healthData = await healthRes.json();
      const runsData = await runsRes.json();
      setHealth(healthData);
      setRuns(runsData);
      calculateStats(runsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setLoading(false);
    }
  };

  const fetchRunDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/runs/${id}`);
      const data = await res.json();
      setRunDetail(data);
      setLogContent(null);
    } catch (err) {
      console.error('Error fetching run detail:', err);
    }
  };

  const fetchLogContent = async (taskId: string, fileName: string) => {
    if (!fileName) {
      setLogContent(null);
      return;
    }
    try {
      const res = await fetch(`/api/logs/${taskId}/${fileName}`);
      const data = await res.json();
      setLogContent(data.content);
    } catch (err) {
      console.error('Error fetching log content:', err);
    }
  };

  const setupSSE = () => {
    const eventSource = new EventSource('/api/events');
    const onRunsChanged = (event: MessageEvent<string>) => {
      const update = JSON.parse(event.data) as DashboardSseEvent;
      console.log('Update received:', update);
      fetchInitialData(); // Refresh on any change
      if (selectedRunIdRef.current) {
        fetchRunDetail(selectedRunIdRef.current);
      }
    };
    eventSource.addEventListener('runs.changed', onRunsChanged);
    return () => eventSource.close();
  };

  const calculateStats = (runsList: RunSummary[]) => {
    const total = runsList.length;
    const running = runsList.filter(r => r.status === 'running').length;
    const completed = runsList.filter(r => r.status === 'completed').length;
    const failed = runsList.filter(r => r.status === 'failed').length;
    const blocked = runsList.filter(r => r.status === 'blocked').length;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    setStats({ totalRuns: total, running, completed, failed, blocked, successRate });
  };

  const filteredRuns = runs.filter(r => 
    r.id.toLowerCase().includes(search.toLowerCase()) || 
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity color="var(--accent-color)" />
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>AI Dev Dashboard</span>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '8px', top: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 8px 8px 32px', 
                backgroundColor: 'var(--bg-color)', 
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)'
              }} 
            />
          </div>
        </div>
        <div className="run-list">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
          ) : filteredRuns.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>No runs found</div>
          ) : (
            filteredRuns.map(run => (
              <div 
                key={run.id} 
                className={`run-item ${selectedRunId === run.id ? 'active' : ''}`}
                onClick={() => setSelectedRunId(run.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{run.id}</span>
                  <span className={`status-badge status-${run.status}`}>{run.status}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {run.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <Clock size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {new Date(run.updatedAt || '').toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: health?.ok ? 'var(--status-success)' : 'var(--status-error)' }}></div>
            <span>Backend: {health?.ok ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      <div className="main-content">
        {selectedRunId ? (
          runDetail ? (
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
                      {runDetail.timeline.map(event => (
                        <div key={event.id} className="timeline-item">
                          <div className="timeline-dot"></div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{event.agent.toUpperCase()} - {event.action}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{event.message}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{event.timestamp}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {runDetail.artifacts.some(a => a.type === 'log') && (
                    <div className="card" style={{ marginTop: '24px' }}>
                      <div className="card-title"><Terminal size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Live Logs</div>
                      <select 
                        style={{ marginBottom: '12px', padding: '4px', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                        onChange={(e) => fetchLogContent(runDetail.id, e.target.value)}
                      >
                        <option value="">Select a log file...</option>
                        {runDetail.artifacts.filter(a => a.type === 'log').map(a => (
                          <option key={a.name} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                      <div className="log-terminal" id="log-viewer">
                        {logContent || 'Select a log file to view content'}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-title">Artifacts</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {runDetail.artifacts.map(a => (
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
            <div style={{ textAlign: 'center', marginTop: '100px' }}><Loader2 className="animate-spin" size={48} /></div>
          )
        ) : (
          <div>
            <h1 style={{ marginBottom: '24px' }}>Dashboard Overview</h1>
            {stats && (
              <div className="summary-cards">
                <div className="card">
                  <div className="card-title">Total Runs</div>
                  <div className="card-value">{stats.totalRuns}</div>
                </div>
                <div className="card">
                  <div className="card-title">Running</div>
                  <div className="card-value" style={{ color: 'var(--status-running)' }}>{stats.running}</div>
                </div>
                <div className="card">
                  <div className="card-title">Success Rate</div>
                  <div className="card-value" style={{ color: 'var(--status-success)' }}>{stats.successRate.toFixed(1)}%</div>
                </div>
                <div className="card">
                  <div className="card-title">Failed</div>
                  <div className="card-value" style={{ color: 'var(--status-error)' }}>{stats.failed}</div>
                </div>
              </div>
            )}
            
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <LayoutDashboard size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3>Select a run from the sidebar to see details</h3>
              <p>Real-time updates are active via File Watcher.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
