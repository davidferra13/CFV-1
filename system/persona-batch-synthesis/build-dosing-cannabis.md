# Consolidated Build: Dosing Cannabis

**Priority rank:** 2 of 18
**Personas affected:** 3 (Dr. Julien Armand, Jordan Hale, Maya Rios)
**Average severity:** HIGH

## The Pattern

3 persona(s) surfaced 8 related gaps in dosing cannabis. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **No deterministic dose-curve engine** - from Dr. Julien Armand - HIGH
   For assigning and validating per-guest dose progression by course (the persona’s core workflow).
2. **No molecule-level culinary data model** - from Dr. Julien Armand - HIGH
   Tying batch/extraction/potency/terpenes to ingredients, dishes, and courses.
3. **No cannabis outcome intelligence loop** - from Dr. Julien Armand - HIGH
   (cross-event analysis of dose patterns, tolerance, adverse signals, and optimal progression templates).
4. **No canonical central dosing engine** - from Jordan Hale - HIGH
   Jordan’s highest-risk failure mode is inconsistent per-course dose allocation across chefs and events. Cannabis pages and dosage fields exist, but there is no explicitly documented rules engine enforc...
5. **Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal** - from Jordan Hale - HIGH
   Repeat guest dosing should improve with historical response and adverse-reaction memory. CRM and event history are strong, but explicit cannabis tolerance evolution and dose-response profile contracts...
6. **Product System (SKUs, Batches, Units)** - from Maya Rios - HIGH
   ChefFlow has no concept of products, batches, or units. Maya needs to track 100+ brownies with exact 5mg dosing per unit — but ChefFlow only manages event courses and guests. Without this foundation, ...
7. **Batch Dosing Engine** - from Maya Rios - HIGH
   The system lacks any mechanism to calculate THC distribution per unit in a batch. Maya requires precise calculation of total THC input → unit distribution (e.g., 100 brownies at exactly 5mg each), but...
8. **Label Generation** - from Maya Rios - HIGH
   \*\* ChefFlow has no functionality to generate compliant product labels (dose per unit, batch potency, ingredient list). Maya's consumer products require legal labeling, but the system lacks integration...

## Recommended Build Scope

A single consolidated build addressing all dosing cannabis gaps should cover:

- No deterministic dose-curve engine
- No molecule-level culinary data model
- No cannabis outcome intelligence loop
- No canonical central dosing engine
- Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal
- Product System (SKUs, Batches, Units)
- Batch Dosing Engine
- Label Generation

## Existing Build Tasks

- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-1.md`
- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-2.md`

## Acceptance Criteria (merged from all personas)

1. Dr. Julien Armand: No deterministic dose-curve engine is addressed
2. Dr. Julien Armand: No molecule-level culinary data model is addressed
3. Dr. Julien Armand: No cannabis outcome intelligence loop is addressed
4. Jordan Hale: No canonical central dosing engine is addressed
5. Jordan Hale: Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal is addressed
6. Maya Rios: Product System (SKUs, Batches, Units) is addressed
7. Maya Rios: Batch Dosing Engine is addressed
8. Maya Rios: Label Generation is addressed
