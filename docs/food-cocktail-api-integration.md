# Open Food Facts & TheCocktailDB Integration

**Date:** 2026-02-26
**Branch:** feature/risk-gap-closure

## Summary

Wired two free, no-API-key-needed external services into ChefFlow's culinary features:

1. **Open Food Facts** — packaged product search for ingredient details, allergens, and nutrition
2. **TheCocktailDB** — cocktail recipe search for beverage pairing suggestions in menu building

## What Changed

### New Files

| File                                          | Purpose                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `lib/food/actions.ts`                         | Server actions wrapping both APIs (chef-only, try/catch protected)                          |
| `components/recipes/product-lookup-panel.tsx` | Open Food Facts search UI — product name/barcode search, allergen badges, nutrition summary |
| `components/menus/cocktail-browser-panel.tsx` | TheCocktailDB search UI — name/spirit search, cocktail detail, "Use as pairing" action      |

### Modified Files

| File                                                    | Change                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `app/(chef)/recipes/[id]/edit/edit-recipe-client.tsx`   | Added "Search Product" toggle + ProductLookupPanel + allergen warning banner                            |
| `app/(chef)/recipes/ingredients/ingredients-client.tsx` | Added "Search Product" toggle + ProductLookupPanel in ingredient library                                |
| `components/menus/menu-doc-editor.tsx`                  | Added CocktailBrowserPanel in sidebar, cocktail selection creates new "Drinks" course with pairing info |
| `app/(chef)/menus/[id]/menu-detail-client.tsx`          | Added CocktailBrowserPanel on draft/shared menus                                                        |

## Architecture

### Server Actions (`lib/food/actions.ts`)

All actions follow existing patterns:

- `'use server'` directive
- `await requireChef()` for auth
- Try/catch with `console.error('[non-blocking]')` on failure
- Return empty arrays/null on error (non-blocking side effects)

Actions:

- `searchFoodProductsAction(query, pageSize)` — search by product name
- `getFoodProductByBarcodeAction(barcode)` — barcode lookup
- `searchCocktailsAction(query)` — cocktail name search
- `searchCocktailsByIngredientAction(ingredient)` — search by spirit/ingredient
- `getCocktailByIdAction(id)` — full cocktail detail lookup

### Open Food Facts Integration

**Where it appears:**

- Recipe edit page (`/recipes/[id]/edit`) — "Search Product" button in the Ingredients section header
- Ingredient Library (`/recipes/ingredients`) — "Search Product" button in the page header

**What it does:**

- Search by product name or barcode
- Shows: product name, brand, image, allergens, NutriScore, nutrition per 100g, categories
- Allergen detection: when a product with allergens is selected, a warning banner appears with the allergen list
- `onAllergensFound` callback allows parent components to react to allergen data

### TheCocktailDB Integration

**Where it appears:**

- Menu doc editor sidebar (for unlocked menus) — between Season and Pricing panels
- Menu detail page (for draft/shared menus) — below the Dishes section

**What it does:**

- Search by cocktail name (e.g., "Negroni") or by spirit/ingredient (e.g., "gin")
- Shows: cocktail name, thumbnail, glass type, alcoholic/non-alcoholic badge, ingredients with measures, preparation instructions, category
- "Use as beverage pairing" button: creates a new "Drinks" course on the menu with the cocktail details auto-filled into the dish name, description, and beverage pairing fields

## Design Decisions

1. **Both APIs are free with no key** — no env vars needed, no cost
2. **Non-blocking pattern** — all API calls wrapped in try/catch; failures are logged but never block the main workflow
3. **Product lookup is a toggle** — hidden by default to keep the UI clean; click "Search Product" to reveal
4. **Cocktail browser in sidebar** — placed in the existing menu editor sidebar where it's contextually relevant during menu composition
5. **Cocktail adds a full course** — selecting a cocktail creates a "Drinks" course with all fields filled, rather than just filling a text field. This makes the cocktail a first-class menu item.
6. **24h cache** — both utility files use `next: { revalidate: 86400 }` for fetch caching

## Testing

- Start dev server on port 3100
- Navigate to `/recipes/[id]/edit` — click "Search Product", search for "olive oil" or scan a barcode
- Navigate to `/recipes/ingredients` — click "Search Product" in the header
- Navigate to `/menus/[id]/editor` — in the sidebar, use the Cocktail Browser to search "Margarita" or search by ingredient "gin"
- Navigate to `/menus/[id]` (draft menu) — scroll down to see the Cocktail Browser panel
