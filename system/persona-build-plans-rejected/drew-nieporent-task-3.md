<!-- REJECTED: all 1 referenced files are missing -->
<!-- 2026-04-28T01:50:42.777Z -->

Here is a focused build plan to address the gap you identified:

# Build Task: Experience Mapping:
**Source Persona:** drew-nieporent
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build
Add a "Guest Feedback" tab that displays ratings and comments from guests who have completed the event feedback survey. This will allow chefs to see what their guests really thought about the food and service.

## Files to Modify
- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` -- Add a new "Guest Feedback" tab component in the mobile nav menu. Update the main content area of this file to display the ratings and comments when the Guest Feedback tab is selected.

## Implementation Notes
- Use the existing feedback survey data model from `lib/surveys/feedback-model.ts`
- Display average rating first, then show a few sample comments
- Truncate long comments for readability

## Acceptance Criteria
1. New "Guest Feedback" tab appears in event detail mobile nav menu 
2. Tapping tab shows average food and service ratings
3. A few sample guest comments are displayed below ratings
4. `npx tsc --noEmit --skipLibCheck` passes without errors

## DO NOT
- Modify any files outside the specified event detail component
- Add new npm packages or dependencies
- Change database schema or API endpoints
- Remove existing functionality from the tab