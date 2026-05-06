import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

export const paymentsRouter = Router();

type PaymentWorkflowRow = {
  payment_id: number;
  subscription_id: number;
  member_id: number;
  payment_status: string;
} & RowDataPacket;

const paymentStatuses = ['pending', 'paid', 'failed'] as const;

function toDbPaymentStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function parsePaymentStatus(value: unknown) {
  const status = String(value ?? '').trim().toLowerCase();
  if (!paymentStatuses.includes(status as typeof paymentStatuses[number])) throw new HttpError(400, 'Payment status must be pending, paid, or failed');
  return status;
}

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

paymentsRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const paymentId = Number(req.params.id);
  if (!Number.isInteger(paymentId) || paymentId <= 0) throw new HttpError(400, 'Valid payment id is required');
  const paymentStatus = parsePaymentStatus(req.body.payment_status);
  const paymentMethod = req.body.payment_method == null ? null : String(req.body.payment_method).trim() || null;
  if (paymentStatus === 'paid' && !paymentMethod) throw new HttpError(400, 'Payment method is required when marking paid');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [paymentRows] = await connection.query<PaymentWorkflowRow[]>(
      `SELECT pay.PaymentID AS payment_id,
              pay.SubscriptionID AS subscription_id,
              pay.PaymentStatus AS payment_status,
              s.MemberUserID AS member_id
         FROM payment pay
         JOIN subscription s ON s.SubscriptionID = pay.SubscriptionID
        WHERE pay.PaymentID = ?
        LIMIT 1 FOR UPDATE`,
      [paymentId]
    );
    const payment = paymentRows[0];
    if (!payment) throw new HttpError(404, 'Payment was not found');

    await connection.query<ResultSetHeader>(
      'UPDATE payment SET PaymentStatus = ?, PaymentMethod = ? WHERE PaymentID = ?',
      [toDbPaymentStatus(paymentStatus), paymentMethod, paymentId]
    );

    let subscriptionStatus = 'pending';
    if (paymentStatus === 'paid') {
      await connection.query<ResultSetHeader>(
        `UPDATE subscription
            SET Status = 'Cancelled'
          WHERE MemberUserID = ? AND SubscriptionID <> ? AND Status = 'Active'`,
        [payment.member_id, payment.subscription_id]
      );
      await connection.query<ResultSetHeader>(
        `UPDATE subscription
            SET Status = 'Active'
          WHERE SubscriptionID = ? AND Status = 'Pending'`,
        [payment.subscription_id]
      );
      subscriptionStatus = 'active';
    }

    await connection.commit();
    res.json({ payment: { payment_id: paymentId, payment_status: paymentStatus, subscription_id: payment.subscription_id, subscription_status: subscriptionStatus } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));
