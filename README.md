# Gym Management System — Pulse Studio

Full-stack role-based web app for managing gym members, trainers, staff, membership plans, subscriptions, payments, sessions, bookings, and attendance.

Built for the ICS 321 project — a complete operational dashboard with three role-specific workspaces.

## Project Status

- **Database**: MySQL schema with 10 tables, CHECK constraints, foreign keys, and seeded demo data
- **Backend**: Express.js REST API (TypeScript) with JWT auth, role middleware, workflow rules, and 69 unit tests
- **Frontend**: React SPA (TypeScript, Vite) with role-based routing and command-style UI
- **Testing**: Vitest — 7 test files covering auth, admin/member/trainer workflows, schema constraints, and route integration
- **Brand**: Pulse Studio — all dashboards styled with a command-terminal aesthetic

## Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Frontend | React 19, TypeScript, Vite, React Router DOM 7 |
| Backend  | Express.js 4, TypeScript, tsx (watch mode)    |
| Database | MySQL (mysql2 driver)                   |
| Auth     | bcryptjs + JSON Web Tokens              |
| Testing  | Vitest + Supertest                      |

## Project Structure

```
gym-management-system/
├── client/                       # React SPA (Vite)
│   └── src/
│       ├── api.ts                # Typed API client with JWT
│       ├── App.tsx               # Role-based routing + Shell layout
│       ├── auth.tsx              # Auth provider (login, register, logout)
│       ├── main.tsx              # Entry point
│       ├── styles.css            # Command-terminal UI theme
│       └── pages/
│           ├── LandingPage.tsx    # Public landing with live stats
│           ├── LoginPage.tsx      # Login/register with quick demo selector
│           ├── AdminDashboard.tsx # 8-tab admin workspace
│           ├── TrainerDashboard.tsx # Sessions + attendance marking
│           ├── MemberDashboard.tsx  # Plans, bookings, payments
│           └── ResourceTable.tsx    # Reusable data table component
├── server/                       # Express REST API
│   └── src/
│       ├── index.ts             # App setup, route mounting
│       ├── auth.ts              # JWT middleware (requireDemoUser, requireRole)
│       ├── db.ts                # MySQL connection pool
│       ├── http.ts              # Error handling utilities
│       ├── types.ts             # Shared type definitions
│       ├── workflowRules.ts     # Booking/attendance business logic
│       └── routes/
│           ├── auth.ts          # Login + member registration
│           ├── dashboard.ts     # Admin counts + public stats
│           ├── users.ts         # User CRUD + status management
│           ├── members.ts       # Member profiles
│           ├── trainers.ts      # Trainer CRUD
│           ├── plans.ts         # Plan CRUD
│           ├── subscriptions.ts # Request/approve/cancel subscriptions
│           ├── payments.ts      # Payment status management
│           ├── sessions.ts      # Session CRUD + status changes
│           ├── bookings.ts      # Book/cancel sessions
│           └── attendance.ts    # Mark + view attendance
├── database/
│   ├── schema.sql               # Full schema with constraints
│   └── seed.sql                 # Demo data (17 users, plans, etc.)
├── docs/                        # Project documentation
└── package.json                 # Root workspace scripts
```

## Setup

```bash
# 1. Create the MySQL database
mysql -u root < database/schema.sql

# 2. Seed demo data
mysql -u root < database/seed.sql

# 3. Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# 4. Install dependencies
npm run install:all

# 5. Start dev servers (backend :4000, frontend :5173)
npm run dev
```

### Demo Accounts

All use password `password123`:

| Username    | Role    | Full Name         |
| ----------- | ------- | ----------------- |
| `admin1`    | Admin   | Admin User        |
| `khalid_t`  | Trainer | Khalid Al-Saadi   |
| `nora_t`    | Trainer | Nora Al-Ghamdi    |
| `ahmed_m`   | Member  | Ahmed Mohammed    |
| `sara_a`    | Member  | Sara Ali          |

## Role Dashboards

### Admin (`/admin`)

8-tab workspace: Overview, Users, Members, Trainers, Plans, Sessions, Payments, Reports.

- Key metrics cards (active members, open payments, etc.)
- Manage user status (activate/deactivate/suspend)
- Create/update membership plans and sessions
- Approve/reject subscription requests (triggers payment creation)
- Mark payments paid (activates subscription, cancels other active subs)
- Manage trainer accounts
- View attendance reports

### Trainer (`/trainer`)

- View upcoming and completed assigned sessions
- Select a session, load booked members, mark attendance (present/absent/late)
- Attendance history view

### Member (`/member`)

- Overview: active subscription, pending requests, latest payment, booking count
- Browse plans and request a subscription (admin must approve + mark paid)
- View and book scheduled sessions (requires active subscription with paid payment)
- Cancel own bookings

## Database Schema

The implemented database schema is defined in `database/schema.sql`. Sample data is separated into `database/seed.sql` and should be run after the schema when demo accounts and sample workflows are needed. The schema follows the original relational model in `Gym-Management-System-Relational-Model.pdf`, with one practical extension: a `staff` table used to identify administrator accounts.

Current tables:

- `user`
- `member`
- `trainer`
- `staff`
- `membershipplan`
- `subscription`
- `payment`
- `session`
- `booking`
- `attendance`

Roles are derived from subtype tables instead of a `role` column:

- A row in `staff` means the user is an `admin`.
- A row in `trainer` means the user is a `trainer`.
- A row in `member` means the user is a `member`.

The seeded admin account is created by inserting user `admin1` into `user`, then linking it through `staff`.

The database also uses `CHECK` constraints for core data integrity:

- `user.Status` must be `Active`, `Inactive`, or `Suspended`.
- `subscription.Status` must be `Pending`, `Active`, or `Cancelled`.
- `payment.PaymentStatus` must be `Pending`, `Paid`, or `Failed`.
- `session.Status` must be `Scheduled`, `Completed`, or `Cancelled`.
- `booking.BookingStatus` must be `Confirmed`, `Booked`, or `Cancelled`.
- `attendance.AttendanceStatus` must be `Present`, `Absent`, or `Late`.
- `membershipplan.DurationMonths`, `membershipplan.Price`, `payment.Amount`, and `session.Capacity` must be greater than `0`.
- `session.EndTime` must be after `session.StartTime`.

## Functionality and Queries

### Login

Authenticates an active user by username, derives the user's role from `staff`, `trainer`, or `member`, then verifies the bcrypt password before issuing a JWT.

Seeded demo accounts use password `password123`:

- `admin1` / `password123`
- `ahmed_m` / `password123`
- `sara_a` / `password123`
- `khalid_t` / `password123`
- `nora_t` / `password123`

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
 LIMIT 1;
```

### Member Registration

Creates a new active member account in one transaction by inserting the user record first, then inserting the matching member profile.

```sql
INSERT INTO `user` (Username, PasswordHash, FullName, Email, Phone, Status, CreatedAt)
VALUES (?, ?, ?, ?, ?, 'Active', NOW());

INSERT INTO member (UserID, Gender, JoinDate)
VALUES (?, ?, CURRENT_DATE);
```

### Admin Dashboard Counts

Shows high-level gym metrics for admins: users, members, trainers, staff, plans, subscriptions, payments, sessions, bookings, attendance, active members, active subscriptions, scheduled sessions, and pending or failed payments.

```sql
SELECT COUNT(*) AS count FROM `user`;
SELECT COUNT(*) AS count FROM member;
SELECT COUNT(*) AS count FROM trainer;
SELECT COUNT(*) AS count FROM staff;
SELECT COUNT(*) AS count FROM membershipplan;
SELECT COUNT(*) AS count FROM subscription;
SELECT COUNT(*) AS count FROM payment;
SELECT COUNT(*) AS count FROM session;
SELECT COUNT(*) AS count FROM booking;
SELECT COUNT(*) AS count FROM attendance;
SELECT COUNT(*) AS count FROM `user` u JOIN member m ON m.UserID = u.UserID WHERE u.Status = 'Active';
SELECT COUNT(*) AS count FROM subscription WHERE Status = 'Active';
SELECT COUNT(*) AS count FROM session WHERE Status = 'Scheduled';
SELECT COUNT(*) AS count FROM payment WHERE PaymentStatus IN ('Pending', 'Failed');
```

### Membership Plans

Lists available plans for authenticated users. Admins can also create, update, and delete plans.

```sql
SELECT PlanID AS plan_id,
       PlanName AS plan_name,
       DurationMonths AS duration_months,
       Price AS price,
       Description AS description
  FROM membershipplan
 ORDER BY PlanID;
```

Create plan query:

```sql
INSERT INTO membershipplan (PlanName, DurationMonths, Price, Description)
VALUES (?, ?, ?, ?);
```

Update plan query:

```sql
UPDATE membershipplan
   SET PlanName = ?, DurationMonths = ?, Price = ?, Description = ?
 WHERE PlanID = ?;
```

Delete plan query:

```sql
DELETE FROM membershipplan WHERE PlanID = ?;
```

### Members

Allows admins to view member profiles with their linked user contact and account status information.

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
 ORDER BY m.UserID;
```

### Trainers

Allows admins and members to view trainers. Member responses hide trainer email and phone in the API response.

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
 ORDER BY t.UserID;
```

### Users

Allows admins to view all user accounts without exposing password hashes. The role is derived from `staff`, `trainer`, and `member`.

```sql
SELECT u.UserID AS user_id,
       u.Username AS username,
       CASE
         WHEN st.UserID IS NOT NULL THEN 'admin'
         WHEN t.UserID IS NOT NULL THEN 'trainer'
         WHEN m.UserID IS NOT NULL THEN 'member'
       END AS role,
       u.FullName AS full_name,
       u.Email AS email,
       u.Phone AS phone,
       LOWER(u.Status) AS status,
       u.CreatedAt AS created_at
  FROM `user` u
  LEFT JOIN staff st ON st.UserID = u.UserID
  LEFT JOIN trainer t ON t.UserID = u.UserID
  LEFT JOIN member m ON m.UserID = u.UserID
 ORDER BY u.UserID;
```

### Staff/Admin

The `staff` table links administrator users to the base `user` table.

```sql
CREATE TABLE IF NOT EXISTS staff (
  UserID int(11) NOT NULL,
  Position varchar(100) DEFAULT 'Admin',
  HireDate date NOT NULL,
  PRIMARY KEY (UserID),
  CONSTRAINT fk_staff_user FOREIGN KEY (UserID) REFERENCES `user` (UserID) ON DELETE CASCADE ON UPDATE CASCADE
);
```

Seeded admin account:

```sql
INSERT INTO `user` (UserID, Username, PasswordHash, FullName, Email, Phone, Status, CreatedAt)
VALUES (1, 'admin1', '$2b$10$NSMGGSD4LluqeEigu0KBrODaptsU/aI77GHY9OEBM4S9twTifGR4y', 'Admin User', 'admin@gymsys.local', '0500000000', 'Active', '2026-01-01 08:00:00');

INSERT INTO staff (UserID, Position, HireDate)
VALUES (1, 'Admin', '2026-01-01');
```

### Subscriptions

Members view only their own subscriptions, while admins view all subscriptions with plan and member details.

```sql
SELECT s.SubscriptionID AS subscription_id,
       s.MemberUserID AS member_id,
       s.MemberUserID AS member_user_id,
       s.PlanID AS plan_id,
       s.StartDate AS start_date,
       s.EndDate AS end_date,
       LOWER(s.Status) AS status,
       p.PlanName AS plan_name,
       p.DurationMonths AS duration_months,
       p.Price AS price
  FROM subscription s
  JOIN membershipplan p ON p.PlanID = s.PlanID
 WHERE s.MemberUserID = ?
 ORDER BY s.StartDate DESC;
```

Admin subscription query:

```sql
SELECT s.SubscriptionID AS subscription_id,
       s.MemberUserID AS member_id,
       s.PlanID AS plan_id,
       s.StartDate AS start_date,
       s.EndDate AS end_date,
       LOWER(s.Status) AS status,
       p.PlanName AS plan_name,
       p.DurationMonths AS duration_months,
       p.Price AS price,
       u.UserID AS member_user_id,
       u.FullName AS member_name,
       u.Email AS member_email
  FROM subscription s
  JOIN membershipplan p ON p.PlanID = s.PlanID
  JOIN member m ON m.UserID = s.MemberUserID
  JOIN `user` u ON u.UserID = m.UserID
 ORDER BY s.StartDate DESC;
```

Request subscription query:

```sql
INSERT INTO subscription (MemberUserID, PlanID, StartDate, EndDate, Status)
VALUES (?, ?, ?, ?, 'Pending');
```

Approve subscription query:

Approving a pending subscription creates a pending payment for the plan price. The subscription remains pending until that payment is marked paid.

```sql
INSERT INTO payment (SubscriptionID, Amount, PaymentDate, PaymentMethod, PaymentStatus)
VALUES (?, ?, CURDATE(), NULL, 'Pending');
```

Cancel subscription query:

```sql
UPDATE subscription
   SET Status = 'Cancelled'
 WHERE SubscriptionID = ?;
```

### Payments

Members view payments for their own subscriptions, while admins view all payments with subscription, plan, and member details. Payments are manual records; there is no payment gateway integration.

When an admin marks a payment as paid, the system activates the related pending subscription and cancels the member's other active subscriptions:

```sql
UPDATE payment
   SET PaymentStatus = 'Paid', PaymentMethod = ?
 WHERE PaymentID = ?;

UPDATE subscription
   SET Status = 'Cancelled'
 WHERE MemberUserID = ? AND SubscriptionID <> ? AND Status = 'Active';

UPDATE subscription
   SET Status = 'Active'
 WHERE SubscriptionID = ? AND Status = 'Pending';
```

Failed payments remain attached to the pending subscription so staff can retry or update the payment later.

Members can book sessions only after a subscription is active and has a paid payment.

```sql
SELECT pay.PaymentID AS payment_id,
       pay.SubscriptionID AS subscription_id,
       pay.Amount AS amount,
       pay.PaymentDate AS payment_date,
       pay.PaymentMethod AS payment_method,
       LOWER(pay.PaymentStatus) AS payment_status,
       s.Status AS subscription_status,
       p.PlanID AS plan_id,
       p.PlanName AS plan_name
  FROM payment pay
  JOIN subscription s ON s.SubscriptionID = pay.SubscriptionID
  JOIN membershipplan p ON p.PlanID = s.PlanID
 WHERE s.MemberUserID = ?
 ORDER BY pay.PaymentDate DESC;
```

Admin payments query:

```sql
SELECT pay.PaymentID AS payment_id,
       pay.SubscriptionID AS subscription_id,
       pay.Amount AS amount,
       pay.PaymentDate AS payment_date,
       pay.PaymentMethod AS payment_method,
       LOWER(pay.PaymentStatus) AS payment_status,
       s.Status AS subscription_status,
       p.PlanID AS plan_id,
       p.PlanName AS plan_name,
       m.UserID AS member_id,
       u.FullName AS member_name,
       u.Email AS member_email
  FROM payment pay
  JOIN subscription s ON s.SubscriptionID = pay.SubscriptionID
  JOIN membershipplan p ON p.PlanID = s.PlanID
  JOIN member m ON m.UserID = s.MemberUserID
  JOIN `user` u ON u.UserID = m.UserID
 ORDER BY pay.PaymentDate DESC;
```

### Sessions

Shows sessions with trainer details and current booked count. Non-admin users only see scheduled sessions; admins can view all sessions.

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
       t.Specialty AS trainer_specialty,
       COALESCE(booked.booked_count, 0) AS booked_count
  FROM `session` s
  JOIN trainer t ON t.UserID = s.TrainerUserID
  JOIN `user` u ON u.UserID = t.UserID
  LEFT JOIN (
    SELECT SessionID, COUNT(*) AS booked_count
      FROM booking
     WHERE BookingStatus IN ('Confirmed', 'Booked')
     GROUP BY SessionID
  ) booked ON booked.SessionID = s.SessionID
 WHERE s.Status = 'Scheduled'
 ORDER BY s.SessionDate, s.StartTime;
```

Create session query:

```sql
INSERT INTO `session` (TrainerUserID, SessionTitle, SessionType, SessionDate, StartTime, EndTime, Capacity, Status)
VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled');
```

Update session query:

```sql
UPDATE `session`
   SET TrainerUserID = ?, SessionTitle = ?, SessionType = ?, SessionDate = ?, StartTime = ?, EndTime = ?, Capacity = ?
 WHERE SessionID = ?;
```

Update session status query:

```sql
UPDATE `session` SET Status = ? WHERE SessionID = ?;
```

### Bookings

Members view their own bookings, while admins view all bookings with member and trainer names.

```sql
SELECT b.BookingID AS booking_id,
       b.MemberUserID AS member_id,
       b.SessionID AS session_id,
       b.BookingDate AS booking_date,
       LOWER(b.BookingStatus) AS booking_status,
       s.SessionTitle AS session_title,
       s.SessionType AS session_type,
       s.SessionDate AS session_date,
       s.StartTime AS start_time,
       s.EndTime AS end_time,
       LOWER(s.Status) AS session_status,
       u.FullName AS trainer_name
  FROM booking b
  JOIN `session` s ON s.SessionID = b.SessionID
  JOIN trainer t ON t.UserID = s.TrainerUserID
  JOIN `user` u ON u.UserID = t.UserID
 WHERE b.MemberUserID = ?
 ORDER BY s.SessionDate DESC, s.StartTime DESC;
```

Create booking query:

```sql
INSERT INTO booking (MemberUserID, SessionID, BookingDate, BookingStatus)
VALUES (?, ?, CURDATE(), 'Confirmed');
```

Cancel booking query:

```sql
UPDATE booking
   SET BookingStatus = 'Cancelled'
 WHERE BookingID = ?;
```

### Attendance

Trainers can view and mark attendance for their sessions. Attendance is linked to a booking, and `BookingID` is unique so the same booking can only have one attendance record.

```sql
SELECT b.MemberUserID AS member_id,
       u.FullName AS member_name,
       u.Email AS member_email,
       a.AttendanceID AS attendance_id,
       LOWER(a.AttendanceStatus) AS attendance_status,
       a.MarkedByTrainerUserID AS marked_by_trainer_id,
       a.MarkedAt AS marked_at
  FROM booking b
  JOIN member m ON m.UserID = b.MemberUserID
  JOIN `user` u ON u.UserID = m.UserID
  LEFT JOIN attendance a ON a.BookingID = b.BookingID
 WHERE b.SessionID = ? AND b.BookingStatus IN ('Confirmed', 'Booked')
 ORDER BY u.FullName;
```

Mark attendance query:

```sql
INSERT INTO attendance (BookingID, MarkedByTrainerUserID, AttendanceStatus, MarkedAt)
VALUES (?, ?, ?, NOW())
ON DUPLICATE KEY UPDATE MarkedByTrainerUserID = VALUES(MarkedByTrainerUserID),
                        AttendanceStatus = VALUES(AttendanceStatus),
                        MarkedAt = NOW();

## API Endpoints

| Method | Path                          | Role     | Description                        |
| ------ | ----------------------------- | -------- | ---------------------------------- |
| POST   | `/api/auth/login`             | Public   | Authenticate + receive JWT         |
| POST   | `/api/auth/register`          | Public   | Register new member account        |
| GET    | `/api/dashboard`              | Admin    | Dashboard counts                   |
| GET    | `/api/dashboard/public-stats` | Public   | Landing page stats                 |
| GET    | `/api/users`                  | Admin    | List all users                     |
| PATCH  | `/api/users/:id/status`       | Admin    | Update user status                 |
| GET    | `/api/members`                | Admin    | List all members                   |
| GET    | `/api/trainers`               | All      | List trainers                      |
| POST   | `/api/trainers`               | Admin    | Create trainer account             |
| GET    | `/api/plans`                  | All      | List plans                         |
| POST   | `/api/plans`                  | Admin    | Create plan                        |
| PUT    | `/api/plans/:id`              | Admin    | Update plan                        |
| DELETE | `/api/plans/:id`              | Admin    | Delete plan                        |
| GET    | `/api/subscriptions`          | All      | List subscriptions (own or all)    |
| POST   | `/api/subscriptions/request`  | Member   | Request subscription               |
| PATCH  | `/api/subscriptions/:id/activate` | Admin | Approve + create payment         |
| PATCH  | `/api/subscriptions/:id/cancel`  | Admin | Cancel subscription              |
| GET    | `/api/payments`               | All      | List payments (own or all)         |
| PATCH  | `/api/payments/:id/status`    | Admin    | Mark paid/failed                   |
| GET    | `/api/sessions`               | All      | List sessions (filtered by role)   |
| POST   | `/api/sessions`               | Admin    | Create session                     |
| PUT    | `/api/sessions/:id`           | Admin    | Update session                     |
| PATCH  | `/api/sessions/:id/status`    | Admin    | Complete/cancel session            |
| GET    | `/api/bookings`               | All      | List bookings (own or all)         |
| POST   | `/api/bookings`               | Member   | Book session                       |
| PATCH  | `/api/bookings/:id/cancel`    | Member   | Cancel own booking                 |
| GET    | `/api/attendance/session/:id` | Trainer  | View attendance for session        |
| GET    | `/api/attendance/history`     | Trainer  | View own attendance history        |
| POST   | `/api/attendance`             | Trainer  | Mark individual attendance         |

## Tests

Run the test suite:

```bash
npm test --prefix server
```

Tests use Vitest with mocked MySQL connections. Coverage includes:

| Test file                   | Scope                                         |
| --------------------------- | --------------------------------------------- |
| `auth.test.ts`              | Login, registration, JWT issuance             |
| `adminWorkflows.test.ts`    | User/plan/session CRUD, payment/sub lifecycle |
| `memberWorkflows.test.ts`   | Registration, plan request, booking rules     |
| `trainerWorkflows.test.ts`  | Attendance marking, session filtering         |
| `schemaConstraints.test.ts` | CHECK constraints in schema.sql               |
| `workflowRoutes.test.ts`    | Route-level integration                       |
| `workflows.test.ts`         | End-to-end workflow scenarios                 |
```
