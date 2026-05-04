# Command Center Layout Design

## Goal

Evolve the React client from an Iron Command visual theme into a screenshot-inspired command-center layout while preserving the gym-management workflows and labels.

## Scope

Apply the strongest layout treatment to authenticated dashboards. The shell gets a fixed left command sidebar, a compact top status bar, dense metric cards, and dashboard-specific operational panels. Public landing and login pages keep the existing Iron Command styling. No API, auth, routing, permissions, or workflow behavior changes.

## Visual Direction

Use the provided references as layout inspiration: matte black workspace, red active states, compact uppercase labels, sharp rectangular panels, thin borders, dense tables, right-side alert/roster modules, and terminal-like status copy. Keep labels understandable for a gym app instead of replacing them with fictional military terms.

## Architecture

Update `client/src/App.tsx` for the shell structure and `client/src/pages/AdminDashboard.tsx`, `TrainerDashboard.tsx`, and `MemberDashboard.tsx` for role-specific dashboard compositions. Keep data loading and mutations in the existing components. Use `client/src/styles.css` for the visual system and responsive behavior.

## Components

The shell should include a sidebar brand block, role navigation, operator metadata, log out action, and a top bar with system status/search/log affordances. Admin overview should gain split command panels for registry, alerts, queue summaries, and logs. Trainer and member pages should reuse compact command panels without hiding their existing tabs/actions.

## Data Flow

No data-flow changes. Derived panel values come from existing state such as counts, selected rows, sessions, subscriptions, payments, bookings, and attendance.

## Error Handling

Existing error and success messages remain visible. Layout changes must not move alerts below inaccessible content or make them color-only.

## Testing

Add a static UI structure check that verifies the command shell and role dashboard classes exist. Run the check, then run the client build.
