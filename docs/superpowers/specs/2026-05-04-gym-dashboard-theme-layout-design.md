# Gym Dashboard Theme And Layout Redesign

## Goal

Modernize the client UI to match the provided dark dashboard references while keeping the product identity unchanged: Pulse Studio remains a gym management system for members, trainers, classes, bookings, attendance, plans, payments, and admin operations.

This is a theme and layout redesign, not a product rename or business-concept change.

## Scope

- Refresh the whole client visual system: landing page, login page, authenticated shell, dashboards, tables, forms, tabs, cards, status messages, dialogs, and action controls.
- Keep existing workflows and API/data behavior intact.
- Preserve role-specific functionality for admin, trainer, and member views.
- Use the reference screenshots for layout density, dark navy theme, card composition, sidebar structure, and red/coral action treatment.

## Non-Goals

- Do not rename the product away from Pulse Studio or make it feel like a generic SaaS operating system.
- Do not remove existing CRUD workflows, tables, forms, approvals, bookings, attendance marking, or payment visibility.
- Do not introduce new backend routes or change database behavior.
- Do not add decorative imagery that requires new image assets.

## Visual Direction

- Base theme: dark navy/black app surfaces rather than harsh pure black.
- Primary accent: red/coral for active navigation, key calls to action, progress, and urgent states.
- Surfaces: layered panels with subtle borders, low-opacity gradients, and restrained glow.
- Typography: readable Inter-style body text with bold gym-brand hierarchy used for headings and key metrics.
- Background: subtle grid/dot texture may remain, but it should be quieter than the current command-center treatment.
- Icons: use text and existing UI patterns unless an icon system already exists; avoid emoji icons.

## Authenticated Layout

- Use a persistent left sidebar for role navigation and key actions.
- Use a compact topbar for page title/search/status/user controls where appropriate.
- Keep mobile responsive behavior: sidebar should stack/collapse into a usable top section on narrow screens.
- Current role routes remain unchanged.

## Dashboard Layouts

### Admin

- Keep admin focused on gym operations: members, plans, sessions/classes, payments, subscriptions, and reports.
- Use top metric cards for operational counts.
- Use dashboard panels for live registry, plan/payment queues, session load, and admin event summaries.
- Keep resource tables and forms accessible from tabs/workspaces.

### Trainer

- Keep trainer focused on assigned sessions/classes, attendance, and client/member engagement.
- Use overview cards for upcoming classes, capacity, attendance state, and recent history.
- Keep attendance marking workflow intact and visually integrated with the new panel style.

### Member

- Keep member focused on plans, bookings, available sessions/classes, payments, and current membership state.
- Use dashboard cards for active plan, upcoming bookings, available sessions, and payment/subscription status.
- Keep booking and subscription actions intact.

## Landing And Login

- Update landing and login pages to match the same dark navy/red gym-management theme.
- Preserve the gym management positioning and role-based entry points.
- Avoid making the marketing page look disconnected from the authenticated app.

## Components And States

- Tables should keep horizontal scrolling for dense data and receive the updated dark card treatment.
- Forms and dialogs should use the new surfaces, borders, focus states, and button hierarchy.
- Success/error/loading states should remain accessible and visible.
- Buttons need clear hover/focus states and pointer behavior.

## Accessibility And Responsiveness

- Maintain visible focus styles for keyboard users.
- Maintain sufficient text contrast, especially for muted labels and small table text.
- Prevent horizontal page scroll on mobile except inside intentional table wrappers.
- Respect existing reduced-motion handling.

## Testing And Verification

- Run the client build after implementation.
- If available, run relevant client checks from `package.json`.
- Manually inspect desktop and mobile breakpoints for landing, login, admin, trainer, and member pages.

## Implementation Constraints

- Implement with existing CSS and React structure first; only restructure JSX where the new layout cannot be achieved cleanly with styles alone.
- Keep any existing user-made worktree changes intact and avoid unrelated refactors.
