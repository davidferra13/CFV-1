# Culinary Operations

**What:** Recipes, menus, ingredients, costing, prep. The chef's craft, digitized.

**Routes:** `/menus`, `/recipes`, `/ingredients`, `/components`, `/costing`, `/prep`, `/vendors`, `/inventory`, `/culinary-board`, `/seasonal-palettes`
**Key files:** `app/(chef)/recipes/`, `app/(chef)/menus/`, `lib/pricing/resolve-price.ts`
**Status:** DONE

## What's Here

- Menus: library, detail view, drag-drop dish editor, event usage history, pricing
- Recipes: full detail with ingredients, yield, nutrition (AI), technique tags, photos, cost breakdown, scaled ingredient lists. Manual entry only (AI never generates recipes)
- Ingredients: master list, cost history, sustainability, allergen classification (FDA Big 9)
- Price Catalog: 15K+ items from OpenClaw, 10-tier price resolution chain
- Components: pre-prep elements with quantities and cost
- Costing: per-event menu cost breakdown, per-guest, historical trending
- Prep: timeline manager with active timers, countdowns, station assignments, alerts
- Vendors: supplier list, contact, pricing, order history
- Inventory: on-hand stock, reorder alerts, movement log
- Culinary Board: kanban (brainstorm > design > test > approved)
- Seasonal Palettes: seasonal ingredient/dish curation

## Open Items

None. Fully functional.
