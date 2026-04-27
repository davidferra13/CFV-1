# Build Task: Information Overload/Fragmentation:

**Source Persona:** oprah-winfrey
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build

Implement a centralized dashboard for ChefFlow that aggregates key metrics and insights from across the platform into a single, easy-to-navigate view. The dashboard would surface important information like upcoming events, financials, staff management, and operational KPIs in one place to help chefs stay on top of their business.

## Files to Modify

- `src/chef/dashboard.tsx` -- Update existing dashboard component to include new aggregated metrics and insights. Refactor code to extract common metric components into reusable widgets.
- `src/finance/reports/tax-summary/page.tsx` -- Add a link in the Tax Summary report view to navigate back to the centralized dashboard.
- `src/staff/roster/page.tsx` -- Similar to the tax summary, add a "back to dashboard" navigation link at the top of the staff roster page.

## Files to Create (if any)

- `src/chef/dashboard/metrics/widgets/common.tsx` -- New shared component for common metric visualization patterns like revenue graphs, event counts, etc.

## Implementation Notes

- Use React hooks and state management to keep dashboard metrics in sync across views.
- Leverage existing API endpoints to fetch aggregated data for each section of the dashboard.
- Ensure responsive design so the dashboard is usable on both desktop and mobile devices.

## Acceptance Criteria

1. The centralized ChefFlow dashboard displays a summary of upcoming events, financials, staff management, and operational KPIs in one view.
2. Navigating to the dashboard from any other page feels seamless and natural.
3. Each section of the dashboard is responsive and works well on both desktop and mobile views.
4. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT

- Modify existing event, financial or staff management pages beyond adding "back to dashboard" links.
- Add any new npm packages or dependencies.
- Change the database schema or underlying data model.
- Remove or modify existing functionality outside of the centralized dashboard.
