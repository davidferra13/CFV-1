# Consolidated Build: Recipe Menu

**Priority rank:** 1 of 18
**Personas affected:** 5 (Dr. Julien Armand, Leo Varga, Maya Rios, Noah Kessler, Rina Solis)
**Average severity:** HIGH

## The Pattern

5 persona(s) surfaced 8 related gaps in recipe menu. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **No molecule-level culinary data model** - from Dr. Julien Armand - HIGH
   Tying batch/extraction/potency/terpenes to ingredients, dishes, and courses.
2. **No regulator-grade traceability export** - from Dr. Julien Armand - HIGH
   That proves source material, preparation mapping, delivery, and consumption chain of custody.
3. **No deterministic inventory-to-menu execution assistant** - from Leo Varga - HIGH
   A first-class answer to "what can I serve now with what remains? " across current stock and guest constraints.
4. **Product System (SKUs, Batches, Units)** - from Maya Rios - HIGH
   ChefFlow has no concept of products, batches, or units. Maya needs to track 100+ brownies with exact 5mg dosing per unit — but ChefFlow only manages event courses and guests. Without this foundation, ...
5. **Batch Dosing Engine** - from Maya Rios - HIGH
   The system lacks any mechanism to calculate THC distribution per unit in a batch. Maya requires precise calculation of total THC input → unit distribution (e.g., 100 brownies at exactly 5mg each), but...
6. **No market-first menu builder mode** - from Noah Kessler - HIGH
   Workflow that starts from currently available and priced ingredients, then proposes feasible dish options.
7. **No safe-only menu generation mode for high-risk clients** - from Rina Solis - HIGH
   Planning still assumes optional review; Rina needs an operational mode where only valid options are visible for a selected client profile.
8. **Insufficient hidden-risk and cross-contact signaling at ingredient level** - from Rina Solis - HIGH
   Allergen checks exist, but hidden processing and cross-contact risk annotations are not surfaced as explicit hazard tiers in selection flows.

## Recommended Build Scope

A single consolidated build addressing all recipe menu gaps should cover:

- No molecule-level culinary data model
- No regulator-grade traceability export
- No deterministic inventory-to-menu execution assistant
- Product System (SKUs, Batches, Units)
- Batch Dosing Engine
- No market-first menu builder mode
- No safe-only menu generation mode for high-risk clients
- Insufficient hidden-risk and cross-contact signaling at ingredient level

## Existing Build Tasks

- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-1.md`
- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-2.md`

## Acceptance Criteria (merged from all personas)

1. Dr. Julien Armand: No molecule-level culinary data model is addressed
2. Dr. Julien Armand: No regulator-grade traceability export is addressed
3. Leo Varga: No deterministic inventory-to-menu execution assistant is addressed
4. Maya Rios: Product System (SKUs, Batches, Units) is addressed
5. Maya Rios: Batch Dosing Engine is addressed
6. Noah Kessler: No market-first menu builder mode is addressed
7. Rina Solis: No safe-only menu generation mode for high-risk clients is addressed
8. Rina Solis: Insufficient hidden-risk and cross-contact signaling at ingredient level is addressed
