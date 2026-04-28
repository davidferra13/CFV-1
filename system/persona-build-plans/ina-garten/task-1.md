# Build Task: Implement Advanced Inventory Module:
**Source Persona:** ina-garten
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build
Implement a robust inventory management system for chefs to track ingredients, equipment, and supplies. This module will allow chefs to add items, set reorder points, view usage trends, and generate purchase orders.

## Files to Modify
- `app/(chef)/inventory/page.tsx` -- Update the UI to include forms for adding/editing inventory items, display tables for viewing item details and usage stats.
- `app/(chef)/inventory/api/[id].tsx` -- Implement CRUD operations for individual inventory items.
- `app/(chef)/inventory/api/index.tsx` -- Create endpoints for fetching and updating inventory data.

## Files to Create (if any)
- `app/(chef)/inventory/api/useInventoryData.tsx` -- A custom hook to manage the state of inventory data fetched from the server.

## Implementation Notes
- Use Drizzle ORM to interact with the PostgreSQL database for all inventory-related operations.
- Implement optimistic UI updates using the "conflict-free" pattern, where changes are first made client-side and then synced with the server.
- Utilize Tailwind CSS classes to create a visually appealing and responsive design for the inventory pages.

## Acceptance Criteria
1. Chefs can add new inventory items (ingredients, equipment, supplies) with fields for name, description, unit of measure, quantity on hand, reorder point, and supplier details.
2. Existing inventory items can be edited or deleted via their respective detail pages.
3. The system displays a list of all inventory items in the database, showing current quantities and reorder status.
4. Usage trends are shown for each item, allowing chefs to see how much they've used over various time periods (e.g., last week, last month).
5. Generating purchase orders is streamlined based on items that have fallen below their reorder points or by manually selecting needed items.

## DO NOT
- Modify the `/schedule` or `/privacy` pages.
- Change any existing functionality outside of the inventory module.
- Introduce new npm dependencies not related to the inventory system.