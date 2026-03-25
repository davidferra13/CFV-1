# Recipe Dump & Recipe Families

**Date:** 2025-03-25
**Feature:** Recipe brain dump with variation/family support

## What Changed

### 1. Recipe Families (Variations System)

**Migration:** `supabase/migrations/20260401000101_recipe_families.sql`

New `recipe_families` table:

- `id`, `tenant_id`, `name`, `description`, `created_at`, `updated_at`
- Unique constraint on `(tenant_id, lower(name))` to prevent duplicate family names

New columns on `recipes`:

- `family_id` (FK to recipe_families, nullable)
- `variation_label` (text, e.g., "Classic", "Vegan", "Gluten-Free")

**How it works:**

- A family groups related recipes (e.g., "Chocolate Lava Cake" family)
- Each recipe in the family has a variation label (e.g., "Classic", "Vegan")
- Recipes don't have to belong to a family (optional)
- The first recipe saved creates the family when you click "Add Variation"

### 2. Recipe Dump Page

**Route:** `/recipes/dump`
**Files:**

- `app/(chef)/recipes/dump/page.tsx` (server page)
- `app/(chef)/recipes/dump/recipe-dump-client.tsx` (client component)

**Flow:**

1. Type recipe name (optional, Ollama figures it out)
2. Dump everything you know in a text box (natural language)
3. Press Ctrl+Enter or click "Parse Recipe"
4. Ollama parses into structured recipe (name, category, ingredients with quantities/units, method, times, yield, dietary tags, allergens)
5. Review the parsed result
6. Save (Ctrl+Enter or click "Save Recipe")
7. After saving: choose "Add Variation" or "New Recipe"
8. "Add Variation" creates a family (if first time) and lets you enter the next version

**Variation flow:**

- When you click "Add Variation", the system creates a `recipe_families` entry
- The original recipe gets `variation_label: "Classic"` and is assigned to the family
- You then enter the variation (e.g., "Vegan Chocolate Lava Cake") with its own ingredients
- That recipe is also assigned to the same family

### 3. Recipe List Updates

**File:** `app/(chef)/recipes/recipes-client.tsx`

- "Recipe Dump" button added to header (desktop + mobile)
- Recipe cards show family name and variation label
- Empty state now prioritizes "Recipe Dump" as the primary action

### 4. Server Actions Added

**File:** `lib/recipes/actions.ts`

New actions:

- `createRecipeFamily(name, description?, initialRecipeId?, variationLabel?)` - Create a family, optionally assign first recipe
- `assignRecipeToFamily(recipeId, familyId, variationLabel?)` - Add recipe to existing family
- `removeRecipeFromFamily(recipeId)` - Remove recipe from family
- `getRecipeFamilies()` - List all families with recipe counts
- `getRecipesInFamily(familyId)` - Get all recipes in a family
- `createRecipeInFamily(input, familyId, variationLabel)` - Create + assign in one step

Updated:

- `RecipeListItem` type now includes `family_id`, `variation_label`, `family_name`
- `getRecipes()` now fetches and maps family names

## Architecture Notes

- Recipe families are tenant-scoped (like everything else)
- Family name is unique per tenant (case-insensitive)
- Deleting a family sets `family_id` to null on all member recipes (ON DELETE SET NULL)
- No hierarchy within families (flat grouping, not parent-child)
- AI parsing uses Ollama exclusively (private, local, no data leaves the machine)
