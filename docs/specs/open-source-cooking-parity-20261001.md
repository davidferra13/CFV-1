# Open-source cooking parity

Status: in-progress. Owner instruction: "Keep building" (2026-10-01).
Goal: match the combined useful cooking capabilities of Mealie, Tandoor, Grocy and KitchenOwl, then prove a simpler connected ChefFlow workflow for household and professional users.
Canonical product is origin/main. This lane starts at 3fa5a0818 in fix/grocery-unit-integrity-20261001; integrate through the established main/release path.

## First bounded delivery: correct shopping quantities

Observed: addQuantities(2, 'cup', 8, 'oz') returns 10 cups without density. Both event and multi-event grocery actions also add incompatible units directly.
Acceptance: incompatible units cannot become a fabricated combined total; compatible measurements and ingredient-density conversions continue to work.
Acceptance: fluid ounces, deciliters and milligrams use the same canonical factors as the conversion engine.
Acceptance: negative/non-finite quantities and non-finite density cannot create valid-looking results.
Acceptance: action errors identify the ingredient and original units, and existing UI error paths show failure rather than an incorrect list.
Verification: failing-then-passing regression tests, focused typecheck, affected tests, native regression firewall, build/release checks and target behavior where the environment permits.
Preflight: original full TypeScript command ran out of heap (exit 134); an explicit 12 GB compiler retry exceeded its 180-second bound. This bounded delivery repairs an existing calculation defect. Full release remains held. Focused verification: 29 tests and the arithmetic/test typecheck pass; see [the delivery record](../recovery/grocery-unit-integrity-20261001.md) for precise limits.
No upstream code is incorporated in this delivery.

## Parity coverage to verify next

| Workflow                                  | Reference          | ChefFlow evidence required                                                             |
| ----------------------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| Import, edit, organize and export recipes | Mealie, Tandoor    | Round-trip real fixtures; preserve ingredients, instructions, source, yields and units |
| Scale and compose recipes                 | Tandoor            | Consistent servings, nested recipes and mixed compatible units                         |
| Meal planning and shared shopping         | Mealie, KitchenOwl | Repeated meals, portions, deduplication, checkoff and multi-user persistence           |
| Pantry and expiry-aware planning          | Grocy              | Unit-aware available stock, reservations, expiry, shortages and recovery               |
| Cook from a phone                         | Mealie, KitchenOwl | Full mobile task, accessible controls, timers and interrupted-session recovery         |
| Professional costing and event prep       | ChefFlow extension | One recipe feeds menu quantities, costs, shopping and prep without re-entry            |

A feature is verified only with implementation, passing tests, runtime evidence and a completed user flow. Pages or feature counts do not establish parity. Check exact upstream licensing before reuse; preserve required notices and attribution.
