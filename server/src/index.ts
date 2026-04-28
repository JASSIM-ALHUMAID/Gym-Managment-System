import cors from 'cors';
import express from 'express';
import { pool } from './db.js';
import { asyncHandler, sendError } from './http.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { membersRouter } from './routes/members.js';
import { paymentsRouter } from './routes/payments.js';
import { plansRouter } from './routes/plans.js';
import { sessionsRouter } from './routes/sessions.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { trainersRouter } from './routes/trainers.js';
import { usersRouter } from './routes/users.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);
app.use('/api/plans', plansRouter);
app.use('/api/members', membersRouter);
app.use('/api/trainers', trainersRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/sessions', sessionsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(error, res);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
