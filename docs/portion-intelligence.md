# Portion Intelligence System

## The Problem

A private chef making soup for 10 does not need 5× the garlic they use for 2. A recipe scaled linearly is wrong — it produces over-seasoned, overworked food. And without knowing "how much soup is 6 oz per person for 12 guests?", the chef has to guess at every event.

## What Was Built

### `lib/recipes/portion-standards.ts` — The Brain

A pure TypeScript constants/logic library. No UI, no database. Contains all the culinary knowledge the system needs.

**1. Portion Standards**

For every combination of recipe category (protein, soup, sauce, salad, starch, pasta, vegetable, dessert, appetizer, bread, condiment, fruit) and course position (amuse-bouche, appetizer, first course, main course, side dish, dessert, standalone), the library knows:

- `portionOz` — standard cooked/served ounces per guest
- `portionNote` — chef-readable description of the standard
- `rawFactor` — multiply cooked oz × rawFactor to get raw purchase quantity (proteins, vegetables)
- `rawNote` — explains the yield loss (e.g. "25% cooking loss — buy ~8 oz raw per guest")

Examples:
- `protein + main` → 6 oz cooked, rawFactor 1.33, "buy ~8 oz raw per guest"
- `soup + first` → 6 oz (180 ml), no yield loss
- `sauce + main` → 1.5 oz (3 tbsp), "make 20–25% extra for reduction waste"
- `pasta + first` → 3 oz cooked (≈ 2 oz dry), classic Italian first-course portion

**2. Ingredient Scaling Exponents**

The sub-linear scaling rule: as a recipe batch grows, flavor compounds concentrate. The system encodes the correct exponent for each ingredient category:

| Category | Exponent | Rule |
|---|---|---|
| protein | 1.00 | Always linear — buy exactly by weight |
| produce | 1.00 | Linear |
| baking | 1.00 | Always linear — baking is chemistry |
| beverage | 1.00 | Linear |
| frozen | 1.00 | Linear |
| dairy | 0.92 | Cream/butter slightly concentrate |
| alcohol | 0.90 | Wine/spirits concentrate as liquid reduces |
| fresh_herb | 0.90 | Near-linear for garnish, slightly sub for flavoring |
| pantry | 0.85 | Stocks, canned goods more efficient at scale |
| oil | 0.88 | Cooking fat coats larger volumes more efficiently |
| specialty | 0.85 | Flavor-forward specialty items |
| condiment | 0.80 | Mustard, Worcestershire, fish sauce — sub-linear |
| spice | 0.75 | Highly sub-linear — 5× recipe needs ~3.3× spice |
| dry_herb | 0.75 | Same as spice — dried herbs concentrate like spice |

At a 2× scale the difference is small. At 5× scale it matters significantly:
- 5× recipe, linear: 1 tsp spice → 5 tsp
- 5× recipe, smart (0.75 exponent): 1 tsp → 3.34 tsp — **33% less than linear**

This is the difference between a properly seasoned dinner and an overseasoned one.

**3. Public API**

```typescript
getPortionInfo(category, coursePosition, guestCount) → PortionInfo | null
smartScale(baseQty, scaleFactor, ingredientCategory) → number
getScalingExponent(ingredientCategory) → number
getScalingLabel(ingredientCategory) → 'linear' | 'near-linear' | 'sub-linear' | ...
getScalingReason(ingredientCategory) → string  // full explanation
formatScaledQty(qty) → string  // culinary fractions: ¼, ½, ¾, ⅓, ⅔, ⅛, etc.
```

---

### `components/recipes/recipe-scaling-calculator.tsx` — The UI

Replaces the previous simple multiplier with a professional tool. Integrated into the recipe detail page.

**How it works:**

1. Chef clicks "Scale for Guests"
2. Selects course position (amuse / appetizer / first / main / side / dessert / standalone)
3. Enters guest count
4. System computes scale factor from `recipe.yield_quantity` (e.g. base 8 servings → for 20 guests = ×2.5)

**Portion Standard Panel (blue):**
- Shows standard oz per guest for that category + course
- Shows total to prepare (e.g. "4.5 lbs for 12 main course guests")
- Shows raw purchase quantity with yield loss if applicable (proteins, vegetables)
- If recipe has no yield_quantity: shows the standard as a reference but explains ingredient scaling isn't possible yet

**Scaled Ingredient Table:**
- Two modes: **Smart (sub-linear)** and **Linear**
- Smart mode default — each ingredient scaled by its category's exponent
- For sub-linear ingredients, shows "−18% vs linear" badge so the chef understands why the spice amount is lower
- Hover any ingredient to see a tooltip explaining the scaling rule for that category
- Warning if any quantity goes below a practical minimum
- **Chef Override:** Every quantity is an editable input. Click any quantity to type a custom value. An overridden field shows in brand color with a "↺ reset" button to revert to the computed value. Overrides persist across Smart/Linear mode toggles. The clipboard copy marks overridden ingredients with `*` and labels the section "chef-adjusted". All overrides clear when the panel is closed.

**Copy Scaled Recipe button:**
Produces a plain-text mise-en-place card with:
- Header with dish name, course, guest count, scale factor
- All scaled ingredients with culinary fractions
- Portion reference section (oz per person, total, purchase quantity)
- Method

---

## How Scale Factor Is Computed

```
If recipe.yield_quantity is set (e.g. 8 servings):
  scaleFactor = guestCount / yield_quantity
  e.g. 12 guests / 8 base yield = ×1.5

If recipe.yield_quantity is NOT set:
  No ingredient scaling is possible.
  Portion standard is shown as a reference only.
  Chef should set yield_quantity when recording the recipe.
```

## What Did NOT Change

- No database changes
- No changes to the grocery list generator, prep sheet, or packing list
- `components.scale_factor` (already in the DB) is for event-level component scaling, separate from this recipe-level calculator

## Future Integration Points

- **Menu builder:** When a chef builds a menu for a 16-person event and links a recipe with yield 8, auto-suggest `scale_factor = 2.0` on the component
- **Grocery list:** The grocery list generator already uses `components.scale_factor` — if the menu builder sets the scale factor correctly, grocery quantities will be automatically right
- **Prep sheet:** Add portion summary banner per component showing total weight to prepare
