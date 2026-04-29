import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

export const subscriptionsRouter = Router();

type PlanDurationRow = { plan_id: number; duration_months: number } & RowDataPacket;

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function toSqlDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

subscriptionsRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);

  if (user.role === 'member') {
    if (!user.member_id) throw new HttpError(403, 'Member profile is required');
    const [rows] = await pool.query(
      `SELECT s.*, p.plan_name, p.duration_months, p.price
         FROM subscriptions s
         JOIN membership_plans p ON p.plan_id = s.plan_id
        WHERE s.member_id = ?
        ORDER BY s.start_date DESC`,
      [user.member_id]
    );
    res.json({ subscriptions: rows });
    return;
  }

  requireRole(user, ['admin', 'staff']);
  const [rows] = await pool.query(`
    SELECT s.*, p.plan_name, p.duration_months, p.price,
           m.member_id, u.user_id AS member_user_id, u.full_name AS member_name, u.email AS member_email
      FROM subscriptions s
      JOIN membership_plans p ON p.plan_id = s.plan_id
      JOIN members m ON m.member_id = s.member_id
      JOIN users u ON u.user_id = m.user_id
     ORDER BY s.start_date DESC
  `);

  res.json({ subscriptions: rows });
}));

subscriptionsRouter.post('/request', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['member']);
  if (!user.member_id) throw new HttpError(403, 'Member profile is required');
  const planId = Number(req.body.plan_id);
  if (!Number.isInteger(planId) || planId <= 0) throw new HttpError(400, 'Valid plan id is required');

  const [plans] = await pool.query<PlanDurationRow[]>('SELECT plan_id, duration_months FROM membership_plans WHERE plan_id = ?', [planId]);
  const plan = plans[0];
  if (!plan) throw new HttpError(404, 'Plan was not found');

  const startDate = new Date();
  const endDate = addMonths(startDate, plan.duration_months);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [user.member_id, planId, toSqlDate(startDate), toSqlDate(endDate)]
  );

  res.status(201).json({
    subscription: {
      subscription_id: result.insertId,
      member_id: user.member_id,
      plan_id: planId,
      start_date: toSqlDate(startDate),
      end_date: toSqlDate(endDate),
      status: 'pending'
    }
  });
}));

subscriptionsRouter.patch('/:id/activate', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const subscriptionId = Number(req.params.id);
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) throw new HttpError(400, 'Valid subscription id is required');

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE subscriptions
        SET status = 'active', approved_by_user_id = ?, cancelled_at = NULL
      WHERE subscription_id = ?`,
    [user.user_id, subscriptionId]
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Subscription was not found');

  res.json({ subscription: { subscription_id: subscriptionId, status: 'active' } });
}));

subscriptionsRouter.patch('/:id/cancel', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const subscriptionId = Number(req.params.id);
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) throw new HttpError(400, 'Valid subscription id is required');

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE subscriptions
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
      WHERE subscription_id = ?`,
    [subscriptionId]
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Subscription was not found');

  res.json({ subscription: { subscription_id: subscriptionId, status: 'cancelled' } });
}));
