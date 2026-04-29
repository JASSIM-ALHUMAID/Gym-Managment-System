# Gym Management System

Role-based web app for managing gym members, trainers, plans, subscriptions, payments, sessions, bookings, and attendance.

## Requirements

- Node.js 20+
- npm
- MySQL 8+

## Database Setup

Create and seed the MySQL 8 database from the repository root. The schema resets the database, so this will delete and recreate `gym_management_system`:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p gym_management_system < database/sample-data.sql
```

These commands work in Bash or Git Bash. On Windows PowerShell, either run them from Git Bash or import the files through the MySQL shell/client, for example:

```sql
SOURCE database/schema.sql;
USE gym_management_system;
SOURCE database/sample-data.sql;
```

The schema script creates `gym_management_system`. The seed script inserts users with real bcrypt password hashes, plans, members, trainers, subscriptions, payments, sessions, bookings, and attendance records. If your MySQL user is not `root`, import the same files with a user that has permission to create databases and insert data.

## App Setup

```bash
cp .env.example server/.env
npm install
npm run install:all
npm run dev
```

Edit `server/.env` before starting the app if your MySQL `root` user has a password or if you use another MySQL account.

Frontend: http://localhost:5173

Backend: http://localhost:4000

Useful verification commands:

```bash
npm run build
npm test
```

## Authentication

This project uses username/password authentication with backend-issued JWT bearer tokens. Passwords in the seed data are bcrypt hashes. The frontend stores the token in browser storage for local development convenience and clears auth state on unauthorized API responses.

## Seeded Users

All seeded active users use this password:

```text
password123
```

- admin1
- staff1
- trainer_ahmed
- trainer_lina
- member_omar
- member_noor
- member_sara
- member_faisal

`member_faisal` is seeded as inactive and is expected to be rejected by login.

Members can also create a new account from the Register tab on the login page.

## Demo Walkthrough

After loading the database and running `npm run dev`, use the frontend login page to verify the main role workflows:

- `admin1`: create/update plans and sessions, activate/cancel subscriptions, and view operational tables.
- `staff1`: use the same operational controls as admin for now.
- `trainer_ahmed`: view upcoming/completed sessions, mark attendance, and review attendance history.
- `member_omar`: compare plans, request a subscription, view sessions with trainer details, and book/cancel sessions when an active subscription exists.

Known local verification limitation: this repository requires a local MySQL client/server for database import and full browser workflow testing. If `mysql` is not installed or credentials are unknown, the build and automated workflow tests can still be run, but end-to-end data-backed walkthroughs must be completed on a machine with MySQL configured.
