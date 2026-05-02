import { Router } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';
import { canBookSession, getBookingResponseStatus } from '../workflowRules.js';

type SessionRow = { status: string; capacity: number; session_type: string } & RowDataPacket;
type CountRow = { count: number } & RowDataPacket;
type ExistingBookingRow = { booking_id: number; booking_status: string } & RowDataPacket;
type BookingStatusRow = { booking_status: string } & RowDataPacket;

function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Valid ${label} is required`);
  return id;
}

async function memberExists(connection: PoolConnection, memberId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT members.member_id
       FROM members
       JOIN users ON users.user_id = members.user_id
      WHERE members.member_id = ? AND users.status = 'active'
      FOR UPDATE`,
    [memberId]
  );
  return rows.length > 0;
}

async function getLockedSession(connection: PoolConnection, sessionId: number) {
  const [rows] = await connection.query<SessionRow[]>(
    'SELECT status, capacity, session_type FROM sessions WHERE session_id = ? FOR UPDATE',
    [sessionId]
  );
  return rows[0] ?? null;
}

async function getBookedCount(connection: PoolConnection, sessionId: number) {
  const [rows] = await connection.query<CountRow[]>(
    "SELECT COUNT(*) AS count FROM bookings WHERE session_id = ? AND booking_status = 'booked'",
    [sessionId]
  );
  return rows[0]?.count ?? 0;
}

async function getActivePlanName(connection: PoolConnection, memberId: number) {
  const [rows] = await connection.query<({ plan_name: string } & RowDataPacket)[]>(
    `SELECT p.plan_name
       FROM subscriptions s
       JOIN membership_plans p ON p.plan_id = s.plan_id
      WHERE s.member_id = ?
        AND s.status = 'active'
        AND CURDATE() BETWEEN s.start_date AND s.end_date
      ORDER BY s.start_date DESC
      LIMIT 1`,
    [memberId]
  );
  return rows[0]?.plan_name ?? null;
}

function planIncludesSession(planName: string, sessionType: string) {
  const plan = planName.toLowerCase();
  const session = sessionType.toLowerCase();
  if (plan.includes('premium')) return true;
  if (plan.includes('plus')) return !session.includes('personal');
  return false;
}

async function getExistingBooking(connection: PoolConnection, memberId: number, sessionId: number) {
  const [rows] = await connection.query<ExistingBookingRow[]>(
    'SELECT booking_id, booking_status FROM bookings WHERE member_id = ? AND session_id = ? LIMIT 1',
    [memberId, sessionId]
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

  const connection = await pool.getConnection();
  let committed = false;
  try {
    await connection.beginTransaction();

    if (!await memberExists(connection, memberId)) throw new HttpError(404, 'Member was not found');

    const activePlanName = user.role === 'member' ? await getActivePlanName(connection, memberId) : null;
    if (user.role === 'member' && !activePlanName) throw new HttpError(403, 'An active subscription is required to book sessions');

    const session = await getLockedSession(connection, sessionId);
    if (!session) throw new HttpError(404, 'Session was not found');
    if (user.role === 'member' && activePlanName && !planIncludesSession(activePlanName, session.session_type)) {
      throw new HttpError(403, 'Your current plan does not include this session');
    }

    const existing = await getExistingBooking(connection, memberId, sessionId);
    const bookedCount = await getBookedCount(connection, sessionId);
    const bookingDecision = canBookSession({
      status: session.status,
      capacity: session.capacity,
      bookedCount,
      existingBookingStatus: existing?.booking_status
    });
    if (bookingDecision !== 'ok') throw new HttpError(400, bookingDecision);

    const statusCode = getBookingResponseStatus(existing);
    const bookingId = existing?.booking_id;
    if (existing) {
      await connection.query<ResultSetHeader>(
        "UPDATE bookings SET booking_status = 'booked', booking_date = CURDATE() WHERE booking_id = ?",
        [existing.booking_id]
      );
    } else {
      const [result] = await connection.query<ResultSetHeader>(
        "INSERT INTO bookings (member_id, session_id, booking_date, booking_status) VALUES (?, ?, CURDATE(), 'booked')",
        [memberId, sessionId]
      );
      await connection.commit();
      committed = true;
      res.status(statusCode).json({ booking: { booking_id: result.insertId, member_id: memberId, session_id: sessionId, booking_status: 'booked' } });
      return;
    }

    await connection.commit();
    committed = true;
    res.status(statusCode).json({ booking: { booking_id: bookingId, member_id: memberId, session_id: sessionId, booking_status: 'booked' } });
  } catch (error) {
    if (!committed) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

  const [bookingRows] = await pool.query<BookingStatusRow[]>(
    `SELECT booking_status FROM bookings WHERE booking_id = ?${memberFilter} LIMIT 1`,
    params
  );
  const booking = bookingRows[0];
  if (!booking) throw new HttpError(404, 'Booking was not found');
  if (booking.booking_status === 'cancelled') throw new HttpError(409, 'Booking is already cancelled');

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE bookings SET booking_status = 'cancelled' WHERE booking_id = ?${memberFilter}`,
    params
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Booking was not found');

  res.json({ booking: { booking_id: bookingId, booking_status: 'cancelled' } });
}));
