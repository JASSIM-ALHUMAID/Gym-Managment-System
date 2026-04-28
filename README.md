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

The schema script creates `gym_management_system_v2`. The seed script inserts demo users, plans, members, trainers, subscriptions, payments, sessions, bookings, and attendance records.

If your MySQL user is not `root`, import the same files with a user that has permission to create databases and insert data. Then copy `.env.example` to `server/.env` and update the database credentials:

```bash
cp .env.example server/.env
```

## App Setup

```bash
npm install
npm run install:all
npm run dev
```

Frontend: http://localhost:5173

Backend: http://localhost:4000

Useful verification commands:

```bash
npm run build
npm test
```

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
