import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

export const paymentsRouter = Router();

paymentsRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);

  if (user.role === 'member') {
    if (!user.member_id) throw new HttpError(403, 'Member profile is required');
    const [rows] = await pool.query(
      `SELECT pay.*, s.subscription_id, s.status AS subscription_status, p.plan_id, p.plan_name
         FROM payments pay
         JOIN subscriptions s ON s.subscription_id = pay.subscription_id
         JOIN membership_plans p ON p.plan_id = s.plan_id
        WHERE s.member_id = ?
        ORDER BY pay.payment_date DESC`,
      [user.member_id]
    );
    res.json({ payments: rows });
    return;
  }

  requireRole(user, ['admin']);
  const [rows] = await pool.query(`
    SELECT pay.*, s.subscription_id, s.status AS subscription_status,
           p.plan_id, p.plan_name, m.member_id, u.full_name AS member_name, u.email AS member_email
      FROM payments pay
      JOIN subscriptions s ON s.subscription_id = pay.subscription_id
      JOIN membership_plans p ON p.plan_id = s.plan_id
      JOIN members m ON m.member_id = s.member_id
      JOIN users u ON u.user_id = m.user_id
     ORDER BY pay.payment_date DESC
  `);

  res.json({ payments: rows });
}));
