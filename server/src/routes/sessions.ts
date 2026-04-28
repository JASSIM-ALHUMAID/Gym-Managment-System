import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

type SessionInput = {
  trainer_id: number;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
};

type CountRow = { count: number } & RowDataPacket;
type SessionBookedCountRow = { session_id: number; count: number } & RowDataPacket;

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
  const sessionDate = String(body.session_date ?? '').trim();
  const startTime = String(body.start_time ?? '').trim();
  const endTime = String(body.end_time ?? '').trim();
  const capacity = Number(body.capacity);

  if (!Number.isInteger(trainerId) || trainerId <= 0) throw new HttpError(400, 'Valid trainer id is required');
  if (!sessionType) throw new HttpError(400, 'Session type is required');
  if (!isValidDate(sessionDate)) throw new HttpError(400, 'Valid session date is required');
  if (!isValidTime(startTime)) throw new HttpError(400, 'Valid start time is required');
  if (!isValidTime(endTime)) throw new HttpError(400, 'Valid end time is required');
  if (!Number.isInteger(capacity) || capacity <= 0) throw new HttpError(400, 'Capacity must be greater than 0');
  if (toTimeValue(endTime) <= toTimeValue(startTime)) throw new HttpError(400, 'End time must be after start time');

  return {
    trainer_id: trainerId,
    session_type: sessionType,
    session_date: sessionDate,
    start_time: startTime,
    end_time: endTime,
    capacity
  };
}

async function trainerExists(trainerId: number) {
  const [rows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS count FROM trainers WHERE trainer_id = ?', [trainerId]);
  return (rows[0]?.count ?? 0) > 0;
}

async function getBookedCount(sessionId: number) {
  const [rows] = await pool.query<SessionBookedCountRow[]>(
    `SELECT s.session_id, COUNT(b.booking_id) AS count
       FROM sessions s
       LEFT JOIN bookings b ON b.session_id = s.session_id AND b.booking_status = 'booked'
      WHERE s.session_id = ?
      GROUP BY s.session_id`,
    [sessionId]
  );
  return rows[0]?.count ?? null;
}

export const sessionsRouter = Router();

sessionsRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  const statusFilter = user.role === 'admin' || user.role === 'staff' ? '' : "WHERE s.status = 'scheduled'";

  const [rows] = await pool.query(`
    SELECT s.*, u.full_name AS trainer_name, COALESCE(booked.booked_count, 0) AS booked_count
      FROM sessions s
      JOIN trainers t ON t.trainer_id = s.trainer_id
      JOIN users u ON u.user_id = t.user_id
      LEFT JOIN (
        SELECT session_id, COUNT(*) AS booked_count
          FROM bookings
         WHERE booking_status = 'booked'
         GROUP BY session_id
      ) booked ON booked.session_id = s.session_id
      ${statusFilter}
     ORDER BY s.session_date, s.start_time
  `);

  res.json({ sessions: rows });
}));

sessionsRouter.post('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const input = parseSessionInput(req.body);
  if (!await trainerExists(input.trainer_id)) throw new HttpError(404, 'Trainer was not found');

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO sessions (trainer_id, session_type, session_date, start_time, end_time, capacity) VALUES (?, ?, ?, ?, ?, ?)',
    [input.trainer_id, input.session_type, input.session_date, input.start_time, input.end_time, input.capacity]
  );

  res.status(201).json({ session: { session_id: result.insertId, ...input } });
}));

sessionsRouter.put('/:id', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) throw new HttpError(400, 'Valid session id is required');
  const input = parseSessionInput(req.body);
  const bookedCount = await getBookedCount(sessionId);
  if (bookedCount === null) throw new HttpError(404, 'Session was not found');
  if (!await trainerExists(input.trainer_id)) throw new HttpError(404, 'Trainer was not found');
  if (input.capacity < bookedCount) throw new HttpError(400, 'Capacity cannot be less than current booked count');

  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE sessions SET trainer_id = ?, session_type = ?, session_date = ?, start_time = ?, end_time = ?, capacity = ? WHERE session_id = ?',
    [input.trainer_id, input.session_type, input.session_date, input.start_time, input.end_time, input.capacity, sessionId]
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Session was not found');

  res.json({ session: { session_id: sessionId, ...input } });
}));

sessionsRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) throw new HttpError(400, 'Valid session id is required');
  const status = String(req.body.status ?? '').trim();
  if (!sessionStatuses.includes(status as typeof sessionStatuses[number])) throw new HttpError(400, 'Status must be scheduled, completed, or cancelled');

  const [result] = await pool.query<ResultSetHeader>('UPDATE sessions SET status = ? WHERE session_id = ?', [status, sessionId]);
  if (result.affectedRows === 0) throw new HttpError(404, 'Session was not found');
  res.json({ session: { session_id: sessionId, status } });
}));
