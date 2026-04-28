# Build Task: Advanced Inventory/Supply Chain:

**Source Persona:** andrew-zimmern
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build

Implement a feature that allows chefs to manage their inventory and supplier relationships directly within the ChefFlow application. This will include viewing supplier contact information, placing orders for ingredients, and tracking order status.

## Files to Modify

- `app/(chef)/culinary/price-catalog/catalog-browser.tsx` -- Add new components for displaying supplier contact info and placing orders.
- `app/(chef)/help/supply-chain/page.tsx` -- Create a dedicated page for managing supplier relationships.

## Files to Create (if any)

- `app/(chef)/suppliers/[id]/page.tsx` -- A detailed view of a single supplier, showing their contact info, order history, and ability to place new orders.
- `app/(chef)/suppliers/page.tsx` -- An overview page listing all suppliers the chef works with.

## Implementation Notes

- Use Drizzle ORM to interact with the PostgreSQL database for inventory tracking and supplier data.
- Integrate Twilio API for placing phone calls to suppliers as part of the order process.
- Ensure proper authentication checks are in place so only authorized chefs can access these features.

## Acceptance Criteria

1. Chefs can view a list of all their active suppliers from the supply chain page.
2. Clicking on a supplier takes them to a detailed view showing contact info, past orders, and ability to place new orders.
3. Placing an order involves selecting ingredients, quantities, and choosing to have ChefFlow call the supplier directly.
4. Order status is tracked and displayed in both the supplier details page and the main supply chain overview.
5. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT

- Modify any files outside of those listed under "Files to Modify".
- Add new npm dependencies not directly related to implementing this feature.
- Change the existing database schema in a way that could break other functionality.
- Remove or alter existing features unrelated to this specific gap.
