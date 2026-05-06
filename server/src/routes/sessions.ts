import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

type SessionInput = {
  trainer_id: number;
  session_title: string;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
};

type CountRow = { count: number } & RowDataPacket;
type SessionBookedCountRow = { session_id: number; count: number; status?: string } & RowDataPacket;
type SessionStatusRow = { status: string } & RowDataPacket;

const sessionStatuses = ['scheduled', 'completed', 'cancelled'] as const;

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

function toTimeValue(value: string) {
  const [hours, minutes, seconds = 0] = value.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function parseSessionInput(body: Record<string, unknown>): SessionInput {
  const trainerId = Number(body.trainer_id);
  const sessionType = String(body.session_type ?? '').trim();
  const sessionTitle = String(body.session_title ?? body.session_type ?? '').trim();
  const sessionDate = String(body.session_date ?? '').trim();
  const startTime = String(body.start_time ?? '').trim();
  const endTime = String(body.end_time ?? '').trim();
  const capacity = Number(body.capacity);

  if (!Number.isInteger(trainerId) || trainerId <= 0) throw new HttpError(400, 'Valid trainer id is required');
  if (!sessionType) throw new HttpError(400, 'Session type is required');
  if (!sessionTitle) throw new HttpError(400, 'Session title is required');
  if (!isValidDate(sessionDate)) throw new HttpError(400, 'Valid session date is required');
  if (!isValidTime(startTime)) throw new HttpError(400, 'Valid start time is required');
  if (!isValidTime(endTime)) throw new HttpError(400, 'Valid end time is required');
  if (!Number.isInteger(capacity) || capacity <= 0) throw new HttpError(400, 'Capacity must be greater than 0');
  if (toTimeValue(endTime) <= toTimeValue(startTime)) throw new HttpError(400, 'End time must be after start time');

  return {
    trainer_id: trainerId,
    session_title: sessionTitle,
    session_type: sessionType,
    session_date: sessionDate,
    start_time: startTime,
    end_time: endTime,
    capacity
  };
}

async function trainerExists(trainerId: number) {
  const [rows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS count FROM trainer WHERE UserID = ?', [trainerId]);
  return (rows[0]?.count ?? 0) > 0;
}

async function getSessionUpdateState(sessionId: number) {
  const [rows] = await pool.query<SessionBookedCountRow[]>(
    `SELECT s.SessionID AS session_id, s.Status AS status, COUNT(b.BookingID) AS count
       FROM \`session\` s
       LEFT JOIN booking b ON b.SessionID = s.SessionID AND b.BookingStatus IN ('Confirmed', 'Booked')
      WHERE s.SessionID = ?
      GROUP BY s.SessionID`,
    [sessionId]
  );
  return rows[0] ?? null;
}

function normalizeStatus(value: string | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function toDbStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function toSessionResponse(sessionId: number, input: SessionInput, status?: string) {
  return {
    session_id: sessionId,
    trainer_id: input.trainer_id,
    session_title: input.session_title,
    session_type: input.session_type,
    session_date: input.session_date,
    start_time: input.start_time,
    end_time: input.end_time,
    capacity: input.capacity,
    ...(status ? { status } : {})
  };
}

export const sessionsRouter = Router();

sessionsRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  const statusFilter = user.role === 'admin' ? '' : "WHERE s.Status = 'Scheduled'";

  const [rows] = await pool.query(`
    SELECT s.SessionID AS session_id,
           s.TrainerUserID AS trainer_id,
           s.SessionTitle AS session_title,
           s.SessionType AS session_type,
           s.SessionDate AS session_date,
           s.StartTime AS start_time,
           s.EndTime AS end_time,
           s.Capacity AS capacity,
           LOWER(s.Status) AS status,
           u.FullName AS trainer_name,
           t.Specialty AS trainer_specialty,
           COALESCE(booked.booked_count, 0) AS booked_count
      FROM \`session\` s
      JOIN trainer t ON t.UserID = s.TrainerUserID
      JOIN \`user\` u ON u.UserID = t.UserID
      LEFT JOIN (
        SELECT SessionID, COUNT(*) AS booked_count
          FROM booking
         WHERE BookingStatus IN ('Confirmed', 'Booked')
         GROUP BY SessionID
      ) booked ON booked.SessionID = s.SessionID
      ${statusFilter}
     ORDER BY s.SessionDate, s.StartTime
  `);

  res.json({ sessions: rows });
}));

sessionsRouter.post('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const input = parseSessionInput(req.body);
  if (!await trainerExists(input.trainer_id)) throw new HttpError(404, 'Trainer was not found');

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO `session` (TrainerUserID, SessionTitle, SessionType, SessionDate, StartTime, EndTime, Capacity, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [input.trainer_id, input.session_title, input.session_type, input.session_date, input.start_time, input.end_time, input.capacity, 'Scheduled']
  );

  res.status(201).json({ session: toSessionResponse(result.insertId, input, 'scheduled') });
}));

sessionsRouter.put('/:id', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) throw new HttpError(400, 'Valid session id is required');
  const input = parseSessionInput(req.body);
  const sessionState = await getSessionUpdateState(sessionId);
  if (sessionState === null) throw new HttpError(404, 'Session was not found');
  if (sessionState.status && normalizeStatus(sessionState.status) !== 'scheduled') throw new HttpError(409, 'Only scheduled sessions can be updated');
  if (!await trainerExists(input.trainer_id)) throw new HttpError(404, 'Trainer was not found');
  if (input.capacity < sessionState.count) throw new HttpError(400, 'Capacity cannot be less than current booked count');

  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE `session` SET TrainerUserID = ?, SessionTitle = ?, SessionType = ?, SessionDate = ?, StartTime = ?, EndTime = ?, Capacity = ? WHERE SessionID = ?',
    [input.trainer_id, input.session_title, input.session_type, input.session_date, input.start_time, input.end_time, input.capacity, sessionId]
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Session was not found');

  res.json({ session: toSessionResponse(sessionId, input) });
}));

sessionsRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) throw new HttpError(400, 'Valid session id is required');
  const status = String(req.body.status ?? '').trim();
  if (!sessionStatuses.includes(status as typeof sessionStatuses[number])) throw new HttpError(400, 'Status must be scheduled, completed, or cancelled');

  const [sessionRows] = await pool.query<SessionStatusRow[]>('SELECT Status AS status FROM `session` WHERE SessionID = ? LIMIT 1', [sessionId]);
  const currentStatus = sessionRows[0]?.status;
  if (!currentStatus) throw new HttpError(404, 'Session was not found');
  if (normalizeStatus(currentStatus) === 'completed') throw new HttpError(409, 'Completed sessions cannot change status');
  if (normalizeStatus(currentStatus) === 'cancelled') throw new HttpError(409, 'Cancelled sessions cannot change status');
  if (status === 'scheduled' && normalizeStatus(currentStatus) !== 'scheduled') throw new HttpError(409, 'Only scheduled sessions can be completed or cancelled');

  const [result] = await pool.query<ResultSetHeader>('UPDATE `session` SET Status = ? WHERE SessionID = ?', [toDbStatus(status), sessionId]);
  if (result.affectedRows === 0) throw new HttpError(404, 'Session was not found');
  res.json({ session: { session_id: sessionId, status } });
}));
