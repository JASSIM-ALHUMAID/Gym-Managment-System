import type { Request } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from './db.js';
import { HttpError } from './http.js';
import type { DemoUser, Role } from './types.js';

type UserRow = DemoUser & RowDataPacket;

export async function findDemoUser(usernameOrId: string) {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT u.user_id, u.username, u.role, u.full_name, u.email, u.status,
            m.member_id, t.trainer_id
       FROM users u
       LEFT JOIN members m ON m.user_id = u.user_id
       LEFT JOIN trainers t ON t.user_id = u.user_id
      WHERE u.username = ? OR u.user_id = ?
      LIMIT 1`,
    [usernameOrId, Number(usernameOrId) || 0]
  );

  return rows[0] ?? null;
}

export async function requireDemoUser(req: Request) {
  const userId = req.header('x-demo-user-id');
  if (!userId) throw new HttpError(401, 'Demo user header is required');

  const user = await findDemoUser(userId);
  if (!user || user.status !== 'active') throw new HttpError(401, 'Active demo user was not found');

  return user;
}

export function requireRole(user: DemoUser, roles: Role[]) {
  if (!roles.includes(user.role)) throw new HttpError(403, 'You are not allowed to perform this action');
}
