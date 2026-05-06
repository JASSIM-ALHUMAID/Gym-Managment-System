import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

export const membersRouter = Router();

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

function parseGender(value: unknown) {
  const gender = String(value ?? '').trim().toLowerCase();
  if (!['male', 'female'].includes(gender)) throw new HttpError(400, 'Gender must be male or female');
  return gender === 'male' ? 'Male' : 'Female';
}

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

membersRouter.patch('/:id', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin']);
  const memberId = parseId(req.params.id, 'member id');
  const fullName = String(req.body.full_name ?? '').trim();
  const email = String(req.body.email ?? '').trim() || null;
  const phone = String(req.body.phone ?? '').trim() || null;
  const status = parseStatus(req.body.status);
  const gender = parseGender(req.body.gender);
  if (!fullName) throw new HttpError(400, 'Full name and gender are required');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [userResult] = await connection.query<ResultSetHeader>(
      'UPDATE `user` SET FullName = ?, Email = ?, Phone = ?, Status = ? WHERE UserID = ?',
      [fullName, email, phone, toDbStatus(status), memberId]
    );
    if (userResult.affectedRows === 0) throw new HttpError(404, 'Member was not found');
    const [memberResult] = await connection.query<ResultSetHeader>('UPDATE member SET Gender = ? WHERE UserID = ?', [gender, memberId]);
    if (memberResult.affectedRows === 0) throw new HttpError(404, 'Member was not found');
    await connection.commit();
    res.json({ member: { member_id: memberId, status } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));
