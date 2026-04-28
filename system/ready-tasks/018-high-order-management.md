---
status: ready
priority: 'high'
score: 38
ref_accuracy: 50
source_plan: 'system/persona-build-plans/dean-deluca/task-1.md'
source_persona: 'dean-deluca'
exported_at: '2026-04-28T01:13:33.789Z'
---
# Build Task: Order Management:
**Source Persona:** dean-deluca
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build
Implement a feature that allows admin users to view and manage pending beta signups from the /beta page. Provide a summary of total signups by status (pending, invited, onboarded, declined) and allow admins to update the status of each signup.

## Files to Modify
- `app/(admin)/admin/beta/page.tsx` -- Add a new component that displays the summary and allows updating statuses

## Files to Create (if any)
- `app/(admin)/admin/beta/components/pending-beta-signups-table.tsx` -- A table component showing pending beta signups with details like name, email, signup date, current status, and options to update status

## Implementation Notes
- Use a database query to fetch all pending beta signups 
- Group the signups by status for the summary count
- In the new component, use a table library like react-table or antd to display the data in columns
- Add form controls to allow admins to select a new status and submit updates

## Acceptance Criteria
1. The /admin/beta page loads a section showing 4 status counts: pending (10), invited (5), onboarded (3), declined (2) 
2. Clicking "View All" takes the admin to a page with a table of all pending signups, showing name, email, signup date, current status, and options to change it to pending, invited, onboarded or declined
3. Updating a status works - the next time the list is fetched, the signup moves to the new section 
4. `npx tsc --noEmit --skipLibCheck` runs on the updated files without errors

## DO NOT
- Modify any other components or pages besides /admin/beta and its child components
- Add any dependencies outside of the admin/beta directory
- Change anything related to the database schema or API calls outside of implementing the new feature
- Remove existing functionality for viewing beta signups - just add the new admin controls