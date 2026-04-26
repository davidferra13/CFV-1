# Consolidated Build: Compliance Legal

**Priority rank:** 3 of 18
**Personas affected:** 3 (Dr. Julien Armand, Jordan Hale, Maya Rios)
**Average severity:** HIGH

## The Pattern

3 persona(s) surfaced 3 related gaps in compliance legal. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **No regulator-grade traceability export** - from Dr. Julien Armand - HIGH
   That proves source material, preparation mapping, delivery, and consumption chain of custody.
2. **Compliance evidence is fragmented across multiple screens** - from Jordan Hale - HIGH
   Legal defensibility depends on one coherent chain from intake → dosing decisions → execution → outcome logs. Compliance tracker + cannabis ledger + events + RSVPs exist, but evidence appears feature-s...
3. **Product Traceability** - from Maya Rios - HIGH
   ChefFlow cannot track the full lifecycle from raw cannabis → infused components → finished products. Maya needs batch-level traceability to ensure safety and compliance, but the system only tracks eve...

## Recommended Build Scope

A single consolidated build addressing all compliance legal gaps should cover:

- No regulator-grade traceability export
- Compliance evidence is fragmented across multiple screens
- Product Traceability

## Existing Build Tasks

- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-1.md`
- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-2.md`

## Acceptance Criteria (merged from all personas)

1. Dr. Julien Armand: No regulator-grade traceability export is addressed
2. Jordan Hale: Compliance evidence is fragmented across multiple screens is addressed
3. Maya Rios: Product Traceability is addressed
