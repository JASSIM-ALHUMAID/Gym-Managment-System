# Gym Management System

Role-based web app for managing gym members, trainers, plans, subscriptions, payments, sessions, bookings, and attendance.

## Requirements

- Node.js 20+
- npm
- MySQL 8+

## Database Setup

Create and seed the MySQL 8 database from the repository root:

```bash
mysql -u root -p < database/schema-v2.sql
mysql -u root -p gym_management_system_v2 < database/sample-data-v2.sql
```

These commands work in Bash or Git Bash. On Windows PowerShell, either run them from Git Bash or import the files through the MySQL shell/client, for example:

```sql
SOURCE database/schema-v2.sql;
USE gym_management_system_v2;
SOURCE database/sample-data-v2.sql;
```

The schema script creates `gym_management_system_v2`. The seed script inserts demo users, plans, members, trainers, subscriptions, payments, sessions, bookings, and attendance records. If your MySQL user is not `root`, import the same files with a user that has permission to create databases and insert data.

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

## Demo Auth

This project uses demo-only authentication for local coursework review. The frontend stores the selected demo user and sends that identity to the API in the `x-demo-user-id` header. This is not production security and must not be used as real authentication or authorization outside the local demo environment.

## Demo Users

The app uses a username-only demo login selector. No password is required for demo access.

- admin1
- staff1
- trainer_ahmed
- trainer_lina
- member_omar
- member_noor
- member_sara
- member_faisal

`member_faisal` is seeded as inactive and is expected to be rejected by demo login.

## Demo Walkthrough

After loading the database and running `npm run dev`, use the frontend demo login selector to verify the main role workflows:

- `admin1`: view management tables for users, plans, members, trainers, subscriptions, payments, and sessions.
- `staff1`: view operational management records.
- `trainer_ahmed`: view assigned sessions and mark attendance.
- `member_omar`: view available sessions and book or cancel a session.

Known local verification limitation: this repository requires a local MySQL client/server for database import and full browser workflow testing. If `mysql` is not installed or credentials are unknown, the build and automated workflow tests can still be run, but end-to-end data-backed walkthroughs must be completed on a machine with MySQL configured.
