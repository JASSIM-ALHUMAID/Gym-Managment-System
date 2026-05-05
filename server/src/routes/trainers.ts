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
  requireRole(user, ['admin', 'member']);

  const [rows] = await pool.query<TrainerRow[]>(`
    SELECT t.UserID AS trainer_id,
           t.Specialty AS specialty,
           t.HireDate AS hire_date,
           u.UserID AS user_id,
           u.FullName AS full_name,
           u.Email AS email,
           u.Phone AS phone,
           LOWER(u.Status) AS status
      FROM trainer t
      JOIN \`user\` u ON u.UserID = t.UserID
     ORDER BY t.UserID
  `);

  const trainers = user.role === 'member'
    ? rows.map(({ email: _email, phone: _phone, ...trainer }) => trainer)
    : rows;

  res.json({ trainers });
}));
