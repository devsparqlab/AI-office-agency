import React, { useState, useEffect, useRef } from 'react';
import './styles/globals.css';
import type { 
  RunSummary, 
  RunDetail, 
  HealthStatus,
  DashboardSseEvent
} from '../../shared/types';
import type { DashboardSection } from './views/types';
import { MonitorView } from './views/MonitorView';
import { AnalyticsView } from './views/AnalyticsView';
import { ReportsView } from './views/ReportsView';
import { apiFetch, apiEventSourceUrl } from './api';
import { Activity, Search, Clock, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('monitor');
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [runDetailError, setRunDetailError] = useState<string | null>(null);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLogFile, setSelectedLogFile] = useState('');
  const [logContent, setLogContent] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const selectedRunIdRef = useRef<string | null>(null);
  const selectedLogFileRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshInFlightRef = useRef<boolean>(false);

  useEffect(() => {
    fetchInitialData();
    const cleanupSSE = setupSSE();
    return () => {
      cleanupSSE();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      // Abort any previous in-flight fetches when selectedRunId changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      selectedLogFileRef.current = '';
      setSelectedLogFile('');
      setLogContent(null);
      setLogError(null);
      fetchRunDetail(selectedRunId);
    }
    selectedRunIdRef.current = selectedRunId;
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [selectedRunId]);

  useEffect(() => {
    selectedLogFileRef.current = selectedLogFile;
  }, [selectedLogFile]);

  const fetchInitialData = async (signal?: AbortSignal) => {
    try {
      const [healthRes, runsRes] = await Promise.all([
        apiFetch('/api/health', { signal }),
        apiFetch('/api/runs', { signal }),
      ]);
      const healthData = await healthRes.json();
      const runsData = await runsRes.json();
      setHealth(healthData);
      setRuns(runsData);

      if (
        selectedRunIdRef.current &&
        !runsData.some((run: RunSummary) => run.id === selectedRunIdRef.current)
      ) {
        setRunDetail(null);
        setRunDetailError('Selected run not found.');
        selectedLogFileRef.current = '';
        setSelectedLogFile('');
        setLogContent(null);
        setLogError(null);
      }
      setLoading(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Error fetching initial data:', err);
      setLoading(false);
    }
  };

  const fetchRunDetail = async (id: string, signal?: AbortSignal) => {
    setRunDetailLoading(true);
    setRunDetailError(null);
    try {
      const res = await apiFetch(`/api/runs/${id}`, { signal });
      if (!res.ok) {
        setRunDetail(null);
        setRunDetailError(res.status === 404 ? 'Selected run not found.' : 'Failed to load run details.');
        return;
      }
      const data = await res.json();
      setRunDetail(data);
      if (selectedLogFileRef.current) {
        const hasSelectedLog = data.artifacts.some(
          (artifact: { type: string; name: string }) =>
            artifact.type === 'log' && artifact.name === selectedLogFileRef.current
        );
        if (!hasSelectedLog) {
          selectedLogFileRef.current = '';
          setSelectedLogFile('');
          setLogContent(null);
          setLogError('Log not found.');
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Error fetching run detail:', err);
      setRunDetail(null);
      setRunDetailError('Failed to load run details.');
    } finally {
      setRunDetailLoading(false);
    }
  };

  const fetchLogContent = async (taskId: string, fileName: string, signal?: AbortSignal) => {
    if (!fileName) {
      setLogContent(null);
      setLogError(null);
      return;
    }
    try {
      const res = await apiFetch(`/api/logs/${taskId}/${fileName}`, { signal });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setLogContent(null);
        setLogError(data?.error || 'Log not found');
        return;
      }
      const data = await res.json();
      setLogContent(data.content);
      setLogError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Error fetching log content:', err);
      setLogContent(null);
      setLogError('Failed to load log content.');
    }
  };

  const setupSSE = () => {
    const eventSource = new EventSource(apiEventSourceUrl('/api/events'));
    const onRunsChanged = async (event: MessageEvent<string>) => {
      const update = JSON.parse(event.data) as DashboardSseEvent;
      console.log('Update received:', update);

      // Deduplicate: skip if a refresh is already in flight
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;

      // Abort any previous in-flight fetches before starting a new refresh cycle
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      try {
        // Coordinated refresh
        await fetchInitialData(signal);

        if (selectedRunIdRef.current) {
          await fetchRunDetail(selectedRunIdRef.current, signal);
          if (selectedLogFileRef.current) {
            await fetchLogContent(selectedRunIdRef.current, selectedLogFileRef.current, signal);
          }
        }
      } finally {
        refreshInFlightRef.current = false;
      }

      // Trigger Analytics refresh via a global event or similar
      // For now, we can rely on the fact that AnalyticsView will likely re-mount
      // or we can add a refresh counter if needed.
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };
    eventSource.addEventListener('runs.changed', onRunsChanged);
    return () => eventSource.close();
  };

  const filteredRuns = runs.filter(r => 
    r.id.toLowerCase().includes(search.toLowerCase()) || 
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const sections: Array<{ id: DashboardSection; label: string }> = [
    { id: 'monitor', label: 'Monitor' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reports', label: 'Reports' },
  ];

  const healthAccent =
    !health
      ? 'var(--status-error)'
      : health.status === 'error'
        ? 'var(--status-error)'
        : health.status === 'warning'
          ? '#f59e0b'
          : 'var(--status-success)';
  const healthLabel =
    !health
      ? 'Offline'
      : health.status === 'error'
        ? 'Error'
        : health.status === 'warning'
          ? 'Warning'
          : 'Connected';

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: activeSection === section.id ? 'var(--card-bg)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {section.label}
              </button>
            ))}
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
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: healthAccent }}></div>
            <span style={{ fontWeight: 600 }}>Backend: {healthLabel}</span>
          </div>
          {health && (
            <div style={{ color: 'var(--text-secondary)' }}>
              <div>Uptime: {formatUptime(health.uptime)}</div>
              <div>Runs: {health.totalRuns ?? 0} folders</div>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        {activeSection === 'monitor' && (
          <MonitorView
            loading={loading}
            health={health}
            healthAccent={healthAccent}
            selectedRunId={selectedRunId}
            runDetail={runDetail}
            runDetailLoading={runDetailLoading}
            runDetailError={runDetailError}
            selectedLogFile={selectedLogFile}
            logContent={logContent}
            logError={logError}
            onSelectLogFile={(fileName) => {
              setSelectedLogFile(fileName);
              if (selectedRunId) fetchLogContent(selectedRunId, fileName);
            }}
          />
        )}

        {activeSection === 'analytics' && (
          <AnalyticsView />
        )}

        {activeSection === 'reports' && (
          <ReportsView />
        )}
      </div>
    </div>
  );
};

export default App;
