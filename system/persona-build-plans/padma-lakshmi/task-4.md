# Build Task: Communication Hub:
**Source Persona:** padma-lakshmi
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build
Implement a "Recent Communications" section on the client communication page that displays the most recent notes, follow-ups, and events for each client. This will allow chefs to quickly review what communications have taken place with each client.

## Files to Modify
- `app/(chef)/clients/communication/index.tsx` -- Add a new section below the existing "Notes" and "Follow-Ups" sections to display recent communications.
- `{exact/file/path}.tsx` -- {what to change in this file}

## Files to Create (if any)
- `{exact/file/path}.tsx` -- {purpose of new file}

## Implementation Notes
- Use the `getClientsWithStats()` function to retrieve client data, including their most recent note, follow-up, and event.
- For each client, display their name, email (if available), and a brief summary or excerpt from their most recent communication. 
- Link to each client's profile page where full details of all communications can be found.
- Ensure the new section is responsive and fits well within the existing layout.

## Acceptance Criteria
1. The "Recent Communications" section appears below the "Notes" and "Follow-Ups" sections on the client communication page.
2. For each client, displays name, email (if available), and a summary of their most recent note, follow-up or event.
3. Links to each client's profile page for full details.
4. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT
- Modify the "Notes" or "Follow-Ups" sections functionality.
- Add new npm dependencies.
- Change database schema.
- Delete existing functionality related to notes, follow-ups or events.
- Use em dashes anywhere in the code.