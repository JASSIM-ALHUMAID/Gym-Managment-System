import type { Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2';
import { pool } from './db.js';
import { HttpError } from './http.js';
import type { DemoUser, Role } from './types.js';

type UserRow = Omit<DemoUser, 'role'> & { role: Role | null; password_hash?: string } & RowDataPacket;
type UserWithRole = DemoUser & { password_hash?: string } & RowDataPacket;

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

function hasRole(user: UserRow | null): user is UserWithRole {
  return user?.role != null;
}

function publicUser(user: UserWithRole): DemoUser {
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

export async function findDemoUser(username: string) {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT u.UserID AS user_id,
            u.Username AS username,
            u.PasswordHash AS password_hash,
            u.FullName AS full_name,
            u.Email AS email,
            LOWER(u.Status) AS status,
            CASE
              WHEN st.UserID IS NOT NULL THEN 'admin'
              WHEN t.UserID IS NOT NULL THEN 'trainer'
              WHEN m.UserID IS NOT NULL THEN 'member'
            END AS role,
            m.UserID AS member_id,
            t.UserID AS trainer_id
       FROM \`user\` u
       LEFT JOIN staff st ON st.UserID = u.UserID
       LEFT JOIN trainer t ON t.UserID = u.UserID
       LEFT JOIN member m ON m.UserID = u.UserID
      WHERE u.Username = ?
      LIMIT 1`,
    [username]
  );

  const user = rows[0] ?? null;
  return hasRole(user) ? user : null;
}

export async function findPublicUserById(userId: number) {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT u.UserID AS user_id,
            u.Username AS username,
            u.PasswordHash AS password_hash,
            u.FullName AS full_name,
            u.Email AS email,
            LOWER(u.Status) AS status,
            CASE
              WHEN st.UserID IS NOT NULL THEN 'admin'
              WHEN t.UserID IS NOT NULL THEN 'trainer'
              WHEN m.UserID IS NOT NULL THEN 'member'
            END AS role,
            m.UserID AS member_id,
            t.UserID AS trainer_id
       FROM \`user\` u
       LEFT JOIN staff st ON st.UserID = u.UserID
       LEFT JOIN trainer t ON t.UserID = u.UserID
       LEFT JOIN member m ON m.UserID = u.UserID
      WHERE u.UserID = ?
      LIMIT 1`,
    [userId]
  );
  const user = rows[0] ?? null;
  return hasRole(user) ? publicUser(user) : null;
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
