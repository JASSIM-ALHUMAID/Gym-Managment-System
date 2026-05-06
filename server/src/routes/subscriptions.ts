import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

export const subscriptionsRouter = Router();

type PlanDurationRow = { plan_id: number; duration_months: number } & RowDataPacket;
type CountRow = { count: number } & RowDataPacket;
type SubscriptionApprovalRow = { subscription_id: number; member_id: number; price: string | number; status: string } & RowDataPacket;

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function toSqlDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
}

subscriptionsRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);

  if (user.role === 'member') {
    if (!user.member_id) throw new HttpError(403, 'Member profile is required');
    const [rows] = await pool.query(
      `SELECT s.SubscriptionID AS subscription_id, s.MemberUserID AS member_id, s.PlanID AS plan_id,
              s.StartDate AS start_date, s.EndDate AS end_date, LOWER(s.Status) AS status,
              p.PlanName AS plan_name, p.DurationMonths AS duration_months, p.Price AS price
         FROM subscription s
         JOIN membershipplan p ON p.PlanID = s.PlanID
        WHERE s.MemberUserID = ?
        ORDER BY s.StartDate DESC`,
      [user.member_id]
    );
    res.json({ subscriptions: rows });
    return;
  }

  requireRole(user, ['admin']);
  const [rows] = await pool.query(`
    SELECT s.SubscriptionID AS subscription_id, s.MemberUserID AS member_id, s.MemberUserID AS member_user_id,
           s.PlanID AS plan_id, s.StartDate AS start_date, s.EndDate AS end_date, LOWER(s.Status) AS status,
           p.PlanName AS plan_name, p.DurationMonths AS duration_months, p.Price AS price,
           u.FullName AS member_name, u.Email AS member_email
      FROM subscription s
      JOIN membershipplan p ON p.PlanID = s.PlanID
      JOIN member m ON m.UserID = s.MemberUserID
      JOIN \`user\` u ON u.UserID = m.UserID
     ORDER BY s.StartDate DESC
  `);

  res.json({ subscriptions: rows });
}));

subscriptionsRouter.post('/request', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['member']);
  if (!user.member_id) throw new HttpError(403, 'Member profile is required');
  const planId = Number(req.body.plan_id);
  if (!Number.isInteger(planId) || planId <= 0) throw new HttpError(400, 'Valid plan id is required');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [plans] = await connection.query<PlanDurationRow[]>('SELECT PlanID AS plan_id, DurationMonths AS duration_months FROM membershipplan WHERE PlanID = ?', [planId]);
    const plan = plans[0];
    if (!plan) throw new HttpError(404, 'Plan was not found');

    await connection.query('SELECT UserID AS member_id FROM member WHERE UserID = ? FOR UPDATE', [user.member_id]);

    const [pendingRows] = await connection.query<CountRow[]>(
      "SELECT COUNT(*) AS count FROM subscription WHERE MemberUserID = ? AND Status = 'Pending' FOR UPDATE",
      [user.member_id]
    );
    if ((pendingRows[0]?.count ?? 0) > 0) throw new HttpError(409, 'You already have a pending subscription request');

    const startDate = new Date();
    const endDate = addMonths(startDate, plan.duration_months);
    let result: ResultSetHeader;
    try {
      [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO subscription (MemberUserID, PlanID, StartDate, EndDate, Status)
         VALUES (?, ?, ?, ?, 'Pending')`,
        [user.member_id, planId, toSqlDate(startDate), toSqlDate(endDate)]
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new HttpError(409, 'You already have a pending subscription request');
      throw error;
    }

    await connection.commit();
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
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}));

subscriptionsRouter.patch('/:id/activate', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const subscriptionId = Number(req.params.id);
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) throw new HttpError(400, 'Valid subscription id is required');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [subscriptionRows] = await connection.query<SubscriptionApprovalRow[]>(
      `SELECT s.SubscriptionID AS subscription_id,
              s.MemberUserID AS member_id,
              s.Status AS status,
              p.Price AS price
         FROM subscription s
         JOIN membershipplan p ON p.PlanID = s.PlanID
        WHERE s.SubscriptionID = ?
        LIMIT 1 FOR UPDATE`,
      [subscriptionId]
    );
    const subscription = subscriptionRows[0];
    if (!subscription) throw new HttpError(404, 'Subscription was not found');
    if (subscription.status !== 'Pending') throw new HttpError(409, 'Subscription is not pending');

    const [paymentRows] = await connection.query<CountRow[]>(
      'SELECT COUNT(*) AS count FROM payment WHERE SubscriptionID = ? FOR UPDATE',
      [subscriptionId]
    );
    if ((paymentRows[0]?.count ?? 0) > 0) throw new HttpError(409, 'Payment already exists for subscription');

    const amount = Number(subscription.price);
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO payment (SubscriptionID, Amount, PaymentDate, PaymentMethod, PaymentStatus)
       VALUES (?, ?, CURDATE(), NULL, 'Pending')`,
      [subscriptionId, amount]
    );

    await connection.commit();
    res.json({
      subscription: { subscription_id: subscriptionId, status: 'pending' },
      payment: { payment_id: result.insertId, subscription_id: subscriptionId, amount, payment_status: 'pending' }
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}));

subscriptionsRouter.patch('/:id/cancel', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const subscriptionId = Number(req.params.id);
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) throw new HttpError(400, 'Valid subscription id is required');

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE subscription
        SET Status = 'Cancelled'
      WHERE SubscriptionID = ?`,
    [subscriptionId]
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Subscription was not found');

  res.json({ subscription: { subscription_id: subscriptionId, status: 'cancelled' } });
}));
