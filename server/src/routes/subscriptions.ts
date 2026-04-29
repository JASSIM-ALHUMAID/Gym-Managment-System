import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

export const subscriptionsRouter = Router();

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
