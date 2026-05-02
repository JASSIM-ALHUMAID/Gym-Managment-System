import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

type TrainerRow = {
  trainer_id: number;
  specialty: string | null;
  hire_date: string;
  user_id: number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
} & RowDataPacket;

export const trainersRouter = Router();

trainersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff', 'member']);

  const [rows] = await pool.query<TrainerRow[]>(`
    SELECT t.trainer_id, t.specialty, t.hire_date,
           u.user_id, u.full_name, u.email, u.phone, u.status
      FROM trainers t
      JOIN users u ON u.user_id = t.user_id
     ORDER BY t.trainer_id
  `);

  const trainers = user.role === 'member'
    ? rows.map(({ email: _email, phone: _phone, ...trainer }) => trainer)
    : rows;

  res.json({ trainers });
}));
