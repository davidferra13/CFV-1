# Spec: Homepage Diet and Constraint Discovery Rail Expansion

> **Status:** implemented
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** diet and constraint discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |
| Implemented in production             | 2026-05-13 | Build agent         |        |
| Status: implemented                   | 2026-05-14 | Housekeeping        |        |

---

## Developer Notes

The developer asked to continue expanding every homepage discovery rail section after cuisine and meal type. This spec covers diet and constraint discovery.

Intent:

- Make dietary needs and food constraints easy to start from.
- Treat true safety constraints differently from soft preferences.
- Avoid turning the homepage into a giant checklist.
- Never imply allergy safety unless the downstream flow can actually preserve and enforce the constraint.
- Keep this queued for future implementation only.

---

## What This Does

Create a homepage rail layer for dietary needs, food constraints, and eating goals. This gives users a fast way to browse food or chefs through constraints such as vegan, gluten-free, nut-free, dairy-free, high-protein, low-carb, halal, kosher-style, budget-conscious, kid-friendly, and low-effort.

The homepage should show a small rotating subset, while a deeper destination supports the full constraint catalog.

---

## Constraint Classes

The system must distinguish these classes:

- **Safety constraints:** allergies, celiac/gluten cross-contact, severe intolerances.
- **Religious/cultural constraints:** halal, kosher-style, Jain, no pork, no alcohol.
- **Diet patterns:** vegan, vegetarian, pescatarian, keto, low-carb, Mediterranean.
- **Health goals:** high-protein, low-sodium, heart-conscious, diabetic-friendly.
- **Household constraints:** kid-friendly, picky-eater friendly, family-friendly.
- **Operational constraints:** budget meals, low effort, minimal cleanup.

Safety constraints need stricter copy and routing. Do not present them as guaranteed unless the downstream path captures and preserves the required details.

---

## Homepage Modules

### Common Diet Patterns

Examples:

- Vegan
- Vegetarian
- Pescatarian
- Gluten-free
- Dairy-free
- Low-carb
- High-protein

Purpose: cover common entry points with clear labels.

### Safety-Aware Needs

Examples:

- Nut-aware
- Gluten-sensitive planning
- Dairy-free planning
- Allergy-conscious chefs

Purpose: let users start from safety needs while avoiding false guarantees.

Copy should prefer "allergy-conscious" or "supports allergy notes" unless the product has verified allergen handling.

### Cultural / Religious Constraints

Examples:

- Halal-friendly
- Kosher-style
- Jain-friendly
- No pork
- No alcohol

Purpose: support culturally meaningful constraints respectfully and accurately.

### Goal-Based Eating

Examples:

- High-protein
- Balanced meals
- Light dinners
- Low-sodium
- Heart-conscious
- Diabetic-friendly

Purpose: help users start from intent without requiring clinical claims.

### Practical Household Filters

Examples:

- Kid-friendly
- Budget-conscious
- Picky-eater friendly
- Family-friendly
- Meal-prep friendly

Purpose: include constraints that shape real decisions but are not medical.

### Surprise Constraint Bridge

Examples:

- "Try a plant-forward dinner"
- "Make it dairy-free"
- "High-protein without steak"
- "Budget-friendly private dinner"

Purpose: introduce constraint combinations that feel useful, not random.

---

## Full Constraint Destination

Preferred route:

- `/eat` with diet/constraint filters and preserved query context.

Required capabilities:

- Browse all supported constraints.
- Combine constraints with cuisine, meal type, location, budget, date window, and group size.
- Clearly separate hard restrictions from preferences.
- Preserve selected constraints when moving to `/chefs`, public chef pages, planning, inquiry, or booking.
- Provide honest empty states when no public coverage exists.

Hard rule:

- No fake safety guarantees. If a later flow cannot enforce or verify a constraint, the copy must say less.

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `constraintClass`
- `severitySupported`
- `safetyCritical`
- `requiresUserDetail`
- `compatibleCuisineTags`
- `compatibleMealTypes`
- `coverageScore`
- `popularityScore`
- `familiarityScore`
- `noveltyScore`
- `relatedConstraints`
- `defaultRoute`
- `defaultQuery`
- `copyRiskLevel`

Suggested `constraintClass` values:

- `allergy`
- `intolerance`
- `religious`
- `cultural`
- `diet_pattern`
- `health_goal`
- `household`
- `operational`

---

## Slot Model

Example composition:

- 2 common diet patterns
- 1 safety-aware item
- 1 cultural/religious item
- 1 health-goal item
- 1 practical household item
- 1 spontaneous constraint bridge
- 1 "Explore dietary needs" item

Example output:

- Vegan
- Gluten-free
- Allergy-conscious chefs
- Halal-friendly
- High-protein
- Kid-friendly
- Try plant-forward
- Explore Dietary Needs

Rules:

- Do not show too many medical/safety-sensitive items at once.
- Do not mix hard allergy terms with casual marketing copy.
- Prefer constraints with downstream coverage.
- Do not repeat dismissed constraints.
- Keep a full browse path available.

---

## Controlled Spontaneity

Spontaneity can suggest a constraint-friendly variation, but must not create safety risk.

Good examples:

- "Because you like weeknight dinners: try high-protein meal prep."
- "Because you browsed brunch: try a dairy-free brunch."
- "Because you saved vegetarian chefs: try vegan tasting menus."

Bad examples:

- Treating allergies as playful wildcard prompts.
- Suggesting nut-free as guaranteed without verified support.
- Sending a safety-sensitive item to an empty or generic page.

---

## Routing Rules

- Constraint items can route to `/eat` with preserved query context.
- Chef-focused constraint items can route to `/chefs` only if the filter exists and results are honest.
- Booking/inquiry flows must preserve the constraint context only through existing user-controlled paths.
- No automatic booking, inquiry, event, group, or planning record creation from a rail click.
- No private recipes, menus, client records, internal notes, costs, quotes, invoices, or event IDs.

---

## Acceptance Criteria

- The homepage can surface dietary and constraint entry points without listing every constraint.
- Safety, religious/cultural, diet-pattern, health-goal, household, and operational constraints are modeled separately.
- Copy avoids false medical or allergy guarantees.
- Selected constraints preserve context into deeper public discovery.
- Slot logic is coverage-gated and avoids repetitive output.
- Tests cover routing, deduplication, class separation, safety copy risk, hidden/dismissed behavior, and empty-result handling.

---

## Out Of Scope

- Medical advice.
- Allergy certification system.
- Booking or inquiry write-path changes.
- Cuisine, meal type, ingredient, occasion, seasonal, technique, or spontaneity implementation outside constraint-specific bridging.
