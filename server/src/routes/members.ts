import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const membersRouter = Router();

membersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);

  const [rows] = await pool.query(`
    SELECT m.UserID AS member_id,
           m.Gender AS gender,
           m.JoinDate AS join_date,
           u.UserID AS user_id,
           u.FullName AS full_name,
           u.Email AS email,
           u.Phone AS phone,
           LOWER(u.Status) AS status
      FROM member m
      JOIN \`user\` u ON u.UserID = m.UserID
     ORDER BY m.UserID
  `);

  res.json({ members: rows });
}));
