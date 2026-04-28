import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

type PlanInput = {
  plan_name: string;
  duration_months: number;
  price: number;
  description: string | null;
};

type MySqlError = Error & { code?: string; errno?: number };

function parsePlanInput(body: Record<string, unknown>): PlanInput {
  const planName = String(body.plan_name ?? '').trim();
  const durationMonths = Number(body.duration_months);
  const price = Number(body.price);
  const description = body.description == null ? null : String(body.description).trim();

  if (!planName) throw new HttpError(400, 'Plan name is required');
  if (!Number.isInteger(durationMonths) || durationMonths <= 0) throw new HttpError(400, 'Duration months must be an integer greater than 0');
  if (!Number.isFinite(price) || price <= 0) throw new HttpError(400, 'Price must be greater than 0');

  return { plan_name: planName, duration_months: durationMonths, price, description };
}

function isReferencedPlanError(error: unknown) {
  const mysqlError = error as MySqlError;
  return mysqlError.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError.errno === 1451;
}

function isDuplicatePlanNameError(error: unknown) {
  const mysqlError = error as MySqlError;
  return mysqlError.code === 'ER_DUP_ENTRY' || mysqlError.errno === 1062;
}

export const plansRouter = Router();

plansRouter.get('/', asyncHandler(async (req, res) => {
  await requireDemoUser(req);

  const [rows] = await pool.query('SELECT plan_id, plan_name, duration_months, price, description FROM membership_plans ORDER BY plan_id');
  res.json({ plans: rows });
}));

plansRouter.post('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const input = parsePlanInput(req.body);

  let result: ResultSetHeader;
  try {
    [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO membership_plans (plan_name, duration_months, price, description) VALUES (?, ?, ?, ?)',
      [input.plan_name, input.duration_months, input.price, input.description]
    );
  } catch (error) {
    if (isDuplicatePlanNameError(error)) throw new HttpError(409, 'Plan name already exists');
    throw error;
  }

  res.status(201).json({ plan: { plan_id: result.insertId, ...input } });
}));

plansRouter.put('/:id', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const planId = Number(req.params.id);
  if (!Number.isInteger(planId) || planId <= 0) throw new HttpError(400, 'Valid plan id is required');
  const input = parsePlanInput(req.body);

  let result: ResultSetHeader;
  try {
    [result] = await pool.query<ResultSetHeader>(
      'UPDATE membership_plans SET plan_name = ?, duration_months = ?, price = ?, description = ? WHERE plan_id = ?',
      [input.plan_name, input.duration_months, input.price, input.description, planId]
    );
  } catch (error) {
    if (isDuplicatePlanNameError(error)) throw new HttpError(409, 'Plan name already exists');
    throw error;
  }
  if (result.affectedRows === 0) throw new HttpError(404, 'Plan was not found');

  res.json({ plan: { plan_id: planId, ...input } });
}));

plansRouter.delete('/:id', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const planId = Number(req.params.id);
  if (!Number.isInteger(planId) || planId <= 0) throw new HttpError(400, 'Valid plan id is required');

  let result: ResultSetHeader;
  try {
    [result] = await pool.query<ResultSetHeader>('DELETE FROM membership_plans WHERE plan_id = ?', [planId]);
  } catch (error) {
    if (isReferencedPlanError(error)) throw new HttpError(409, 'Plan cannot be deleted because subscriptions reference it');
    throw error;
  }
  if (result.affectedRows === 0) throw new HttpError(404, 'Plan was not found');

  res.json({ deleted: true });
}));
