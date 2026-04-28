# Gym Management Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a role-based Gym Management web app with React TypeScript, Express TypeScript, and MySQL using the existing schema and sample data.

**Architecture:** Use a monorepo with `client/` for the Vite React app, `server/` for the Express API, and `database/` for SQL files. The frontend calls JSON API endpoints only; the backend owns MySQL access, demo role checks, and workflow validation.

**Tech Stack:** npm, Node.js, TypeScript, Express, mysql2, dotenv, cors, React, Vite, React Router.

---

## File Structure

- Create `package.json`: root npm workspace/scripts for running client and server.
- Create `.gitignore`: ignore dependencies, builds, env files, and local brainstorming files.
- Create `README.md`: setup and run instructions.
- Create `.env.example`: database configuration template.
- Move `schema-v2.sql` to `database/schema-v2.sql`.
- Move `sample-data-v2.sql` to `database/sample-data-v2.sql`.
- Create `server/package.json`: backend dependencies and scripts.
- Create `server/tsconfig.json`: backend TypeScript config.
- Create `server/src/index.ts`: Express app entry point.
- Create `server/src/db.ts`: MySQL connection pool.
- Create `server/src/types.ts`: shared backend type aliases.
- Create `server/src/http.ts`: response helpers and async handler wrapper.
- Create `server/src/auth.ts`: demo auth and role guard helpers.
- Create `server/src/routes/*.ts`: API route modules by resource.
- Create `server/tests/workflows.test.ts`: workflow tests for booking and attendance rules.
- Create `client/package.json`: frontend dependencies and scripts.
- Create `client/tsconfig.json`, `client/tsconfig.node.json`, `client/vite.config.ts`, `client/index.html`.
- Create `client/src/main.tsx`: React entry point.
- Create `client/src/App.tsx`: routes and role-aware shell.
- Create `client/src/api.ts`: typed API client.
- Create `client/src/auth.tsx`: demo auth context.
- Create `client/src/styles.css`: app styling.
- Create `client/src/pages/*.tsx`: login and role pages.

---

### Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `database/schema-v2.sql`
- Create: `database/sample-data-v2.sql`
- Delete: `schema-v2.sql`
- Delete: `sample-data-v2.sql`

- [ ] **Step 1: Create the root package file**

Create `package.json`:

```json
{
  "name": "gym-management-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:all": "npm install --prefix server && npm install --prefix client",
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "test": "npm test --prefix server",
    "build": "npm run build --prefix server && npm run build --prefix client"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

- [ ] **Step 2: Create ignored-file rules**

Create `.gitignore`:

```gitignore
node_modules/
dist/
.env
.env.local
.superpowers/
npm-debug.log*
```

- [ ] **Step 3: Create env template**

Create `.env.example`:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gym_management_system_v2
```

- [ ] **Step 4: Move SQL files**

Move `schema-v2.sql` to `database/schema-v2.sql` and `sample-data-v2.sql` to `database/sample-data-v2.sql` without changing SQL content.

- [ ] **Step 5: Create setup documentation**

Create `README.md`:

~~~markdown
# Gym Management System

Role-based web app for managing gym members, trainers, plans, subscriptions, payments, sessions, bookings, and attendance.

## Requirements

- Node.js 20+
- npm
- MySQL 8+

## Database Setup

```bash
mysql -u root -p < database/schema-v2.sql
mysql -u root -p gym_management_system_v2 < database/sample-data-v2.sql
```

## App Setup

```bash
cp .env.example server/.env
npm install
npm run install:all
npm run dev
```

Frontend: http://localhost:5173

Backend: http://localhost:4000

## Demo Users

- admin1
- staff1
- trainer_ahmed
- trainer_lina
- member_omar
- member_noor
- member_sara
- member_faisal
~~~

- [ ] **Step 6: Verify skeleton files**

Run: `npm install`

Expected: npm installs root `concurrently` dependency and creates `package-lock.json`.

---

### Task 2: Backend Foundation

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/db.ts`
- Create: `server/src/types.ts`
- Create: `server/src/http.ts`

- [ ] **Step 1: Create backend package**

Create `server/package.json`:

```json
{
  "name": "gym-management-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "mysql2": "^3.12.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.7",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create backend TypeScript config**

Create `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create database pool**

Create `server/src/db.ts`:

```ts
import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'gym_management_system_v2',
  waitForConnections: true,
  connectionLimit: 10
});
```

- [ ] **Step 4: Create shared backend types**

Create `server/src/types.ts`:

```ts
export type Role = 'admin' | 'staff' | 'trainer' | 'member';

export type DemoUser = {
  user_id: number;
  username: string;
  role: Role;
  full_name: string;
  email: string | null;
  status: 'active' | 'inactive' | 'suspended';
  member_id?: number;
  trainer_id?: number;
};
```

- [ ] **Step 5: Create HTTP helpers**

Create `server/src/http.ts`:

```ts
import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export function sendError(error: unknown, res: Response) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'Unexpected server error' });
}
```

- [ ] **Step 6: Create Express entry point**

Create `server/src/index.ts`:

```ts
import cors from 'cors';
import express from 'express';
import { pool } from './db.js';
import { sendError } from './http.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(error, res);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

- [ ] **Step 7: Verify backend foundation**

Run: `npm install --prefix server && npm run build --prefix server`

Expected: TypeScript build succeeds and creates `server/dist/`.

---

### Task 3: Demo Auth And Role Guards

**Files:**
- Create: `server/src/auth.ts`
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create auth helpers**

Create `server/src/auth.ts`:

```ts
import type { Request } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from './db.js';
import { HttpError } from './http.js';
import type { DemoUser, Role } from './types.js';

type UserRow = DemoUser & RowDataPacket;

export async function findDemoUser(usernameOrId: string) {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT u.user_id, u.username, u.role, u.full_name, u.email, u.status,
            m.member_id, t.trainer_id
       FROM users u
       LEFT JOIN members m ON m.user_id = u.user_id
       LEFT JOIN trainers t ON t.user_id = u.user_id
      WHERE u.username = ? OR u.user_id = ?
      LIMIT 1`,
    [usernameOrId, Number(usernameOrId) || 0]
  );

  return rows[0] ?? null;
}

export async function requireDemoUser(req: Request) {
  const userId = req.header('x-demo-user-id');
  if (!userId) throw new HttpError(401, 'Demo user header is required');

  const user = await findDemoUser(userId);
  if (!user || user.status !== 'active') throw new HttpError(401, 'Active demo user was not found');

  return user;
}

export function requireRole(user: DemoUser, roles: Role[]) {
  if (!roles.includes(user.role)) throw new HttpError(403, 'You are not allowed to perform this action');
}
```

- [ ] **Step 2: Create auth route**

Create `server/src/routes/auth.ts`:

```ts
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
```

- [ ] **Step 3: Register auth route**

Modify `server/src/index.ts` to import and use auth route:

```ts
import { authRouter } from './routes/auth.js';
```

Add before the error handler:

```ts
app.use('/api/auth', authRouter);
```

- [ ] **Step 4: Verify auth build**

Run: `npm run build --prefix server`

Expected: TypeScript build succeeds.

---

### Task 4: Backend Resource Routes

**Files:**
- Create: `server/src/routes/dashboard.ts`
- Create: `server/src/routes/users.ts`
- Create: `server/src/routes/plans.ts`
- Create: `server/src/routes/members.ts`
- Create: `server/src/routes/trainers.ts`
- Create: `server/src/routes/subscriptions.ts`
- Create: `server/src/routes/payments.ts`
- Create: `server/src/routes/sessions.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create dashboard route**

Create `server/src/routes/dashboard.ts` with counts for active members, active subscriptions, scheduled sessions, and non-paid payments.

```ts
import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { requireDemoUser } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

type CountRow = { count: number } & RowDataPacket;

async function count(sql: string) {
  const [rows] = await pool.query<CountRow[]>(sql);
  return rows[0]?.count ?? 0;
}

export const dashboardRouter = Router();

dashboardRouter.get('/', asyncHandler(async (req, res) => {
  await requireDemoUser(req);

  const [activeMembers, activeSubscriptions, scheduledSessions, openPayments] = await Promise.all([
    count("SELECT COUNT(*) AS count FROM users WHERE role = 'member' AND status = 'active'"),
    count("SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'"),
    count("SELECT COUNT(*) AS count FROM sessions WHERE status = 'scheduled'"),
    count("SELECT COUNT(*) AS count FROM payments WHERE payment_status IN ('pending', 'failed')")
  ]);

  res.json({ activeMembers, activeSubscriptions, scheduledSessions, openPayments });
}));
```

- [ ] **Step 2: Create simple list routes**

Create `server/src/routes/users.ts`:

```ts
import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const usersRouter = Router();

usersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const [rows] = await pool.query('SELECT user_id, username, role, full_name, email, phone, status, created_at FROM users ORDER BY user_id');
  res.json({ users: rows });
}));
```

Create `server/src/routes/members.ts`:

```ts
import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const membersRouter = Router();

membersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff']);
  const [rows] = await pool.query(`
    SELECT m.member_id, m.gender, m.join_date,
           u.user_id, u.full_name, u.email, u.phone, u.status
      FROM members m
      JOIN users u ON u.user_id = m.user_id
     ORDER BY m.member_id
  `);
  res.json({ members: rows });
}));
```

Create `server/src/routes/trainers.ts`:

```ts
import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const trainersRouter = Router();

trainersRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  requireRole(user, ['admin', 'staff', 'member']);
  const [rows] = await pool.query(`
    SELECT t.trainer_id, t.specialty, t.hire_date,
           u.user_id, u.full_name, u.email, u.phone, u.status
      FROM trainers t
      JOIN users u ON u.user_id = t.user_id
     ORDER BY t.trainer_id
  `);
  res.json({ trainers: rows });
}));
```

Create `server/src/routes/subscriptions.ts`:

```ts
import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const subscriptionsRouter = Router();

subscriptionsRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  if (user.role === 'member') {
    const [rows] = await pool.query(
      `SELECT s.*, p.plan_name, p.price
         FROM subscriptions s
         JOIN membership_plans p ON p.plan_id = s.plan_id
        WHERE s.member_id = ?
        ORDER BY s.start_date DESC`,
      [user.member_id]
    );
    res.json({ subscriptions: rows });
    return;
  }

  requireRole(user, ['admin', 'staff']);
  const [rows] = await pool.query(`
    SELECT s.*, p.plan_name, u.full_name AS member_name
      FROM subscriptions s
      JOIN membership_plans p ON p.plan_id = s.plan_id
      JOIN members m ON m.member_id = s.member_id
      JOIN users u ON u.user_id = m.user_id
     ORDER BY s.start_date DESC
  `);
  res.json({ subscriptions: rows });
}));
```

Create `server/src/routes/payments.ts`:

```ts
import { Router } from 'express';
import { requireDemoUser, requireRole } from '../auth.js';
import { pool } from '../db.js';
import { asyncHandler } from '../http.js';

export const paymentsRouter = Router();

paymentsRouter.get('/', asyncHandler(async (req, res) => {
  const user = await requireDemoUser(req);
  if (user.role === 'member') {
    const [rows] = await pool.query(
      `SELECT pay.*
         FROM payments pay
         JOIN subscriptions s ON s.subscription_id = pay.subscription_id
        WHERE s.member_id = ?
        ORDER BY pay.payment_date DESC`,
      [user.member_id]
    );
    res.json({ payments: rows });
    return;
  }

  requireRole(user, ['admin', 'staff']);
  const [rows] = await pool.query(`
    SELECT pay.*, u.full_name AS member_name, p.plan_name
      FROM payments pay
      JOIN subscriptions s ON s.subscription_id = pay.subscription_id
      JOIN membership_plans p ON p.plan_id = s.plan_id
      JOIN members m ON m.member_id = s.member_id
      JOIN users u ON u.user_id = m.user_id
     ORDER BY pay.payment_date DESC
  `);
  res.json({ payments: rows });
}));
```

- [ ] **Step 3: Create plans route with CRUD**

Create `server/src/routes/plans.ts` with `GET /`, `POST /`, `PUT /:id`, and `DELETE /:id`. Validate `plan_name`, `duration_months > 0`, and `price > 0`. Restrict mutations to `admin` and `staff`.

- [ ] **Step 4: Create sessions route with CRUD**

Create `server/src/routes/sessions.ts` with `GET /`, `POST /`, `PUT /:id`, and `PATCH /:id/status`. Validate capacity and time order. Allow `admin` and `staff` to mutate; allow trainers and members to list scheduled sessions.

- [ ] **Step 5: Register routes**

Modify `server/src/index.ts`:

```ts
import { dashboardRouter } from './routes/dashboard.js';
import { usersRouter } from './routes/users.js';
import { plansRouter } from './routes/plans.js';
import { membersRouter } from './routes/members.js';
import { trainersRouter } from './routes/trainers.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { paymentsRouter } from './routes/payments.js';
import { sessionsRouter } from './routes/sessions.js';

app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);
app.use('/api/plans', plansRouter);
app.use('/api/members', membersRouter);
app.use('/api/trainers', trainersRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/sessions', sessionsRouter);
```

- [ ] **Step 6: Verify resource routes**

Run: `npm run build --prefix server`

Expected: TypeScript build succeeds.

---

### Task 5: Booking And Attendance Workflows

**Files:**
- Create: `server/src/routes/bookings.ts`
- Create: `server/src/routes/attendance.ts`
- Create: `server/tests/workflows.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write booking workflow test**

Create `server/tests/workflows.test.ts` with pure validation helpers or mocked route-level tests covering duplicate booking, full sessions, and allowed attendance status.

```ts
import { describe, expect, it } from 'vitest';

function canBookSession(input: { status: string; capacity: number; bookedCount: number; alreadyBooked: boolean }) {
  if (input.status !== 'scheduled') return 'Session is not available for booking';
  if (input.alreadyBooked) return 'Member already booked this session';
  if (input.bookedCount >= input.capacity) return 'Session is full';
  return 'ok';
}

function isAttendanceStatus(value: string) {
  return ['present', 'absent', 'late'].includes(value);
}

describe('booking workflow rules', () => {
  it('rejects duplicate bookings', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 5, bookedCount: 1, alreadyBooked: true })).toBe('Member already booked this session');
  });

  it('rejects full sessions', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 2, bookedCount: 2, alreadyBooked: false })).toBe('Session is full');
  });

  it('accepts valid bookings', () => {
    expect(canBookSession({ status: 'scheduled', capacity: 2, bookedCount: 1, alreadyBooked: false })).toBe('ok');
  });
});

describe('attendance workflow rules', () => {
  it('allows present absent and late only', () => {
    expect(isAttendanceStatus('present')).toBe(true);
    expect(isAttendanceStatus('absent')).toBe(true);
    expect(isAttendanceStatus('late')).toBe(true);
    expect(isAttendanceStatus('excused')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**

Run: `npm test --prefix server`

Expected: tests pass.

- [ ] **Step 3: Create booking route**

Create `server/src/routes/bookings.ts` with:

- `GET /`: admin/staff see all; members see own bookings.
- `POST /`: member/admin/staff creates booking after checking scheduled status, capacity, and duplicate active booking.
- `PATCH /:id/cancel`: member can cancel own booking; admin/staff can cancel any booking.

Use SQL count of booked rows with `booking_status = 'booked'` before insert.

- [ ] **Step 4: Create attendance route**

Create `server/src/routes/attendance.ts` with:

- `GET /`: admin/staff see all; trainers see attendance for assigned sessions.
- `GET /session/:sessionId`: returns booked members and existing attendance for a session.
- `POST /`: marks attendance using insert-or-update behavior for `(session_id, member_id)`.

Validate `attendance_status` is `present`, `absent`, or `late`. Allow assigned trainer, admin, or staff.

- [ ] **Step 5: Register workflow routes**

Modify `server/src/index.ts`:

```ts
import { bookingsRouter } from './routes/bookings.js';
import { attendanceRouter } from './routes/attendance.js';

app.use('/api/bookings', bookingsRouter);
app.use('/api/attendance', attendanceRouter);
```

- [ ] **Step 6: Verify workflow routes**

Run: `npm test --prefix server && npm run build --prefix server`

Expected: tests pass and TypeScript build succeeds.

---

### Task 6: Frontend Foundation

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/tsconfig.node.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/api.ts`
- Create: `client/src/auth.tsx`
- Create: `client/src/styles.css`
- Create: `client/src/App.tsx`

- [ ] **Step 1: Create frontend package**

Create `client/package.json`:

```json
{
  "name": "gym-management-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.7",
    "typescript": "^5.7.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.1"
  },
  "devDependencies": {
    "@types/react": "^19.0.4",
    "@types/react-dom": "^19.0.2"
  }
}
```

- [ ] **Step 2: Create frontend config files**

Create `client/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});
```

Create `client/tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `client/tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Create `client/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

Create `client/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gym Management System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create API client**

Create `client/src/api.ts`:

```ts
export type DemoUser = {
  user_id: number;
  username: string;
  role: 'admin' | 'staff' | 'trainer' | 'member';
  full_name: string;
  email: string | null;
  status: string;
  member_id?: number;
  trainer_id?: number;
};

export async function apiFetch<T>(path: string, options: RequestInit = {}, user?: DemoUser | null): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (user) headers.set('x-demo-user-id', String(user.user_id));

  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}
```

- [ ] **Step 4: Create auth context**

Create `client/src/auth.tsx` with `AuthProvider`, `useAuth`, `login(username)`, and `logout()`. Store demo user in `localStorage` key `gym-demo-user`.

- [ ] **Step 5: Create app shell and routes**

Create `client/src/App.tsx` with routes for `/login`, `/`, `/admin`, `/trainer`, and `/member`. Redirect users to their role dashboard after login.

- [ ] **Step 6: Verify frontend foundation**

Run: `npm install --prefix client && npm run build --prefix client`

Expected: frontend build succeeds.

---

### Task 7: Frontend Pages And Workflows

**Files:**
- Create: `client/src/pages/LoginPage.tsx`
- Create: `client/src/pages/AdminDashboard.tsx`
- Create: `client/src/pages/TrainerDashboard.tsx`
- Create: `client/src/pages/MemberDashboard.tsx`
- Create: `client/src/pages/ResourceTable.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/styles.css`

- [ ] **Step 1: Create login page**

Create `LoginPage.tsx` with a dropdown containing `admin1`, `staff1`, `trainer_ahmed`, `trainer_lina`, `member_omar`, `member_noor`, `member_sara`, and `member_faisal`. On submit, call `login(username)` from auth context.

- [ ] **Step 2: Create reusable resource table**

Create `ResourceTable.tsx` that accepts `title`, `rows`, `columns`, `loading`, and `error`. Render empty state when rows are empty.

- [ ] **Step 3: Create admin dashboard**

Create `AdminDashboard.tsx` with dashboard cards and tabs/buttons for users, members, trainers, plans, subscriptions, payments, sessions, bookings, and attendance. Fetch data through `apiFetch` with the logged-in user.

- [ ] **Step 4: Create trainer dashboard**

Create `TrainerDashboard.tsx` to show assigned sessions and a simple attendance form with status select values `present`, `absent`, and `late`.

- [ ] **Step 5: Create member dashboard**

Create `MemberDashboard.tsx` to show subscription summary, available scheduled sessions, booked sessions, and plan list. Add book/cancel buttons that call `/api/bookings` endpoints.

- [ ] **Step 6: Add styling**

Create responsive dashboard styles in `styles.css`: card grid, table wrappers, forms, buttons, sidebar/topbar, mobile stacking at widths under 760px.

- [ ] **Step 7: Verify frontend pages**

Run: `npm run build --prefix client`

Expected: frontend build succeeds.

---

### Task 8: End-To-End Verification And Polish

**Files:**
- Modify: `README.md`
- Modify: `.env.example` if setup changed
- Modify: affected client/server files for issues found during verification

- [ ] **Step 1: Install all dependencies**

Run: `npm run install:all`

Expected: dependencies install in `server/` and `client/`.

- [ ] **Step 2: Build everything**

Run: `npm run build`

Expected: server and client builds succeed.

- [ ] **Step 3: Run backend tests**

Run: `npm test`

Expected: workflow tests pass.

- [ ] **Step 4: Verify database setup manually**

Run:

```bash
mysql -u root -p < database/schema-v2.sql
mysql -u root -p gym_management_system_v2 < database/sample-data-v2.sql
```

Expected: schema and seed data load without SQL errors.

- [ ] **Step 5: Run app manually**

Run: `npm run dev`

Expected: backend starts on `http://localhost:4000` and frontend starts on `http://localhost:5173`.

- [ ] **Step 6: Role walkthrough**

Verify these actions in the browser:

- Login as `admin1` and view management tables.
- Login as `staff1` and create or view operational records.
- Login as `trainer_ahmed` and mark attendance for an assigned session.
- Login as `member_omar` and book or cancel a scheduled session.

- [ ] **Step 7: Final documentation update**

Update `README.md` with any changed commands, required MySQL notes, and known demo limitations.

---

## Self-Review Notes

- Spec coverage: plan covers npm, React TypeScript frontend, Express TypeScript backend, MySQL schema/sample data, demo login, all roles, CRUD resources, booking, attendance, subscription/payment flows, setup docs, and verification.
- Scope: implementation is large but still a single coherent course-project app. Tasks are separated by foundation, backend resources, workflows, frontend, and verification.
- Testing focus: backend workflow tests are prioritized for duplicate booking, capacity, and attendance status rules.
