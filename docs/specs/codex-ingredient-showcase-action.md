---
title: Ingredient Showcase Auto-Builder
status: ready
agent: codex
scope: narrow
risk: low
---

# Ingredient Showcase Auto-Builder

## Purpose

Create a server function that, given an event ID, automatically builds ingredient showcase data from the database. This replaces the current manual text entry for the "Ingredients And Source" section on public event pages.

The function queries the menu -> recipe -> ingredient chain and returns data in the exact shape the public event page already consumes (`ingredientLines[]` and `sourceLinks[]`).

NO UI changes in this spec. Just the data pipeline function.

## Background

### Current State

The public event page (`app/(public)/e/[shareToken]/public-event-view.tsx`) has an "Ingredients And Source" section that renders:

- `config.supplier.ingredientLines` - array of strings (ingredient names/descriptions)
- `config.supplier.sourceLinks` - array of `{ ingredient, sourceName, notes? }`

These are currently populated MANUALLY via the `DinnerCircleConfig.supplier` JSON field. There is no auto-population from the database.

### What Already Exists (DO NOT recreate)

- **`event_ingredient_lifecycle` SQL VIEW**: Computes per-ingredient quantities for an event. Columns: `event_id`, `chef_id`, `ingredient_id`, `ingredient_name`, `unit`, `recipe_qty`, `buy_qty`, `purchased_qty`, `used_qty`, `computed_leftover_qty`, `last_price_cents`.
- **`ingredients` table**: Has `preferred_vendor` TEXT, `category` TEXT.
- **`DinnerCircleSourceLink` type** in `lib/dinner-circles/types.ts`: `{ ingredient: string; sourceName: string; notes?: string }`.
- **`lib/db/server.ts`**: Exports `createServerClient()` for the compat DB layer.

## Files to Create

### 1. `lib/dinner-circles/ingredient-showcase.ts`

Write this exact content:

```typescript
'use server'

import { createServerClient } from '@/lib/db/server'
import type { DinnerCircleSourceLink } from '@/lib/dinner-circles/types'

export interface IngredientShowcaseResult {
  ingredientLines: string[]
  sourceLinks: DinnerCircleSourceLink[]
}

/**
 * Build ingredient showcase data for an event from the database.
 * Queries the event's menu chain (menu -> dish -> component -> recipe -> ingredient)
 * via the event_ingredient_lifecycle view, then enriches with vendor data.
 *
 * Returns data in the same shape as DinnerCircleConfig.supplier so it can
 * be used as a fallback when manual entries are empty.
 */
export async function buildEventIngredientShowcase(
  eventId: string,
  tenantId: string
): Promise<IngredientShowcaseResult> {
  const db: any = createServerClient({ admin: true })

  // 1. Get lifecycle data for this event from the view
  const { data: lifecycle } = await db
    .from('event_ingredient_lifecycle')
    .select('ingredient_id, ingredient_name, unit, recipe_qty')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)

  if (!lifecycle || lifecycle.length === 0) {
    return { ingredientLines: [], sourceLinks: [] }
  }

  // 2. Get ingredient details with vendor info
  const ingredientIds = (lifecycle as any[]).map((l: any) => l.ingredient_id)
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, category, preferred_vendor')
    .in('id', ingredientIds)

  const detailMap: Record<
    string,
    { name: string; category: string | null; preferred_vendor: string | null }
  > = {}
  for (const ing of ingredients ?? []) {
    detailMap[ing.id] = {
      name: ing.name,
      category: ing.category ?? null,
      preferred_vendor: ing.preferred_vendor ?? null,
    }
  }

  // 3. Build ingredient lines and source links
  const ingredientLines: string[] = []
  const sourceLinks: DinnerCircleSourceLink[] = []
  const seenIngredients = new Set<string>()

  for (const item of lifecycle as any[]) {
    const detail = detailMap[item.ingredient_id]
    const name = detail?.name ?? item.ingredient_name

    // Deduplicate (same ingredient may appear in multiple recipes)
    if (seenIngredients.has(item.ingredient_id)) continue
    seenIngredients.add(item.ingredient_id)

    ingredientLines.push(name)

    if (detail?.preferred_vendor) {
      sourceLinks.push({
        ingredient: name,
        sourceName: detail.preferred_vendor,
      })
    }
  }

  return { ingredientLines, sourceLinks }
}
```

## Files to Modify

NONE. This spec only creates one new file. The integration into `public-event-view.tsx` is a separate task.

## DO NOT

- Do NOT modify `public-event-view.tsx` or any page files
- Do NOT modify `types/database.ts`
- Do NOT modify any existing files
- Do NOT add authentication checks (this function receives tenantId as a parameter from already-authenticated callers)
- Do NOT add npm dependencies
- Do NOT create database tables or migrations
- Do NOT import from `@/lib/auth/get-user` (the caller handles auth)

## Verification

1. `npx tsc --noEmit --skipLibCheck` must pass
2. The import paths must resolve:
   - `@/lib/db/server` (existing)
   - `@/lib/dinner-circles/types` (existing, exports `DinnerCircleSourceLink`)
3. The function must return `IngredientShowcaseResult` with `ingredientLines: string[]` and `sourceLinks: DinnerCircleSourceLink[]`

## Commit

```
feat(showcase): add buildEventIngredientShowcase server action

Auto-builds ingredient showcase data from event menu chain.
Returns ingredientLines and sourceLinks matching existing
DinnerCircleConfig.supplier shape for public event pages.
```
