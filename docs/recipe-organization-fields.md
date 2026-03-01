# Recipe Organization Fields

**Date:** 2026-03-01
**Branch:** `feature/risk-gap-closure`

## What Changed

Added four new fields to the `recipes` table for better recipe organization, filtering, and browsing.

## New Fields

### `cuisine` (single-select enum)

Database type: `recipe_cuisine` enum

| Value            | Display Label  |
| ---------------- | -------------- |
| `italian`        | Italian        |
| `french`         | French         |
| `mexican`        | Mexican        |
| `japanese`       | Japanese       |
| `chinese`        | Chinese        |
| `indian`         | Indian         |
| `mediterranean`  | Mediterranean  |
| `thai`           | Thai           |
| `korean`         | Korean         |
| `american`       | American       |
| `southern`       | Southern       |
| `middle_eastern` | Middle Eastern |
| `fusion`         | Fusion         |
| `other`          | Other          |

### `meal_type` (single-select enum)

Database type: `recipe_meal_type` enum

| Value          | Display Label  |
| -------------- | -------------- |
| `breakfast`    | Breakfast      |
| `brunch`       | Brunch         |
| `lunch`        | Lunch          |
| `dinner`       | Dinner         |
| `snack_passed` | Snack / Passed |
| `any`          | Any            |

### `season` (multi-select TEXT[])

Predefined options: `Spring`, `Summer`, `Fall`, `Winter`, `Year-Round`

- Selecting "Year-Round" clears individual seasons
- Selecting any individual season clears "Year-Round"

### `occasion_tags` (multi-select TEXT[])

Suggested values: `Date Night`, `Holiday`, `Wedding`, `Corporate`, `Kids Party`, `Outdoor/BBQ`, `Tasting Menu`, `Comfort Food`, `Quick Weeknight`

- Also accepts custom freeform values via text input

## All Fields Are Nullable

No existing recipes are affected. All four fields default to null/empty and are optional on both create and edit forms.

## Files Modified

| File                                                                | Change                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `supabase/migrations/20260330000018_recipe_organization_fields.sql` | Migration: new enums + columns                                                  |
| `lib/recipes/actions.ts`                                            | Constants, Zod schemas, type, filters, create/update                            |
| `app/(chef)/recipes/new/create-recipe-client.tsx`                   | Create form: cuisine/meal_type dropdowns, season checkboxes, occasion tag chips |
| `app/(chef)/recipes/[id]/edit/edit-recipe-client.tsx`               | Edit form: same UI, initialized from recipe data                                |
| `app/(chef)/recipes/recipes-client.tsx`                             | List: cuisine + meal_type filter dropdowns, badges on cards                     |
| `app/(chef)/recipes/page.tsx`                                       | Server page: pass cuisine/meal_type to getRecipes                               |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`                  | Detail: display new fields, copy on duplicate                                   |

## How Filters Work

The recipe list page (`/recipes`) supports URL-based filters:

- `?cuisine=italian` — filter by cuisine
- `?meal_type=dinner` — filter by meal type
- `?category=sauce` — existing category filter (unchanged)
- Filters are combinable: `?cuisine=french&meal_type=dinner&category=sauce`

## Display

- **Recipe cards:** Cuisine badge (blue), meal type badge (purple), dietary tags (green)
- **Recipe detail:** Organization section showing cuisine + meal type, season badges (amber), occasion badges (blue)
- **"Any" meal type** is hidden from card display (not useful as a filter chip)

## Future Enhancements (deferred)

- Browse-by-season page (`/culinary/recipes/season`)
- Browse-by-occasion page (`/culinary/recipes/occasions`)
- Nav config entries for these browse pages
