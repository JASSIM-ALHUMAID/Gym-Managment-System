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
      if (sql.includes('SELECT PlanID AS plan_id, DurationMonths AS duration_months')) return [[{ plan_id: 2, duration_months: 3 }]];
      if (sql.includes('FROM member')) return [[{ member_id: 1 }]];
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 0 }]];
      if (sql.includes('INSERT INTO subscription')) return [{ insertId: 14 }];
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
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM membershipplan'), [2]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM member'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UserID = ?'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FOR UPDATE'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining('COUNT(*) AS count'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining('MemberUserID = ?'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining("Status = 'Pending'"), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining('INSERT INTO subscription'), [1, 2, expect.any(String), expect.any(String)]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining("'Pending'"), [1, 2, expect.any(String), expect.any(String)]);
    expect(mocks.connection.commit).toHaveBeenCalledOnce();
    expect(mocks.connection.rollback).not.toHaveBeenCalled();
    expect(mocks.connection.release).toHaveBeenCalledOnce();
  });

  it('rejects a second pending subscription request', async () => {
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT PlanID AS plan_id, DurationMonths AS duration_months')) return [[{ plan_id: 2, duration_months: 3 }]];
      if (sql.includes('FROM member')) return [[{ member_id: 1 }]];
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
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM member'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FOR UPDATE'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining('COUNT(*) AS count'), [1]);
    expect(mocks.connection.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO subscription'), expect.any(Array));
    expect(mocks.connection.commit).not.toHaveBeenCalled();
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
    expect(mocks.connection.release).toHaveBeenCalledOnce();
  });

  it('returns a conflict when a pending subscription already exists at insert time', async () => {
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT PlanID AS plan_id, DurationMonths AS duration_months')) return [[{ plan_id: 2, duration_months: 3 }]];
      if (sql.includes('FROM member')) return [[{ member_id: 1 }]];
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 0 }]];
      if (sql.includes('INSERT INTO subscription')) throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
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

  it('rejects member bookings without an active paid subscription', async () => {
    mocks.connection.query
      .mockResolvedValueOnce([[{ member_id: 1 }]])
      .mockResolvedValueOnce([[{ count: 0 }]]);

    const response = await request(createApp())
      .post('/api/bookings')
      .send({ session_id: 3 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'An active paid subscription is required to book sessions' });
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM subscription'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('JOIN payment'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('s.MemberUserID = ?'), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining("s.Status = 'Active'"), [1]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining("pay.PaymentStatus = 'Paid'"), [1]);
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
  });

  it('lists member bookings with separate session title and type fields', async () => {
    mocks.pool.query.mockResolvedValueOnce([[]]);

    const response = await request(createApp()).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('SessionTitle AS session_title'), [1]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('SessionType AS session_type'), [1]);
  });

  it('allows active paid members to book any scheduled session type', async () => {
    mocks.connection.query
      .mockResolvedValueOnce([[{ member_id: 1 }]])
      .mockResolvedValueOnce([[{ subscription_id: 9 }]])
      .mockResolvedValueOnce([[{ status: 'Scheduled', capacity: 10, session_type: 'Personal Training' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([{ insertId: 21 }]);

    const response = await request(createApp())
      .post('/api/bookings')
      .send({ session_id: 3 });

    expect(response.status).toBe(201);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining('SessionType AS session_type'), [3]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining('FROM `session`'), [3]);
  });

  it('creates confirmed bookings in the migrated booking table', async () => {
    mocks.connection.query
      .mockResolvedValueOnce([[{ member_id: 1 }]])
      .mockResolvedValueOnce([[{ subscription_id: 9 }]])
      .mockResolvedValueOnce([[{ status: 'Scheduled', capacity: 10, session_type: 'Personal Training' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([{ insertId: 22 }]);

    const response = await request(createApp())
      .post('/api/bookings')
      .send({ session_id: 3 });

    expect(response.status).toBe(201);
    expect(response.body.booking).toEqual({ booking_id: 22, member_id: 1, session_id: 3, booking_status: 'confirmed' });
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining('FROM booking'), [1, 3]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(5, expect.stringContaining("BookingStatus IN ('Confirmed', 'Booked')"), [3]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(6, expect.stringContaining('INSERT INTO booking'), [1, 3]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(6, expect.stringContaining("'Confirmed'"), [1, 3]);
    expect(mocks.connection.commit).toHaveBeenCalledOnce();
    expect(mocks.connection.rollback).not.toHaveBeenCalled();
  });
});
