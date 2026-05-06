import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

export const usersRouter = Router();

const userStatuses = ['active', 'inactive', 'suspended'] as const;

function parseUserStatus(value: unknown) {
  const status = String(value ?? '').trim().toLowerCase();
  if (!userStatuses.includes(status as typeof userStatuses[number])) throw new HttpError(400, 'Status must be active, inactive, or suspended');
  return status;
}

function toDbStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

usersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);

  const [rows] = await pool.query(`
    SELECT u.UserID AS user_id,
           u.Username AS username,
           CASE
             WHEN st.UserID IS NOT NULL THEN 'admin'
             WHEN t.UserID IS NOT NULL THEN 'trainer'
             WHEN m.UserID IS NOT NULL THEN 'member'
           END AS role,
           u.FullName AS full_name,
           u.Email AS email,
           u.Phone AS phone,
           LOWER(u.Status) AS status,
           u.CreatedAt AS created_at
      FROM \`user\` u
      LEFT JOIN staff st ON st.UserID = u.UserID
      LEFT JOIN trainer t ON t.UserID = u.UserID
      LEFT JOIN member m ON m.UserID = u.UserID
     ORDER BY u.UserID
  `);

  res.json({ users: rows });
}));

usersRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) throw new HttpError(400, 'Valid user id is required');
  const status = parseUserStatus(req.body.status);

  const [result] = await pool.query<ResultSetHeader>('UPDATE `user` SET Status = ? WHERE UserID = ?', [toDbStatus(status), userId]);
  if (result.affectedRows === 0) throw new HttpError(404, 'User was not found');

  res.json({ user: { user_id: userId, status } });
}));
