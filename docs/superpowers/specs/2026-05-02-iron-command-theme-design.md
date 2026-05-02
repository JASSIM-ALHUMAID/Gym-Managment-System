# Iron Command Theme Design

## Goal

Restyle the whole React client to match the provided Iron Command screenshot while preserving the app's gym-management wording and workflows.

## Scope

The theme applies to the landing page, login/register page, and all authenticated dashboards. The implementation should not change API calls, routing, role permissions, forms, or workflow behavior.

## Visual Direction

Use a tactical command-center style: near-black matte backgrounds, hard rectangular panels, thin red and gray borders, uppercase condensed headings, compact spacing, red alert accents, and subtle grid/dot texture. Buttons should become sharper and more system-like rather than rounded promotional CTAs.

## Architecture

Most work belongs in `client/src/styles.css` because the app already uses shared classes for shell, panels, metric cards, tables, tabs, landing sections, and login cards. React component edits should be minimal and only used where class hooks or small label adjustments are needed.

## Components

Update shared CSS variables, body background, buttons, forms, tables, panels, metric cards, navigation, landing hero, login card, dashboard shell, tabs, status badges, and responsive rules. Keep existing component names and data rendering intact.

## Data Flow

No data-flow changes. Existing dashboard loading, auth, subscriptions, bookings, sessions, payments, and admin/trainer workflows continue unchanged.

## Error Handling

Existing error and success messages remain. Their visual treatment should fit the command theme with clear red error states and readable contrast.

## Testing

Run the client build after styling changes. Visually inspect the app at desktop and mobile breakpoints if the dev server can be run locally.
