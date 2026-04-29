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

const { sessionsRouter } = await import('../src/routes/sessions.js');
const { subscriptionsRouter } = await import('../src/routes/subscriptions.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(error, res);
  });
  return app;
}

describe('admin and staff workflow routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireDemoUser.mockResolvedValue({ user_id: 1, username: 'admin1', role: 'admin', full_name: 'Admin User', email: null, status: 'active' });
    mocks.requireRole.mockImplementation(() => undefined);
  });

  it('creates sessions with description, location, and difficulty', async () => {
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
      description: 'Technique-focused class for newer boxers',
      location: 'Studio C',
      difficulty: 'beginner'
    });
    expect(mocks.pool.query).toHaveBeenLastCalledWith(expect.stringContaining('description'), [1, 'Boxing Fundamentals', 'Technique-focused class for newer boxers', 'Studio C', 'beginner', '2026-05-01', '09:00:00', '10:00:00', 10]);
  });

  it('activates pending subscriptions as admin or staff', async () => {
    mocks.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(createApp())
      .patch('/api/subscriptions/7/activate')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.subscription).toEqual({ subscription_id: 7, status: 'active' });
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('approved_by_user_id'), [1, 7]);
  });

  it('cancels subscriptions as admin or staff', async () => {
    mocks.pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(createApp())
      .patch('/api/subscriptions/7/cancel')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.subscription).toEqual({ subscription_id: 7, status: 'cancelled' });
    expect(mocks.pool.query).toHaveBeenCalledWith(expect.stringContaining('cancelled_at = CURRENT_TIMESTAMP'), [7]);
  });
});
