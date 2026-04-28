# Build Task: Communication Hub:

**Source Persona:** andrew-zimmern
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Enhance the Follow-Ups page by adding a "Last Contact" field to track when each client was last contacted. This will help prioritize follow-ups based on how long it has been since each client was communicated with.

## Files to Modify

- `app/(chef)/clients/communication/follow-ups/page.tsx` -- Add new "lastContactDate" column to the sorting criteria and display the Last Contact date for each client in the list view.

## Implementation Notes

- Use the existing database schema to add a "lastContactDate" field to the clients table.
- Update the `getClientsWithStats` query to include the lastContactDate in the results.
- Modify the Follow-Ups page component to sort clients by how long it has been since their last contact, with the most overdue contacts appearing first.

## Acceptance Criteria

1. The Follow-Ups page now displays a "Last Contact" column showing the date each client was last contacted.
2. Clients are sorted based on how long it has been since they were last contacted, with those who have gone the longest without contact appearing at the top of the list.
3. `npx tsc --noEmit --skipLibCheck` passes

## DO NOT

- Modify any files other than `app/(chef)/clients/communication/follow-ups/page.tsx`.
- Add new npm dependencies or change existing ones.
- Change the database schema in any way other than adding the "lastContactDate" field to the clients table.
- Remove existing functionality from the Follow-Ups page.
