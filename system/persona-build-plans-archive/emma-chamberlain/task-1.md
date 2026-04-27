<!-- AUTO-ARCHIVED: all 4 file refs invalid. 2026-04-27T18:28:57.613Z -->

# Build Task: Information Overload/Fragmentation:

**Source Persona:** Emma Chamberlain
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build

Implement a streamlined, centralized information hub for the ChefFlow app. This hub would aggregate key data points from across the platform into a single, easy-to-navigate dashboard.

## Files to Modify

- `src/chefflow/app.tsx` -- Add a new route and link in the navigation menu to access the info hub
- `src/chefflow/dashboard/index.tsx` -- Pull in core metrics like events, revenue, expenses from here into the info hub

## Files to Create (if any)

- `src/chefflow/info-hub/index.tsx` -- New page component for the centralized information hub
- `src/chefflow/info-hub/data-card.tsx` -- Reusable card component to display key metrics and data points

## Implementation Notes

- Use React hooks like `useState`, `useEffect` to manage state and side effects in components
- Leverage existing data fetching logic where possible, avoid duplicating API calls
- Ensure the info hub is responsive and adapts well to different screen sizes

## Acceptance Criteria

1. The centralized info hub page is accessible via a direct link from anywhere in ChefFlow
2. Core metrics like total events held this year, current revenue vs expense trends are displayed in an intuitive dashboard format
3. Clicking on data cards drills down to relevant details and charts for deeper analysis
4. `npx tsc --noEmit --skipLibCheck` runs without emitting any type errors or warnings

## DO NOT

- Add new npm packages or external dependencies
- Modify existing functionality outside of the info hub feature
- Change file paths or folder structures not related to this task
- Adjust database schema or API endpoints in any way
