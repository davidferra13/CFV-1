# Build Task: Implement "Usage Deduction":
**Source Persona:** julia
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build
Implement a feature that deducts usage data from ChefFlow's PostgreSQL database and displays it on the `/dashboard` page, showing how various features are being utilized by users.

## Files to Modify
- `app/(chef)/dashboard/page.tsx` -- Update this file to fetch and display the deducted usage data

## Files to Create (if any)
- None needed for this task

## Implementation Notes
- Use Drizzle ORM to query the PostgreSQL database for relevant usage statistics
- Aggregate data such as number of events created, inquiries submitted, payments processed, etc.
- Ensure the dashboard displays the information in an easily digestible format using Tailwind CSS for styling

## Acceptance Criteria
1. The `/dashboard` page now shows a "Usage Deduction" section displaying aggregated usage stats like total events created, inquiries received, and payments processed
2. Usage data is fetched from the PostgreSQL database using Drizzle ORM and displayed in a clear, visually appealing way with Tailwind CSS
3. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to this feature

## DO NOT
- Modify any files other than the one specified for modification
- Add new npm dependencies not directly related to implementing the "Usage Deduction" feature
- Change the existing database schema in a way that could break existing functionality
- Delete or modify existing functionality outside of adding the "Usage Deduction" section