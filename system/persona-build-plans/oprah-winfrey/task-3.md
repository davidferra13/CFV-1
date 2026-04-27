# Build Task: Scale & Complexity:

**Source Persona:** oprah-winfrey
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Implement a centralized dashboard for the cannabis tier that provides quick access to key metrics and actions, improving operational efficiency and reducing friction.

## Files to Modify

- `app/(chef)/cannabis/page.tsx` -- Add a new section at the bottom of the page for displaying relevant cannabis tier-specific metrics and actions. Use the existing MetricsStrip component or create a new one tailored to the cannabis tier's needs.

## Files to Create (if any)

- `app/(chef)/cannabis/dashboard/metrics-strip.tsx` -- A custom MetricsStrip component that displays cannabis tier-specific metrics, such as event counts, recent events, and other relevant data points. This component will be used in place of the existing MetricsStrip when displaying the cannabis tier dashboard.

## Implementation Notes

- Utilize the Drizzle ORM to fetch cannabis tier-specific metrics from the database efficiently.
- Ensure the new components are responsive and styled using Tailwind CSS to maintain a consistent look and feel with the rest of the application.
- Consider using Auth.js v5 to ensure that only authorized users can access the cannabis tier dashboard.

## Acceptance Criteria

1. The cannabis tier dashboard now includes a section displaying key metrics relevant to the cannabis tier, such as event counts and recent events.
2. The new MetricsStrip component (or updated existing one) is used exclusively for displaying cannabis tier-specific metrics in the cannabis tier dashboard.
3. `npx tsc --noEmit --skipLibCheck` passes without any new type errors related to the changes made.

## DO NOT

- Modify files not listed above or in the "Files to Modify" section.
- Add new npm dependencies that are not specifically required for this task.
- Change the database schema in a way that affects other parts of the application.
- Delete existing functionality or modify it in ways not described in this plan.
- Use em dashes anywhere in your code.
