# Gym Management Schema Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app use the provided `gym_management` schema directly, extended with a `staff` admin subtype table.

**Architecture:** Replace the local schema with the provided dump plus `staff`. Keep frontend response shapes mostly snake_case by aliasing SQL columns in backend routes. Treat `UserID` as the app-facing `user_id`, `member_id`, and `trainer_id` for role profiles because the new schema uses subtype primary keys.

**Tech Stack:** MariaDB/MySQL, `mysql2`, Express, TypeScript, Vitest, Supertest.

---

## File Map

- Modify: `database/schema.sql` - canonical schema/data, copied from `gym_management.sql`, with `staff` table and one staff seed user.
- Modify: `database/sample-data.sql` - either remove duplicate old inserts or make it a small optional no-op/extra seed for the new schema.
- Modify: `server/.env` - set `DB_NAME=gym_management`.
- Modify: `server/src/db.ts` - change fallback database to `gym_management`.
- Modify: `server/src/types.ts` - keep `Role`, define subtype IDs as `UserID` aliases.
- Modify: `server/src/auth.ts` - read from `user`, `member`, `trainer`, `staff` and infer role.
- Modify: `server/src/routes/auth.ts` - insert registering members into `user` and `member`.
- Modify: all route files in `server/src/routes/*.ts` - replace old table/column references with new table/column names and aliases.
- Modify: `server/src/workflowRules.ts` only if status values need title-case compatibility.
- Modify: `server/tests/*.test.ts` - update fixtures/expectations for the new schema and role model.

### Task 1: Schema And Config

**Files:**
- Modify: `database/schema.sql`
- Modify: `database/sample-data.sql`
- Modify: `server/.env`
- Modify: `server/src/db.ts`
- Test: `server/tests/auth.test.ts`

- [ ] **Step 1: Replace schema with the provided model plus staff**

Use `gym_management.sql` as the base for `database/schema.sql`. Add this table after `trainer` and before the final SQL restore statements:

```sql
CREATE TABLE IF NOT EXISTS `staff` (
  `UserID` int(11) NOT NULL,
  `Position` varchar(100) DEFAULT 'Admin',
  `HireDate` date NOT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
```

Add a staff seed user after the existing `user` inserts:

```sql
INSERT INTO `user` (`UserID`, `Username`, `PasswordHash`, `FullName`, `Email`, `Phone`, `Status`, `CreatedAt`) VALUES
  (5, 'admin1', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Admin User', 'admin@example.com', '0500000000', 'Active', '2026-01-01 08:00:00');

INSERT INTO `staff` (`UserID`, `Position`, `HireDate`) VALUES
  (5, 'Admin', '2026-01-01');
```

The bcrypt hash above matches the existing test/demo password used by the current seed data.

- [ ] **Step 2: Change database config**

Set `server/.env`:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gym_management
```

Change `server/src/db.ts` line 9 to:

```ts
database: process.env.DB_NAME ?? 'gym_management',
```

- [ ] **Step 3: Make sample-data compatible**

Replace `database/sample-data.sql` with:

```sql
USE gym_management;

-- The canonical seed data lives in database/schema.sql because the provided
-- dump includes data. Keep this file valid for scripts that execute it.
```

- [ ] **Step 4: Run build to expose compile failures**

Run: `npm run build --workspace server`

Expected: FAIL until route migration tasks are complete, with errors pointing at old table assumptions or type mismatches.

- [ ] **Step 5: Commit**

```bash
git add database/schema.sql database/sample-data.sql server/.env server/src/db.ts
git commit -m "feat(db): adopt gym_management schema"
```

### Task 2: Auth Role Inference

**Files:**
- Modify: `server/src/types.ts`
- Modify: `server/src/auth.ts`
- Modify: `server/src/routes/auth.ts`
- Test: `server/tests/auth.test.ts`

- [ ] **Step 1: Update user type expectations**

Change `server/src/types.ts` to keep the current frontend contract:

```ts
export type Role = 'admin' | 'trainer' | 'member';

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

- [ ] **Step 2: Update auth SQL**

In `server/src/auth.ts`, replace the user lookup SQL in both `findDemoUser` and `findPublicUserById` with aliases over the new schema:

```sql
SELECT u.UserID AS user_id,
       u.Username AS username,
       u.PasswordHash AS password_hash,
       u.FullName AS full_name,
       u.Email AS email,
       LOWER(u.Status) AS status,
       CASE
         WHEN st.UserID IS NOT NULL THEN 'admin'
         WHEN t.UserID IS NOT NULL THEN 'trainer'
         WHEN m.UserID IS NOT NULL THEN 'member'
       END AS role,
       m.UserID AS member_id,
       t.UserID AS trainer_id
  FROM `user` u
  LEFT JOIN staff st ON st.UserID = u.UserID
  LEFT JOIN trainer t ON t.UserID = u.UserID
  LEFT JOIN member m ON m.UserID = u.UserID
 WHERE u.Username = ?
 LIMIT 1
```

For `findPublicUserById`, use `WHERE u.UserID = ?`.

- [ ] **Step 3: Reject users without a subtype**

After each lookup, return `null` when `role` is null:

```ts
const user = rows[0] ?? null;
return user?.role ? user : null;
```

- [ ] **Step 4: Update member registration**

In `server/src/routes/auth.ts`, change inserts to:

```ts
const [userResult] = await connection.query<ResultSetHeader>(
  `INSERT INTO \`user\` (Username, PasswordHash, FullName, Email, Phone, Status, CreatedAt)
   VALUES (?, ?, ?, ?, ?, 'Active', NOW())`,
  [username, passwordHash, fullName, email, phone]
);
const userId = userResult.insertId;
await connection.query<ResultSetHeader>(
  'INSERT INTO member (UserID, Gender, JoinDate) VALUES (?, ?, CURRENT_DATE)',
  [userId, gender]
);
```

Set the response member ID to `userId` because `member.UserID` is the member key.

- [ ] **Step 5: Run auth tests**

Run: `npm run test --workspace server -- auth.test.ts`

Expected: PASS after test fixtures are adjusted to load the new schema.

- [ ] **Step 6: Commit**

```bash
git add server/src/types.ts server/src/auth.ts server/src/routes/auth.ts server/tests/auth.test.ts
git commit -m "feat(auth): infer roles from user subtypes"
```

### Task 3: Read Routes Migration

**Files:**
- Modify: `server/src/routes/members.ts`
- Modify: `server/src/routes/trainers.ts`
- Modify: `server/src/routes/plans.ts`
- Modify: `server/src/routes/payments.ts`
- Modify: `server/src/routes/dashboard.ts`
- Test: `server/tests/adminWorkflows.test.ts`

- [ ] **Step 1: Update members query**

Use this query in `members.ts`:

```sql
SELECT m.UserID AS member_id,
       m.Gender AS gender,
       m.JoinDate AS join_date,
       u.UserID AS user_id,
       u.FullName AS full_name,
       u.Email AS email,
       u.Phone AS phone,
       LOWER(u.Status) AS status
  FROM member m
  JOIN `user` u ON u.UserID = m.UserID
 ORDER BY m.UserID
```

- [ ] **Step 2: Update trainers query**

Use this query in `trainers.ts`:

```sql
SELECT t.UserID AS trainer_id,
       t.Specialty AS specialty,
       t.HireDate AS hire_date,
       u.UserID AS user_id,
       u.FullName AS full_name,
       u.Email AS email,
       u.Phone AS phone,
       LOWER(u.Status) AS status
  FROM trainer t
  JOIN `user` u ON u.UserID = t.UserID
 ORDER BY t.UserID
```

- [ ] **Step 3: Update plans query and writes**

Map `membershipplan` columns:

```sql
SELECT PlanID AS plan_id,
       PlanName AS plan_name,
       DurationMonths AS duration_months,
       Price AS price,
       Description AS description
  FROM membershipplan
 ORDER BY PlanID
```

Write statements use `PlanName`, `DurationMonths`, `Price`, and `Description`.

- [ ] **Step 4: Update payments query**

Use `payment`, `subscription`, `membershipplan`, `member`, and `user`, aliasing response fields to the current JSON names.

- [ ] **Step 5: Update dashboard counts**

Replace old count tables with `user`, `member`, `trainer`, `staff`, `membershipplan`, `subscription`, `payment`, `session`, `booking`, and `attendance`.

- [ ] **Step 6: Run admin workflow tests**

Run: `npm run test --workspace server -- adminWorkflows.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/members.ts server/src/routes/trainers.ts server/src/routes/plans.ts server/src/routes/payments.ts server/src/routes/dashboard.ts server/tests/adminWorkflows.test.ts
git commit -m "refactor(routes): read from gym schema"
```

### Task 4: Session And Booking Migration

**Files:**
- Modify: `server/src/routes/sessions.ts`
- Modify: `server/src/routes/bookings.ts`
- Modify: `server/src/workflowRules.ts`
- Test: `server/tests/memberWorkflows.test.ts`
- Test: `server/tests/workflowRoutes.test.ts`

- [ ] **Step 1: Map session fields**

Use `session.SessionTitle` as the app `session_type` when the frontend expects one display name. Return both title and type where helpful:

```sql
SELECT s.SessionID AS session_id,
       s.TrainerUserID AS trainer_id,
       s.SessionTitle AS session_title,
       s.SessionType AS session_type,
       s.SessionDate AS session_date,
       s.StartTime AS start_time,
       s.EndTime AS end_time,
       s.Capacity AS capacity,
       LOWER(s.Status) AS status,
       u.FullName AS trainer_name,
       t.Specialty AS trainer_specialty
  FROM `session` s
  JOIN trainer t ON t.UserID = s.TrainerUserID
  JOIN `user` u ON u.UserID = t.UserID
```

- [ ] **Step 2: Update session writes**

Insert and update `session` using `TrainerUserID`, `SessionTitle`, `SessionType`, `SessionDate`, `StartTime`, `EndTime`, `Capacity`, and `Status`.

- [ ] **Step 3: Update booking logic**

Replace `bookings` with `booking`. Use `MemberUserID`, `SessionID`, `BookingDate`, and `BookingStatus`. Treat active bookings as statuses `Confirmed` and `Booked` during reads:

```sql
WHERE BookingStatus IN ('Confirmed', 'Booked')
```

For new bookings, insert status `Confirmed`.

- [ ] **Step 4: Update active subscription checks**

Use `subscription.MemberUserID`, `subscription.PlanID`, `membershipplan.PlanName`, `StartDate`, `EndDate`, and `Status = 'Active'`.

- [ ] **Step 5: Run member workflow tests**

Run: `npm run test --workspace server -- memberWorkflows.test.ts workflowRoutes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/sessions.ts server/src/routes/bookings.ts server/src/workflowRules.ts server/tests/memberWorkflows.test.ts server/tests/workflowRoutes.test.ts
git commit -m "refactor(routes): migrate sessions and bookings"
```

### Task 5: Subscription And Attendance Migration

**Files:**
- Modify: `server/src/routes/subscriptions.ts`
- Modify: `server/src/routes/attendance.ts`
- Test: `server/tests/trainerWorkflows.test.ts`
- Test: `server/tests/workflows.test.ts`

- [ ] **Step 1: Update subscriptions**

Use `subscription` with aliases. Since the new schema has no pending approval metadata, keep statuses as `Pending`, `Active`, `Expired`, and `Cancelled`; activation updates only `Status`.

- [ ] **Step 2: Update attendance reads**

Join attendance through booking:

```sql
SELECT a.AttendanceID AS attendance_id,
       b.MemberUserID AS member_id,
       b.SessionID AS session_id,
       a.MarkedByTrainerUserID AS marked_by_trainer_id,
       LOWER(a.AttendanceStatus) AS attendance_status,
       a.MarkedAt AS marked_at
  FROM attendance a
  JOIN booking b ON b.BookingID = a.BookingID
```

- [ ] **Step 3: Update attendance marking**

Look up the booking ID first:

```sql
SELECT BookingID
  FROM booking
 WHERE SessionID = ?
   AND MemberUserID = ?
   AND BookingStatus IN ('Confirmed', 'Booked')
 LIMIT 1
```

Then upsert by unique `BookingID`:

```sql
INSERT INTO attendance (BookingID, MarkedByTrainerUserID, AttendanceStatus, MarkedAt)
VALUES (?, ?, ?, NOW())
ON DUPLICATE KEY UPDATE MarkedByTrainerUserID = VALUES(MarkedByTrainerUserID),
                        AttendanceStatus = VALUES(AttendanceStatus),
                        MarkedAt = NOW()
```

- [ ] **Step 4: Run trainer workflow tests**

Run: `npm run test --workspace server -- trainerWorkflows.test.ts workflows.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/subscriptions.ts server/src/routes/attendance.ts server/tests/trainerWorkflows.test.ts server/tests/workflows.test.ts
git commit -m "refactor(routes): migrate subscriptions attendance"
```

### Task 6: Final Verification

**Files:**
- Modify: any remaining files that still reference old schema names.

- [ ] **Step 1: Search for old table names**

Run: `rg "\b(users|members|trainers|membership_plans|subscriptions|payments|sessions|bookings)\b" server/src server/tests database`

Expected: no old table references except comments explaining the migration or frontend response property names.

- [ ] **Step 2: Run full server tests**

Run: `npm run test --workspace server`

Expected: PASS.

- [ ] **Step 3: Run TypeScript build**

Run: `npm run build --workspace server`

Expected: PASS.

- [ ] **Step 4: Commit final cleanup**

```bash
git add server database
git commit -m "test: verify gym schema migration"
```
