import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const usersRouter = Router();

usersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);

  const [rows] = await pool.query(
    'SELECT user_id, username, role, full_name, email, phone, status, created_at FROM users ORDER BY user_id'
  );

  res.json({ users: rows });
}));
