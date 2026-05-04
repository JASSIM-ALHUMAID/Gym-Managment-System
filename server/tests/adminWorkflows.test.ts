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

const { sessionsRouter } = await import('../src/routes/sessions.js');
const { subscriptionsRouter } = await import('../src/routes/subscriptions.js');
const { membersRouter } = await import('../src/routes/members.js');
const { trainersRouter } = await import('../src/routes/trainers.js');
const { plansRouter } = await import('../src/routes/plans.js');
const { paymentsRouter } = await import('../src/routes/payments.js');
const { dashboardRouter } = await import('../src/routes/dashboard.js');
const { usersRouter } = await import('../src/routes/users.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/trainers', trainersRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/users', usersRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(error, res);
  });
  return app;
}

describe('admin workflow routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pool.query.mockReset();
    mocks.connection.query.mockReset();
    mocks.requireDemoUser.mockResolvedValue({ user_id: 1, username: 'admin1', role: 'admin', full_name: 'Admin User', email: null, status: 'active' });
    mocks.requireRole.mockImplementation(() => undefined);
  });

  it('creates sessions with migrated session fields', async () => {
    mocks.pool.query
      .mockResolvedValueOnce([[{ count: 1 }]])
      .mockResolvedValueOnce([{ insertId: 12 }]);

    const response = await request(createApp())
      .post('/api/sessions')
      .send({
        trainer_id: 1,
        session_type: 'Boxing Fundamentals',
        description: 'Technique-focused class for newer boxers',
        location: 'Studio C',
        difficulty: 'beginner',
        session_date: '2026-05-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
        capacity: 10
      });

    expect(response.status).toBe(201);
    expect(response.body.session).toMatchObject({
      session_id: 12,
      trainer_id: 1,
      session_title: 'Boxing Fundamentals',
      session_type: 'Boxing Fundamentals',
      session_date: '2026-05-01',
      start_time: '09:00:00',
      end_time: '10:00:00',
      capacity: 10,
      status: 'scheduled'
    });
    expect(response.body.session.description).toBeUndefined();
    expect(response.body.session.location).toBeUndefined();
    expect(response.body.session.difficulty).toBeUndefined();
    expect(mocks.pool.query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO `session`'), [1, 'Boxing Fundamentals', 'Boxing Fundamentals', '2026-05-01', '09:00:00', '10:00:00', 10, 'Scheduled']);
  });

  it('updates sessions without inventing a scheduled status', async () => {
    mocks.pool.query
      .mockResolvedValueOnce([[{ session_id: 12, count: 1 }]])
      .mockResolvedValueOnce([[{ count: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(createApp())
      .put('/api/sessions/12')
      .send({
        trainer_id: 1,
        session_title: 'Strength Lab',
        session_type: 'Personal Training',
        description: 'Technique-focused class',
        location: 'Studio C',
        difficulty: 'advanced',
        session_date: '2026-05-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
        capacity: 10
      });

    expect(response.status).toBe(200);
    expect(response.body.session).toMatchObject({
      session_id: 12,
      trainer_id: 1,
      session_title: 'Strength Lab',
      session_type: 'Personal Training',
      session_date: '2026-05-01',
      start_time: '09:00:00',
      end_time: '10:00:00',
      capacity: 10
    });
    expect(response.body.session.status).toBeUndefined();
    expect(mocks.pool.query).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE `session`'), [1, 'Strength Lab', 'Personal Training', '2026-05-01', '09:00:00', '10:00:00', 10, 12]);
  });

  it('activates pending subscriptions as admin', async () => {
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FROM subscription')) return [[{ subscription_id: 7, member_id: 3, status: 'pending' }]];
      if (sql.includes('FROM member')) return [[{ member_id: 3 }]];
      if (sql.includes("Status = 'Cancelled'")) return [{ affectedRows: 1 }];
      if (sql.includes("SET Status = 'Active'")) return [{ affectedRows: 1 }];
      return [[]];
    });

    const response = await request(createApp())
      .patch('/api/subscriptions/7/activate')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.subscription).toEqual({ subscription_id: 7, status: 'active' });
    expect(mocks.pool.getConnection).toHaveBeenCalledOnce();
    expect(mocks.connection.beginTransaction).toHaveBeenCalledOnce();
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('MemberUserID AS member_id'), [7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FOR UPDATE'), [7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM member'), [3]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FOR UPDATE'), [3]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining("Status = 'Cancelled'"), [3, 7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining("Status = 'Active'"), [3, 7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining("SET Status = 'Active'"), [7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining("Status = 'Pending'"), [7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.not.stringContaining('approved_by_user_id'), [7]);
    expect(mocks.connection.commit).toHaveBeenCalledOnce();
    expect(mocks.connection.release).toHaveBeenCalledOnce();
  });

  it('rejects activation when the selected subscription is no longer pending', async () => {
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FROM subscription')) return [[{ subscription_id: 7, member_id: 3, status: 'pending' }]];
      if (sql.includes('FROM member')) return [[{ member_id: 3 }]];
      if (sql.includes("Status = 'Cancelled'")) return [{ affectedRows: 1 }];
      if (sql.includes("SET Status = 'Active'")) return [{ affectedRows: 0 }];
      return [[]];
    });

    const response = await request(createApp())
      .patch('/api/subscriptions/7/activate')
      .send();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Subscription is not pending' });
    expect(mocks.pool.getConnection).toHaveBeenCalledOnce();
    expect(mocks.connection.beginTransaction).toHaveBeenCalledOnce();
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FOR UPDATE'), [7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM member'), [3]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FOR UPDATE'), [3]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining("Status = 'Pending'"), [7]);
    expect(mocks.connection.commit).not.toHaveBeenCalled();
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
    expect(mocks.connection.release).toHaveBeenCalledOnce();
  });

  it('cancels subscriptions as admin', async () => {
    mocks.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(createApp())
      .patch('/api/subscriptions/7/cancel')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.subscription).toEqual({ subscription_id: 7, status: 'cancelled' });
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining("Status = 'Cancelled'"), [7]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.not.stringContaining('cancelled_at'), [7]);
  });

  it('lists members from gym schema with snake case aliases', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{
      member_id: 2,
      gender: 'Female',
      join_date: '2026-01-06',
      user_id: 2,
      full_name: 'Member Two',
      email: 'member@example.com',
      phone: '555-0102',
      status: 'active'
    }]]);

    const response = await request(createApp()).get('/api/members');

    expect(response.status).toBe(200);
    expect(response.body.members).toEqual([{
      member_id: 2,
      gender: 'Female',
      join_date: '2026-01-06',
      user_id: 2,
      full_name: 'Member Two',
      email: 'member@example.com',
      phone: '555-0102',
      status: 'active'
    }]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('m.UserID AS member_id'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM member m'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('JOIN `user` u ON u.UserID = m.UserID'));
  });

  it('lists users from gym schema with snake case aliases', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{
      user_id: 2,
      username: 'member2',
      full_name: 'Member Two',
      email: 'member@example.com',
      phone: '555-0102',
      status: 'active',
      created_at: '2026-01-06 08:00:00'
    }]]);

    const response = await request(createApp()).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body.users).toEqual([{
      user_id: 2,
      username: 'member2',
      full_name: 'Member Two',
      email: 'member@example.com',
      phone: '555-0102',
      status: 'active',
      created_at: '2026-01-06 08:00:00'
    }]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('u.UserID AS user_id'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM `user` u'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.not.stringContaining('FROM users'));
  });

  it('lists trainers from gym schema and hides contact fields from members', async () => {
    mocks.requireDemoUser.mockResolvedValueOnce({ user_id: 2, username: 'member1', role: 'member', full_name: 'Member One', email: null, status: 'active', member_id: 2 });
    mocks.pool.query.mockResolvedValueOnce([[{
      trainer_id: 3,
      specialty: 'Strength Training',
      hire_date: '2025-12-01',
      user_id: 3,
      full_name: 'Trainer Three',
      email: 'trainer@example.com',
      phone: '555-0103',
      status: 'active'
    }]]);

    const response = await request(createApp()).get('/api/trainers');

    expect(response.status).toBe(200);
    expect(response.body.trainers).toEqual([{
      trainer_id: 3,
      specialty: 'Strength Training',
      hire_date: '2025-12-01',
      user_id: 3,
      full_name: 'Trainer Three',
      status: 'active'
    }]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('t.UserID AS trainer_id'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM trainer t'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('JOIN `user` u ON u.UserID = t.UserID'));
  });

  it('lists plans from membershipplan with snake case aliases', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{
      plan_id: 1,
      plan_name: 'Monthly Basic',
      duration_months: 1,
      price: '150.00',
      description: 'Basic one-month gym access'
    }]]);

    const response = await request(createApp()).get('/api/plans');

    expect(response.status).toBe(200);
    expect(response.body.plans).toEqual([{
      plan_id: 1,
      plan_name: 'Monthly Basic',
      duration_months: 1,
      price: '150.00',
      description: 'Basic one-month gym access'
    }]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('PlanID AS plan_id'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM membershipplan'));
  });

  it('writes plans through membershipplan CamelCase columns', async () => {
    mocks.pool.query
      .mockResolvedValueOnce([{ insertId: 4 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const app = createApp();
    const input = { plan_name: 'Semiannual', duration_months: 6, price: 700, description: 'Six months' };

    const createResponse = await request(app).post('/api/plans').send(input);
    const updateResponse = await request(app).put('/api/plans/4').send(input);
    const deleteResponse = await request(app).delete('/api/plans/4');

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(mocks.pool.query).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO membershipplan (PlanName, DurationMonths, Price, Description)'), ['Semiannual', 6, 700, 'Six months']);
    expect(mocks.pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE membershipplan SET PlanName = ?, DurationMonths = ?, Price = ?, Description = ? WHERE PlanID = ?'), ['Semiannual', 6, 700, 'Six months', 4]);
    expect(mocks.pool.query).toHaveBeenNthCalledWith(3, expect.stringContaining('DELETE FROM membershipplan WHERE PlanID = ?'), [4]);
  });

  it('lists member payments from gym schema by MemberUserID', async () => {
    mocks.requireDemoUser.mockResolvedValueOnce({ user_id: 2, username: 'member1', role: 'member', full_name: 'Member One', email: null, status: 'active', member_id: 2 });
    mocks.pool.query.mockResolvedValueOnce([[{
      payment_id: 9,
      subscription_id: 7,
      amount: '150.00',
      payment_date: '2026-01-05',
      payment_method: 'Card',
      payment_status: 'paid',
      subscription_status: 'active',
      plan_id: 1,
      plan_name: 'Monthly Basic'
    }]]);

    const response = await request(createApp()).get('/api/payments');

    expect(response.status).toBe(200);
    expect(response.body.payments[0]).toMatchObject({ payment_id: 9, subscription_id: 7, payment_status: 'paid', subscription_status: 'active', plan_id: 1 });
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('pay.PaymentID AS payment_id'), [2]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM payment pay'), [2]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE s.MemberUserID = ?'), [2]);
  });

  it('lists admin payments from gym schema with member details', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{
      payment_id: 9,
      subscription_id: 7,
      amount: '150.00',
      payment_date: '2026-01-05',
      payment_method: 'Card',
      payment_status: 'paid',
      subscription_status: 'active',
      plan_id: 1,
      plan_name: 'Monthly Basic',
      member_id: 2,
      member_name: 'Member Two',
      member_email: 'member@example.com'
    }]]);

    const response = await request(createApp()).get('/api/payments');

    expect(response.status).toBe(200);
    expect(response.body.payments[0]).toMatchObject({ payment_id: 9, member_id: 2, member_name: 'Member Two', member_email: 'member@example.com' });
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('m.UserID AS member_id'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('JOIN subscription s ON s.SubscriptionID = pay.SubscriptionID'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('JOIN `user` u ON u.UserID = m.UserID'));
  });

  it('counts dashboard metrics from gym schema tables and CamelCase statuses', async () => {
    mocks.pool.query
      .mockResolvedValueOnce([[{ count: 1 }]])
      .mockResolvedValueOnce([[{ count: 2 }]])
      .mockResolvedValueOnce([[{ count: 3 }]])
      .mockResolvedValueOnce([[{ count: 4 }]])
      .mockResolvedValueOnce([[{ count: 5 }]])
      .mockResolvedValueOnce([[{ count: 6 }]])
      .mockResolvedValueOnce([[{ count: 7 }]])
      .mockResolvedValueOnce([[{ count: 8 }]])
      .mockResolvedValueOnce([[{ count: 9 }]])
      .mockResolvedValueOnce([[{ count: 10 }]])
      .mockResolvedValueOnce([[{ count: 11 }]])
      .mockResolvedValueOnce([[{ count: 12 }]])
      .mockResolvedValueOnce([[{ count: 13 }]])
      .mockResolvedValueOnce([[{ count: 14 }]]);

    const response = await request(createApp()).get('/api/dashboard');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      activeMembers: 11,
      activeSubscriptions: 12,
      scheduledSessions: 13,
      openPayments: 14,
      counts: {
        users: 1,
        members: 2,
        trainers: 3,
        staff: 4,
        plans: 5,
        subscriptions: 6,
        payments: 7,
        sessions: 8,
        bookings: 9,
        attendance: 10
      }
    });
    expect(mocks.pool.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM `user`'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM member'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(3, expect.stringContaining('FROM trainer'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(4, expect.stringContaining('FROM staff'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(5, expect.stringContaining('FROM membershipplan'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(6, expect.stringContaining('FROM subscription'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(7, expect.stringContaining('FROM payment'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(8, expect.stringContaining('FROM session'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(9, expect.stringContaining('FROM booking'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(10, expect.stringContaining('FROM attendance'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(11, expect.stringContaining('JOIN member m ON m.UserID = u.UserID'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(11, expect.stringContaining("u.Status = 'Active'"));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(12, expect.stringContaining('FROM subscription'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(12, expect.stringContaining("Status = 'Active'"));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(13, expect.stringContaining('FROM session'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(13, expect.stringContaining("Status = 'Scheduled'"));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(14, expect.stringContaining('FROM payment'));
    expect(mocks.pool.query).toHaveBeenNthCalledWith(14, expect.stringContaining("PaymentStatus IN ('Pending', 'Failed')"));
  });
});
