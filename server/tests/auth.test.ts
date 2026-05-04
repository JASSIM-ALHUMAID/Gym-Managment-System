import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendError } from '../src/http.js';

const mocks = vi.hoisted(() => {
  const connection = {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    query: vi.fn(),
    release: vi.fn(),
    rollback: vi.fn()
  };

  return {
    connection,
    pool: {
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    }
  };
});

vi.mock('../src/db.js', () => ({ pool: mocks.pool }));

const { authRouter } = await import('../src/routes/auth.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(error, res);
  });
  return app;
}

describe('real auth routes', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    vi.clearAllMocks();
  });

  it('logs in active staff users as admins with a valid password and returns a token', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    mocks.pool.query.mockResolvedValueOnce([[{
      user_id: 1,
      username: 'admin1',
      password_hash: passwordHash,
      role: 'admin',
      full_name: 'Admin User',
      email: 'admin@example.com',
      status: 'active',
      member_id: null,
      trainer_id: null
    }]]);

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ username: 'admin1', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ username: 'admin1', role: 'admin' });
    expect(response.body.user.password_hash).toBeUndefined();
    expect(mocks.pool.query.mock.calls[0][0]).toContain('LEFT JOIN staff st ON st.UserID = u.UserID');
    expect(mocks.pool.query.mock.calls[0][0]).toContain('LEFT JOIN trainer t ON t.UserID = u.UserID');
    expect(mocks.pool.query.mock.calls[0][0]).toContain('LEFT JOIN member m ON m.UserID = u.UserID');
  });

  it('logs in active member users with member_id mapped to UserID', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    mocks.pool.query.mockResolvedValueOnce([[{
      user_id: 1,
      username: 'ahmed_m',
      password_hash: passwordHash,
      role: 'member',
      full_name: 'Ahmed Mohammed',
      email: 'ahmed@example.com',
      status: 'active',
      member_id: 1,
      trainer_id: null
    }]]);

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ username: 'ahmed_m', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ user_id: 1, username: 'ahmed_m', role: 'member', member_id: 1 });
  });

  it('rejects login for active users without a role subtype', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    mocks.pool.query.mockResolvedValueOnce([[{
      user_id: 8,
      username: 'orphan_user',
      password_hash: passwordHash,
      role: null,
      full_name: 'Orphan User',
      email: 'orphan@example.com',
      status: 'active',
      member_id: null,
      trainer_id: null
    }]]);

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ username: 'orphan_user', password: 'password123' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid username or password' });
  });

  it('rejects login with an invalid password', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    mocks.pool.query.mockResolvedValueOnce([[{
      user_id: 1,
      username: 'admin1',
      password_hash: passwordHash,
      role: 'admin',
      full_name: 'Admin User',
      email: 'admin@example.com',
      status: 'active',
      member_id: null,
      trainer_id: null
    }]]);

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ username: 'admin1', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid username or password' });
  });

  it('does not treat a numeric username as a user id during login', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    const userById = {
      user_id: 1,
      username: 'admin1',
      password_hash: passwordHash,
      role: 'admin',
      full_name: 'Admin User',
      email: 'admin@example.com',
      status: 'active',
      member_id: null,
      trainer_id: null
    };
    mocks.pool.query.mockImplementationOnce(async (_sql: string, params?: unknown[]) => [params?.length === 1 ? [] : [userById]]);

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ username: '1', password: 'password123' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid username or password' });
  });

  it('registers members with a hashed password and member profile', async () => {
    mocks.pool.query.mockResolvedValueOnce([[]]);
    mocks.connection.query
      .mockResolvedValueOnce([{ insertId: 9 }])
      .mockResolvedValueOnce([{ insertId: 0 }]);

    const response = await request(createApp())
      .post('/api/auth/register')
      .send({
        username: 'new_member',
        password: 'password123',
        full_name: 'New Member',
        email: 'new@example.com',
        phone: '0509999999',
        gender: 'other'
      });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ user_id: 9, username: 'new_member', role: 'member', member_id: 9 });
    expect(mocks.connection.query.mock.calls[0][0]).toContain('INSERT INTO `user`');
    expect(mocks.connection.query.mock.calls[1][0]).toBe('INSERT INTO member (UserID, Gender, JoinDate) VALUES (?, ?, CURRENT_DATE)');
    expect(mocks.connection.query.mock.calls[1][1]).toEqual([9, 'other']);
    const insertedUserParams = mocks.connection.query.mock.calls[0][1] as unknown[];
    expect(insertedUserParams[1]).not.toBe('password123');
    await expect(bcrypt.compare('password123', String(insertedUserParams[1]))).resolves.toBe(true);
    expect(mocks.connection.commit).toHaveBeenCalledOnce();
  });

  it('returns a conflict when registration hits a duplicate database key', async () => {
    mocks.pool.query.mockResolvedValueOnce([[]]);
    mocks.connection.query.mockRejectedValueOnce(Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }));

    const response = await request(createApp())
      .post('/api/auth/register')
      .send({
        username: 'new_member',
        password: 'password123',
        full_name: 'New Member',
        email: 'new@example.com',
        phone: '0509999999',
        gender: 'other'
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Username or email is already taken' });
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
  });

  it('returns the current user for a valid bearer token', async () => {
    const token = jwt.sign({ user_id: 6 }, 'test-secret');
    mocks.pool.query.mockResolvedValueOnce([[{
      user_id: 6,
      username: 'member_noor',
      role: 'member',
      full_name: 'Noor Hassan',
      email: 'noor@example.com',
      status: 'active',
      member_id: 2,
      trainer_id: null
    }]]);

    const response = await request(createApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ username: 'member_noor', member_id: 2 });
  });

  it('rejects bearer tokens for users without a role subtype', async () => {
    const token = jwt.sign({ user_id: 8 }, 'test-secret');
    mocks.pool.query.mockResolvedValueOnce([[{
      user_id: 8,
      username: 'orphan_user',
      role: null,
      full_name: 'Orphan User',
      email: 'orphan@example.com',
      status: 'active',
      member_id: null,
      trainer_id: null
    }]]);

    const response = await request(createApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Active user was not found' });
  });

  it('does not sign login tokens with the fallback secret in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    const passwordHash = await bcrypt.hash('password123', 10);
    mocks.pool.query.mockResolvedValueOnce([[{
      user_id: 1,
      username: 'admin1',
      password_hash: passwordHash,
      role: 'admin',
      full_name: 'Admin User',
      email: 'admin@example.com',
      status: 'active',
      member_id: null,
      trainer_id: null
    }]]);

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ username: 'admin1', password: 'password123' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Unexpected server error' });
  });
});
