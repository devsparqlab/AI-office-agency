import React, { useEffect, useMemo, useState } from 'react';
import type {
  ReviewModelResponse, ReviewSummary, RunSummary, RunPhase, AgentName,
  RiskLevel, DecisionAction,
} from '../../../shared/types';
import { apiFetch, apiFetchJson } from '../api';

const ACTOR_KEY = 'dashboard_actor';

// Pixel office layout: each "room" is a phase group, laid out in workflow order.
// The desk agent lights up when a task in that room is currently theirs.
interface Room {
  id: string;
  label: string;
  phases: RunPhase[];
  agent: AgentName | null;
}
const ROOMS: Room[] = [
  { id: 'inbox', label: 'Inbox', phases: ['pending'], agent: 'pm' },
  { id: 'blocked', label: 'Blocked', phases: ['blocked'], agent: null },
  { id: 'dev', label: 'Dev Bay', phases: ['assigned', 'assigned_parallel'], agent: 'dev' },
  { id: 'review', label: 'Review Room', phases: ['review', 'in_review'], agent: 'reviewer' },
  { id: 'debug', label: 'Debug Lab', phases: ['debugging', 'debugging_complete'], agent: 'debugger' },
  { id: 'devops', label: 'DevOps', phases: ['devops_needed', 'devops_complete'], agent: 'devops' },
  { id: 'escalation', label: 'Escalation', phases: ['escalated', 'free_roam_complete'], agent: 'free-roam' },
  { id: 'rejected', label: 'Validation Failed', phases: ['validation_failed'], agent: null },
  { id: 'done', label: 'Done', phases: ['done'], agent: null },
  { id: 'aborted', label: 'Aborted', phases: ['aborted'], agent: null },
];

const AGENT_EMOJI: Record<string, string> = {
  pm: '🧑‍💼', dev: '👷', 'dev-2': '👩‍🔧', reviewer: '🕵️',
  debugger: '🐛', devops: '🛠️', 'free-roam': '🦸', done: '✅', unknown: '❔',
};

const RISK_COLOR: Record<RiskLevel, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e', none: '#6b7280',
};

const DECISION_ACTIONS: { action: DecisionAction; label: string }[] = [
  { action: 'approve', label: 'Approve' },
  { action: 'request_changes', label: 'Changes' },
  { action: 'escalate', label: 'Escalate' },
  { action: 'reject', label: 'Reject' },
];

interface OfficeTask extends ReviewSummary {
  title: string;
  currentAgent?: AgentName;
}

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
.office { font-family: 'Press Start 2P', ui-monospace, monospace; image-rendering: pixelated;
  background: #14141f; padding: 16px; overflow: auto; height: 100%; }
.office-floor { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
.room { background: #23233a; border: 3px solid #0c0c14; box-shadow: 4px 4px 0 #0c0c14;
  min-width: 150px; max-width: 240px; flex: 1 1 170px; }
.room-head { display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  background: #2f2f4d; border-bottom: 3px solid #0c0c14; font-size: 8px; color: #cfcfe6; }
.room-body { padding: 8px; display: flex; flex-wrap: wrap; gap: 6px; min-height: 46px; }
.desk { font-size: 18px; filter: grayscale(1) opacity(0.4); }
.desk.active { filter: none; animation: bob 0.8s steps(2) infinite; }
.tile { width: 30px; height: 30px; border: 3px solid #0c0c14; display: flex; align-items: center;
  justify-content: center; font-size: 7px; color: #fff; cursor: pointer; position: relative;
  box-shadow: 2px 2px 0 #0c0c14; user-select: none; }
.tile.sel { outline: 3px solid #fff; outline-offset: 1px; }
.tile .conf { position: absolute; right: -3px; bottom: -3px; width: 8px; height: 8px;
  border: 2px solid #0c0c14; }
.blink { animation: blink 0.7s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0.25; } }
@keyframes bob { 50% { transform: translateY(-3px); } }
.office-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  margin-bottom: 14px; font-size: 8px; color: #cfcfe6; }
.office input { font-family: inherit; font-size: 8px; padding: 6px; background: #0c0c14;
  color: #fff; border: 3px solid #2f2f4d; }
.office button { font-family: inherit; font-size: 8px; padding: 6px 8px; cursor: pointer;
  border: 3px solid #0c0c14; box-shadow: 2px 2px 0 #0c0c14; background: #2f2f4d; color: #fff; }
.panel { margin-top: 14px; background: #23233a; border: 3px solid #0c0c14;
  box-shadow: 4px 4px 0 #0c0c14; padding: 10px; font-size: 9px; color: #e6e6f5; line-height: 1.8; }
`;

function tileColor(risk: RiskLevel, needsReview: boolean): string {
  if (needsReview) return RISK_COLOR[risk] === '#6b7280' ? '#f59e0b' : RISK_COLOR[risk];
  return '#3a3a5a';
}
function shortId(id: string): string { return id.replace(/^TASK-?/, ''); }

export const OfficeView: React.FC = () => {
  const [tasks, setTasks] = useState<OfficeTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [actor, setActor] = useState(() => localStorage.getItem(ACTOR_KEY) || '');

  const load = async () => {
    try {
      const [review, runs] = await Promise.all([
        apiFetchJson<ReviewModelResponse>('/api/review'),
        apiFetchJson<RunSummary[]>('/api/runs'),
      ]);
      const runById = new Map(runs.map((r) => [r.id, r]));
      setTasks(review.reviews.map((rv) => ({
        ...rv,
        title: runById.get(rv.taskId)?.title || rv.taskId,
        currentAgent: runById.get(rv.taskId)?.currentAgent,
      })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load office');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const run = () => { if (active) load(); };
    run();
    window.addEventListener('dashboard:refresh', run);
    return () => { active = false; window.removeEventListener('dashboard:refresh', run); };
  }, []);

  const byRoom = useMemo(() => {
    const map = new Map<string, OfficeTask[]>();
    const phaseToRoom = new Map<string, string>();
    for (const room of ROOMS) for (const p of room.phases) phaseToRoom.set(p, room.id);
    for (const t of tasks) {
      const roomId = (t.phase && phaseToRoom.get(t.phase)) || 'unknown';
      if (!map.has(roomId)) map.set(roomId, []);
      map.get(roomId)!.push(t);
    }
    return map;
  }, [tasks]);

  const decide = async (taskId: string, action: DecisionAction) => {
    const noteRequired = action !== 'approve';
    const note = window.prompt(`Note for "${action}" on ${taskId}${noteRequired ? ' (required):' : ' (optional):'}`) ?? undefined;
    if (noteRequired && !note?.trim()) { setError(`A note is required for "${action}".`); return; }
    setError(null);
    try {
      const res = await apiFetch(`/api/decisions/${taskId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: action, actor: actor.trim() || undefined, note }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || `Failed (${res.status})`);
      } else { await load(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record decision');
    }
  };

  if (loading) return <div className="view-state">Loading office…</div>;

  const selectedTask = tasks.find((t) => t.taskId === selected) || null;
  const unknownRoom: Room = { id: 'unknown', label: 'Unknown', phases: [], agent: null };
  const rooms = [...ROOMS, ...(byRoom.has('unknown') ? [unknownRoom] : [])];

  return (
    <div className="office">
      <style>{STYLE}</style>
      <div className="office-bar">
        <span>🏢 AI DEV OFFICE</span>
        <span style={{ color: '#8a8aa6' }}>{tasks.length} tasks</span>
        <input type="text" placeholder="your name (decisions)" value={actor}
          onChange={(e) => { setActor(e.target.value); localStorage.setItem(ACTOR_KEY, e.target.value); }} />
        {error && <span style={{ color: '#ef4444' }}>{error}</span>}
      </div>

      <div className="office-floor">
        {rooms.map((room) => {
          const items = byRoom.get(room.id) || [];
          const active = room.agent != null && items.some((t) => t.currentAgent === room.agent);
          return (
            <div className="room" key={room.id}>
              <div className="room-head">
                {room.agent && (
                  <span className={`desk ${active ? 'active' : ''}`} title={room.agent}>
                    {AGENT_EMOJI[room.agent] || '❔'}
                  </span>
                )}
                <span>{room.label}</span>
                <span style={{ marginLeft: 'auto', color: '#8a8aa6' }}>{items.length}</span>
              </div>
              <div className="room-body">
                {items.map((t) => (
                  <div
                    key={t.taskId}
                    className={`tile ${t.needsReview ? 'blink' : ''} ${selected === t.taskId ? 'sel' : ''}`}
                    style={{ background: tileColor(t.riskLevel, t.needsReview),
                             borderColor: t.latestDecision ? '#22c55e' : '#0c0c14' }}
                    title={`${t.taskId} — ${t.title}\nphase=${t.phase ?? '—'} risk=${t.riskLevel} verdict=${t.verdict ?? '—'}`}
                    onClick={() => setSelected(t.taskId === selected ? null : t.taskId)}
                  >
                    {shortId(t.taskId)}
                    {t.confidence && (
                      <span className="conf" style={{
                        background: t.confidence === 'high' ? '#22c55e' : t.confidence === 'medium' ? '#f59e0b' : '#ef4444',
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <div className="panel">
          <div style={{ fontSize: 11, marginBottom: 6 }}>{selectedTask.taskId} — {selectedTask.title}</div>
          <div>phase: {selectedTask.phase ?? '—'} | verdict: {selectedTask.verdict ?? '—'} | risk: {selectedTask.riskLevel}
            {' '}(e:{selectedTask.issueCounts.error} w:{selectedTask.issueCounts.warning} s:{selectedTask.issueCounts.suggestion})
            {' '}| confidence: {selectedTask.confidence ?? '—'}</div>
          {selectedTask.latestDecision && (
            <div style={{ color: '#22c55e' }}>
              decision: {selectedTask.latestDecision.decision} · {selectedTask.latestDecision.actor}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {DECISION_ACTIONS.map(({ action, label }) => (
              <button key={action} onClick={() => decide(selectedTask.taskId, action)}>{label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
