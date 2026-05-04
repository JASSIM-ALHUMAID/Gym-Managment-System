import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const usersRouter = Router();

usersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);

  const [rows] = await pool.query(`
    SELECT u.UserID AS user_id,
           u.Username AS username,
           u.FullName AS full_name,
           u.Email AS email,
           u.Phone AS phone,
           LOWER(u.Status) AS status,
           u.CreatedAt AS created_at
      FROM \`user\` u
     ORDER BY u.UserID
  `);

  res.json({ users: rows });
}));
