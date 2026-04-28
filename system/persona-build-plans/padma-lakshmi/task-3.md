# Build Task: Personalized Station Coordination:
**Source Persona:** padma-lakshmi
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build
Integrate the chef's personal preferences and cooking style into the station coordination view. Highlight stations where their signature dishes are being prepared, show staff familiar with those recipes, and emphasize ingredients that match their taste profile.

## Files to Modify
- `app/(chef)/ops/stations/page.tsx` -- Update logic to fetch and display personalized data like preferred stations, staff, components, and tasks based on the chef's profile.

## Files to Create (if any)
- `app/(chef)/ops/stations/personalized-header.tsx` -- New component to summarize the chef's preferences and cooking style at the top of the station coordination page.

## Implementation Notes
- Use GraphQL queries to fetch personalized data from the backend API.
- Conditionally render components based on the fetched data.
- Leverage React hooks for state management if needed.

## Acceptance Criteria
1. The station coordination view now prominently displays a personalized header summarizing the chef's preferences and cooking style.
2. Stations preparing signature dishes are visually highlighted within the main station list.
3. Staff members familiar with the chef's recipes are indicated next to relevant stations.
4. Ingredients matching the chef's taste profile have special icons or coloration.
5. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT
- Modify existing logic unrelated to personalization.
- Add new npm packages or external dependencies.
- Alter database schemas or API endpoints.
- Remove any existing functionality related to general station coordination.