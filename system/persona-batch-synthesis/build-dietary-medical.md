# Consolidated Build: Dietary Medical

**Priority rank:** 10 of 20
**Personas affected:** 2 (Leo Varga, Rina Solis)
**Average severity:** HIGH

## The Pattern

2 persona(s) surfaced 3 related gaps in dietary medical. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

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

## Recommended Build Scope

A single consolidated build addressing all dietary medical gaps should cover:

- No deterministic inventory-to-menu execution assistant
- No hard medical constraint enforcement engine (blocking layer)
- Insufficient hidden-risk and cross-contact signaling at ingredient level

## Existing Build Tasks

No existing build tasks found for this category.

## Acceptance Criteria (merged from all personas)

1. Leo Varga: No deterministic inventory-to-menu execution assistant is addressed
2. Rina Solis: No hard medical constraint enforcement engine (blocking layer) is addressed
3. Rina Solis: Insufficient hidden-risk and cross-contact signaling at ingredient level is addressed
