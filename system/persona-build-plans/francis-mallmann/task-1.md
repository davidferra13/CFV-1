# Build Task: Centralized Project Command:
**Source Persona:** francis-mallmann
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build
Implement a centralized project command feature that allows chefs to initiate and manage unified purchase orders for ingredients across all locations from the cannabis dining hub.

## Files to Modify
- `app/(chef)/locations/purchasing/page.tsx` -- Add a new card component for initiating centralized purchase orders from the cannabis dining hub page

## Files to Create (if any)
- `lib/locations/purchasing-actions.ts` -- {purpose of new file}

## Implementation Notes
- Integrate with the existing purchasing-actions library to create, list, and manage centralized POs
- Ensure seamless navigation from the cannabis dining hub to the centralized purchasing dashboard
- Implement authentication checks to ensure only authorized chefs can access this feature

## Acceptance Criteria
1. Chefs can view a summary of cross-location ingredient needs and initiate new centralized purchase orders directly from their cannabis dining hub page
2. The centralized purchasing dashboard is accessible via a prominent link in the cannabis dining hub, with proper authentication checks
3. `npx tsc --noEmit --skipLibCheck` passes without any new type errors or warnings

## DO NOT
- Modify the feature-classification or modules files
- Add new npm dependencies not related to this specific feature
- Change the existing database schema unrelated to centralized project command functionality
- Delete existing functionality in the cannabis dining hub page
- Use em dashes anywhere