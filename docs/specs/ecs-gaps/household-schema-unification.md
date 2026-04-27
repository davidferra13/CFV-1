# ECS Gap: Household Schema Unification

> Source: ECS Scorecard 2026-04-27 | User Type: Household (77/100) | Dimension: Flow Continuity (12/20)

## Problem
Two disconnected household schemas:
- `households` + `household_members` (migration 20260221000006) links clients to households
- `hub_household_members` (migration 20260401000125) links to hub_guest_profiles
No bridge between them. Data entered in one system is invisible to the other.

## Spec
1. Audit both schemas: which has more data? Which is more actively used?
2. Choose one as canonical (likely `hub_household_members` since it's newer and more actively maintained)
3. Create a migration that bridges or consolidates:
   - Option A: Create a view that unions both tables
   - Option B: Migrate data from old to new, deprecate old tables
   - Option C: Add foreign key bridge between the two
4. Ensure all downstream consumers read from the canonical source

## CAUTION
This involves schema changes. Requires developer approval before any migration. Additive only. No DROP TABLE.

## Acceptance
- Single canonical household data source
- All consumers read from one place
- No data loss during migration
- Developer approval obtained before migration
