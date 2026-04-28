import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const trainersRouter = Router();

trainersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff', 'member']);

  const [rows] = await pool.query(`
    SELECT t.trainer_id, t.specialty, t.hire_date,
           u.user_id, u.full_name, u.email, u.phone, u.status
      FROM trainers t
      JOIN users u ON u.user_id = t.user_id
     ORDER BY t.trainer_id
  `);

  res.json({ trainers: rows });
}));
