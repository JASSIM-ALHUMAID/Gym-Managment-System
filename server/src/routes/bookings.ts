import { Router } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';
import { canBookSession, getBookingResponseStatus } from '../workflowRules.js';

type SessionRow = { status: string; capacity: number; session_type: string } & RowDataPacket;
type CountRow = { count: number } & RowDataPacket;
type ExistingBookingRow = { booking_id: number; booking_status: string } & RowDataPacket;
type BookingStatusRow = { booking_status: string | null } & RowDataPacket;

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Valid ${label} is required`);
  return id;
}

async function memberExists(connection: PoolConnection, memberId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT member.UserID AS member_id
       FROM member
       JOIN \`user\` ON \`user\`.UserID = member.UserID
      WHERE member.UserID = ? AND \`user\`.Status = 'Active'
       FOR UPDATE`,
    [memberId]
  );
  return rows.length > 0;
}

async function getLockedSession(connection: PoolConnection, sessionId: number) {
  const [rows] = await connection.query<SessionRow[]>(
    'SELECT Status AS status, Capacity AS capacity, SessionType AS session_type FROM `session` WHERE SessionID = ? FOR UPDATE',
    [sessionId]
  );
  return rows[0] ?? null;
}

async function getBookedCount(connection: PoolConnection, sessionId: number) {
  const [rows] = await connection.query<CountRow[]>(
    "SELECT COUNT(*) AS count FROM booking WHERE SessionID = ? AND BookingStatus IN ('Confirmed', 'Booked')",
    [sessionId]
  );
  return rows[0]?.count ?? 0;
}

async function getActivePaidSubscription(connection: PoolConnection, memberId: number) {
  const [rows] = await connection.query<({ subscription_id: number } & RowDataPacket)[]>(
    `SELECT s.SubscriptionID AS subscription_id
       FROM subscription s
       JOIN payment pay ON pay.SubscriptionID = s.SubscriptionID
      WHERE s.MemberUserID = ?
        AND s.Status = 'Active'
        AND pay.PaymentStatus = 'Paid'
        AND CURDATE() BETWEEN s.StartDate AND s.EndDate
      ORDER BY s.StartDate DESC
      LIMIT 1`,
    [memberId]
  );
  return rows[0]?.subscription_id ?? null;
}

async function getExistingBooking(connection: PoolConnection, memberId: number, sessionId: number) {
  const [rows] = await connection.query<ExistingBookingRow[]>(
    'SELECT BookingID AS booking_id, BookingStatus AS booking_status FROM booking WHERE MemberUserID = ? AND SessionID = ? LIMIT 1',
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
      `SELECT b.*, s.session_title, s.session_type, s.session_date, s.start_time, s.end_time, s.status AS session_status,
              u.FullName AS trainer_name
         FROM (
           SELECT BookingID AS booking_id, MemberUserID AS member_id, SessionID AS session_id, BookingDate AS booking_date, LOWER(BookingStatus) AS booking_status
             FROM booking
         ) b
         JOIN (
            SELECT SessionID AS session_id, TrainerUserID AS trainer_id, SessionTitle AS session_title, SessionType AS session_type, SessionDate AS session_date, StartTime AS start_time, EndTime AS end_time, LOWER(Status) AS status
             FROM \`session\`
         ) s ON s.session_id = b.session_id
         JOIN trainer t ON t.UserID = s.trainer_id
         JOIN \`user\` u ON u.UserID = t.UserID
        WHERE b.member_id = ?
        ORDER BY s.session_date DESC, s.start_time DESC`,
      [user.member_id]
    );
    res.json({ bookings: rows });
    return;
  }

  requireRole(user, ['admin']);
  const [rows] = await pool.query(
    `SELECT b.*, s.session_title, s.session_type, s.session_date, s.start_time, s.end_time, s.status AS session_status,
            member_user.FullName AS member_name, member_user.Email AS member_email,
            trainer_user.FullName AS trainer_name
       FROM (
         SELECT BookingID AS booking_id, MemberUserID AS member_id, SessionID AS session_id, BookingDate AS booking_date, LOWER(BookingStatus) AS booking_status
           FROM booking
       ) b
       JOIN member m ON m.UserID = b.member_id
       JOIN \`user\` member_user ON member_user.UserID = m.UserID
       JOIN (
          SELECT SessionID AS session_id, TrainerUserID AS trainer_id, SessionTitle AS session_title, SessionType AS session_type, SessionDate AS session_date, StartTime AS start_time, EndTime AS end_time, LOWER(Status) AS status
           FROM \`session\`
       ) s ON s.session_id = b.session_id
       JOIN trainer t ON t.UserID = s.trainer_id
       JOIN \`user\` trainer_user ON trainer_user.UserID = t.UserID
      ORDER BY s.session_date DESC, s.start_time DESC`
  );

  res.json({ bookings: rows });
}));

bookingsRouter.post('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['member', 'admin']);

  const sessionId = parseId(req.body.session_id, 'session id');
  const memberId = user.role === 'member' ? user.member_id : parseId(req.body.member_id, 'member id');
  if (!memberId) throw new HttpError(403, 'Member profile is required');

  const connection = await pool.getConnection();
  let committed = false;
  try {
    await connection.beginTransaction();

    if (!await memberExists(connection, memberId)) throw new HttpError(404, 'Member was not found');

    const activePaidSubscriptionId = user.role === 'member' ? await getActivePaidSubscription(connection, memberId) : null;
    if (user.role === 'member' && !activePaidSubscriptionId) throw new HttpError(403, 'An active paid subscription is required to book sessions');

    const session = await getLockedSession(connection, sessionId);
    if (!session) throw new HttpError(404, 'Session was not found');

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
        "UPDATE booking SET BookingStatus = 'Confirmed', BookingDate = CURDATE() WHERE BookingID = ?",
        [existing.booking_id]
      );
    } else {
      const [result] = await connection.query<ResultSetHeader>(
        "INSERT INTO booking (MemberUserID, SessionID, BookingDate, BookingStatus) VALUES (?, ?, CURDATE(), 'Confirmed')",
        [memberId, sessionId]
      );
      await connection.commit();
      committed = true;
      res.status(statusCode).json({ booking: { booking_id: result.insertId, member_id: memberId, session_id: sessionId, booking_status: 'confirmed' } });
      return;
    }

    await connection.commit();
    committed = true;
    res.status(statusCode).json({ booking: { booking_id: bookingId, member_id: memberId, session_id: sessionId, booking_status: 'confirmed' } });
  } catch (error) {
    if (!committed) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

bookingsRouter.patch('/:id/cancel', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['member', 'admin']);
  const bookingId = parseId(req.params.id, 'booking id');

  const params: unknown[] = [bookingId];
  let memberFilter = '';
  if (user.role === 'member') {
    if (!user.member_id) throw new HttpError(403, 'Member profile is required');
    memberFilter = ' AND MemberUserID = ?';
    params.push(user.member_id);
  }

  const [bookingRows] = await pool.query<BookingStatusRow[]>(
    `SELECT BookingStatus AS booking_status FROM booking WHERE BookingID = ?${memberFilter} LIMIT 1`,
    params
  );
  const booking = bookingRows[0];
  if (!booking) throw new HttpError(404, 'Booking was not found');
  if (normalizeStatus(booking.booking_status) === 'cancelled') throw new HttpError(409, 'Booking is already cancelled');

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE booking SET BookingStatus = 'Cancelled' WHERE BookingID = ?${memberFilter}`,
    params
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Booking was not found');

  res.json({ booking: { booking_id: bookingId, booking_status: 'cancelled' } });
}));
