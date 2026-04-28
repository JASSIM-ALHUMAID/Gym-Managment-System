import { Router } from 'express';
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
