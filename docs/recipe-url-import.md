# Recipe Import from URL

## What Changed

Added the ability for chefs to import recipes directly from any recipe website URL. The feature uses schema.org/Recipe JSON-LD structured data (the same format Google uses for rich recipe results) to extract recipe details.

## How It Works

**Two-step flow:** Fetch + Preview, then Save.

1. Chef clicks "Import from URL" on the Recipe Book page
2. Pastes a URL from any recipe site (AllRecipes, Food Network, Bon Appetit, NYT Cooking, etc.)
3. Server action fetches the page, extracts JSON-LD structured data
4. Chef sees a preview: name, description, ingredients (parsed), instructions, times, yield
5. Chef confirms with "Save to Recipe Book"
6. Recipe + ingredients are created in the database (ingredients are matched to existing or created new)

## Files

| File                                          | Purpose                                                           |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `lib/recipes/ingredient-parser.ts`            | Deterministic ingredient string parser (regex, no AI)             |
| `lib/recipes/import-actions.ts`               | Server actions: `fetchRecipeFromUrl()` and `saveImportedRecipe()` |
| `components/recipes/recipe-import-dialog.tsx` | Modal UI with 4 steps: input, preview, saving, done               |
| `app/(chef)/recipes/recipes-client.tsx`       | Modified: added "Import from URL" button + dialog                 |

## Ingredient Parser

Handles common formats without any AI:

- Whole numbers, fractions (1/2), unicode fractions, mixed numbers (1 1/2), ranges (2-3)
- Standard cooking units (cups, tbsp, tsp, oz, lb, etc.) with normalization
- Size descriptors kept in name (e.g., "3 large eggs")
- Preparation notes after commas ("flour, sifted")
- Parenthetical sizes ("1 (14 oz) can diced tomatoes")
- Special cases: "pinch of", "to taste", "dash of"

## JSON-LD Extraction

Handles multiple schema.org patterns:

- Direct `@type: "Recipe"` objects
- Array of types `["Recipe", "HowTo"]`
- WordPress/Yoast `@graph` arrays with nested Recipe nodes
- Multiple JSON-LD blocks per page (tries each one)

## Category Mapping

Imported recipes get auto-categorized based on `recipeCategory` field from the schema data. Maps common categories (appetizer, soup, dessert, main course, etc.) to ChefFlow's recipe_category enum. Falls back to "other" if no match.

## Design Decisions

- **No AI dependency.** Pure HTML fetch + regex parsing + JSON extraction. Works offline (except for the URL fetch).
- **No new dependencies.** Uses built-in `fetch()` and regex to extract JSON-LD. No cheerio/jsdom needed since we only need the JSON-LD script tags.
- **Preview before save.** Chef sees exactly what will be imported and can cancel. No blind imports.
- **Non-blocking ingredient failures.** If one ingredient fails to parse/create, the rest still get added. The recipe is created regardless.
- **Source URL saved in notes.** The recipe's `notes` field stores the source URL for attribution.
- **Ingredients matched first.** Uses case-insensitive lookup to find existing ingredients before creating new ones, avoiding duplicates.
