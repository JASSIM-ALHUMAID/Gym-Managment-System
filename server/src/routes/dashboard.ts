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

dashboardRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);

  const [users, members, trainers, staff, plans, subscriptions, payments, sessions, bookings, attendance] = await Promise.all([
    count('SELECT COUNT(*) AS count FROM `user`'),
    count('SELECT COUNT(*) AS count FROM member'),
    count('SELECT COUNT(*) AS count FROM trainer'),
    count('SELECT COUNT(*) AS count FROM staff'),
    count('SELECT COUNT(*) AS count FROM membershipplan'),
    count('SELECT COUNT(*) AS count FROM subscription'),
    count('SELECT COUNT(*) AS count FROM payment'),
    count('SELECT COUNT(*) AS count FROM session'),
    count('SELECT COUNT(*) AS count FROM booking'),
    count('SELECT COUNT(*) AS count FROM attendance')
  ]);

  res.json({ users, members, trainers, staff, plans, subscriptions, payments, sessions, bookings, attendance });
}));
