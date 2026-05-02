import express from 'express';
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
    },
    requireDemoUser: vi.fn(),
    requireRole: vi.fn()
  };
});

vi.mock('../src/db.js', () => ({ pool: mocks.pool }));
vi.mock('../src/auth.js', () => ({
  requireDemoUser: mocks.requireDemoUser,
  requireRole: mocks.requireRole
}));

const { bookingsRouter } = await import('../src/routes/bookings.js');
const { subscriptionsRouter } = await import('../src/routes/subscriptions.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(error, res);
  });
  return app;
}

describe('member subscription and booking workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pool.query.mockReset();
    mocks.connection.query.mockReset();
    mocks.requireDemoUser.mockResolvedValue({ user_id: 5, username: 'member_omar', role: 'member', full_name: 'Omar', email: null, status: 'active', member_id: 1 });
    mocks.requireRole.mockImplementation(() => undefined);
  });

  it('lets members request a pending subscription plan', async () => {
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT plan_id, duration_months')) return [[{ plan_id: 2, duration_months: 3 }]];
      if (sql.includes('SELECT member_id FROM members')) return [[{ member_id: 1 }]];
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 0 }]];
      if (sql.includes('INSERT INTO subscriptions')) return [{ insertId: 14 }];
      return [[]];
    });
    mocks.pool.query
      .mockResolvedValueOnce([[{ plan_id: 2, duration_months: 3 }]])
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([{ insertId: 14 }]);

    const response = await request(createApp())
      .post('/api/subscriptions/request')
      .send({ plan_id: 2 });

    expect(response.status).toBe(201);
    expect(response.body.subscription).toMatchObject({ subscription_id: 14, plan_id: 2, status: 'pending' });
    expect(mocks.pool.getConnection).toHaveBeenCalledOnce();
    expect(mocks.connection.beginTransaction).toHaveBeenCalledOnce();
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT plan_id, duration_months'), [2]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT member_id FROM members'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('member_id = ?'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FOR UPDATE'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining('COUNT(*) AS count'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining('member_id = ?'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining("status = 'pending'"), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining('INSERT INTO subscriptions'), [1, 2, expect.any(String), expect.any(String)]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining("'pending'"), [1, 2, expect.any(String), expect.any(String)]);
    expect(mocks.connection.commit).toHaveBeenCalledOnce();
    expect(mocks.connection.rollback).not.toHaveBeenCalled();
    expect(mocks.connection.release).toHaveBeenCalledOnce();
  });

  it('rejects a second pending subscription request', async () => {
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT plan_id, duration_months')) return [[{ plan_id: 2, duration_months: 3 }]];
      if (sql.includes('SELECT member_id FROM members')) return [[{ member_id: 1 }]];
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 1 }]];
      return [[]];
    });
    mocks.pool.query
      .mockResolvedValueOnce([[{ plan_id: 2, duration_months: 3 }]])
      .mockResolvedValueOnce([[{ count: 1 }]]);

    const response = await request(createApp())
      .post('/api/subscriptions/request')
      .send({ plan_id: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'You already have a pending subscription request' });
    expect(mocks.pool.getConnection).toHaveBeenCalledOnce();
    expect(mocks.connection.beginTransaction).toHaveBeenCalledOnce();
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT member_id FROM members'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FOR UPDATE'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining('COUNT(*) AS count'), [1]);
    expect(mocks.connection.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO subscriptions'), expect.any(Array));
    expect(mocks.connection.commit).not.toHaveBeenCalled();
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
    expect(mocks.connection.release).toHaveBeenCalledOnce();
  });

  it('returns a conflict when a pending subscription already exists at insert time', async () => {
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT plan_id, duration_months')) return [[{ plan_id: 2, duration_months: 3 }]];
      if (sql.includes('SELECT member_id FROM members')) return [[{ member_id: 1 }]];
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 0 }]];
      if (sql.includes('INSERT INTO subscriptions')) throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
      return [[]];
    });

    const response = await request(createApp())
      .post('/api/subscriptions/request')
      .send({ plan_id: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'You already have a pending subscription request' });
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
    expect(mocks.connection.release).toHaveBeenCalledOnce();
  });

  it('rejects member bookings without an active subscription', async () => {
    mocks.connection.query
      .mockResolvedValueOnce([[{ member_id: 1 }]])
      .mockResolvedValueOnce([[{ count: 0 }]]);

    const response = await request(createApp())
      .post('/api/bookings')
      .send({ session_id: 3 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'An active subscription is required to book sessions' });
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
  });

  it('rejects session bookings that are not included in the active plan', async () => {
    mocks.connection.query
      .mockResolvedValueOnce([[{ member_id: 1 }]])
      .mockResolvedValueOnce([[{ plan_name: 'Monthly Basic' }]])
      .mockResolvedValueOnce([[{ status: 'scheduled', capacity: 10, session_type: 'Yoga Flow' }]]);

    const response = await request(createApp())
      .post('/api/bookings')
      .send({ session_id: 3 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Your current plan does not include this session' });
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
  });
});
