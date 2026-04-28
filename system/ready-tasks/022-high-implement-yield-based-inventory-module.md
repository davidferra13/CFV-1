---
status: ready
priority: 'high'
score: 38
ref_accuracy: 50
source_plan: 'system/persona-build-plans/joel-salatin/task-1.md'
source_persona: 'joel-salatin'
exported_at: '2026-04-28T01:13:33.790Z'
---
# Build Task: Implement "Yield-Based Inventory Module":
**Source Persona:** joel-salatin
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build
Implement a yield-based inventory module for ChefFlow. This module will track and display the quantity of harvested ingredients from each farm or supplier, allowing chefs to monitor their usage and optimize procurement based on actual yields.

## Files to Modify
- `app/(chef)/inventory/page.tsx` -- Update existing page component to include yield tracking features

## Files to Create (if any)
- `app/(chef)/inventory/modals/yield-entry-modal.tsx` -- New modal component for entering harvested ingredient quantities

## Implementation Notes
- Utilize Drizzle ORM to create a new `ingredient_yields` table that stores supplier, ingredient, and yield quantity data.
- Implement a form in the inventory page where chefs can enter the harvested amounts of each ingredient from their suppliers.
- Display a summary graph showing total yields by ingredient and supplier over time.
- Calculate and display insights on ingredient usage ratios and potential procurement optimizations based on historical yield data.

## Acceptance Criteria
1. Chefs can view their current inventory levels, including counts per ingredient and supplier.
2. A modal form allows chefs to log the quantity harvested for each ingredient from each supplier.
3. Yield data is persisted in a `ingredient_yields` table using Drizzle ORM.
4. The inventory page displays a graph showing total yields by ingredient and supplier over time.
5. The system calculates insights on ingredient usage ratios and potential procurement optimizations based on historical yield data.

## DO NOT
- Modify the existing `/api/inventory` routes or database schema related to inventory counts
- Add new npm dependencies outside of those specified for this task
- Delete any existing functionality from the inventory page component
- Implement features not directly related to yield tracking and optimization