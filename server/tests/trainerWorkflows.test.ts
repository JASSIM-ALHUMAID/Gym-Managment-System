import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendError } from '../src/http.js';

const mocks = vi.hoisted(() => ({
  connection: {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
    query: vi.fn()
  },
  pool: { query: vi.fn(), getConnection: vi.fn() },
  requireDemoUser: vi.fn(),
  requireRole: vi.fn()
}));

vi.mock('../src/db.js', () => ({ pool: mocks.pool }));
vi.mock('../src/auth.js', () => ({
  requireDemoUser: mocks.requireDemoUser,
  requireRole: mocks.requireRole
}));

const { attendanceRouter } = await import('../src/routes/attendance.js');
const { subscriptionsRouter } = await import('../src/routes/subscriptions.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(error, res);
  });
  return app;
}

describe('trainer workflow routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pool.getConnection.mockResolvedValue(mocks.connection);
    mocks.requireDemoUser.mockResolvedValue({ user_id: 3, username: 'trainer_ahmed', role: 'trainer', full_name: 'Ahmed', email: null, status: 'active', trainer_id: 1 });
    mocks.requireRole.mockImplementation(() => undefined);
  });

  it('returns trainer attendance history with session metadata', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{
      attendance_id: 1,
      session_type: 'Morning Strength',
      location: 'Strength Zone',
      difficulty: 'intermediate',
      member_name: 'Omar Alharbi',
      attendance_status: 'present'
    }]]);

    const response = await request(createApp()).get('/api/attendance/history');

    expect(response.status).toBe(200);
    expect(response.body.attendance[0]).toMatchObject({ location: 'Strength Zone', difficulty: 'intermediate' });
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('s.Location AS location'), [1]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('JOIN booking b ON b.BookingID = a.BookingID'), [1]);
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('LOWER(a.AttendanceStatus) AS attendance_status'), [1]);
  });

  it('marks attendance through the matching booking id', async () => {
    mocks.pool.query
      .mockResolvedValueOnce([[{ trainer_id: 1 }]])
      .mockResolvedValueOnce([[{ BookingID: 42 }]])
      .mockResolvedValueOnce([{ insertId: 9 }]);

    const response = await request(createApp())
      .post('/api/attendance')
      .send({ session_id: 20, member_id: 10, attendance_status: 'present' });

    expect(response.status).toBe(201);
    expect(response.body.attendance).toMatchObject({ session_id: 20, member_id: 10, marked_by_trainer_id: 1, attendance_status: 'present' });
    expect(mocks.pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM booking'), [20, 10]);
    expect(mocks.pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining("BookingStatus IN ('Confirmed', 'Booked')"), [20, 10]);
    expect(mocks.pool.query).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO attendance (BookingID, MarkedByTrainerUserID, AttendanceStatus, MarkedAt)'), [42, 1, 'Present']);
  });

  it('requests subscriptions using gym schema columns and returns lowercase status', async () => {
    mocks.requireDemoUser.mockResolvedValueOnce({ user_id: 5, username: 'member_omar', role: 'member', full_name: 'Omar', email: null, status: 'active', member_id: 5 });
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT PlanID AS plan_id, DurationMonths AS duration_months')) return [[{ plan_id: 2, duration_months: 3 }]];
      if (sql.includes('FROM member')) return [[{ member_id: 5 }]];
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 0 }]];
      if (sql.includes('INSERT INTO subscription')) return [{ insertId: 14 }];
      return [[]];
    });

    const response = await request(createApp())
      .post('/api/subscriptions/request')
      .send({ plan_id: 2 });

    expect(response.status).toBe(201);
    expect(response.body.subscription).toMatchObject({ subscription_id: 14, member_id: 5, plan_id: 2, status: 'pending' });
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM membershipplan'), [2]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM member'), [5]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining("Status = 'Pending'"), [5]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining('INSERT INTO subscription (MemberUserID, PlanID, StartDate, EndDate, Status)'), [5, 2, expect.any(String), expect.any(String)]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining("'Pending'"), [5, 2, expect.any(String), expect.any(String)]);
  });

  it('activates subscriptions without removed approval metadata', async () => {
    mocks.requireDemoUser.mockResolvedValueOnce({ user_id: 1, username: 'admin', role: 'admin', full_name: 'Admin', email: null, status: 'active' });
    mocks.connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM subscription') && sql.includes('FOR UPDATE')) return [[{ subscription_id: 7, member_id: 5 }]];
      if (sql.includes('FROM member')) return [[{ member_id: 5 }]];
      if (sql.includes("Status = 'Cancelled'")) return [{ affectedRows: 1 }];
      if (sql.includes("Status = 'Active'")) return [{ affectedRows: 1 }];
      return [[]];
    });

    const response = await request(createApp())
      .patch('/api/subscriptions/7/activate')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.subscription).toEqual({ subscription_id: 7, status: 'active' });
    expect(mocks.connection.query).toHaveBeenNthCalledWith(1, expect.stringContaining('SubscriptionID AS subscription_id, MemberUserID AS member_id'), [7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(3, expect.stringContaining("Status = 'Cancelled'"), [5, 7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.stringContaining("SET Status = 'Active'"), [7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.not.stringContaining('approved_by_user_id'), [7]);
    expect(mocks.connection.query).toHaveBeenNthCalledWith(4, expect.not.stringContaining('cancelled_at'), [7]);
  });
});
