# Gym Management Web App Design

## Goal

Build a role-based web application for the Gym Membership and Training Management System using the existing MySQL schema and sample data. The app should demonstrate core gym operations through a React TypeScript frontend, a TypeScript API backend, and MySQL persistence.

## Current Project Context

The project currently contains:

- `schema-v2.sql`: MySQL schema for users, members, trainers, membership plans, subscriptions, payments, sessions, bookings, and attendance.
- `sample-data-v2.sql`: Seed data for demo users, plans, subscriptions, sessions, bookings, payments, and attendance.
- `Gym Management System.pdf`: project proposal and ER diagram.

The implementation should preserve this schema unless a clear blocker appears. SQL files can be moved into a `database/` directory for project organization, but their table structure should remain the source of truth.

## Recommended Package Manager

Use `npm`.

`npm` is included with Node.js, is the easiest option for instructors and classmates to run, and avoids requiring additional package manager setup. `pnpm` is strong for larger projects, but this course project benefits more from default tooling. Bun is not recommended because backend/MySQL compatibility and evaluator setup are less predictable.

## Architecture

Use a monorepo-style project with a separate frontend and backend:

- `client/`: React + TypeScript application.
- `server/`: Express + TypeScript API.
- `database/`: MySQL schema and sample data.

The frontend never connects directly to MySQL. All database access goes through the backend API. The backend owns validation, role checks, and workflow rules such as booking capacity and attendance creation.

## Technology Stack

- Frontend: React, TypeScript, Vite, React Router.
- Backend: Node.js, Express, TypeScript, MySQL driver.
- Database: MySQL using the existing schema.
- Package manager: npm.
- Authentication: demo login for seeded users.

## Authentication And Roles

The first version uses demo login, not production password authentication.

The login screen should let a user choose or enter one of the seeded demo accounts. After login, the frontend stores the selected user in local application state or browser storage and sends the user identity to the API for demo role checks. This is acceptable for the course demo because the goal is to demonstrate database-backed workflows, not production security.

Supported roles:

- `admin`: full access to all management pages.
- `staff`: operational access to members, trainers, plans, subscriptions, payments, sessions, bookings, and attendance.
- `trainer`: access to assigned sessions and attendance marking.
- `member`: access to available plans, own subscription/payment summary, session browsing, and booking actions.

## Frontend Design

The app should use a practical dashboard layout with role-aware navigation.

Shared screens:

- Login page.
- Dashboard shell with top navigation or sidebar.
- Not found/unauthorized state.

Admin/staff screens:

- Overview dashboard with counts for active members, active subscriptions, scheduled sessions, and pending/failed payments.
- Users and members list.
- Trainers list.
- Membership plans management.
- Subscriptions management.
- Payments management.
- Sessions management.
- Bookings list.
- Attendance list.

Trainer screens:

- Assigned sessions.
- Session attendance page for marking members as present, absent, or late.

Member screens:

- Member dashboard with subscription/payment summary.
- Available sessions list.
- Booked sessions list with cancel action.
- Membership plans list.

## Backend API Design

The backend should expose JSON endpoints grouped by resource and workflow.

Suggested endpoint groups:

- `/api/auth/demo-login`: returns a seeded user profile by selected username or user id.
- `/api/dashboard`: returns role-appropriate summary data.
- `/api/users`: list users and read user details.
- `/api/members`: list, create, update, and deactivate member-related records.
- `/api/trainers`: list, create, and update trainer-related records.
- `/api/plans`: list, create, update, and delete membership plans when no restricted records block deletion.
- `/api/subscriptions`: list, create, update status, and read subscription details.
- `/api/payments`: list and create payment records.
- `/api/sessions`: list, create, update, cancel, and complete sessions.
- `/api/bookings`: list, create booking, and cancel booking.
- `/api/attendance`: list and mark attendance.

The first implementation can keep role checks simple but explicit. API handlers should reject actions that do not match the current user's role.

## Data Flow

Login flow:

1. User selects a demo account.
2. Frontend calls `/api/auth/demo-login`.
3. Backend reads the user from MySQL and returns basic profile data.
4. Frontend routes to the dashboard for that role.

Booking flow:

1. Member views scheduled sessions.
2. Member selects a session.
3. Backend checks that the session exists, is scheduled, has not exceeded capacity, and is not already booked by that member.
4. Backend inserts a `bookings` row with `booking_status = 'booked'`.
5. Frontend refreshes available and booked sessions.

Attendance flow:

1. Trainer opens an assigned session.
2. Backend returns booked members for that session.
3. Trainer marks each member as present, absent, or late.
4. Backend inserts or updates one attendance row per member/session pair.

Payment/subscription flow:

1. Staff/admin creates a subscription for a member and plan.
2. Staff/admin records a payment for the subscription.
3. Dashboard and member views show subscription and payment status.

## Validation And Error Handling

Backend validation should protect database constraints before insert/update when practical:

- Required fields must be present.
- Dates must be valid and subscription end dates must not be before start dates.
- Session end time must be after start time.
- Capacity must be greater than zero.
- Payment amount must be greater than zero.
- Booking should fail when the session is full or already booked by the same member.
- Attendance should only be marked by the assigned trainer or by admin/staff.

Errors should return JSON with a stable shape:

```json
{
  "error": "Human readable message"
}
```

Frontend pages should show loading, empty, and error states for each resource list.

## Testing And Verification

Minimum verification for the first version:

- Backend starts and connects to MySQL.
- Frontend starts and can call the backend.
- Demo login works for admin, staff, trainer, and member sample users.
- Admin/staff can view and manage core records.
- Member can book and cancel a session.
- Trainer can mark attendance.
- Staff/admin can record a subscription and payment.

Automated tests should focus on backend workflow rules first, especially booking capacity, duplicate booking prevention, and attendance marking. Frontend verification can start with manual role walkthroughs unless time allows component or integration tests.

## Project Setup Expectations

The final project should include clear setup documentation:

- Install dependencies with `npm install` in the required project folders.
- Create the MySQL database from `schema-v2.sql`.
- Load sample data from `sample-data-v2.sql`.
- Configure backend database credentials through an `.env` file.
- Start backend and frontend development servers.

The repository should include an `.env.example` but not commit real credentials.

## Out Of Scope For First Version

- Production password authentication and password reset.
- Online payment provider integration.
- Email or SMS notifications.
- Advanced analytics dashboards.
- Mobile app implementation.
- Schema redesign unrelated to current web app requirements.

## Open Decisions Resolved

- Use npm instead of pnpm or Bun.
- Use React TypeScript for the frontend.
- Use TypeScript for the backend API.
- Use MySQL as the database.
- Implement all roles in the first version.
- Use demo login.
- Prioritize core CRUD plus workflows.
