# Build Task: Client Relationship Insights:

**Source Persona:** oprah-winfrey
**Gap Number:** 3 of 5
**Severity:** HIGH

## What to Build

Add a "Client Relationship Insights" section on the client profile page that shows key relationship metrics like health score, churn risk, predicted next booking date, and recommended outreach actions. This will help chefs quickly assess the state of their relationships with clients.

## Files to Modify

- `app/(chef)/clients/[id]/page.tsx` -- Add a new "Client Relationship Insights" section below the client details but above the communication history

## Files to Create (if any)

- `app/(chef)/clients/[id]/relationship/insights.tsx` -- New React component containing the relationship metrics and recommended actions

## Implementation Notes

- Use the `getClientRelationshipSnapshot` API call to fetch key relationship data for display in this section
- Display health score with green, yellow, red labels indicating good, caution, or poor relationship states
- Show predicted next booking date and days until it occurs
- List out 1-3 recommended outreach actions based on churn risk and other signals
- Handle loading state with skeleton UI components

## Acceptance Criteria

1. The "Client Relationship Insights" section appears below client details and above communication history on the client profile page
2. It displays the client's current health score with green/yellow/red labels
3. Predicted next booking date is shown, counting down days until it occurs
4. 1-3 recommended outreach actions are listed based on relationship signals
5. Loading state shows skeleton UI components for each piece of data fetching
6. `npx tsc --noEmit --skipLibCheck` runs without errors

## DO NOT

- Modify existing client details, communication history or other sections
- Add new npm packages
- Change database schema or API endpoints
- Remove any functionality from the current page
