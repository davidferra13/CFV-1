# Build Task: Basic Inventory:
**Source Persona:** dean-deluca
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build
Implement a basic inventory feature for events, allowing chefs to view and manage the essential items needed for their day-of protocol (DOP).

## Files to Modify
- `app/(chef)/events/[id]/dop/mobile/page.tsx` -- Add a new section below the DOP schedule and manual completions for displaying the basic inventory. Use Drizzle ORM queries to fetch the inventory data from the database.

## Files to Create (if any)
- `app/(chef)/events/[id]/inventory/page.tsx` -- Create a dedicated page component for displaying the event's basic inventory. This will include a header, list of items, and possibly an "Add Item" button to allow chefs to manage their inventory directly from this screen.

## Implementation Notes
- Use Drizzle ORM to interact with the PostgreSQL database for fetching and updating the inventory data.
- Ensure proper error handling and loading states are implemented in both the mobile DOP page and the new inventory page.
- Consider using Tailwind CSS classes for styling the inventory section consistently with the rest of the application.

## Acceptance Criteria
1. Chefs can view a list of basic inventory items associated with an event on the day-of protocol mobile page.
2. The inventory list is populated from the database using Drizzle ORM queries.
3. Clicking "Add Item" (if implemented) opens a modal or redirects to a new page where chefs can add, edit, and remove inventory items.
4. `npx tsc --noEmit --skipLibCheck` passes without any new type errors related to the basic inventory feature.

## DO NOT
- Modify the existing DOP schedule or manual completions logic in the mobile DOP page component.
- Add new npm dependencies for this specific feature.
- Change the database schema outside of adding tables and fields necessary for storing basic inventory data.