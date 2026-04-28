# Build Task: Financial Transparency:
**Source Persona:** drew-nieporent
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build
Implement a comprehensive financial transparency feature that displays detailed financial information, including platform GMV, ledger entries, and payment issues, in an easily understandable format for admin users. This will provide visibility into the financial health and transactions within the platform.

## Files to Modify
- `app/(admin)/admin/financials/page.tsx` -- Update existing component to fetch and display new financial transparency data

## Files to Create (if any)
No new files needed for this task.

## Implementation Notes
- Utilize Drizzle ORM to query the PostgreSQL database for relevant financial data, such as platform GMV, ledger entries, and payment issues.
- Ensure that error handling is implemented correctly, displaying user-friendly messages when queries fail.
- Use Tailwind CSS classes to style the new components in a visually appealing and consistent manner.

## Acceptance Criteria
1. Admin users can view detailed financial information, including platform GMV, ledger entries, and payment issues, on the admin dashboard.
2. The displayed data is fetched from the PostgreSQL database using Drizzle ORM queries.
3. Error handling is implemented to show user-friendly messages when data fetching fails.
4. The new feature integrates seamlessly with the existing design and layout of the admin dashboard using Tailwind CSS classes.

## DO NOT
- Modify any files outside of `app/(admin)/admin/financials/page.tsx`
- Add new npm dependencies for this task
- Change the database schema or alter existing data models
- Delete or modify existing functionality unrelated to the financial transparency feature