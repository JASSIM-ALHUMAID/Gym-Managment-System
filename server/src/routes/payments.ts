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
      `SELECT pay.PaymentID AS payment_id,
              pay.SubscriptionID AS subscription_id,
              pay.Amount AS amount,
              pay.PaymentDate AS payment_date,
              pay.PaymentMethod AS payment_method,
              LOWER(pay.PaymentStatus) AS payment_status,
              LOWER(s.Status) AS subscription_status,
              p.PlanID AS plan_id,
              p.PlanName AS plan_name
         FROM payment pay
         JOIN subscription s ON s.SubscriptionID = pay.SubscriptionID
         JOIN membershipplan p ON p.PlanID = s.PlanID
        WHERE s.MemberUserID = ?
        ORDER BY pay.PaymentDate DESC`,
      [user.member_id]
    );
    res.json({ payments: rows });
    return;
  }

  requireRole(user, ['admin']);
  const [rows] = await pool.query(`
    SELECT pay.PaymentID AS payment_id,
           pay.SubscriptionID AS subscription_id,
           pay.Amount AS amount,
           pay.PaymentDate AS payment_date,
           pay.PaymentMethod AS payment_method,
           LOWER(pay.PaymentStatus) AS payment_status,
           LOWER(s.Status) AS subscription_status,
           p.PlanID AS plan_id,
           p.PlanName AS plan_name,
           m.UserID AS member_id,
           u.FullName AS member_name,
           u.Email AS member_email
      FROM payment pay
      JOIN subscription s ON s.SubscriptionID = pay.SubscriptionID
      JOIN membershipplan p ON p.PlanID = s.PlanID
      JOIN member m ON m.UserID = s.MemberUserID
      JOIN \`user\` u ON u.UserID = m.UserID
     ORDER BY pay.PaymentDate DESC
  `);

  res.json({ payments: rows });
}));
