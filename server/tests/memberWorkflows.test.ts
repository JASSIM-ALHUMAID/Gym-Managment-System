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
    mocks.requireDemoUser.mockResolvedValue({ user_id: 5, username: 'member_omar', role: 'member', full_name: 'Omar', email: null, status: 'active', member_id: 1 });
    mocks.requireRole.mockImplementation(() => undefined);
  });

  it('lets members request a pending subscription plan', async () => {
    mocks.pool.query
      .mockResolvedValueOnce([[{ plan_id: 2, duration_months: 3 }]])
      .mockResolvedValueOnce([{ insertId: 14 }]);

    const response = await request(createApp())
      .post('/api/subscriptions/request')
      .send({ plan_id: 2 });

    expect(response.status).toBe(201);
    expect(response.body.subscription).toMatchObject({ subscription_id: 14, plan_id: 2, status: 'pending' });
    expect(mocks.pool.query).toHaveBeenLastCalledWith(expect.stringContaining("'pending'"), [1, 2, expect.any(String), expect.any(String)]);
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
});
