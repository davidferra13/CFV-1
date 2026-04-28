<!-- REJECTED: out-of-scope: matches /\bbeta\s+survey\b/i -->
<!-- 2026-04-28T00:50:40.096Z -->

# Build Task: Data model gap

**Source Persona:** olajide-olatunji
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build

Implement a new data model and API endpoints for tracking beta survey responses and invite management. This will allow admins to view detailed response data, manage invites, and export results as CSV.

## Files to Modify

- `{exact/file/path.tsx}` -- `app/(admin)/admin/beta-surveys/[id]/page.tsx`  
  Update the page component to display survey results, including aggregated stats, a table of individual responses, invite management controls, and a link to export the response data as CSV.

## Files to Create (if any)

- `{exact/file/path.tsx}` -- `app/(admin)/admin/beta-surveys/[id]/results-client.tsx`  
  Create a new React component for displaying the survey results table and individual response details. This will encapsulate the presentation logic separately from the page component.

## Implementation Notes

- Use Drizzle ORM to query the database for survey responses and aggregated stats.
- Ensure proper error handling and loading states are implemented.
- Handle edge cases like missing data gracefully in the UI.

## Acceptance Criteria

1. Admins can view detailed response data, including aggregated stats and a table of individual responses, on the survey detail page.
2. Invite management controls allow admins to add or remove email addresses from the survey's invite list.
3. A CSV export link is available for downloading all survey responses in comma-separated format.
4. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT

- Modify existing functionality outside of the beta surveys feature.
- Add new npm dependencies unrelated to this task.
- Change the overall database schema or table structures.
- Delete any existing UI elements related to survey management.
- Use em dashes anywhere in your code.
