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
const { sessionsRouter } = await import('../src/routes/sessions.js');
const { attendanceRouter } = await import('../src/routes/attendance.js');
const { dashboardRouter } = await import('../src/routes/dashboard.js');
const { paymentsRouter } = await import('../src/routes/payments.js');
const { subscriptionsRouter } = await import('../src/routes/subscriptions.js');
const { trainersRouter } = await import('../src/routes/trainers.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/trainers', trainersRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(error, res);
  });
  return app;
}

describe('workflow route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireDemoUser.mockResolvedValue({ user_id: 1, username: 'admin', role: 'admin', full_name: 'Admin', email: null, status: 'active' });
    mocks.requireRole.mockImplementation(() => undefined);
  });

  it('rejects full session bookings through the bookings route', async () => {
    mocks.connection.query
      .mockResolvedValueOnce([[{ member_id: 10 }]])
      .mockResolvedValueOnce([[{ status: 'scheduled', capacity: 2 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ count: 2 }]]);

    const response = await request(createApp())
      .post('/api/bookings')
      .send({ member_id: 10, session_id: 20 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Session is full' });
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM member'), [10]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('JOIN `user`'), [10]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining("`user`.Status = 'Active'"), [10]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM `session`'), [20]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining('FROM booking'), [20]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining("BookingStatus IN ('Confirmed', 'Booked')"), [20]);
    expect(mocks.connection.rollback).toHaveBeenCalledOnce();
    expect(mocks.connection.release).toHaveBeenCalledOnce();
  });

  it('lists sessions from the migrated session schema with lower-case statuses', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{
      session_id: 20,
      trainer_id: 3,
      session_title: 'Yoga Flow',
      session_type: 'beginner',
      session_date: '2026-05-01',
      start_time: '09:00:00',
      end_time: '10:00:00',
      capacity: 12,
      status: 'scheduled',
      trainer_name: 'Nora Trainer',
      trainer_specialty: 'Yoga',
      booked_count: 1
    }]]);

    const response = await request(createApp()).get('/api/sessions');

    expect(response.status).toBe(200);
    expect(response.body.sessions[0]).toMatchObject({
      session_id: 20,
      session_title: 'Yoga Flow',
      session_type: 'beginner',
      status: 'scheduled',
      trainer_name: 'Nora Trainer'
    });
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('s.SessionTitle AS session_title'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('LOWER(s.Status) AS status'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM `session` s'));
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining("BookingStatus IN ('Confirmed', 'Booked')"));
  });

  it('returns 409 when cancelling an already cancelled booking through the bookings route', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{ booking_status: 'cancelled' }]]);

    const response = await request(createApp())
      .patch('/api/bookings/5/cancel')
      .send();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Booking is already cancelled' });
  });

  it('rejects invalid attendance status through the attendance route', async () => {
    const response = await request(createApp())
      .post('/api/attendance')
      .send({ session_id: 20, member_id: 10, attendance_status: 'excused' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Attendance status must be present, absent, or late' });
    expect(mocks.pool.query).not.toHaveBeenCalled();
  });

  it('requires admin access for dashboard counts', async () => {
    mocks.pool.query.mockResolvedValue([[{ count: 0 }]]);

    const response = await request(createApp()).get('/api/dashboard');

    expect(response.status).toBe(200);
    expect(mocks.requireRole).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }), ['admin']);
  });

  it('returns a clean error when member payments are requested without a member profile', async () => {
    mocks.requireDemoUser.mockResolvedValueOnce({ user_id: 2, username: 'member', role: 'member', full_name: 'Member', email: null, status: 'active', member_id: null });

    const response = await request(createApp()).get('/api/payments');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Member profile is required' });
    expect(mocks.pool.query).not.toHaveBeenCalled();
  });

  it('returns a clean error when member subscriptions are requested without a member profile', async () => {
    mocks.requireDemoUser.mockResolvedValueOnce({ user_id: 2, username: 'member', role: 'member', full_name: 'Member', email: null, status: 'active', member_id: null });

    const response = await request(createApp()).get('/api/subscriptions');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Member profile is required' });
    expect(mocks.pool.query).not.toHaveBeenCalled();
  });

  it('omits trainer contact fields for member users', async () => {
    mocks.requireDemoUser.mockResolvedValueOnce({ user_id: 2, username: 'member', role: 'member', full_name: 'Member', email: null, status: 'active', member_id: 1 });
    mocks.pool.query.mockResolvedValueOnce([[{
      trainer_id: 1,
      specialty: 'Strength',
      hire_date: '2026-01-01',
      user_id: 3,
      full_name: 'Ahmed Trainer',
      email: 'trainer@example.com',
      phone: '0501234567',
      status: 'active'
    }]]);

    const response = await request(createApp()).get('/api/trainers');

    expect(response.status).toBe(200);
    expect(response.body.trainers[0]).toMatchObject({ trainer_id: 1, full_name: 'Ahmed Trainer', specialty: 'Strength' });
    expect(response.body.trainers[0].email).toBeUndefined();
    expect(response.body.trainers[0].phone).toBeUndefined();
  });

  it('uses the assigned session trainer when attendance submits another trainer', async () => {
    mocks.pool.query
      .mockResolvedValueOnce([[{ trainer_id: 3 }]])
      .mockResolvedValueOnce([[{ count: 1 }]])
      .mockResolvedValueOnce([{ insertId: 7 }]);

    const response = await request(createApp())
      .post('/api/attendance')
      .send({ session_id: 20, member_id: 10, attendance_status: 'present', marked_by_trainer_id: 99 });

    expect(response.status).toBe(201);
    expect(response.body.attendance.marked_by_trainer_id).toBe(3);
    expect(mocks.pool.query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO attendance'), [20, 10, 3, 'present']);
  });
});
