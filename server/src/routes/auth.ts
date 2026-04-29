import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { findDemoUser, hashPassword, requireAuthenticatedUser, signAuthToken, verifyPassword } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

export const authRouter = Router();

function validatePassword(password: string) {
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
}

authRouter.post('/login', asyncHandler(async (req, res) => {
  const username = String(req.body.username ?? '').trim();
  const password = String(req.body.password ?? '');
  if (!username || !password) throw new HttpError(400, 'Username and password are required');

  const user = await findDemoUser(username);
  if (!user || !user.password_hash || user.status !== 'active') throw new HttpError(401, 'Invalid username or password');

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) throw new HttpError(401, 'Invalid username or password');

  const { password_hash: _passwordHash, ...publicUser } = user;
  res.json({ token: signAuthToken(publicUser), user: publicUser });
}));

authRouter.post('/register', asyncHandler(async (req, res) => {
  const username = String(req.body.username ?? '').trim();
  const password = String(req.body.password ?? '');
  const fullName = String(req.body.full_name ?? '').trim();
  const email = String(req.body.email ?? '').trim() || null;
  const phone = String(req.body.phone ?? '').trim() || null;
  const gender = String(req.body.gender ?? '').trim();

  if (!username || !fullName || !gender) throw new HttpError(400, 'Username, full name, and gender are required');
  validatePassword(password);
  if (!['male', 'female', 'other'].includes(gender)) throw new HttpError(400, 'Gender must be male, female, or other');

  const existingUser = await findDemoUser(username);
  if (existingUser) throw new HttpError(409, 'Username is already taken');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const passwordHash = await hashPassword(password);
    const [userResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO users (username, password_hash, role, full_name, email, phone, status)
       VALUES (?, ?, 'member', ?, ?, ?, 'active')`,
      [username, passwordHash, fullName, email, phone]
    );
    const userId = userResult.insertId;
    const [memberResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO members (user_id, gender, join_date) VALUES (?, ?, CURRENT_DATE)',
      [userId, gender]
    );
    await connection.commit();

    const user = {
      user_id: userId,
      username,
      role: 'member' as const,
      full_name: fullName,
      email,
      status: 'active' as const,
      member_id: memberResult.insertId,
      trainer_id: undefined
    };
    res.status(201).json({ token: signAuthToken(user), user });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

authRouter.get('/me', asyncHandler(async (req, res) => {
  const user = await requireAuthenticatedUser(req);
  res.json({ user });
}));
