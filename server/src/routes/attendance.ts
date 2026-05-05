import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';
import { getMarkedByTrainerId, isAttendanceStatus } from '../workflowRules.js';

type SessionTrainerRow = { trainer_id: number } & RowDataPacket;
type BookingRow = { BookingID: number } & RowDataPacket;

function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Valid ${label} is required`);
  return id;
}

async function getSessionTrainer(sessionId: number) {
  const [rows] = await pool.query<SessionTrainerRow[]>('SELECT TrainerUserID AS trainer_id FROM `session` WHERE SessionID = ? LIMIT 1', [sessionId]);
  return rows[0] ?? null;
}

function assertCanAccessSession(user: Awaited<ReturnType<typeof requireDemoUser>>, sessionTrainerId: number) {
  if (user.role === 'admin') return;
  if (user.role === 'trainer' && user.trainer_id === sessionTrainerId) return;
  throw new HttpError(403, 'You are not allowed to perform this action');
}

export const attendanceRouter = Router();

attendanceRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);

  if (user.role === 'trainer') {
    if (!user.trainer_id) throw new HttpError(403, 'Trainer profile is required');
    const [rows] = await pool.query(
      `SELECT a.AttendanceID AS attendance_id,
              b.MemberUserID AS member_id,
              b.SessionID AS session_id,
              a.MarkedByTrainerUserID AS marked_by_trainer_id,
              LOWER(a.AttendanceStatus) AS attendance_status,
              a.MarkedAt AS marked_at,
              s.SessionTitle AS session_title, s.SessionType AS session_type,
              s.SessionDate AS session_date, s.StartTime AS start_time,
              member_user.FullName AS member_name
         FROM attendance a
         JOIN booking b ON b.BookingID = a.BookingID
         JOIN \`session\` s ON s.SessionID = b.SessionID
         JOIN member m ON m.UserID = b.MemberUserID
         JOIN \`user\` member_user ON member_user.UserID = m.UserID
        WHERE s.TrainerUserID = ?
        ORDER BY s.SessionDate DESC, s.StartTime DESC, member_user.FullName`,
      [user.trainer_id]
    );
    res.json({ attendance: rows });
    return;
  }

  requireRole(user, ['admin']);
  const [rows] = await pool.query(
    `SELECT a.AttendanceID AS attendance_id,
            b.MemberUserID AS member_id,
            b.SessionID AS session_id,
            a.MarkedByTrainerUserID AS marked_by_trainer_id,
            LOWER(a.AttendanceStatus) AS attendance_status,
            a.MarkedAt AS marked_at,
            s.SessionTitle AS session_title, s.SessionType AS session_type,
            s.SessionDate AS session_date, s.StartTime AS start_time,
            member_user.FullName AS member_name, trainer_user.FullName AS trainer_name
       FROM attendance a
        JOIN booking b ON b.BookingID = a.BookingID
        JOIN \`session\` s ON s.SessionID = b.SessionID
        JOIN member m ON m.UserID = b.MemberUserID
        JOIN \`user\` member_user ON member_user.UserID = m.UserID
        JOIN trainer t ON t.UserID = a.MarkedByTrainerUserID
        JOIN \`user\` trainer_user ON trainer_user.UserID = t.UserID
       ORDER BY s.SessionDate DESC, s.StartTime DESC, member_user.FullName`
  );

  res.json({ attendance: rows });
}));

attendanceRouter.get('/history', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['trainer']);
  if (!user.trainer_id) throw new HttpError(403, 'Trainer profile is required');

  const [rows] = await pool.query(
    `SELECT a.AttendanceID AS attendance_id,
            b.MemberUserID AS member_id,
            b.SessionID AS session_id,
            a.MarkedByTrainerUserID AS marked_by_trainer_id,
            LOWER(a.AttendanceStatus) AS attendance_status,
            a.MarkedAt AS marked_at,
            s.SessionTitle AS session_title, s.SessionType AS session_type,
            s.SessionDate AS session_date, s.StartTime AS start_time,
            s.EndTime AS end_time,
            member_user.FullName AS member_name, member_user.Email AS member_email
       FROM attendance a
        JOIN booking b ON b.BookingID = a.BookingID
        JOIN \`session\` s ON s.SessionID = b.SessionID
        JOIN member m ON m.UserID = b.MemberUserID
        JOIN \`user\` member_user ON member_user.UserID = m.UserID
       WHERE s.TrainerUserID = ?
       ORDER BY s.SessionDate DESC, s.StartTime DESC, member_user.FullName`,
    [user.trainer_id]
  );

  res.json({ attendance: rows });
}));

attendanceRouter.get('/session/:sessionId', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['trainer', 'admin']);
  const sessionId = parseId(req.params.sessionId, 'session id');
  const session = await getSessionTrainer(sessionId);
  if (!session) throw new HttpError(404, 'Session was not found');
  assertCanAccessSession(user, session.trainer_id);

  const [rows] = await pool.query(
    `SELECT b.MemberUserID AS member_id, u.FullName AS member_name, u.Email AS member_email,
            a.AttendanceID AS attendance_id, LOWER(a.AttendanceStatus) AS attendance_status,
            a.MarkedByTrainerUserID AS marked_by_trainer_id, a.MarkedAt AS marked_at
       FROM booking b
       JOIN member m ON m.UserID = b.MemberUserID
       JOIN \`user\` u ON u.UserID = m.UserID
       LEFT JOIN attendance a ON a.BookingID = b.BookingID
      WHERE b.SessionID = ? AND b.BookingStatus IN ('Confirmed', 'Booked')
      ORDER BY u.FullName`,
    [sessionId]
  );

  res.json({ attendance: rows });
}));

attendanceRouter.post('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['trainer', 'admin']);

  const sessionId = parseId(req.body.session_id, 'session id');
  const memberId = parseId(req.body.member_id, 'member id');
  const attendanceStatus = String(req.body.attendance_status ?? '').trim();
  if (!isAttendanceStatus(attendanceStatus)) throw new HttpError(400, 'Attendance status must be present, absent, or late');

  const session = await getSessionTrainer(sessionId);
  if (!session) throw new HttpError(404, 'Session was not found');
  assertCanAccessSession(user, session.trainer_id);

  const [bookingRows] = await pool.query<BookingRow[]>(
    `SELECT BookingID
       FROM booking
      WHERE SessionID = ?
        AND MemberUserID = ?
        AND BookingStatus IN ('Confirmed', 'Booked')
      LIMIT 1`,
    [sessionId, memberId]
  );
  const bookingId = bookingRows[0]?.BookingID;
  if (!bookingId) throw new HttpError(400, 'Member has not booked this session');

  const submittedTrainerId = req.body.marked_by_trainer_id === undefined ? undefined : parseId(req.body.marked_by_trainer_id, 'marked by trainer id');
  const markedByTrainerId = getMarkedByTrainerId(session.trainer_id, submittedTrainerId);

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO attendance (BookingID, MarkedByTrainerUserID, AttendanceStatus, MarkedAt)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE MarkedByTrainerUserID = VALUES(MarkedByTrainerUserID),
                             AttendanceStatus = VALUES(AttendanceStatus),
                             MarkedAt = NOW()`,
    [bookingId, markedByTrainerId, attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1)]
  );

  res.status(result.insertId ? 201 : 200).json({
    attendance: { session_id: sessionId, member_id: memberId, marked_by_trainer_id: markedByTrainerId, attendance_status: attendanceStatus }
  });
}));
