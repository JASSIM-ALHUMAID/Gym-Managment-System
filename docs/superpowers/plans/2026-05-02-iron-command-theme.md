# Iron Command Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole React client to match the provided black/red command-center screenshot while preserving gym-management wording and workflows.

**Architecture:** Keep the implementation CSS-first. The existing app already shares classes across landing, login, dashboards, panels, cards, buttons, forms, tabs, and tables, so `client/src/styles.css` can carry the theme without changing data flow or component logic.

**Tech Stack:** React 19, React Router, Vite, TypeScript, plain CSS.

---

## File Structure

- Modify: `client/src/styles.css` - central theme variables, global typography, surfaces, controls, landing page, auth page, dashboard shell, tables, tabs, cards, dialogs, and responsive rules.
- Modify: `docs/superpowers/specs/2026-05-02-iron-command-theme-design.md` - already created design reference; no implementation edits required.

## Task 1: Command Theme CSS

**Files:**
- Modify: `client/src/styles.css`

- [ ] **Step 1: Replace global tokens and base UI treatment**

Update `:root`, `body`, typography, buttons, inputs, tables, and shared message styles to use a matte black command-center palette, square corners, red accents, uppercase labels, and thinner borders. Keep selectors intact so existing components continue working.

- [ ] **Step 2: Restyle public landing and login surfaces**

Update `.landing-*`, `.hero-*`, `.brand-*`, `.role-card`, `.feature-card`, `.workflow-panel`, `.login-*`, `.quick-login`, and `.segmented-control` rules to match the screenshot's hard-edged console panels. Keep current copy and React markup.

- [ ] **Step 3: Restyle dashboard shell and operational modules**

Update `.top-navbar`, `.brand-block`, `.top-nav-tabs`, `.user-menu`, `.dashboard-content`, `.page-hero`, `.panel`, `.metric-card`, `.workspace-*`, `.status-card`, `.request-card`, `.tabs`, `.pill`, `.table-wrapper`, `.plan-card`, `.dialog-*`, `.inline-field`, and responsive rules. Use compact rectangular modules, red active states, and table styling similar to the screenshot.

- [ ] **Step 4: Run client build**

Run: `npm run build`

Working directory: `client`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 5: Inspect git diff**

Run: `git diff -- client/src/styles.css docs/superpowers/specs/2026-05-02-iron-command-theme-design.md docs/superpowers/plans/2026-05-02-iron-command-theme.md`

Expected: Only CSS theme changes and the new design/plan docs appear for this task.
