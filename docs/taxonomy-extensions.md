# Taxonomy Extensions

Per-chef customization of dropdown lists and taxonomy categories throughout ChefFlow. Chefs can add custom entries and hide system defaults they do not use.

## Overview

ChefFlow ships with system default values for 12 taxonomy categories (cuisines, occasions, courses, stations, etc.). These defaults come from constants files and are always available. The taxonomy extensions feature adds two database tables that let each chef:

1. **Add custom entries** to any category (stored in `chef_taxonomy_extensions`)
2. **Hide system defaults** they do not use (stored in `chef_taxonomy_hidden`)

The merged result (system defaults minus hidden, plus custom entries) is what appears in dropdowns, pickers, and filters across the app.

## Supported Categories

| Category             | Description                           | Source of system defaults                  |
| -------------------- | ------------------------------------- | ------------------------------------------ |
| `cuisine`            | Recipe cuisine types                  | `lib/recipes/recipe-constants.ts`          |
| `occasion`           | Event occasion types                  | `lib/recipes/recipe-constants.ts`          |
| `season`             | Seasonal tags for recipes             | `lib/recipes/recipe-constants.ts`          |
| `meal_type`          | Meal categories (Breakfast, etc.)     | `lib/recipes/recipe-constants.ts`          |
| `course`             | Course types for fire order and menus | `lib/events/fire-order-constants.ts`       |
| `station`            | Classical brigade kitchen stations    | `lib/events/fire-order-constants.ts`       |
| `inquiry_source`     | Where leads come from                 | `lib/constants/business.ts`                |
| `menu_type`          | Service styles (Plated, Buffet, etc.) | `lib/constants/business.ts`                |
| `expense_category`   | Business expense categories           | `lib/constants/business.ts`                |
| `equipment_category` | Kitchen equipment categories          | `lib/equipment/constants.ts`               |
| `waste_reason`       | Food waste tracking reasons           | `lib/waste/constants.ts`                   |
| `sourcing_type`      | Ingredient sourcing methods           | `lib/sustainability/sourcing-constants.ts` |

## Database Tables

Migration: `database/migrations/20260401000093_chef_taxonomy_extensions.sql`

### `chef_taxonomy_extensions`

Custom entries added by chefs. Each entry is scoped to a single chef and category.

| Column        | Type        | Notes                                    |
| ------------- | ----------- | ---------------------------------------- |
| id            | UUID (PK)   | Auto-generated                           |
| chef_id       | UUID (FK)   | References `chefs(id)`, cascading delete |
| category      | TEXT        | One of the 12 supported categories       |
| value         | TEXT        | Slug identifier (lowercase, underscored) |
| display_label | TEXT        | Human-readable label                     |
| sort_order    | INT         | Controls display position                |
| metadata      | JSONB       | Optional extra data (e.g., course color) |
| created_at    | TIMESTAMPTZ | Auto-set                                 |

Unique constraint on `(chef_id, category, value)`.

### `chef_taxonomy_hidden`

Records which system defaults a chef has chosen to hide.

| Column     | Type        | Notes                                    |
| ---------- | ----------- | ---------------------------------------- |
| id         | UUID (PK)   | Auto-generated                           |
| chef_id    | UUID (FK)   | References `chefs(id)`, cascading delete |
| category   | TEXT        | One of the 12 supported categories       |
| value      | TEXT        | The system default value to hide         |
| created_at | TIMESTAMPTZ | Auto-set                                 |

Unique constraint on `(chef_id, category, value)`.

Both tables have RLS policies restricting access to the owning chef via `user_roles`.

## Server Actions

All actions are in `lib/taxonomy/actions.ts`. They require chef authentication via `requireChef()`.

| Action                  | Parameters                                 | Returns               | Description                                    |
| ----------------------- | ------------------------------------------ | --------------------- | ---------------------------------------------- |
| `getTaxonomy`           | `category`                                 | `TaxonomyEntry[]`     | All entries (system + custom) with hidden flag |
| `getActiveTaxonomy`     | `category`                                 | `TaxonomyEntry[]`     | Only visible entries (for dropdowns/pickers)   |
| `getTaxonomyOptions`    | `category`                                 | `TaxonomyEntry[]`     | Alias for getActiveTaxonomy (convenience)      |
| `addTaxonomyEntry`      | `category, value, displayLabel, metadata?` | `{ success, error? }` | Add a custom entry                             |
| `removeTaxonomyEntry`   | `id`                                       | `{ success, error? }` | Remove a custom entry (not system defaults)    |
| `hideTaxonomyDefault`   | `category, value`                          | `{ success, error? }` | Hide a system default for the current chef     |
| `unhideTaxonomyDefault` | `category, value`                          | `{ success, error? }` | Restore a hidden system default                |
| `reorderTaxonomy`       | `category, orderedIds`                     | `{ success, error? }` | Reorder custom entries by ID                   |

Mutations emit a `taxonomy.updated` webhook as a non-blocking side effect and call `revalidatePath('/settings/taxonomy')`.

## API Endpoints

REST endpoints at `/api/v2/settings/taxonomy`:

| Method | Path                                         | Scope            | Description                         |
| ------ | -------------------------------------------- | ---------------- | ----------------------------------- |
| GET    | `/api/v2/settings/taxonomy?category=cuisine` | `settings:read`  | List merged taxonomy for a category |
| POST   | `/api/v2/settings/taxonomy`                  | `settings:write` | Add a custom entry                  |
| DELETE | `/api/v2/settings/taxonomy/:id`              | `settings:write` | Remove a custom entry               |

## Settings Page

Route: `/settings/taxonomy`

The page renders the `TaxonomySettings` component, which displays all 12 categories. For each category, chefs can:

- View the merged list of system defaults and custom entries
- Add new custom entries with a label
- Remove custom entries
- Hide system defaults (they appear dimmed/toggled off)
- Restore hidden system defaults

## Client Hook

`components/hooks/use-taxonomy.ts` exports `useTaxonomy(category)`:

- Returns `{ entries, loading }`
- Instantly shows system defaults while fetching the chef's customizations
- Falls back to system defaults on error
- Includes proper cleanup to avoid state updates on unmounted components

Use this hook in any client component that needs a taxonomy dropdown or picker.

## Key Files

| File                                                              | Purpose                             |
| ----------------------------------------------------------------- | ----------------------------------- |
| `lib/taxonomy/types.ts`                                           | TypeScript types and category list  |
| `lib/taxonomy/system-defaults.ts`                                 | Maps categories to constant sources |
| `lib/taxonomy/actions.ts`                                         | Server actions (CRUD + hide/unhide) |
| `components/hooks/use-taxonomy.ts`                                | Client hook for dropdowns           |
| `app/(chef)/settings/taxonomy/page.tsx`                           | Settings UI page                    |
| `components/settings/taxonomy-settings.tsx`                       | Client component with tabbed UI     |
| `app/api/v2/settings/taxonomy/route.ts`                           | API v2: GET + POST                  |
| `app/api/v2/settings/taxonomy/[id]/route.ts`                      | API v2: DELETE by ID                |
| `database/migrations/20260401000093_chef_taxonomy_extensions.sql` | Database migration                  |
