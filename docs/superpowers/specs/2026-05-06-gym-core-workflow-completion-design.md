# Gym Core Workflow Completion Design

## Goal

Complete the missing core gym-management workflows from `Gym-Management-System-Relational-Model.pdf` while keeping the project simple and suitable for a database course project. The system should support users, members, trainers, plans, subscriptions, sessions, bookings, attendance, and manual payment tracking with logical state transitions.

## Approved Payment Workflow

The project will not integrate a real payment gateway. Payments are manually tracked by admins.

1. A member requests a membership plan.
2. The subscription is created with status `Pending`.
3. Admin approves the request by creating a pending payment for the plan price.
4. The subscription remains `Pending` while the payment is `Pending` or `Failed`.
5. Admin marks the payment `Paid` after collecting payment manually by cash, card, or bank transfer.
6. Marking the payment `Paid` activates the subscription and cancels that member's previous active subscriptions.
7. Members can book sessions only when they have an `Active` subscription with a `Paid` payment.

Failed payments stay attached to the pending subscription so staff can retry or update the payment later.

## Booking Rules

Members can book sessions only when all conditions are true:

- The member account is active.
- The member has an active subscription backed by a paid payment.
- The session is scheduled.
- The session has remaining capacity.
- The member does not already have an active booking for that session.

Plan names such as `Premium` or `Plus` will not control session access. The current schema has no plan-session entitlement table, so name-based access rules are removed.

Booking responses must expose both `session_title` and `session_type` correctly.

## Session State Rules

Sessions use strict one-way lifecycle transitions:

```text
Scheduled -> Completed
Scheduled -> Cancelled
Completed -> locked
Cancelled -> locked
```

Admins can create and update scheduled sessions. Completed and cancelled sessions are retained for history and reporting, but cannot be moved back to scheduled.

## Attendance Rules

Attendance is tied to bookings. Trainers can mark attendance only for their own completed sessions. Admins can also mark or correct attendance.

Attendance statuses are:

- `Present`
- `Absent`
- `Late`

The UI must not default missing attendance to `Present`. Trainers must explicitly choose a status before saving.

## Admin Management

The admin dashboard should expose these top-level tabs:

```text
Overview | Users | Members | Trainers | Plans | Sessions | Payments | Reports
```

Users tab:

- View all accounts.
- Change account status to `Active`, `Inactive`, or `Suspended`.

Members tab:

- View member profiles.
- Edit member contact/status fields.

Trainers tab:

- View trainer profiles.
- Create trainer accounts.
- Edit trainer contact, specialty, and status fields.

Plans tab:

- Create, update, and delete plans.
- Use row-level edit actions instead of manually typing IDs.

Sessions tab:

- Create and update scheduled sessions.
- Complete or cancel scheduled sessions.
- Use row-level actions where possible.

Payments tab:

- View payments.
- Mark pending/failed payments as paid.
- Mark pending payments as failed.

Reports tab:

- Keep attendance report visibility.

## Schema Rules

Core status columns should be non-null and use logical defaults:

- `user.Status`: `Active`
- `subscription.Status`: `Pending`
- `payment.PaymentStatus`: `Pending`
- `session.Status`: `Scheduled`
- `booking.BookingStatus`: `Confirmed`
- `attendance.AttendanceStatus`: no default; must be explicitly marked

Seed users for member, trainer, and admin demos should have bcrypt hashes so each role can log in.

## Testing Strategy

Backend tests should cover:

- Payment status changes activate subscriptions only when payment is paid.
- Members cannot book with pending or failed payment.
- Booking query fields return correct title/type values.
- Invalid session, subscription, booking, and payment transitions are rejected.
- Attendance cannot be marked before completion or by the wrong trainer.
- Non-admin users cannot access admin management routes.
- Schema constraints reject invalid or missing statuses.

Frontend build verification should ensure the admin, member, and trainer dashboards compile after UI changes.

## Scope Boundaries

This design does not add:

- Real payment gateway integration.
- Refunds.
- Online card entry.
- Plan-session entitlement tables.
- Notifications.
- Trainer availability calendars.

Those can be added later after the PDF core scope is correct.
