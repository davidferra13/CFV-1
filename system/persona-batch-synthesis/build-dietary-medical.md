# Consolidated Build: Dietary Medical

**Priority rank:** 4 of 21
**Personas affected:** 3 (Leo Varga, Rina Solis, Samantha Green)
**Average severity:** HIGH

## The Pattern

3 persona(s) surfaced 5 related gaps in dietary medical. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **No deterministic inventory-to-menu execution assistant** - from Leo Varga - HIGH
   A first-class answer to "what can I serve now with what remains? " across current stock and guest constraints.
   > Search hints: deterministic.inventory-to-menu, inventory-to-menu.execution, deterministic, inventory-to-menu, execution
2. **No hard medical constraint enforcement engine (blocking layer)** - from Rina Solis - HIGH
   Current systems capture restrictions and detect conflicts, but the persona needs hard prevention rules that stop unsafe menu items before selection or assignment.
   > Search hints: hard.medical, medical.constraint, constraint.enforcement, enforcement.blocking, medical, constraint, enforcement, blocking
3. **Insufficient hidden-risk and cross-contact signaling at ingredient level** - from Rina Solis - HIGH
   Allergen checks exist, but hidden processing and cross-contact risk annotations are not surfaced as explicit hazard tiers in selection flows.
   > Search hints: insufficient.hidden-risk, hidden-risk.cross-contact, cross-contact.signaling, signaling.ingredient, insufficient, hidden-risk, cross-contact, signaling
4. **Implement Mandatory Allergy Workflow:** - from Samantha Green - HIGH
   The analyzer identified this as a major product fit concern. Review the raw analyzer output below for the original wording and supporting context.
   > Search hints: implement.mandatory, mandatory.allergy, allergy.workflow, implement, mandatory, allergy, workflow
5. **Create "Dietary Confirmation" POS Overlay:** - from Samantha Green - MEDIUM
   This gap should be considered during build planning because it creates repeated operational friction.
   > Search hints: create.dietary, dietary.confirmation, confirmation.pos, pos.overlay, create, dietary, confirmation, overlay

## Recommended Build Scope

A single consolidated build addressing all dietary medical gaps should cover:

- No deterministic inventory-to-menu execution assistant
- No hard medical constraint enforcement engine (blocking layer)
- Insufficient hidden-risk and cross-contact signaling at ingredient level
- Implement Mandatory Allergy Workflow:
- Create "Dietary Confirmation" POS Overlay:

## Existing Build Tasks

- `system/persona-build-plans/samantha-green/task-1.md`
- `system/persona-build-plans/samantha-green/task-2.md`
- `system/persona-build-plans/samantha-green/task-3.md`
- `system/persona-build-plans/samantha-green/task-4.md`
- `system/persona-build-plans/samantha-green/task-5.md`

## Acceptance Criteria (merged from all personas)

1. Leo Varga: No deterministic inventory-to-menu execution assistant is addressed
2. Rina Solis: No hard medical constraint enforcement engine (blocking layer) is addressed
3. Rina Solis: Insufficient hidden-risk and cross-contact signaling at ingredient level is addressed
4. Samantha Green: Implement Mandatory Allergy Workflow: is addressed
5. Samantha Green: Create "Dietary Confirmation" POS Overlay: is addressed
