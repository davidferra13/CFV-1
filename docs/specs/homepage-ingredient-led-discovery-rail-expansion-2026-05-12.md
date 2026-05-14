# Spec: Homepage Ingredient-Led Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** ingredient-led discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

This spec expands the ingredient-led homepage rail section. It should help users begin from ingredients they have, want, avoid wasting, or are curious about.

Intent:

- Make ingredient discovery useful without dumping a massive ingredient database on the homepage.
- Support common ingredients, seasonal ingredients, leftovers, premium ingredients, and wildcard inspiration.
- Preserve context into real public discovery routes.
- Keep private cost and inventory data out of public discovery.

---

## What This Does

Create an ingredient-led rail that helps users start with an ingredient and move toward cuisines, meal ideas, chef discovery, or `/eat` planning.

Examples:

- Chicken
- Rice
- Eggs
- Tofu
- Pasta
- Beans
- Salmon
- Mushrooms
- Tomatoes
- Citrus
- Herbs
- What to cook with leftovers
- Seasonal produce
- Premium seafood

---

## Ingredient Classes

- **Staples:** rice, pasta, beans, eggs, potatoes.
- **Proteins:** chicken, salmon, tofu, beef, lentils.
- **Produce:** tomatoes, mushrooms, greens, citrus, squash.
- **Flavor builders:** garlic, herbs, chilies, ginger, miso.
- **Leftovers:** cooked rice, roast chicken, vegetables, bread.
- **Seasonal:** asparagus, corn, peaches, squash, cranberries.
- **Premium / event:** scallops, lamb, truffles, caviar, oysters.

---

## Homepage Modules

### Common Staples

Examples:

- Chicken
- Rice
- Eggs
- Pasta
- Beans
- Tofu

Purpose: familiar, high-coverage ingredient entry points.

### Use What You Have

Examples:

- Leftover rice
- Roast chicken
- Vegetables to use up
- Pantry dinner
- Fridge cleanout

Purpose: practical, low-friction discovery.

### Seasonal Ingredients

Examples:

- Asparagus
- Tomatoes
- Corn
- Peaches
- Squash
- Citrus

Purpose: connect ingredient discovery to seasonality.

### Chef-Worthy Ingredients

Examples:

- Oysters
- Scallops
- Lamb
- Wild mushrooms
- Truffles
- Saffron

Purpose: bridge ingredient curiosity into chef-led experiences.

### Flavor Builders

Examples:

- Chili crisp
- Miso
- Ginger
- Garlic
- Herbs
- Preserved lemon

Purpose: create more interesting paths than only main proteins.

### Surprise Ingredient

Examples:

- "Ingredient roulette"
- "Cook with something new"
- "Unexpected pantry pick"
- "Seasonal wildcard"

Purpose: add controlled spontaneity.

---

## Full Ingredient Destination

Preferred route:

- `/ingredients` if it is public and appropriate.
- `/eat` with ingredient query context if `/ingredients` is not the right consumer destination.

Required capabilities:

- Search ingredients.
- Browse by ingredient class.
- Browse by season.
- Browse by cuisine compatibility.
- Browse by meal type compatibility.
- Preserve selected ingredient context when moving into `/eat`, `/chefs`, `/nearby`, or public chef pages.

Forbidden:

- Public exposure of private ingredient costs.
- Public exposure of internal vendor data.
- Public exposure of chef private inventory.

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `ingredientClass`
- `seasonality`
- `commonalityScore`
- `coverageScore`
- `wasteReductionFit`
- `premiumFit`
- `compatibleCuisines`
- `compatibleMealTypes`
- `compatibleDietTags`
- `relatedIngredients`
- `defaultRoute`
- `defaultQuery`
- `publicSafe`

Suggested `ingredientClass` values:

- `staple`
- `protein`
- `produce`
- `flavor_builder`
- `leftover`
- `seasonal`
- `premium`
- `pantry`

---

## Slot Model

Example composition:

- 2 common staples
- 1 protein
- 1 produce item
- 1 seasonal item
- 1 use-what-you-have item
- 1 chef-worthy ingredient
- 1 wildcard ingredient
- 1 "Explore ingredients" item

Example output:

- Chicken
- Rice
- Mushrooms
- Tomatoes
- Leftover Vegetables
- Oysters
- Ingredient Roulette
- Explore Ingredients

Rules:

- Prefer high-coverage ingredients.
- Do not show only proteins.
- Do not show only premium/event ingredients.
- Seasonal items must be seasonally sensible or explicitly framed as planning.
- Avoid ingredients the user has hidden or repeatedly ignored.

---

## Controlled Spontaneity

Good examples:

- "Because you like pasta: try preserved lemon."
- "Because it is tomato season: try tomato dinner ideas."
- "Because you browsed rice bowls: try leftover rice."

Bad examples:

- Obscure ingredient with no public destination.
- Premium ingredient pushed as everyday budget food.
- Publicly surfacing internal cost intelligence.

---

## Routing Rules

- Route to real public destinations only.
- Preserve ingredient context as query/filter state.
- Avoid exposing private cost, inventory, vendor, recipe, menu, client, quote, invoice, or event data.
- No automatic booking, inquiry, event, group, or planning object creation.

---

## Acceptance Criteria

- Homepage can surface ingredient-led entry points without a giant catalog dump.
- Staples, proteins, produce, flavor builders, leftovers, seasonal, and premium ingredients are modeled.
- Full ingredient browsing/search exists through a real public destination.
- Slot logic is coverage-gated and balanced.
- Spontaneity is useful and context-aware.
- Tests cover routing, public-safety constraints, slot composition, seasonality, dedupe, hidden/dismissed behavior, and empty-result handling.

---

## Out Of Scope

- Private inventory management.
- Ingredient cost display.
- Vendor sourcing UI.
- Recipe authoring.
- Booking or inquiry write-path changes.
