---
status: ready
priority: 'high'
score: 38
ref_accuracy: 50
source_plan: 'system/persona-build-plans/dean-deluca/task-4.md'
source_persona: 'dean-deluca'
exported_at: '2026-04-28T01:13:33.790Z'
---
# Build Task: Batch/Lot Tracking (Critical):
**Source Persona:** dean-deluca
**Gap Number:** 4 of 5
**Severity:** HIGH

## What to Build
Implement a system for tracking batches and lots of ingredients, allowing chefs to quickly see what products are made from. This will involve creating a new "lots" table in the database with fields for lot number, product name, expiration date, and quantity. The frontend should display this information on each recipe card.

## Files to Modify
- `app/(chef)/dashboard/_sections/recipe-card-section.tsx` -- Add a "Lot #" field to the recipe card component
- `app/(chef)/recipes/[id].tsx` -- Update the individual recipe page to show lot info

## Files to Create (if any)
- `app/(chef)/database/migrations/{timestamp}_create_lots_table.sql` -- SQL script to create lots table
- `app/(chef)/api/lot.{ts,js}` -- API endpoint for CRUD operations on lots data

## Implementation Notes
- Use the Prisma ORM to interact with the new lots table
- Ensure proper error handling and validation in the API 
- Display lot info conditionally if a lot exists for that recipe

## Acceptance Criteria
1. A "Lots" page is accessible via dashboard nav, showing all recorded lots
2. Chefs can add/edit/delete lots through this page
3. Lots table schema matches the SQL script
4. Recipe cards show product name, expiration date, and quantity of lot
5. `npx tsc --noEmit --skipLibCheck` passes without errors