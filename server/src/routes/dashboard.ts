import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

type CountRow = { count: number } & RowDataPacket;

async function count(sql: string) {
  const [rows] = await pool.query<CountRow[]>(sql);
  return rows[0]?.count ?? 0;
}

export const dashboardRouter = Router();

dashboardRouter.get('/public-stats', asyncHandler(async (_req, res) => {
  const [activeMembers, scheduledSessions, bookings, openPayments] = await Promise.all([
    count("SELECT COUNT(*) AS count FROM `user` u JOIN member m ON m.UserID = u.UserID WHERE u.Status = 'Active'"),
    count("SELECT COUNT(*) AS count FROM session WHERE Status = 'Scheduled'"),
    count('SELECT COUNT(*) AS count FROM booking'),
    count("SELECT COUNT(*) AS count FROM payment WHERE PaymentStatus IN ('Pending', 'Failed')")
  ]);
  res.json({ activeMembers, scheduledSessions, bookings, openPayments });
}));

dashboardRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);

  const [
    users,
    members,
    trainers,
    staff,
    plans,
    subscriptions,
    payments,
    sessions,
    bookings,
    attendance,
    activeMembers,
    activeSubscriptions,
    scheduledSessions,
    openPayments
  ] = await Promise.all([
    count('SELECT COUNT(*) AS count FROM `user`'),
    count('SELECT COUNT(*) AS count FROM member'),
    count('SELECT COUNT(*) AS count FROM trainer'),
    count('SELECT COUNT(*) AS count FROM staff'),
    count('SELECT COUNT(*) AS count FROM membershipplan'),
    count('SELECT COUNT(*) AS count FROM subscription'),
    count('SELECT COUNT(*) AS count FROM payment'),
    count('SELECT COUNT(*) AS count FROM session'),
    count('SELECT COUNT(*) AS count FROM booking'),
    count('SELECT COUNT(*) AS count FROM attendance'),
    count("SELECT COUNT(*) AS count FROM `user` u JOIN member m ON m.UserID = u.UserID WHERE u.Status = 'Active'"),
    count("SELECT COUNT(*) AS count FROM subscription WHERE Status = 'Active'"),
    count("SELECT COUNT(*) AS count FROM session WHERE Status = 'Scheduled'"),
    count("SELECT COUNT(*) AS count FROM payment WHERE PaymentStatus IN ('Pending', 'Failed')")
  ]);

  const counts = { users, members, trainers, staff, plans, subscriptions, payments, sessions, bookings, attendance };

  res.json({
    activeMembers,
    activeSubscriptions,
    scheduledSessions,
    openPayments,
    counts
  });
}));
