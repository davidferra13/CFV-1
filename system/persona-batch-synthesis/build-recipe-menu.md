# Consolidated Build: Recipe Menu

**Priority rank:** 3 of 14
**Personas affected:** 4 (Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef), Leo Varga, Maya Rios Cannabis Pastry Chef Micro, Noah Kessler)
**Average severity:** HIGH

## The Pattern

4 persona(s) surfaced 4 related gaps in recipe menu. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **No molecule-level culinary data model** - from Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef) - MEDIUM
   tying batch/extraction/potency/terpenes to ingredients, dishes, and courses.
2. **No deterministic inventory-to-menu execution assistant** - from Leo Varga - HIGH
   What's missing: a first-class answer to "what can I serve now with what remains?" across current stock and guest constraints. File to change first: `app/(chef)/menus/page.tsx` and menu filtering compo...
3. **Batch Dosing Engine** - from Maya Rios Cannabis Pastry Chef Micro - HIGH
   The system lacks any mechanism to calculate THC distribution per unit in a batch. Maya requires precise calculation of total THC input → unit distribution (e.g., 100 brownies at exactly 5mg each), but...
4. **No market-first menu builder mode** - from Noah Kessler - HIGH
   Missing: workflow that starts from currently available and priced ingredients, then proposes feasible dish options. File to change first: `app/(chef)/menus/` creation flow and menu assistant surfaces....

## Recommended Build Scope

A single consolidated build addressing all recipe menu gaps should cover:

- No molecule-level culinary data model
- No deterministic inventory-to-menu execution assistant
- Batch Dosing Engine
- No market-first menu builder mode

## Existing Build Tasks

- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-1.md`

## Acceptance Criteria (merged from all personas)

1. Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef): No molecule-level culinary data model is addressed
2. Leo Varga: No deterministic inventory-to-menu execution assistant is addressed
3. Maya Rios Cannabis Pastry Chef Micro: Batch Dosing Engine is addressed
4. Noah Kessler: No market-first menu builder mode is addressed
