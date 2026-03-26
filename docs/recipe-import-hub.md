# Recipe Import Hub

**Date:** 2026-03-26
**Status:** Implemented

## What Changed

Added a unified Recipe Import Hub at `/recipes/import` that consolidates all recipe import methods into one place, plus a new **batch photo import** capability.

## New Files

| File                                               | Purpose                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `app/(chef)/recipes/import/page.tsx`               | Import Hub server page                                                  |
| `app/(chef)/recipes/import/import-hub-client.tsx`  | Import Hub client component with method grid                            |
| `components/recipes/recipe-photo-batch-import.tsx` | Batch photo import modal (drag-drop, vision AI, review, save)           |
| `lib/recipes/photo-import-actions.ts`              | Server actions: `saveVisionParsedRecipe`, `saveVisionParsedRecipeBatch` |

## Modified Files

| File                                    | Change                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `app/(chef)/recipes/recipes-client.tsx` | Added Import Hub, Photo Import, URL Import buttons (replaced old "Import Link" and "Recipe Dump" buttons) |
| `components/navigation/nav-config.tsx`  | Added "Recipe Import Hub" nav item under Culinary group                                                   |

## Import Methods Available

1. **Photo Import (Batch)** - Drop multiple recipe photos (cards, cookbook pages, handwritten notes). Vision AI (Gemini) extracts name, ingredients, method, times, dietary tags. Chef reviews all extracted recipes, then saves them all at once. Requires `GEMINI_API_KEY`.

2. **URL Import (Batch)** - Paste multiple recipe URLs (one per line). Works with AllRecipes, Food Network, Epicurious, Bon Appetit, and any site using schema.org/Recipe JSON-LD. No AI needed.

3. **Quick URL Import** - Single recipe URL import with preview before saving.

4. **Smart Import (Text)** - Paste or type a recipe. Ollama parses it into structured data. Links to `/recipes/new`.

5. **Brain Dump** - Type everything you know about a recipe in your own words. AI structures it. Links to `/recipes/dump`.

6. **Recipe Sprint** - Queue-based rapid capture for past dishes with no recipe recorded. Links to `/recipes/sprint`.

## Architecture

### Photo Import Flow

```
Chef drops photos → fileToBase64() → parseRecipeFromImage() (Gemini vision)
  → Chef reviews parsed recipes → saveVisionParsedRecipe() → DB insert
  → Ingredients auto-created (case-insensitive dedup) → revalidatePath
```

### Privacy

- Photo import uses Gemini (cloud) because Ollama lacks vision models on 6GB VRAM hardware
- Recipe text is chef IP but low-sensitivity compared to client PII
- URL import uses zero AI (pure HTML parsing)
- Text/brain dump import uses Ollama (local, private)

## How It Connects

The Import Hub links to existing features (sprint, dump, new recipe page) and adds new capabilities (batch photo, batch URL) all in one place. The recipes library page (`/recipes`) now has direct buttons for Import Hub, Photo Import, and URL Import in both desktop and mobile views.

## What This Enables

A chef with years of unorganized recipes can now:

- Photograph stacks of recipe cards and import them all at once
- Paste URLs from recipe sites they've bookmarked over the years
- Brain-dump recipes from memory
- Sprint through past dishes that need recipes recorded

All methods funnel into the same recipe book with full ingredient tracking, cost computation, allergen detection, and dietary tagging.
