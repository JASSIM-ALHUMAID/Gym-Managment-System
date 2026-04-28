import cors from 'cors';
import express from 'express';
import { pool } from './db.js';
import { asyncHandler, sendError } from './http.js';
import { authRouter } from './routes/auth.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

app.use('/api/auth', authRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(error, res);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
