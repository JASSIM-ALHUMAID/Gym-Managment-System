import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const membersRouter = Router();

membersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);

  const [rows] = await pool.query(`
    SELECT m.member_id, m.gender, m.join_date,
           u.user_id, u.full_name, u.email, u.phone, u.status
      FROM members m
      JOIN users u ON u.user_id = m.user_id
     ORDER BY m.member_id
  `);

  res.json({ members: rows });
}));
