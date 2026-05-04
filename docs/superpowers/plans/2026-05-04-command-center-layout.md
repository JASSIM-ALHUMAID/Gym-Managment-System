# Command Center Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert authenticated dashboards into a screenshot-inspired command-center layout while preserving gym-management behavior.

**Architecture:** Keep API and state logic in place. Add shell and dashboard markup hooks in the existing React components, then centralize the visual treatment and responsive behavior in `client/src/styles.css`.

**Tech Stack:** React 19, React Router 7, Vite, TypeScript, plain CSS, Node static test script.

---

## File Structure

- Create: `client/scripts/assert-command-layout.mjs` - static regression check for key command-center layout hooks.
- Modify: `client/package.json` - add `test:ui-structure` script.
- Modify: `client/src/App.tsx` - replace top-only shell with sidebar plus compact top bar.
- Modify: `client/src/pages/AdminDashboard.tsx` - add overview command grid, alerts, registry preview, and logs using existing data.
- Modify: `client/src/pages/TrainerDashboard.tsx` - add trainer command summary/queue panels.
- Modify: `client/src/pages/MemberDashboard.tsx` - add member command summary panels.
- Modify: `client/src/styles.css` - implement sidebar, top bar, dense command panels, responsive rules.

## Task 1: Red Static Structure Test

- [ ] Add `client/scripts/assert-command-layout.mjs` to assert required classes and role sections.
- [ ] Add `test:ui-structure` to `client/package.json`.
- [ ] Run `npm run test:ui-structure` in `client`; expected failure because the command shell/dashboard classes are not implemented yet.

## Task 2: Shell Layout

- [ ] Update `client/src/App.tsx` so `.app-shell` contains `.command-sidebar`, `.command-main`, `.top-navbar`, `.command-search`, and `.system-log-button`.
- [ ] Keep route links, auth display, skip link, and logout behavior intact.

## Task 3: Role Dashboard Panels

- [ ] Update admin overview with `.command-overview-grid`, `.command-registry`, `.command-alert-panel`, and `.system-log-panel`.
- [ ] Update trainer dashboard with `.trainer-command-grid` and compact operator/session summary panels.
- [ ] Update member dashboard with `.member-command-grid` and compact subscription/session/payment summary panels.
- [ ] Keep existing tabs, forms, resource tables, and mutations intact.

## Task 4: Command CSS

- [ ] Update `client/src/styles.css` to make the shell sidebar-based on desktop and stacked on mobile.
- [ ] Restyle dashboard cards and panels as sharp command-center modules.
- [ ] Add responsive rules for 375px, 768px, 1024px, and desktop widths.

## Task 5: Verification

- [ ] Run `npm run test:ui-structure` in `client`; expected pass.
- [ ] Run `npm run build` in `client`; expected TypeScript and Vite build success.
- [ ] Inspect `git diff` for only the intended UI/spec/plan/test changes.
