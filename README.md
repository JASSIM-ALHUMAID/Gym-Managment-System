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
