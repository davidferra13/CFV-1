# Consolidated Build: Compliance Legal

**Priority rank:** 14 of 21
**Personas affected:** 2 (Dr. Julien Armand, Jordan Hale)
**Average severity:** HIGH

## The Pattern

2 persona(s) surfaced 2 related gaps in compliance legal. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **No regulator-grade traceability export** - from Dr. Julien Armand - HIGH
   That proves source material, preparation mapping, delivery, and consumption chain of custody.
   > Search hints: regulator-grade.traceability, traceability.export, regulator-grade, traceability, export
2. **Compliance evidence is fragmented across multiple screens** - from Jordan Hale - HIGH [LIKELY BUILT]
   Legal defensibility depends on one coherent chain from intake → dosing decisions → execution → outcome logs. Compliance tracker + cannabis ledger + events + RSVPs exist, but evidence appears feature-s...
   > Known built: `lib/chef/cannabis-actions.ts` (Cannabis compliance)
   > Search hints: compliance.evidence, evidence.fragmented, fragmented.across, across.multiple, multiple.screens, compliance, evidence, fragmented

## Recommended Build Scope

A single consolidated build addressing all compliance legal gaps should cover:

- No regulator-grade traceability export
- Compliance evidence is fragmented across multiple screens

## Existing Build Tasks

No existing build tasks found for this category.

## Acceptance Criteria (merged from all personas)

1. Dr. Julien Armand: No regulator-grade traceability export is addressed
2. Jordan Hale: Compliance evidence is fragmented across multiple screens is addressed
