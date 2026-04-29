# Realistic Gym App Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the gym app with real password authentication, schema-backed subscription workflows, admin/staff controls, richer member browsing/booking, and improved trainer attendance features.

**Architecture:** Keep the existing React TypeScript client, Express TypeScript API, and MySQL database. Replace demo header auth with JWT bearer auth, update the resettable SQL schema/sample data, and extend existing route/page files rather than introducing a new framework.

**Tech Stack:** npm, React, TypeScript, Vite, Express, MySQL, bcryptjs, jsonwebtoken, Vitest, Supertest.

---

## File Structure

- Modify `database/schema.sql`: reset database, add richer session/subscription fields.
- Modify `database/sample-data.sql`: seed real bcrypt hashes and richer class/plan data.
- Modify `server/package.json`: add auth dependencies.
- Modify `server/src/auth.ts`: JWT auth, password helpers, current-user middleware helpers.
- Modify `server/src/routes/auth.ts`: login/register/me endpoints.
- Modify `server/src/routes/bookings.ts`: require active subscription before booking.
- Modify `server/src/routes/subscriptions.ts`: member request plus admin/staff activation/cancellation.
- Modify `server/src/routes/sessions.ts`: richer session fields and create/edit support.
- Modify `server/src/routes/plans.ts`: keep create/edit support for admin/staff.
- Modify `client/src/auth.tsx`: token-based auth context.
- Modify `client/src/pages/LoginPage.tsx`: username/password login and member registration.
- Modify `client/src/pages/AdminDashboard.tsx`: professional controls for plans, sessions, subscriptions.
- Modify `client/src/pages/MemberDashboard.tsx`: plan comparison, subscription request, active-subscription booking gate.
- Modify `client/src/pages/TrainerDashboard.tsx`: upcoming/completed/history sections.
- Modify `client/src/styles.css`: professional dashboard styling.
- Modify `server/tests/*.test.ts`: auth, authorization, subscription, and booking workflow coverage.
- Modify `README.md`: reset/setup/auth walkthrough.

---

### Phase 1: Real Auth And Schema Reset

**Files:**
- Modify: `database/schema.sql`
- Modify: `database/sample-data.sql`
- Modify: `server/package.json`
- Modify: `server/src/auth.ts`
- Modify: `server/src/routes/auth.ts`
- Modify: `client/src/auth.tsx`
- Modify: `client/src/pages/LoginPage.tsx`
- Test: `server/tests/auth.test.ts`

- [ ] Add `bcryptjs` and `jsonwebtoken` plus matching type packages to `server/package.json`.
- [ ] Update SQL schema for reset-friendly database creation and richer session/subscription fields.
- [ ] Seed real bcrypt hashes in `sample-data.sql` and document known passwords in README later.
- [ ] Implement password hashing/verification and JWT signing/verification helpers in `server/src/auth.ts`.
- [ ] Replace demo login with `POST /api/auth/login`, `POST /api/auth/register`, and `GET /api/auth/me`.
- [ ] Update frontend auth context to store token and send `Authorization: Bearer <token>`.
- [ ] Update login page to support username/password login and member registration.
- [ ] Add backend tests for login success/failure, inactive user rejection, member registration, and token-protected user lookup.
- [ ] Run `npm install --prefix server`, `npm test`, and `npm run build`.
- [ ] Commit with `feat: add real authentication`.

### Phase 2: Admin/Staff Controls

**Files:**
- Modify: `server/src/routes/plans.ts`
- Modify: `server/src/routes/sessions.ts`
- Modify: `server/src/routes/subscriptions.ts`
- Modify: `client/src/pages/AdminDashboard.tsx`
- Modify: `client/src/pages/ResourceTable.tsx`
- Modify: `client/src/styles.css`
- Test: `server/tests/adminWorkflows.test.ts`

- [ ] Ensure plan create/edit/delete routes return clean IDs/errors and require admin/staff JWT roles.
- [ ] Extend session create/edit/status routes to support `description`, `location`, and `difficulty`.
- [ ] Add subscription activation/cancellation endpoints for admin/staff.
- [ ] Replace read-only admin dashboard tabs with forms/actions for plans, sessions, and subscriptions.
- [ ] Add success/error/loading states for each admin/staff action.
- [ ] Add backend tests for plan/session mutation role restrictions and subscription activation/cancellation.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit with `feat: add admin staff controls`.

### Phase 3: Member Plan And Booking Experience

**Files:**
- Modify: `server/src/routes/subscriptions.ts`
- Modify: `server/src/routes/bookings.ts`
- Modify: `server/src/routes/sessions.ts`
- Modify: `client/src/pages/MemberDashboard.tsx`
- Modify: `client/src/styles.css`
- Test: `server/tests/memberWorkflows.test.ts`

- [ ] Add member subscription request endpoint that creates a pending subscription.
- [ ] Enforce active subscription requirement in booking creation.
- [ ] Return trainer specialty, session description, location, difficulty, capacity, and booked count in session listings.
- [ ] Render plan comparison cards with request buttons.
- [ ] Render member subscription status and explain pending/active/cancelled behavior.
- [ ] Improve session cards/table with instructor details and disabled booking reasons.
- [ ] Add backend tests for pending subscription request, booking without active subscription rejection, booking with active subscription success, duplicate/full session rejection.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit with `feat: enhance member subscriptions and booking`.

### Phase 4: Trainer Workflow Improvements

**Files:**
- Modify: `server/src/routes/attendance.ts`
- Modify: `server/src/routes/sessions.ts`
- Modify: `client/src/pages/TrainerDashboard.tsx`
- Modify: `client/src/styles.css`
- Test: `server/tests/trainerWorkflows.test.ts`

- [ ] Return richer assigned-session data for trainers, including booked counts and session metadata.
- [ ] Add trainer attendance history response or adapt existing attendance list for trainer-specific history.
- [ ] Update trainer dashboard with upcoming sessions, completed sessions, attendance marking, and history sections.
- [ ] Preserve assigned-trainer-only attendance authorization.
- [ ] Add backend tests for trainer-only access and attendance update behavior.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit with `feat: improve trainer workflows`.

### Phase 5: Polish, Docs, And Final Verification

**Files:**
- Modify: `README.md`
- Modify: `client/src/styles.css`
- Modify: affected files for verification fixes only

- [ ] Update README with reset database instructions, seeded login credentials, member registration, and role walkthroughs.
- [ ] Polish dashboard responsive layout and form spacing.
- [ ] Run `npm run install:all`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] If MySQL is available, reset/import schema and seed, then manually test login/register/admin/member/trainer workflows.
- [ ] Commit with `docs: finalize realistic app upgrade`.

---

## Self-Review Notes

- Spec coverage: auth, schema reset, admin/staff controls, member subscription-gated booking, trainer workflow, tests, and docs are mapped to phases.
- Scope: this is a large but coherent upgrade; each phase leaves the app buildable and committed.
- Risk: frontend manual testing depends on a local MySQL server; automated backend tests should cover the business rules that are easiest to regress.
