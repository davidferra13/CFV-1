# Consolidated Build: Uncategorized

**Priority rank:** 1 of 14
**Personas affected:** 6 (Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef), Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef), Leo Varga, Maya Rios Cannabis Pastry Chef Micro, Noah Kessler, Rina Solis)
**Average severity:** HIGH

## The Pattern

6 persona(s) surfaced 15 related gaps in uncategorized. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **No deterministic dose-curve engine** - from Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef) - MEDIUM
   for assigning and validating per-guest dose progression by course (the persona’s core workflow).
2. **No regulator-grade traceability export** - from Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef) - MEDIUM
   that proves source material, preparation mapping, delivery, and consumption chain of custody.
3. **V1 strategy conflicts with multi-chef governance need** - from Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef) - MEDIUM
   Why it matters: Jordan is a director role; safety and consistency depend on cross-chef standardization and oversight. Current state: the blueprint states V1 is single-chef and explicitly out-of-scope ...
4. **No documented conflict-safe sync model** - from Leo Varga - HIGH
   What's missing: safe handling for multi-day disconnected edits and eventual reconnection. File to change first: shared persistence and sync infrastructure. Effort estimate: Large (data contract and re...
5. **No charter or voyage provisioning mode** - from Leo Varga - HIGH
   What's missing: depletion simulation for fixed no-restock windows, storage limits, shelf life, and contingency substitutions. File to change first: `app/(chef)/inventory/page.tsx` and provisioning pla...
6. **No rapid guest roster churn flow** - from Leo Varga - HIGH
   What's missing: arrive-today and depart-today actions that update preference relevance in active plans. File to change first: event guest list surfaces under `app/(chef)/events/[id]`. Effort estimate:...
7. **Product System (SKUs, Batches, Units)** - from Maya Rios Cannabis Pastry Chef Micro - HIGH
   ChefFlow has no concept of products, batches, or units. Maya needs to track 100+ brownies with exact 5mg dosing per unit — but ChefFlow only manages event courses and guests. Without this foundation, ...
8. **Product Traceability** - from Maya Rios Cannabis Pastry Chef Micro - HIGH
   ChefFlow cannot track the full lifecycle from raw cannabis → infused components → finished products. Maya needs batch-level traceability to ensure safety and compliance, but the system only tracks eve...
9. **Sales Channel Tracking** - from Maya Rios Cannabis Pastry Chef Micro - HIGH
   \*\* ChefFlow only tracks event sales (dinners), not product sales through pop-ups, drops, or direct channels. Maya's multi-channel sales require movement tracking across channels, but ChefFlow has no p...
10. **No external store availability signal** - from Noah Kessler - HIGH
    Missing: in-stock/low-stock indicators for stores Noah will shop. File to change first: chef vendors or inventory route pages under `app/(chef)/vendors/` and `app/(chef)/inventory/`. Effort: large (ne...
11. **No destination-first store intelligence for travel** - from Noah Kessler - HIGH
    Missing: before-arrival view of nearby stores, comparative prices, and likely procurement plan by destination. File to change first: `app/(chef)/travel/` pages plus related dashboard travel widgets. E...
12. **No explicit outcome-based reaction log as first-class feedback** - from Rina Solis - HIGH
    What's missing: Feedback surfaces are broad, but this persona requires structured outcomes such as tolerated, mild reaction, severe reaction, and clinician follow-up. File to change first: `app/(clien...
13. **No safe-only menu generation mode for high-risk clients** - from Rina Solis - HIGH
    What's missing: Planning still assumes optional review; Rina needs an operational mode where only valid options are visible for a selected client profile. File to change first: `app/(chef)/menus/page....
14. **Insufficient hidden-risk and cross-contact signaling at ingredient level** - from Rina Solis - HIGH
    What's missing: Allergen checks exist, but hidden processing and cross-contact risk annotations are not surfaced as explicit hazard tiers in selection flows. File to change first: `app/(chef)/ingredie...
15. **No dedicated safety command center view** - from Rina Solis - HIGH
    What's missing: Dashboard has strong operational cards, but no focused safety board summarizing blocked items, unresolved risks, and per-client verification state. File to change first: `app/(chef)/da...

## Recommended Build Scope

A single consolidated build addressing all uncategorized gaps should cover:

- No deterministic dose-curve engine
- No regulator-grade traceability export
- V1 strategy conflicts with multi-chef governance need
- No documented conflict-safe sync model
- No charter or voyage provisioning mode
- No rapid guest roster churn flow
- Product System (SKUs, Batches, Units)
- Product Traceability
- Sales Channel Tracking
- No external store availability signal
- No destination-first store intelligence for travel
- No explicit outcome-based reaction log as first-class feedback
- No safe-only menu generation mode for high-risk clients
- Insufficient hidden-risk and cross-contact signaling at ingredient level
- No dedicated safety command center view

## Existing Build Tasks

- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-1.md`

## Acceptance Criteria (merged from all personas)

1. Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef): No deterministic dose-curve engine is addressed
2. Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef): No regulator-grade traceability export is addressed
3. Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef): V1 strategy conflicts with multi-chef governance need is addressed
4. Leo Varga: No documented conflict-safe sync model is addressed
5. Leo Varga: No charter or voyage provisioning mode is addressed
6. Leo Varga: No rapid guest roster churn flow is addressed
7. Maya Rios Cannabis Pastry Chef Micro: Product System (SKUs, Batches, Units) is addressed
8. Maya Rios Cannabis Pastry Chef Micro: Product Traceability is addressed
9. Maya Rios Cannabis Pastry Chef Micro: Sales Channel Tracking is addressed
10. Noah Kessler: No external store availability signal is addressed
11. Noah Kessler: No destination-first store intelligence for travel is addressed
12. Rina Solis: No explicit outcome-based reaction log as first-class feedback is addressed
13. Rina Solis: No safe-only menu generation mode for high-risk clients is addressed
14. Rina Solis: Insufficient hidden-risk and cross-contact signaling at ingredient level is addressed
15. Rina Solis: No dedicated safety command center view is addressed
