import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

type SessionBookingRow = { status: string; capacity: number; booked_count: number } & RowDataPacket;
type ExistingBookingRow = { booking_id: number; booking_status: string } & RowDataPacket;

function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Valid ${label} is required`);
  return id;
}

async function getSessionBookingState(sessionId: number) {
  const [rows] = await pool.query<SessionBookingRow[]>(
    `SELECT s.status, s.capacity, COUNT(b.booking_id) AS booked_count
       FROM sessions s
       LEFT JOIN bookings b ON b.session_id = s.session_id AND b.booking_status = 'booked'
      WHERE s.session_id = ?
      GROUP BY s.session_id`,
    [sessionId]
  );

  return rows[0] ?? null;
}

export const bookingsRouter = Router();

bookingsRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);

  if (user.role === 'member') {
    if (!user.member_id) throw new HttpError(403, 'Member profile is required');
    const [rows] = await pool.query(
      `SELECT b.*, s.session_type, s.session_date, s.start_time, s.end_time, s.status AS session_status,
              u.full_name AS trainer_name
         FROM bookings b
         JOIN sessions s ON s.session_id = b.session_id
         JOIN trainers t ON t.trainer_id = s.trainer_id
         JOIN users u ON u.user_id = t.user_id
        WHERE b.member_id = ?
        ORDER BY s.session_date DESC, s.start_time DESC`,
      [user.member_id]
    );
    res.json({ bookings: rows });
    return;
  }

  requireRole(user, ['admin', 'staff']);
  const [rows] = await pool.query(
    `SELECT b.*, s.session_type, s.session_date, s.start_time, s.end_time, s.status AS session_status,
            member_user.full_name AS member_name, member_user.email AS member_email,
            trainer_user.full_name AS trainer_name
       FROM bookings b
       JOIN members m ON m.member_id = b.member_id
       JOIN users member_user ON member_user.user_id = m.user_id
       JOIN sessions s ON s.session_id = b.session_id
       JOIN trainers t ON t.trainer_id = s.trainer_id
       JOIN users trainer_user ON trainer_user.user_id = t.user_id
      ORDER BY s.session_date DESC, s.start_time DESC`
  );

  res.json({ bookings: rows });
}));

bookingsRouter.post('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['member', 'admin', 'staff']);

  const sessionId = parseId(req.body.session_id, 'session id');
  const memberId = user.role === 'member' ? user.member_id : parseId(req.body.member_id, 'member id');
  if (!memberId) throw new HttpError(403, 'Member profile is required');

  const session = await getSessionBookingState(sessionId);
  if (!session) throw new HttpError(404, 'Session was not found');
  if (session.status !== 'scheduled') throw new HttpError(400, 'Session is not available for booking');

  const [existingRows] = await pool.query<ExistingBookingRow[]>(
    'SELECT booking_id, booking_status FROM bookings WHERE member_id = ? AND session_id = ? LIMIT 1',
    [memberId, sessionId]
  );
  const existing = existingRows[0];
  if (existing?.booking_status === 'booked') throw new HttpError(400, 'Member already booked this session');
  if (session.booked_count >= session.capacity) throw new HttpError(400, 'Session is full');

  if (existing) {
    await pool.query<ResultSetHeader>(
      "UPDATE bookings SET booking_status = 'booked', booking_date = CURDATE() WHERE booking_id = ?",
      [existing.booking_id]
    );
    res.status(201).json({ booking: { booking_id: existing.booking_id, member_id: memberId, session_id: sessionId, booking_status: 'booked' } });
    return;
  }

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO bookings (member_id, session_id, booking_date, booking_status) VALUES (?, ?, CURDATE(), 'booked')",
    [memberId, sessionId]
  );

  res.status(201).json({ booking: { booking_id: result.insertId, member_id: memberId, session_id: sessionId, booking_status: 'booked' } });
}));

bookingsRouter.patch('/:id/cancel', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['member', 'admin', 'staff']);
  const bookingId = parseId(req.params.id, 'booking id');

  const params: unknown[] = [bookingId];
  let memberFilter = '';
  if (user.role === 'member') {
    if (!user.member_id) throw new HttpError(403, 'Member profile is required');
    memberFilter = ' AND member_id = ?';
    params.push(user.member_id);
  }

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE bookings SET booking_status = 'cancelled' WHERE booking_id = ?${memberFilter}`,
    params
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Booking was not found');

  res.json({ booking: { booking_id: bookingId, booking_status: 'cancelled' } });
}));
