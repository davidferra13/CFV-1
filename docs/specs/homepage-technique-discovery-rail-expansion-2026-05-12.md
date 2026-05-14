# Spec: Homepage Technique Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** cooking technique discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

This spec expands the technique rail section. Technique discovery should support users who think in cooking methods or chef craft, without making the homepage feel like a culinary school index.

Intent:

- Surface techniques like roast, grill, stir-fry, braise, bake, ferment, air fry, and make-ahead.
- Bridge technique to cuisine, ingredients, and chef proof.
- Keep advanced techniques approachable.
- Keep this queued for future implementation only.

---

## What This Does

Create a homepage rail layer for cooking techniques and preparation styles.

Examples:

- Stir-fry
- Braise
- Roast
- Grill
- Bake
- Ferment
- Air fry
- Smoke
- Sear
- Make-ahead
- No-cook
- Sous vide
- Pickle

---

## Technique Classes

- **Core heat methods:** roast, grill, sear, saute, steam, braise.
- **Fast methods:** stir-fry, air fry, broil, one-pan.
- **Slow methods:** braise, smoke, slow cook, confit.
- **Baking / pastry:** bake, pastry, bread, cake.
- **Preservation:** ferment, pickle, cure.
- **No-heat / assembly:** no-cook, salads, grazing boards.
- **Advanced chef craft:** sous vide, tasting menu prep, tableside, live fire.

---

## Homepage Modules

### Familiar Techniques

Examples:

- Roast
- Grill
- Stir-fry
- Bake
- One-pan

Purpose: low-friction entry points.

### Fast Techniques

Examples:

- Stir-fry
- Air fry
- Broil
- Sheet pan

Purpose: connect technique to time/effort intent.

### Slow / Deep Flavor

Examples:

- Braise
- Smoke
- Slow cook
- Confit

Purpose: expose weekend/project cooking and chef-led depth.

### Craft Techniques

Examples:

- Ferment
- Pickle
- Sous vide
- Live fire
- Pastry

Purpose: make ChefFlow feel expert without overwhelming.

### Service / Presentation Techniques

Examples:

- Family-style
- Plated
- Tasting menu
- Tableside

Purpose: bridge technique into chef-service proof.

### Surprise Technique

Examples:

- "Try a braise"
- "Make it live-fire"
- "Fermentation pick"
- "Technique outside your usual"

Purpose: controlled skill discovery.

---

## Full Destination

Preferred route:

- `/eat` with technique context.

Required capabilities:

- Browse techniques by class.
- Combine technique with cuisine, ingredient, meal type, dietary needs, time/effort, and location.
- Route chef-service techniques to public chef proof only when supported.
- Avoid advanced technique pages with no downstream content.

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `techniqueClass`
- `skillLevel`
- `timeFit`
- `equipmentFit`
- `compatibleIngredients`
- `compatibleCuisines`
- `compatibleMealTypes`
- `chefServiceFit`
- `coverageScore`
- `popularityScore`
- `noveltyScore`
- `relatedTechniques`
- `defaultRoute`
- `defaultQuery`

Suggested `techniqueClass` values:

- `core_heat`
- `fast`
- `slow`
- `baking`
- `preservation`
- `no_heat`
- `advanced`
- `service`

---

## Slot Model

Example composition:

- 2 familiar techniques
- 1 fast technique
- 1 slow technique
- 1 craft technique
- 1 service/presentation technique
- 1 surprise technique
- 1 "Explore techniques" item

Example output:

- Grill
- Stir-Fry
- Sheet Pan
- Braise
- Ferment
- Tasting Menu
- Try Live Fire
- Explore Techniques

Rules:

- Do not overfill the rail with advanced methods.
- Avoid techniques with no route or no coverage.
- Keep technique labels understandable.
- Do not imply instruction content if the destination only has chef discovery.

---

## Controlled Spontaneity

Good examples:

- "Because you like grilling: try live fire."
- "Because you browse Korean food: try fermentation."
- "Because you like comfort food: try braising."

Bad examples:

- Advanced technique with no explanation or results.
- Technique route that lands on generic unrelated content.
- Overly technical language in homepage labels.

---

## Routing Rules

- Route to real public destinations only.
- Preserve technique query context.
- Do not expose private recipes, menus, costs, inventory, vendor, client, quote, invoice, or event data.
- No automatic booking, inquiry, event, group, or planning creation.

---

## Acceptance Criteria

- Homepage can surface technique entry points without a giant culinary index.
- Core, fast, slow, baking, preservation, no-heat, advanced, and service technique classes are modeled.
- Slot logic balances familiar and novel techniques.
- Advanced technique items are coverage-gated.
- Tests cover routing, class balance, dedupe, hidden/dismissed behavior, coverage gating, and copy clarity.

---

## Out Of Scope

- Cooking school/course implementation.
- Recipe instruction authoring.
- Booking/inquiry write-path changes.
