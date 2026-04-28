# Build Task: Financial accuracy gap

**Source Persona:** olajide-olatunji
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build

Implement financial reconciliation and reporting features for admin users, ensuring accurate GMV, transfer, platform fee, and deferred amount calculations. Improve the user experience by handling errors gracefully and allowing users to retry failed queries.

## Files to Modify

- `app/(admin)/admin/financials/page.tsx` -- Update existing components to display financial reconciliation data, add error handling, and implement retry functionality.
- `app/(admin)/admin/reconciliation/page.tsx` -- Refactor the page component to use the new reconciliation actions and improve user experience.

## Files to Create (if any)

No new files needed for this task.

## Implementation Notes

- Use Drizzle ORM to query financial data from the database accurately.
- Implement error handling using try-catch blocks or Promise-based approaches, displaying user-friendly messages when queries fail.
- Allow users to retry failed queries by clicking a "Retry" button that re-fetches the data.
- Ensure all calculations are performed with proper currency formatting and rounding.

## Acceptance Criteria

1. Admin users can view GMV, transfer amounts, platform fees, and deferred amounts accurately on the financials page.
2. Error handling is implemented for failed queries, displaying user-friendly messages to the admin user.
3. Users can retry failed queries by clicking a "Retry" button, which re-fetches the data without page reloads.
4. `npx tsc --noEmit --skipLibCheck` passes with no new errors related to this task.

## DO NOT

- Modify any files outside of those listed in "Files to Modify".
- Add new npm dependencies for this task.
- Change the database schema or alter existing functionality unrelated to financial reconciliation and reporting.
