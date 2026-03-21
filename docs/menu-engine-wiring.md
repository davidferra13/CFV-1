# Menu Engine: Wiring Orphaned Code (2026-03-21)

## What Changed

Three pieces of fully-built but disconnected Menu Engine code were wired into the live app:

### 1. Menu Engineering Dashboard Page Route

- **New file:** `app/(chef)/culinary/menus/engineering/page.tsx`
- **New file:** `app/(chef)/culinary/menus/engineering/loading.tsx`
- **Existing component:** `components/menus/menu-engineering-dashboard.tsx` (411 lines, already built)
- **Nav link added** in `nav-config.tsx` under Culinary > Menus: "Menu Engineering"
- Shows the 4-quadrant matrix (Star/Plowhorse/Puzzle/Dog), date range selector, per-recipe profitability, and summary metrics

### 2. Quadrant Badges in Menu Context Sidebar

- **New component:** `components/culinary/quadrant-badge.tsx` (reusable Star/PH/PZ/Dog badge)
- **New feature toggle:** `quadrant_badges` added to `MenuEngineFeatures` (types, Zod schema, defaults, labels)
- **Sidebar enhanced:** `components/culinary/menu-context-sidebar.tsx` now shows:
  - Compact distribution bar (color-coded quadrant proportions)
  - Balance score (0-100)
  - Per-recipe quadrant badges with cost-per-serving
  - Actionable recommendations
  - Link to full engineering analysis page
- Gated behind `features.quadrant_badges` toggle (default: on)

### 3. What-If Simulator Panel in Menu Editor

- **New server action:** `getMenuSimulatorData(menuId)` in `lib/menus/menu-engineering-actions.ts`
  - Bridges DB schema (menus > dishes > components > recipes > ingredients) into flat `SimulatorDish[]` format
  - Also returns `availableRecipes` (up to 100 tenant recipes with cost data) as swap candidates
- **New component:** `components/culinary/menu-whatif-panel.tsx`
  - Collapsible panel, loads data lazily on expand
  - Two dropdowns: remove dish + replace with
  - "Simulate Swap" runs `simulateDishSwap()` client-side (pure deterministic math, no AI)
  - Displays: cost delta (color-coded), new total, margin impact (old->new %), prep time delta, allergen conflicts, ingredient overlap
- **Wired into:** `app/(chef)/culinary/menus/[id]/page.tsx` intelligence sidebar (between cost sidebar and context sidebar)

## Architecture Notes

- All menu intelligence is **Formula > AI**: deterministic math computes quadrant classification, cost deltas, margin impact, and allergen checks. Zero LLM involvement.
- The What-If Simulator's core logic (`lib/menus/menu-simulator.ts`, 211 lines) was already built and tested. Only the data bridge (server action) and UI panel were needed.
- Quadrant badges respect the `MenuEngineFeatures` toggle system, so operators can disable them from Settings > Menu Engine.

## Files Modified

- `app/(chef)/culinary/menus/[id]/page.tsx` (added What-If panel import + render)
- `app/(chef)/culinary/menus/engineering/page.tsx` (new)
- `app/(chef)/culinary/menus/engineering/loading.tsx` (new)
- `components/navigation/nav-config.tsx` (added nav link)
- `components/culinary/quadrant-badge.tsx` (new)
- `components/culinary/menu-whatif-panel.tsx` (new)
- `components/culinary/menu-context-sidebar.tsx` (added menu mix section)
- `lib/menus/menu-engineering-actions.ts` (added getMenuSimulatorData server action)
- `lib/scheduling/types.ts` (added quadrant_badges feature toggle)
- `lib/chef/actions.ts` (added quadrant_badges to Zod schema)
