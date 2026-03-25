# Recipe Photo Import

**Date:** 2026-03-25
**Status:** Implemented

## What Changed

Added a new "Recipe Photos" import mode that lets chefs photograph recipe cards, printed pages, handwritten notes, or cookbook pages and have them automatically parsed into structured recipes.

## How It Works

1. Chef goes to `/import` and selects the "Recipe Photos" tab
2. Uploads up to 20 photos at a time (drag-and-drop, file picker, or camera capture on mobile)
3. Clicks "Parse" to send all photos through Gemini vision analysis
4. Each photo produces a structured recipe with: name, category, ingredients (with quantities, units, allergens), method, yield, times, dietary tags
5. Chef reviews each parsed recipe, can edit the name and method inline
6. Chef clicks "Save" on each recipe (or "Save All" for batch approval)
7. Saved recipes appear in the Recipe Library with full ingredient links

## Architecture

```
Photo upload (client)
  -> base64 encode
  -> parseRecipeFromImage() [Gemini 2.5 Flash vision]
  -> ParsedRecipeSchema validation (Zod, same schema as text parser)
  -> Chef reviews in UI
  -> importRecipe() [existing server action]
  -> recipes table + ingredients table + recipe_ingredients links
```

## Files

| File                                        | Purpose                                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/parse-recipe-vision.ts`             | Gemini vision parser for recipe photos. Dedicated prompt optimized for handwritten cards, printed pages, cookbook photos. Returns full ParsedRecipe schema. |
| `components/import/recipe-photo-import.tsx` | Client component: batch upload, parse, review, edit, save. Handles all UI states (queued, parsing, parsed, saving, saved, error).                           |
| `components/import/smart-import-hub.tsx`    | Added 'recipe-photos' mode and tab. Routes to RecipePhotoImport component.                                                                                  |

## AI Policy

Uses Gemini cloud (not Ollama) because vision models require more VRAM than available (6GB). Recipe text (names, ingredients, methods) is chef IP but LOW-sensitivity compared to client PII. Acceptable trade-off until a local vision model becomes viable.

## Privacy Classification

Recipe content: LOW sensitivity (chef's own creative work, no client PII)
Acceptable for cloud processing via Gemini.

## Reuses Existing Infrastructure

- `ParsedRecipeSchema` from `lib/ai/parse-recipe-schema.ts` (same validation as text parser)
- `importRecipe()` from `lib/ai/import-actions.ts` (same save logic as brain dump and text import)
- `findOrCreateIngredient()` for deduplicating ingredients across imports

## Future Improvements

- Multi-recipe detection: if a photo contains multiple recipes (e.g., a cookbook spread), parse all of them
- Handwriting confidence scoring: flag specific words that were hard to read
- Re-parse with different model if confidence is low
- Direct camera integration (live viewfinder with recipe detection overlay)
