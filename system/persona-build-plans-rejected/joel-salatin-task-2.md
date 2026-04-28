<!-- REJECTED: all 1 referenced files are missing -->
<!-- 2026-04-28T01:11:33.860Z -->

# Build Task: Develop "Dynamic Fulfillment Invoicing":
**Source Persona:** joel-salatin
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build
Implement a dynamic invoicing system for completed events, allowing chefs to automatically generate and send invoices based on event details and service provided. This will streamline the billing process and reduce manual reconciliation.

## Files to Modify
- `app/(chef)/events/[event-slug]/page.tsx` -- Add a "Generate Invoice" button that triggers the new invoicing flow when clicked.
- `app/(chef)/(new|edit)/invoice/page.tsx` -- Create a new page for building and previewing invoices. This page will pull event details, calculate costs based on menu and recipe data, and allow chefs to add custom charges or discounts.

## Files to Create (if any)
- `lib/invoicing/index.ts` -- A new library file containing functions to calculate total event cost from menus and recipes, and format the invoice data for rendering.
- `components/chef/[component-name]/invoice-preview.tsx` -- A reusable component to display a preview of the generated invoice on both the event detail page and the invoicing page itself.

## Implementation Notes
- Utilize Drizzle ORM to interact with the database and retrieve event details, menu items, and recipe costs.
- Implement a flexible pricing structure that allows chefs to add custom charges or discounts to the base cost of the event.
- Ensure the invoicing system integrates seamlessly with the existing event lifecycle and does not disrupt the current user flow.

## Acceptance Criteria
1. Chefs can generate invoices directly from an event's detail page using a "Generate Invoice" button.
2. The invoicing page accurately calculates total costs based on the selected menu and recipes, as well as any custom charges or discounts added by the chef.
3. Invoices can be previewed and edited before finalizing and sending to clients.
4. The invoicing system does not interfere with existing event functionality and maintains a consistent user experience.

## DO NOT
- Modify files outside of those specified in "Files to Modify" and "Files to Create".
- Add new npm dependencies unrelated to the invoicing feature.
- Alter the database schema for this specific feature.
- Remove or alter existing functionalities related to events, menus, or recipes.