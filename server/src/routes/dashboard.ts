import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { requireDemoUser } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

type CountRow = { count: number } & RowDataPacket;

async function count(sql: string) {
  const [rows] = await pool.query<CountRow[]>(sql);
  return rows[0]?.count ?? 0;
}

export const dashboardRouter = Router();

dashboardRouter.get('/', asyncHandler(async (req, res) => {
  await requireDemoUser(req);

  const [activeMembers, activeSubscriptions, scheduledSessions, openPayments] = await Promise.all([
    count("SELECT COUNT(*) AS count FROM users WHERE role = 'member' AND status = 'active'"),
    count("SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'"),
    count("SELECT COUNT(*) AS count FROM sessions WHERE status = 'scheduled'"),
    count("SELECT COUNT(*) AS count FROM payments WHERE payment_status IN ('pending', 'failed')")
  ]);

  res.json({ activeMembers, activeSubscriptions, scheduledSessions, openPayments });
}));
