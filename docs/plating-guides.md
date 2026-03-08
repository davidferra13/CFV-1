# Plating Guides Feature

**Date:** 2026-03-08
**Branch:** feature/risk-gap-closure

## What This Is

Per-dish visual presentation instructions that chefs share with staff. When a sous chef is plating the amuse-bouche, they need structured information: what vessel, where each component goes, garnish placement, sauce technique.

## Database

**Table:** `plating_guides` (migration `20260330000077`)
- `chef_id` scoped (new table convention)
- Optional `recipe_id` foreign key (links to recipes table, SET NULL on delete)
- `components` JSONB array of `{name, placement, technique, notes}`
- RLS policy: chef manages own guides via `get_current_tenant_id()`
- Auto-updating `updated_at` trigger

## Server Actions

**File:** `lib/recipes/plating-actions.ts`

| Action | Purpose |
|--------|---------|
| `createPlatingGuide(data)` | Create new guide, optionally linked to recipe |
| `updatePlatingGuide(id, data)` | Update existing guide (tenant-scoped) |
| `deletePlatingGuide(id)` | Delete guide (tenant-scoped) |
| `getPlatingGuide(recipeId)` | Get guide for a specific recipe |
| `getPlatingGuides()` | Get all guides for current chef |
| `getEventPlatingGuides(eventId)` | Get guides for recipes in event's menu |

All actions use `requireChef()` for auth and scope by `chef_id = user.tenantId`.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `PlatingGuideCard` | `components/recipes/plating-guide.tsx` | Display card with print support |
| `PlatingGuideEditor` | `components/recipes/plating-guide-editor.tsx` | Create/edit form with dynamic component list |
| `EventPlatingGuidesPanel` | `components/events/event-plating-guides-panel.tsx` | Shows guides on event detail page |

## Pages

- **Library:** `app/(chef)/culinary/plating-guides/page.tsx` - Grid of all plating guide cards
  - Search by dish name
  - Filter by linked vs standalone
  - Create/edit/delete inline

## Integration Points

1. **Culinary Hub** (`app/(chef)/culinary/page.tsx`) - Added "Plating Guides" tile
2. **Nav Config** (`components/navigation/nav-config.tsx`) - Added link under Menus & Recipes (advanced visibility)
3. **Event Detail** (`app/(chef)/events/[id]/page.tsx`) - Shows plating guides panel when event has a menu with linked guides

## Print Support

The `PlatingGuideCard` component has a "Print" button that opens a new window with clean, kitchen-friendly formatting (inline styles, no Tailwind dependency). Designed for posting at kitchen stations.

## Architecture Notes

- Uses `chef_id` column (new table convention per CLAUDE.md)
- Event plating guides are resolved by traversing: event -> menus -> dishes -> components -> recipes -> plating_guides
- Components stored as JSONB for flexibility (no rigid schema for placement/technique variations)
- Zod validation on all inputs
