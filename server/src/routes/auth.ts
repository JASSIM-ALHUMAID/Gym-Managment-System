import { Router } from 'express';
import { findDemoUser } from '../auth.js';
import { HttpError, asyncHandler } from '../http.js';

export const authRouter = Router();

authRouter.post('/demo-login', asyncHandler(async (req, res) => {
  const username = String(req.body.username ?? '').trim();
  if (!username) throw new HttpError(400, 'Username is required');

  const user = await findDemoUser(username);
  if (!user || user.status !== 'active') throw new HttpError(401, 'Active demo user was not found');

  res.json({ user });
}));
