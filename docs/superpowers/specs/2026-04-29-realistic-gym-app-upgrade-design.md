# Realistic Gym App Upgrade Design

## Goal

Upgrade the current local gym management web app from a demo-header system into a more realistic application with password authentication, stronger role-based access, professional admin/staff controls, member subscription-aware booking, richer session/plan browsing, and improved trainer workflows.

## Scope Decisions

- Authentication will support both admin/staff-created accounts and member self-registration.
- Payments will not be processed in-app for this version. Members request subscription plans; admin/staff reviews and activates or cancels subscriptions.
- Members can book sessions only when they have an active subscription.
- Schema reset is allowed. Users will recreate the database from `database/schema.sql` and `database/sample-data.sql`.
- Admin and staff are treated as equivalent operational users for this version.

## Architecture

The existing architecture stays in place:

- React + TypeScript frontend in `client/`.
- Express + TypeScript backend in `server/`.
- MySQL schema and seed data in `database/`.

The main architectural change is replacing demo header authentication with backend-issued JWT authentication. The frontend stores the token and sends it in `Authorization: Bearer <token>`. The backend validates the token and loads the active user before serving protected routes.

## Schema Changes

The schema can be reset, so the SQL files should be updated directly rather than using migrations.

Recommended changes:

- Keep `users.password_hash`, but seed it with real bcrypt hashes.
- Add `sessions.description`, `sessions.location`, and `sessions.difficulty` so members can understand classes before booking.
- Add `subscriptions.requested_at`, `subscriptions.approved_by_user_id`, and `subscriptions.cancelled_at` to support member requests and staff review.
- Keep `payments` for staff-visible payment records, but no member payment action is required in this version.

## Authentication

Backend endpoints:

- `POST /api/auth/register`: creates a member user and member profile.
- `POST /api/auth/login`: validates username/password and returns a token plus user profile.
- `GET /api/auth/me`: validates the token and returns the current user profile.

Backend auth behavior:

- Passwords are hashed with bcrypt.
- Inactive or suspended users cannot log in.
- Protected routes require a valid token.
- Role checks are enforced server-side.

Frontend auth behavior:

- Login form uses username/password.
- Registration form creates member accounts.
- Token and user profile are stored in browser storage for local development convenience.
- Auth state is cleared on `401` responses.

## Admin/Staff Dashboard

The admin/staff dashboard should feel like an operations console, not just read-only tables.

Required controls:

- Dashboard summary cards.
- Tabbed sections for users, members, trainers, plans, subscriptions, payments, sessions, bookings, and attendance.
- Create and edit membership plans.
- Create and edit sessions, including trainer, date/time, capacity, location, difficulty, description, and status.
- Review pending subscriptions.
- Activate or cancel subscriptions.

Full CRUD for every table is not required. Plans, sessions, and subscriptions are the priority because they drive member workflows.

## Member Experience

Member features:

- Register a new account.
- Browse plan comparison cards with duration, price, and description.
- Request a subscription plan.
- See subscription status: pending, active, expired, cancelled.
- Browse scheduled sessions with trainer name, specialty, date/time, capacity, location, difficulty, and description.
- Book sessions only when the member has an active subscription.
- Cancel own booked sessions.

Booking behavior:

- Backend rejects booking without an active subscription.
- Backend rejects duplicate bookings.
- Backend rejects full sessions.
- Cancelled bookings can be reactivated if the session still has capacity.

## Trainer Experience

Trainer features:

- View assigned upcoming sessions.
- View completed sessions.
- View booked members per session.
- Mark or update attendance for assigned sessions.
- View attendance history for assigned sessions.

## Error Handling

All API errors should preserve the existing JSON shape:

```json
{
  "error": "Human readable message"
}
```

Frontend pages should show loading, empty, success, and error states. Forms should disable submit buttons while requests are pending.

## Testing

Backend tests should cover:

- Login success and failure.
- Member registration.
- Token-protected route access.
- Role restrictions.
- Active subscription required for booking.
- Subscription request, activation, and cancellation rules.

Frontend verification can remain build-based plus manual browser walkthrough unless a frontend test runner is added later.

## Documentation

README should explain:

- Database reset workflow.
- Seeded usernames and passwords.
- How auth works locally.
- Admin/staff, member, and trainer walkthroughs.

## Out Of Scope

- Real payment provider integration.
- Password reset email flow.
- Production-grade refresh tokens or cookie hardening.
- Advanced analytics and charts.
- Complex member billing history beyond staff-visible payment records.
