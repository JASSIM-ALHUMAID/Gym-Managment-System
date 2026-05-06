import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth';
import ResourceTable, { type ResourceColumn, type ResourceRow } from './ResourceTable';

type SessionRow = ResourceRow & {
  session_id: number;
  trainer_id: number;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  description: string | null;
  status: string;
};

type AttendanceRow = ResourceRow & {
  member_id: number;
  member_name: string;
  member_email: string | null;
  attendance_status: string | null;
};

function formatDate(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return '-';
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, Number(day)));
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatTime(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return '-';
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  const date = new Date(2000, 0, 1, hour, minute);
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatSessionLabel(session: { session_type: string; session_date: string; start_time: string }) {
  return `${session.session_type} - ${formatDate(session.session_date)} at ${formatTime(session.start_time)}`;
}

const sessionColumns: ResourceColumn<SessionRow>[] = [
  { key: 'session_id', label: 'ID' },
  { key: 'session_type', label: 'Type' },
  { key: 'session_date', label: 'Date', format: formatDate },
  { key: 'start_time', label: 'Start', format: formatTime },
  { key: 'end_time', label: 'End', format: formatTime },
  { key: 'booked_count', label: 'Booked' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'status', label: 'Status' }
];

const attendanceColumns: ResourceColumn<AttendanceRow>[] = [
  { key: 'member_id', label: 'Member ID' },
  { key: 'member_name', label: 'Member' },
  { key: 'member_email', label: 'Email' },
  { key: 'attendance_status', label: 'Current status' }
];

const historyColumns: ResourceColumn<ResourceRow>[] = [
  { key: 'attendance_id', label: 'ID' },
  { key: 'session_type', label: 'Type' },
  { key: 'member_name', label: 'Member' },
  { key: 'attendance_status', label: 'Status' },
  { key: 'session_date', label: 'Date', format: formatDate },
  { key: 'marked_at', label: 'Marked', format: formatDateTime }
];

const attendanceStatuses = ['present', 'absent', 'late'];

export default function TrainerDashboard() {
  const { request, user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [history, setHistory] = useState<ResourceRow[]>([]);
  const [statusByMember, setStatusByMember] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'mark' | 'history'>('upcoming');
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    setError(null);
    request<{ sessions: SessionRow[] }>('/sessions')
      .then((data) => {
        if (cancelled) return;
        const assignedSessions = data.sessions.filter((session) => !user?.trainer_id || session.trainer_id === user.trainer_id);
        setSessions(assignedSessions);
        setSelectedSessionId((current) => assignedSessions.some((session) => session.session_id === current) ? current : assignedSessions[0]?.session_id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load sessions');
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request, user?.trainer_id]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await request<{ attendance: ResourceRow[] }>('/attendance/history');
      setHistory(data.attendance);
    } catch {
      // History loads in the background; keep attendance marking usable if it fails.
    } finally {
      setHistoryLoading(false);
    }
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    request<{ attendance: ResourceRow[] }>('/attendance/history')
      .then((data) => {
        if (!cancelled) setHistory(data.attendance);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  useEffect(() => {
    if (!selectedSessionId) {
      setAttendance([]);
      setStatusByMember({});
      return;
    }

    let cancelled = false;
    setAttendanceLoading(true);
    setError(null);
    request<{ attendance: AttendanceRow[] }>(`/attendance/session/${selectedSessionId}`)
      .then((data) => {
        if (cancelled) return;
        setAttendance(data.attendance);
        setStatusByMember(Object.fromEntries(data.attendance.map((row) => [row.member_id, row.attendance_status ?? ''])));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load attendance');
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request, selectedSessionId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSessionId) return;
    const sessionId = selectedSessionId;
    setSaving(true);
    setError(null);
    setMessage(null);
    let savedCount = 0;

    try {
      for (const row of attendance) {
        await request('/attendance', {
          method: 'POST',
          body: JSON.stringify({
            session_id: sessionId,
            member_id: row.member_id,
            attendance_status: statusByMember[row.member_id] ?? 'present'
          })
        });
        savedCount += 1;
      }
      const refreshed = await request<{ attendance: AttendanceRow[] }>(`/attendance/session/${sessionId}`);
      setAttendance(refreshed.attendance);
      await loadHistory();
      setMessage('Attendance saved.');
    } catch (err) {
      const failureMessage = err instanceof Error ? err.message : 'Failed to save attendance';
      setError(savedCount > 0 ? `Saved ${savedCount} of ${attendance.length} records. ${failureMessage}` : failureMessage);
      if (savedCount > 0) {
        try {
          const refreshed = await request<{ attendance: AttendanceRow[] }>(`/attendance/session/${sessionId}`);
          setAttendance(refreshed.attendance);
        } catch {
          // Keep the partial-save message visible if the refresh also fails.
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const scheduledSessions = sessions.filter((session) => session.status === 'scheduled');
  const completedSessions = sessions.filter((session) => session.status === 'completed');
  const selectedSession = sessions.find((session) => session.session_id === selectedSessionId);

  return (
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Trainer floor</p>
          <h1>Sessions and attendance control</h1>
          <p className="muted">Review assigned sessions, load booked members, and submit attendance without leaving your role workspace.</p>
        </div>
      </section>

      <section className="trainer-command-grid" aria-label="Trainer command summary">
        <article className="status-card">
          <p className="eyebrow">Active protocols</p>
          <h2>{scheduledSessions.length}</h2>
          <p className="muted">Scheduled sessions assigned to your trainer profile.</p>
        </article>
        <article className="status-card">
          <p className="eyebrow">Attendance queue</p>
          <h2>{attendance.length}</h2>
          <p className="muted">Booked members loaded for the selected session.</p>
        </article>
        <article className="status-card trainer-focus-card">
          <p className="eyebrow">Selected session</p>
          <h2>{selectedSession ? selectedSession.session_type : 'Standby'}</h2>
          <p className="muted">{selectedSession ? `${formatDate(selectedSession.session_date)} at ${formatTime(selectedSession.start_time)}` : 'Select a session to begin attendance control.'}</p>
          <span className="pill">{completedSessions.length} completed</span>
        </article>
      </section>

      <section className="tabs dashboard-tabs" aria-label="Trainer sections">
        <button type="button" className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')}>Upcoming</button>
        <button type="button" className={activeTab === 'completed' ? 'active' : ''} onClick={() => setActiveTab('completed')}>Completed</button>
        <button type="button" className={activeTab === 'mark' ? 'active' : ''} onClick={() => setActiveTab('mark')}>Mark attendance</button>
        <button type="button" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>History</button>
      </section>

      {activeTab === 'upcoming' ? (
        <ResourceTable title="Upcoming assigned sessions" rows={scheduledSessions} columns={sessionColumns} loading={sessionsLoading} error={error && !selectedSessionId ? error : null} getRowKey={(session) => session.session_id} />
      ) : null}

      {activeTab === 'completed' ? (
        <ResourceTable title="Completed assigned sessions" rows={completedSessions} columns={sessionColumns} loading={sessionsLoading} error={error && !selectedSessionId ? error : null} getRowKey={(session) => session.session_id} />
      ) : null}

      {activeTab === 'history' ? (
        <ResourceTable title="Attendance history" rows={history} columns={historyColumns} loading={historyLoading} getRowKey={(row) => Number(row.attendance_id)} />
      ) : null}

      {activeTab === 'mark' ? <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Attendance</p>
            <h2>Mark attendance</h2>
          </div>
          <select aria-label="Select session to mark attendance" value={selectedSessionId ?? ''} disabled={saving} onChange={(event) => setSelectedSessionId(Number(event.target.value) || null)}>
            <option value="">Select session</option>
            {completedSessions.map((session) => (
              <option key={session.session_id} value={session.session_id}>{formatSessionLabel(session)}</option>
            ))}
          </select>
        </div>

        {error && selectedSessionId ? <p className="error" role="alert">{error}</p> : null}
        {message ? <p className="success" role="status">{message}</p> : null}
        {attendanceLoading ? <p className="muted">Loading attendance...</p> : null}
        {!attendanceLoading && selectedSessionId && attendance.length === 0 ? <p className="empty-state">No booked members for this session.</p> : null}

        {!attendanceLoading && attendance.length > 0 ? (
          <form className="attendance-form" onSubmit={handleSubmit}>
            <ResourceTable title="Booked members" rows={attendance} columns={attendanceColumns} getRowKey={(row) => row.member_id} />
            <div className="attendance-list">
              {attendance.map((row) => (
                <label className="inline-field" key={row.member_id}>
                  <span>{row.member_name}</span>
                  <select required value={statusByMember[row.member_id] ?? ''} onChange={(event) => setStatusByMember((current) => ({ ...current, [row.member_id]: event.target.value }))}>
                    <option value="">Choose status</option>
                    {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save attendance'}</button>
          </form>
        ) : null}
      </section> : null}
    </div>
  );
}
