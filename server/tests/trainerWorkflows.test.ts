import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendError } from '../src/http.js';

const mocks = vi.hoisted(() => ({
  pool: { query: vi.fn() },
  requireDemoUser: vi.fn(),
  requireRole: vi.fn()
}));

vi.mock('../src/db.js', () => ({ pool: mocks.pool }));
vi.mock('../src/auth.js', () => ({
  requireDemoUser: mocks.requireDemoUser,
  requireRole: mocks.requireRole
}));

const { attendanceRouter } = await import('../src/routes/attendance.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/attendance', attendanceRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(error, res);
  });
  return app;
}

describe('trainer workflow routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('s.location'), [1]);
  });
});
