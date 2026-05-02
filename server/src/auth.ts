import type { Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2';
import { pool } from './db.js';
import { HttpError } from './http.js';
import type { DemoUser, Role } from './types.js';

type UserRow = DemoUser & { password_hash?: string } & RowDataPacket;

const JWT_EXPIRES_IN = '8h';

function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    throw new Error('JWT_SECRET must be configured');
  }
  return 'local-dev-secret-change-me';
}

export function signAuthToken(user: Pick<DemoUser, 'user_id' | 'role'>) {
  return jwt.sign({ user_id: user.user_id, role: user.role }, jwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

function publicUser(user: UserRow): DemoUser {
  return {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    status: user.status,
    member_id: user.member_id,
    trainer_id: user.trainer_id
  };
}

export async function findDemoUser(usernameOrId: string) {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT u.user_id, u.username, u.password_hash, u.role, u.full_name, u.email, u.status,
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

export async function findPublicUserById(userId: number) {
  const user = await findDemoUser(String(userId));
  return user ? publicUser(user) : null;
}

export function requireBearerToken(req: Request) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication token is required');
  return header.slice('Bearer '.length).trim();
}

export async function requireAuthenticatedUser(req: Request) {
  const token = requireBearerToken(req);
  let payload: string | jwt.JwtPayload;

  try {
    payload = jwt.verify(token, jwtSecret());
  } catch {
    throw new HttpError(401, 'Invalid or expired authentication token');
  }

  if (typeof payload === 'string' || typeof payload.user_id !== 'number') {
    throw new HttpError(401, 'Invalid authentication token');
  }

  const user = await findPublicUserById(payload.user_id);
  if (!user || user.status !== 'active') throw new HttpError(401, 'Active user was not found');

  return user;
}

export async function requireDemoUser(req: Request) {
  return requireAuthenticatedUser(req);
}

export function requireRole(user: DemoUser, roles: Role[]) {
  if (!roles.includes(user.role)) throw new HttpError(403, 'You are not allowed to perform this action');
}
