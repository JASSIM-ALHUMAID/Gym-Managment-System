import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';
import { getMarkedByTrainerId, isAttendanceStatus } from '../workflowRules.js';

type SessionTrainerRow = { trainer_id: number } & RowDataPacket;
type CountRow = { count: number } & RowDataPacket;

function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Valid ${label} is required`);
  return id;
}

async function getSessionTrainer(sessionId: number) {
  const [rows] = await pool.query<SessionTrainerRow[]>('SELECT trainer_id FROM sessions WHERE session_id = ? LIMIT 1', [sessionId]);
  return rows[0] ?? null;
}

function assertCanAccessSession(user: Awaited<ReturnType<typeof requireDemoUser>>, sessionTrainerId: number) {
  if (user.role === 'admin' || user.role === 'staff') return;
  if (user.role === 'trainer' && user.trainer_id === sessionTrainerId) return;
  throw new HttpError(403, 'You are not allowed to perform this action');
}

export const attendanceRouter = Router();

attendanceRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);

  if (user.role === 'trainer') {
    if (!user.trainer_id) throw new HttpError(403, 'Trainer profile is required');
    const [rows] = await pool.query(
      `SELECT a.*, s.session_type, s.session_date, s.start_time, member_user.full_name AS member_name
         FROM attendance a
         JOIN sessions s ON s.session_id = a.session_id
         JOIN members m ON m.member_id = a.member_id
         JOIN users member_user ON member_user.user_id = m.user_id
        WHERE s.trainer_id = ?
        ORDER BY s.session_date DESC, s.start_time DESC, member_user.full_name`,
      [user.trainer_id]
    );
    res.json({ attendance: rows });
    return;
  }

  requireRole(user, ['admin', 'staff']);
  const [rows] = await pool.query(
    `SELECT a.*, s.session_type, s.session_date, s.start_time,
            member_user.full_name AS member_name, trainer_user.full_name AS trainer_name
       FROM attendance a
       JOIN sessions s ON s.session_id = a.session_id
       JOIN members m ON m.member_id = a.member_id
       JOIN users member_user ON member_user.user_id = m.user_id
       JOIN trainers t ON t.trainer_id = a.marked_by_trainer_id
       JOIN users trainer_user ON trainer_user.user_id = t.user_id
      ORDER BY s.session_date DESC, s.start_time DESC, member_user.full_name`
  );

  res.json({ attendance: rows });
}));

attendanceRouter.get('/session/:sessionId', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['trainer', 'admin', 'staff']);
  const sessionId = parseId(req.params.sessionId, 'session id');
  const session = await getSessionTrainer(sessionId);
  if (!session) throw new HttpError(404, 'Session was not found');
  assertCanAccessSession(user, session.trainer_id);

  const [rows] = await pool.query(
    `SELECT b.member_id, u.full_name AS member_name, u.email AS member_email,
            a.attendance_id, a.attendance_status, a.marked_by_trainer_id, a.marked_at
       FROM bookings b
       JOIN members m ON m.member_id = b.member_id
       JOIN users u ON u.user_id = m.user_id
       LEFT JOIN attendance a ON a.session_id = b.session_id AND a.member_id = b.member_id
      WHERE b.session_id = ? AND b.booking_status = 'booked'
      ORDER BY u.full_name`,
    [sessionId]
  );

  res.json({ attendance: rows });
}));

attendanceRouter.post('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['trainer', 'admin', 'staff']);

  const sessionId = parseId(req.body.session_id, 'session id');
  const memberId = parseId(req.body.member_id, 'member id');
  const attendanceStatus = String(req.body.attendance_status ?? '').trim();
  if (!isAttendanceStatus(attendanceStatus)) throw new HttpError(400, 'Attendance status must be present, absent, or late');

  const session = await getSessionTrainer(sessionId);
  if (!session) throw new HttpError(404, 'Session was not found');
  assertCanAccessSession(user, session.trainer_id);

  const [bookingRows] = await pool.query<CountRow[]>(
    "SELECT COUNT(*) AS count FROM bookings WHERE session_id = ? AND member_id = ? AND booking_status = 'booked'",
    [sessionId, memberId]
  );
  if ((bookingRows[0]?.count ?? 0) === 0) throw new HttpError(400, 'Member has not booked this session');

  const submittedTrainerId = req.body.marked_by_trainer_id === undefined ? undefined : parseId(req.body.marked_by_trainer_id, 'marked by trainer id');
  const markedByTrainerId = getMarkedByTrainerId(session.trainer_id, submittedTrainerId);

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO attendance (session_id, member_id, marked_by_trainer_id, attendance_status, marked_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE marked_by_trainer_id = VALUES(marked_by_trainer_id),
                             attendance_status = VALUES(attendance_status),
                             marked_at = NOW()`,
    [sessionId, memberId, markedByTrainerId, attendanceStatus]
  );

  res.status(result.insertId ? 201 : 200).json({
    attendance: { session_id: sessionId, member_id: memberId, marked_by_trainer_id: markedByTrainerId, attendance_status: attendanceStatus }
  });
}));
