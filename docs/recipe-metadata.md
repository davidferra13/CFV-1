# Recipe Metadata Enhancement

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`

## What Changed

Added four new metadata fields to recipes:

| Field                | Column                 | Type             | Description                                                             |
| -------------------- | ---------------------- | ---------------- | ----------------------------------------------------------------------- |
| Servings             | `servings`             | `INTEGER`        | How many people this recipe serves                                      |
| Calories per Serving | `calories_per_serving` | `INTEGER`        | Manual calorie count (USDA auto-calc also available via NutritionPanel) |
| Difficulty           | `difficulty`           | `SMALLINT (1-5)` | Skill level: 1=Easy, 2=Simple, 3=Moderate, 4=Advanced, 5=Expert         |
| Equipment            | `equipment`            | `TEXT[]`         | Required equipment (e.g., stand mixer, food processor)                  |

## Files Modified

- **Migration:** `supabase/migrations/20260327000002_recipe_metadata.sql` — additive ALTER TABLE
- **Server actions:** `lib/recipes/actions.ts` — updated Create/Update schemas + insert/update logic
- **Create form:** `app/(chef)/recipes/new/create-recipe-client.tsx` — new form fields
- **Edit form:** `app/(chef)/recipes/[id]/edit/edit-recipe-client.tsx` — new form fields
- **Detail page:** `app/(chef)/recipes/[id]/recipe-detail-client.tsx` — display + duplicate support

## Design Decisions

1. **Servings vs Yield** — Kept separate. Yield can be "2 cups" or "1 loaf", servings is always a people count. Both are useful for different contexts.

2. **Calories — manual override** — The existing `NutritionPanel` already computes calories from USDA data per-ingredient. This field is a simple manual override for when the chef knows the number (e.g., from a lab test or recipe source).

3. **Difficulty — clickable 1-5 scale** — Visual toggle buttons that fill in like a rating. Click the same number again to deselect (set to 0/unset).

4. **Equipment — comma-separated text** — Same UX pattern as dietary tags. Stored as `TEXT[]` in the database, displayed as pill badges on the detail page.

5. **`as any` casts** — Used because `types/database.ts` hasn't been regenerated yet. These casts will be unnecessary after running `npx supabase gen types` post-migration.

## How to Apply

1. Run the migration: `supabase db push --linked`
2. Regenerate types: `npx supabase gen types typescript --linked > types/database.ts`
3. Remove `as any` casts from recipe components (optional cleanup)
