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

  const [activeMembers, activeSubscriptions, scheduledSessions, openPayments] = await Promise.all([
    count("SELECT COUNT(*) AS count FROM `user` u JOIN member m ON m.UserID = u.UserID WHERE LOWER(u.Status) = 'active'"),
    count("SELECT COUNT(*) AS count FROM subscription WHERE LOWER(Status) = 'active'"),
    count("SELECT COUNT(*) AS count FROM session WHERE LOWER(Status) = 'scheduled'"),
    count("SELECT COUNT(*) AS count FROM payment WHERE LOWER(PaymentStatus) IN ('pending', 'failed')")
  ]);

  res.json({ activeMembers, activeSubscriptions, scheduledSessions, openPayments });
}));
