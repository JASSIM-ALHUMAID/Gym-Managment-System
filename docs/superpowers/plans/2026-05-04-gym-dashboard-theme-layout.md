# Gym Dashboard Theme And Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the whole client to match the provided dark dashboard layout/theme while preserving Pulse Studio as a gym management system.

**Architecture:** Keep the existing React routes, auth flow, API calls, and dashboard workflows. Implement the redesign through focused JSX copy/class updates in the public shell and a consolidated CSS refresh that keeps current class hooks working.

**Tech Stack:** React 19, React Router 7, TypeScript, Vite, plain CSS in `client/src/styles.css`.

---

## File Structure

- Modify: `client/scripts/assert-command-layout.mjs` - rename the visual structure assertion from command-center language to gym dashboard layout language while preserving class-hook checks.
- Modify: `client/src/App.tsx` - keep the authenticated shell but update product copy, navigation labels, topbar wording, and accessible labels to gym-management language.
- Modify: `client/src/pages/LandingPage.tsx` - keep the landing page content model but align copy and preview labels with the refreshed Pulse Studio gym-management identity.
- Modify: `client/src/pages/LoginPage.tsx` - keep auth behavior unchanged while updating supporting copy to match the new theme direction.
- Modify: `client/src/styles.css` - refresh tokens, public pages, authenticated shell, dashboard cards, panels, tables, forms, dialogs, and responsive behavior.

## Task 1: Rename Structure Check Copy

**Files:**
- Modify: `client/scripts/assert-command-layout.mjs:7-32`

- [ ] **Step 1: Update assertion message only**

Replace the final failure/success messages with gym layout language while keeping existing hook tokens intact:

```js
if (failures.length > 0) {
  console.error('Missing gym dashboard layout hooks:');
  for (const [file, token] of failures) console.error(`- ${file}: ${token}`);
  process.exit(1);
}

console.log('Gym dashboard layout hooks found.');
```

- [ ] **Step 2: Run structure check**

Run: `npm run test:ui-structure --prefix client`

Expected: PASS with `Gym dashboard layout hooks found.`

- [ ] **Step 3: Commit**

```bash
git add client/scripts/assert-command-layout.mjs
git commit -m "test: update dashboard layout assertion copy"
```

## Task 2: Update Authenticated Shell Language

**Files:**
- Modify: `client/src/App.tsx:16-70`

- [ ] **Step 1: Update dashboard navigation labels**

Replace `dashboardLinks` with:

```tsx
const dashboardLinks: DashboardLink[] = [
  { to: '/admin', label: 'Overview', roles: ['admin'] },
  { to: '/trainer', label: 'Trainer View', roles: ['trainer'] },
  { to: '/member', label: 'Member View', roles: ['member'] }
];
```

- [ ] **Step 2: Update shell copy without changing behavior**

Replace the `<aside>` and `<header>` content in `Shell` with:

```tsx
<aside className="command-sidebar" aria-label="Gym management navigation">
  <div className="brand-block">
    <p className="eyebrow">Pulse Studio</p>
    <h2>Gym Management</h2>
    <span>Operator #{user?.user_id ?? '----'}</span>
  </div>
  <nav className="top-nav-tabs" aria-label="Primary navigation">
    {visibleLinks.map((link) => (
      <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
    ))}
  </nav>
  <button className="secondary sidebar-logout" type="button" onClick={logout}>Sign out</button>
</aside>
<div className="command-main">
  <header className="top-navbar">
    <div className="command-status" aria-live="polite"><span aria-hidden="true" /> Gym live</div>
    <div className="command-search" aria-label="Gym records search placeholder">Search members, classes, plans...</div>
    <button className="secondary system-log-button" type="button" disabled title="Reports view is visual only">Reports</button>
    <div className="user-menu">
      <div className="avatar" aria-hidden="true">{initials}</div>
      <div className="user-meta">
        <strong>{user?.full_name}</strong>
        <span>{user?.role}</span>
      </div>
    </div>
  </header>
  <main id="main-content" className="dashboard-content">{children}</main>
</div>
```

- [ ] **Step 3: Run build**

Run: `npm run build --prefix client`

Expected: PASS with TypeScript and Vite build complete.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx
git commit -m "style: align shell copy with gym dashboard"
```

## Task 3: Update Public Page Copy

**Files:**
- Modify: `client/src/pages/LandingPage.tsx:3-99`
- Modify: `client/src/pages/LoginPage.tsx:70-116`

- [ ] **Step 1: Replace landing page data constants**

Use this content in `LandingPage.tsx`:

```tsx
const features = [
  { title: 'Membership Plans', text: 'Create plans, review subscription requests, and keep member access organized.' },
  { title: 'Class Scheduling', text: 'Coordinate trainers, capacity, locations, difficulty, and daily class operations.' },
  { title: 'Member Bookings', text: 'Let members reserve classes while the system protects capacity and membership rules.' },
  { title: 'Attendance Tracking', text: 'Trainers mark attendance and admins review the operational history.' }
];

const roles = [
  { label: 'Admin', stat: 'Operations', text: 'Members, plans, classes, subscriptions, payments, and resource tables.' },
  { label: 'Trainer', stat: 'Classes', text: 'Assigned sessions, member rosters, attendance marking, and history.' },
  { label: 'Member', stat: 'Self-service', text: 'Plan requests, class booking, booking review, and payments.' }
];

const workflow = ['Create plans', 'Approve subscriptions', 'Schedule classes', 'Book members', 'Mark attendance', 'Review payments'];
```

- [ ] **Step 2: Replace landing hero and preview copy**

Set these exact strings in the existing JSX:

```tsx
<p className="eyebrow">Gym management system</p>
<h1>Run memberships, classes, bookings, and attendance from one studio dashboard.</h1>
<p className="hero-lede">Pulse Studio gives admins, trainers, and members focused tools for daily gym operations without spreadsheet chaos.</p>
```

Set the preview header to:

```tsx
<div className="console-header">
  <span>Studio activity</span>
  <strong>Live</strong>
</div>
```

Change the second preview metric label from `Scheduled sessions` to `Classes today`.

- [ ] **Step 3: Replace login support copy**

In `LoginPage.tsx`, keep the form behavior unchanged and set:

```tsx
<p className="eyebrow">Pulse Studio Access</p>
<h1>{mode === 'login' ? 'Welcome back' : 'Create member account'}</h1>
<p className="muted">Use a seeded demo profile or register a new member account. Demo users share <code>password123</code>.</p>
```

- [ ] **Step 4: Run build**

Run: `npm run build --prefix client`

Expected: PASS with TypeScript and Vite build complete.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/LandingPage.tsx client/src/pages/LoginPage.tsx
git commit -m "copy: preserve gym identity in refreshed UI"
```

## Task 4: Refresh Theme Tokens And Base Elements

**Files:**
- Modify: `client/src/styles.css:1-260`

- [ ] **Step 1: Replace root tokens**

Use these token values in `:root`:

```css
:root {
  color: #f8fafc;
  background: #080d1a;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
  --bg: #080d1a;
  --bg-2: #0b1222;
  --surface: #101827;
  --surface-2: #151f32;
  --panel: rgba(15, 23, 42, 0.94);
  --panel-strong: rgba(7, 12, 24, 0.98);
  --border: rgba(148, 163, 184, 0.16);
  --border-strong: rgba(255, 82, 82, 0.62);
  --text: #f8fafc;
  --text-soft: #cbd5e1;
  --muted: #94a3b8;
  --muted-2: #64748b;
  --primary: #ff4d4d;
  --primary-2: #ff6b5f;
  --primary-dark: #b91c1c;
  --success: #22c55e;
  --danger: #ef4444;
  --warning: #f59e0b;
  --shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
  --red-glow: 0 18px 42px rgba(255, 77, 77, 0.18);
}
```

- [ ] **Step 2: Replace body background**

Use this background for `body`:

```css
background:
  radial-gradient(circle at 16% -10%, rgba(255, 77, 77, 0.16), transparent 26rem),
  radial-gradient(circle at 86% 0%, rgba(59, 130, 246, 0.1), transparent 28rem),
  linear-gradient(rgba(255, 255, 255, 0.024) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255, 255, 255, 0.024) 1px, transparent 1px),
  linear-gradient(135deg, #080d1a 0%, #0b1222 52%, #101827 100%);
background-size: auto, auto, 30px 30px, 30px 30px, auto;
```

- [ ] **Step 3: Replace button hover treatment**

Keep existing selectors and use these values:

```css
button,
.button-link,
.ghost-link {
  align-items: center;
  border: 1px solid rgba(248, 250, 252, 0.1);
  border-radius: 16px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  box-shadow: 0 16px 38px rgba(255, 77, 77, 0.24);
  color: #fff;
  display: inline-flex;
  font-weight: 800;
  justify-content: center;
  letter-spacing: 0.01em;
  min-height: 44px;
  padding: 0.82rem 1.2rem;
  transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, color 180ms ease, transform 180ms ease;
}

button:hover:not(:disabled),
.button-link:hover,
.ghost-link:hover {
  background: linear-gradient(135deg, #ef4444, var(--primary-2));
  border-color: rgba(248, 250, 252, 0.2);
  box-shadow: 0 18px 44px rgba(255, 77, 77, 0.3), var(--red-glow);
  transform: translateY(-1px);
}
```

- [ ] **Step 4: Run build**

Run: `npm run build --prefix client`

Expected: PASS.

## Task 5: Refresh Authenticated Shell CSS

**Files:**
- Modify: `client/src/styles.css:1551-1681`

- [ ] **Step 1: Replace shell and sidebar CSS block**

Replace `.app-shell` through `.dashboard-content` near the lower command layout section with:

```css
.app-shell {
  background:
    radial-gradient(circle at 80% -10%, rgba(255, 77, 77, 0.12), transparent 24rem),
    #080d1a;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
}

.command-sidebar {
  align-self: start;
  background: linear-gradient(180deg, rgba(5, 10, 22, 0.98), rgba(8, 13, 26, 0.98));
  border-right: 1px solid rgba(148, 163, 184, 0.14);
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100vh;
  min-height: 100vh;
  overflow-y: auto;
  padding: 1.25rem 1rem;
  position: sticky;
  top: 0;
}

.command-sidebar .brand-block {
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  padding-bottom: 1.5rem;
}

.command-sidebar .brand-block h2 {
  color: #fff;
  font-style: normal;
  line-height: 0.95;
}

.command-sidebar .brand-block span {
  color: var(--muted);
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  margin-top: 0.65rem;
  text-transform: uppercase;
}

.command-sidebar .top-nav-tabs {
  align-content: start;
  display: grid;
  gap: 0.45rem;
  justify-content: stretch;
  padding-top: 1.5rem;
}

.command-sidebar .top-nav-tabs a {
  border-left: 3px solid transparent;
  display: block;
  padding: 0.95rem 1rem;
}

.command-sidebar .top-nav-tabs a.active,
.command-sidebar .top-nav-tabs a:hover {
  background: linear-gradient(90deg, rgba(255, 77, 77, 0.18), rgba(255, 77, 77, 0.04));
  border-color: var(--primary);
}

.sidebar-logout { width: 100%; }

.command-main { min-width: 0; }

.top-navbar {
  background: rgba(7, 12, 24, 0.9);
  border-width: 0 0 1px;
  border-color: rgba(148, 163, 184, 0.14);
  box-shadow: none;
  grid-template-columns: auto minmax(200px, 420px) auto auto;
  margin: 0;
  min-height: 64px;
}

.command-status {
  align-items: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: var(--text-soft);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 800;
  gap: 0.6rem;
  letter-spacing: 0.04em;
  padding: 0.65rem 0.9rem;
  text-transform: uppercase;
}

.command-status span {
  background: var(--success);
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(34, 197, 94, 0.7);
  height: 0.55rem;
  width: 0.55rem;
}

.command-search {
  align-items: center;
  background: rgba(15, 23, 42, 0.74);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  color: var(--muted);
  display: flex;
  font-size: 0.82rem;
  min-height: 38px;
  padding: 0.65rem 1rem;
}

.system-log-button {
  font-size: 0.78rem;
  min-height: 38px;
  width: auto;
}

.dashboard-content {
  background:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    #0b1222;
  background-size: 30px 30px;
  min-height: calc(100vh - 64px);
}
```

- [ ] **Step 2: Run structure check and build**

Run: `npm run test:ui-structure --prefix client`

Expected: PASS.

Run: `npm run build --prefix client`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/styles.css
git commit -m "style: refresh authenticated gym shell"
```

## Task 6: Refresh Cards, Panels, Tables, Forms, And Mobile CSS

**Files:**
- Modify: `client/src/styles.css:800-1199`
- Modify: `client/src/styles.css:1683-1889`

- [ ] **Step 1: Update shared panel/card surfaces**

Ensure `.page-hero`, `.panel`, `.metric-card`, `.status-card`, `.workspace-summary-card`, `.request-card`, `.plan-card`, `.dialog-panel`, and `.table-wrapper` use these shared surface values where their rules already exist:

```css
background: linear-gradient(180deg, rgba(17, 25, 40, 0.92), rgba(11, 18, 34, 0.96));
border: 1px solid rgba(148, 163, 184, 0.14);
box-shadow: 0 22px 60px rgba(0, 0, 0, 0.26);
```

- [ ] **Step 2: Tune metric cards**

Set `.metric-card::before` to:

```css
.metric-card::before {
  background: linear-gradient(90deg, var(--primary), transparent);
  content: "";
  height: 3px;
  inset: 0 0 auto;
  position: absolute;
}
```

Set `.metric-card strong` font size to `2.45rem` in the desktop rule.

- [ ] **Step 3: Tune dashboard grids**

Keep existing class names and use:

```css
.command-overview-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
}

.trainer-command-grid,
.member-command-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.member-command-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
```

- [ ] **Step 4: Tune tables and forms**

Keep existing selectors and use:

```css
th {
  background: rgba(7, 12, 24, 0.88);
  color: #cbd5e1;
}

td {
  color: #e2e8f0;
}

select,
input,
textarea {
  background: rgba(7, 12, 24, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  color: var(--text);
}
```

- [ ] **Step 5: Confirm mobile rules remain intact**

Verify the existing `@media (max-width: 760px)` block still includes:

```css
.app-shell { display: block; }

.command-sidebar {
  height: auto;
  min-height: auto;
  position: static;
}
```

- [ ] **Step 6: Run build**

Run: `npm run build --prefix client`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/src/styles.css
git commit -m "style: polish gym dashboard surfaces"
```

## Task 7: Final Verification

**Files:**
- Verify: `client/src/App.tsx`
- Verify: `client/src/pages/LandingPage.tsx`
- Verify: `client/src/pages/LoginPage.tsx`
- Verify: `client/src/pages/AdminDashboard.tsx`
- Verify: `client/src/pages/TrainerDashboard.tsx`
- Verify: `client/src/pages/MemberDashboard.tsx`
- Verify: `client/src/styles.css`

- [ ] **Step 1: Run UI structure check**

Run: `npm run test:ui-structure --prefix client`

Expected: PASS with `Gym dashboard layout hooks found.`

- [ ] **Step 2: Run client build**

Run: `npm run build --prefix client`

Expected: PASS with TypeScript and Vite build complete.

- [ ] **Step 3: Manual responsive inspection**

Run: `npm run dev --prefix client`

Open the Vite URL and inspect these pages at approximately 375px, 768px, 1024px, and desktop width:

```text
/
/login
/admin
/trainer
/member
```

Expected: no horizontal page scroll outside table wrappers, sidebar usable on mobile, text readable, buttons focusable, and all existing workflows visible.

- [ ] **Step 4: Final commit**

```bash
git add client/scripts/assert-command-layout.mjs client/src/App.tsx client/src/pages/LandingPage.tsx client/src/pages/LoginPage.tsx client/src/styles.css docs/superpowers/specs/2026-05-04-gym-dashboard-theme-layout-design.md docs/superpowers/plans/2026-05-04-gym-dashboard-theme-layout.md
git commit -m "style: refresh gym management dashboard theme"
```

## Self-Review

- Spec coverage: plan covers whole-client theme, authenticated shell, public pages, dashboards, tables, forms, dialogs, accessibility, responsiveness, and verification.
- Placeholder scan: no TBD/TODO/later placeholders are present.
- Type consistency: no new TypeScript types or data contracts are introduced; all route and API behavior remains unchanged.
