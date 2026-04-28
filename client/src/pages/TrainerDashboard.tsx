import { FormEvent, useEffect, useState } from 'react';
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
  status: string;
};

type AttendanceRow = ResourceRow & {
  member_id: number;
  member_name: string;
  member_email: string | null;
  attendance_status: string | null;
};

const sessionColumns: ResourceColumn<SessionRow>[] = [
  { key: 'session_id', label: 'ID' },
  { key: 'session_type', label: 'Type' },
  { key: 'session_date', label: 'Date' },
  { key: 'start_time', label: 'Start' },
  { key: 'end_time', label: 'End' },
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

const attendanceStatuses = ['present', 'absent', 'late'];

export default function TrainerDashboard() {
  const { request, user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [statusByMember, setStatusByMember] = useState<Record<number, string>>({});
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
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
        setSelectedSessionId((current) => current ?? assignedSessions[0]?.session_id ?? null);
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
        setStatusByMember(Object.fromEntries(data.attendance.map((row) => [row.member_id, row.attendance_status ?? 'present'])));
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
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await Promise.all(attendance.map((row) => request('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          session_id: selectedSessionId,
          member_id: row.member_id,
          attendance_status: statusByMember[row.member_id] ?? 'present'
        })
      })));
      const refreshed = await request<{ attendance: AttendanceRow[] }>(`/attendance/session/${selectedSessionId}`);
      setAttendance(refreshed.attendance);
      setMessage('Attendance saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-stack">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Trainer workflow</p>
          <h1>Sessions and attendance</h1>
          <p className="muted">Select an assigned session, mark booked members, and save attendance.</p>
        </div>
      </section>

      <ResourceTable title="Assigned sessions" rows={sessions} columns={sessionColumns} loading={sessionsLoading} error={error && !selectedSessionId ? error : null} />

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Attendance</p>
            <h2>Mark attendance</h2>
          </div>
          <select value={selectedSessionId ?? ''} onChange={(event) => setSelectedSessionId(Number(event.target.value) || null)}>
            <option value="">Select session</option>
            {sessions.map((session) => (
              <option key={session.session_id} value={session.session_id}>{session.session_type} - {session.session_date} {session.start_time}</option>
            ))}
          </select>
        </div>

        {error && selectedSessionId ? <p className="error" role="alert">{error}</p> : null}
        {message ? <p className="success" role="status">{message}</p> : null}
        {attendanceLoading ? <p className="muted">Loading attendance...</p> : null}
        {!attendanceLoading && selectedSessionId && attendance.length === 0 ? <p className="empty-state">No booked members for this session.</p> : null}

        {!attendanceLoading && attendance.length > 0 ? (
          <form className="attendance-form" onSubmit={handleSubmit}>
            <ResourceTable title="Booked members" rows={attendance} columns={attendanceColumns} />
            <div className="attendance-list">
              {attendance.map((row) => (
                <label className="inline-field" key={row.member_id}>
                  <span>{row.member_name}</span>
                  <select value={statusByMember[row.member_id] ?? 'present'} onChange={(event) => setStatusByMember((current) => ({ ...current, [row.member_id]: event.target.value }))}>
                    {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save attendance'}</button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
