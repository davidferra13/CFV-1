# Build Task: Implement a "Single Source of Truth" Dashboard:

**Source Persona:** emma-chamberlain
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build

Create a unified dashboard that displays all relevant data in one place, including pricing information, event details, client communication history, and financial records. The goal is to provide a comprehensive overview of the business operations for chefs using ChefFlow.

## Files to Modify

- `app/(chef)/dashboard/page.tsx` -- Update existing page structure to include widgets displaying pricing, events, client messages, and financial data.
- `app/(chef)/pricing/page.tsx` -- Integrate event details and financial records into the pricing dashboard for seamless access.
- `app/(chef)/events/page.tsx` -- Merge client communication history into the events page for contextual understanding.

## Files to Create (if any)

- `app/(chef)/dashboard/widgets/communicationHistoryWidget.tsx` -- A new component that fetches and displays client message history in a readable format on the dashboard.
- `app/(chef)/dashboard/widgets/financialRecordsWidget.tsx` -- A new widget that shows key financial metrics, such as total revenue, expenses, and profit margins.

## Implementation Notes

- Utilize Drizzle ORM to efficiently query and display data from the PostgreSQL database in real-time.
- Implement Tailwind CSS classes for responsive design, ensuring the dashboard is accessible on various devices.
- Use Auth.js v5 to secure access to the dashboard, ensuring that only authenticated chefs can view their own data.

## Acceptance Criteria

1. The unified dashboard displays pricing information, event details, client communication history, and financial records in a single view.
2. Data is updated in real-time, providing chefs with up-to-date insights into their business operations.
3. The dashboard is responsive and works seamlessly across different devices and screen sizes.
4. Access to the dashboard is restricted using Auth.js v5, ensuring data privacy and security.

## DO NOT

- Modify existing functionality outside of the specified changes.
- Introduce new npm dependencies not related to this task.
- Alter the database schema in any way that is not directly related to displaying the unified dashboard.
- Remove or alter any existing components or pages that are not part of this build task.
