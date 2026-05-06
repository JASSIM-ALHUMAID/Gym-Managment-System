import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { hashPassword, requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

type TrainerRow = {
  trainer_id: number;
  specialty: string | null;
  hire_date: string;
  user_id: number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
} & RowDataPacket;

export const trainersRouter = Router();

const userStatuses = ['active', 'inactive', 'suspended'] as const;

function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Valid ${label} is required`);
  return id;
}

function parseStatus(value: unknown) {
  const status = String(value ?? '').trim().toLowerCase();
  if (!userStatuses.includes(status as typeof userStatuses[number])) throw new HttpError(400, 'Status must be active, inactive, or suspended');
  return status;
}

function toDbStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

trainersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'member']);

  const [rows] = await pool.query<TrainerRow[]>(`
    SELECT t.UserID AS trainer_id,
           t.Specialty AS specialty,
           t.HireDate AS hire_date,
           u.UserID AS user_id,
           u.FullName AS full_name,
           u.Email AS email,
           u.Phone AS phone,
           LOWER(u.Status) AS status
      FROM trainer t
      JOIN \`user\` u ON u.UserID = t.UserID
     ORDER BY t.UserID
  `);

  const trainers = user.role === 'member'
    ? rows.map(({ email: _email, phone: _phone, ...trainer }) => trainer)
    : rows;

  res.json({ trainers });
}));

trainersRouter.post('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const username = String(req.body.username ?? '').trim();
  const password = String(req.body.password ?? '');
  const fullName = String(req.body.full_name ?? '').trim();
  const email = String(req.body.email ?? '').trim() || null;
  const phone = String(req.body.phone ?? '').trim() || null;
  const specialty = String(req.body.specialty ?? '').trim() || null;
  if (!username || !password || !fullName) throw new HttpError(400, 'Username, password, and full name are required');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const passwordHash = await hashPassword(password);
    const [userResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO \`user\` (Username, PasswordHash, FullName, Email, Phone, Status, CreatedAt)
       VALUES (?, ?, ?, ?, ?, 'Active', NOW())`,
      [username, passwordHash, fullName, email, phone]
    );
    const trainerId = userResult.insertId;
    await connection.query<ResultSetHeader>('INSERT INTO trainer (UserID, Specialty, HireDate) VALUES (?, ?, CURRENT_DATE)', [trainerId, specialty]);
    await connection.commit();
    res.status(201).json({ trainer: { trainer_id: trainerId, username, full_name: fullName, specialty, status: 'active' } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

trainersRouter.patch('/:id', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const trainerId = parseId(req.params.id, 'trainer id');
  const fullName = String(req.body.full_name ?? '').trim();
  const email = String(req.body.email ?? '').trim() || null;
  const phone = String(req.body.phone ?? '').trim() || null;
  const status = parseStatus(req.body.status);
  const specialty = String(req.body.specialty ?? '').trim() || null;
  if (!fullName) throw new HttpError(400, 'Full name is required');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [userResult] = await connection.query<ResultSetHeader>(
      'UPDATE `user` SET FullName = ?, Email = ?, Phone = ?, Status = ? WHERE UserID = ?',
      [fullName, email, phone, toDbStatus(status), trainerId]
    );
    if (userResult.affectedRows === 0) throw new HttpError(404, 'Trainer was not found');
    const [trainerResult] = await connection.query<ResultSetHeader>('UPDATE trainer SET Specialty = ? WHERE UserID = ?', [specialty, trainerId]);
    if (trainerResult.affectedRows === 0) throw new HttpError(404, 'Trainer was not found');
    await connection.commit();
    res.json({ trainer: { trainer_id: trainerId, status } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));
