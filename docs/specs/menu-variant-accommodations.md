# Menu Variant Accommodations

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test, edge case: vegan daughter at a non-vegan dinner wants the same meal, just swapped (2026-05-16)
> **Depends On:** None (menu builder already built)

---

## Problem Statement

20-person anniversary dinner. 18 guests eat everything. The daughter and her husband are vegan. They don't want a "vegan option" that looks like an afterthought next to everyone else's prime rib. They want the SAME meal, same courses, same plating, same experience at the table, just with the protein swapped.

Grilled beef tenderloin with red wine jus becomes grilled beet with red wine jus. Same plate architecture. Same sauce technique. Nobody at the table should feel like they got the B-team meal.

This is how great chefs actually handle dietary accommodations. Not a separate menu. A VARIANT of the same menu. Same soul, different ingredient.

ChefFlow's menu builder currently handles dishes as single items. There is no concept of "this dish has a variant for dietary group X." The chef has to mentally track which guests get which version, communicate it separately, and hope nothing gets confused on service day.

---

## Solution

### 1. Dish Variants (Same Dish, Dietary Swap)

Each dish in a menu can have one or more **variants**:

- A variant is a sibling of the original dish, not a replacement
- Variant shares: course position, plating style, sauce base, technique description
- Variant differs: primary ingredient, and any dependent sub-ingredients
- Variants are named by their swap: "Grilled Beet (vegan)" not "Vegan Option #3"
- The variant inherits the dish description and modifies only what changes

**Example:**

| Course    | Standard                                                       | Vegan Variant                                             |
| --------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| Entree    | Grilled Beef Tenderloin, red wine jus, roasted root vegetables | Grilled Beet Steak, red wine jus, roasted root vegetables |
| Appetizer | Burrata with heirloom tomato, basil oil                        | Cashew ricotta with heirloom tomato, basil oil            |
| Dessert   | Chocolate mousse, whipped cream                                | Chocolate mousse, coconut whip                            |

The chef builds ONE menu. Variants are annotations on specific dishes, not a separate menu.

### 2. Guest-to-Variant Assignment

When dietary restrictions are collected (via dinner circle or portal):

- System auto-suggests variant assignments: "2 vegan guests detected. Assign vegan variants?"
- Chef confirms or adjusts assignments
- Each guest is linked to their variant set for each course
- Chef's prep list and service notes show: "Table: 18 standard, 2 vegan variant"

### 3. Variant Creation UX

On the menu builder, per dish:

- "Add Variant" button
- Pre-populated with the original dish (chef just swaps what changes)
- Dietary tag selector: vegan, vegetarian, gluten-free, dairy-free, nut-free, halal, kosher, pescatarian
- Multiple variants per dish allowed (vegan + gluten-free for different guests)
- Variant auto-inherits: course position, technique, sauce, sides (unless chef overrides)
- Cost differential calculated: "Beet variant: -$4.50/plate vs beef original"

### 4. Client-Facing Menu Display

When the client views the menu (portal or shared link):

- Standard menu displays as the primary view
- Dietary variants shown as a subtle note: "Vegan option available for each course"
- Expandable: click to see the specific vegan variant dishes
- Guest-specific view: if a guest is logged in / identified, they see THEIR version of the menu
- At the table: printed menu cards can be generated per variant (standard card vs vegan card)

### 5. Prep and Service Day Integration

- Shopping list splits quantities: "Beef tenderloin: 18 portions. Beets: 2 portions."
- Prep timeline includes variant prep as parallel tasks, not afterthoughts
- Service notes per plate: "Seat 7 (Sarah): vegan variant. Seat 8 (Tom): vegan variant."
- Live service tracker (day-of) shows which seats get which variant

### 6. Variant Pricing

- Variants can have different costs (beet is cheaper than beef, cashew ricotta may cost more than burrata)
- Quote shows: "18 guests x $235 (standard) + 2 guests x $220 (vegan variant) = $4,670"
- Or chef can choose flat pricing: "$230/head regardless of variant" (simpler for client)
- Chef decides per event which pricing model to use

### 7. Common Variant Templates

Over time, chefs build a library of proven swaps:

- Beef -> Beet (vegan)
- Chicken -> Cauliflower steak (vegan)
- Burrata -> Cashew ricotta (vegan)
- Cream sauce -> Coconut cream sauce (dairy-free)
- Pasta -> Rice noodle or zucchini noodle (gluten-free)
- Butter -> Olive oil (dairy-free)

System learns from the chef's past variant choices and suggests swaps for new menus: "You've used beet as a beef swap 4 times. Use it here too?"

---

## Edge Cases

### A. Multiple Dietary Groups at One Event

3 vegans, 1 gluten-free, 1 nut allergy. Each needs different variants of the same courses.

- Multiple variant tracks per dish (vegan track, GF track, nut-free track)
- Guests assigned to their track
- Prep list shows quantities per track
- Service notes show per-seat assignments

### B. Variant Affects the Whole Dish (Not Just Protein)

Sometimes the swap cascades. Removing dairy from a cream sauce changes the sauce entirely, which changes the side pairing, which changes the garnish.

- Variant editing allows full dish override, not just protein swap
- But defaults to minimal change (only swap what must change)
- Chef decides how deep the variant goes

### C. Guest Changes Dietary Status After Menu Lock

Guest RSVPs as vegan, menu is locked, then says "actually I eat fish now."

- Variant assignment is editable until service day
- Changing a guest's dietary status prompts: "Update their menu variant? Move from vegan to pescatarian track?"
- Shopping list auto-adjusts quantities

### D. Vegan Guests Who Don't Want the Same Meal

Some dietary guests prefer a completely different dish rather than a swap. "I don't want fake beef, I want something designed to be vegan from the start."

- Chef can offer both: a variant (swap) AND a standalone vegan dish
- Guest chooses during the circle dietary collection: "Would you prefer the vegan version of the main course, or a separate vegan entree?"
- This is optional. Most guests prefer the variant (same experience). But the option exists.

### E. Communicating Variants to the Client (Host)

The host (mother) needs to know that her daughter's dietary needs are handled without having to micromanage.

- Client portal shows: "2 guests have dietary accommodations. Chef has prepared matching variants for each course."
- Detail view: which guests, which variants
- Host doesn't need to worry. It's handled. She can see it's handled.

---

## Files Likely Touched

- `lib/menus/variant-actions.ts` (new, variant CRUD, auto-suggest from dietary data)
- `lib/menus/variant-templates.ts` (new, chef's learned swap library)
- `components/menus/dish-variant-editor.tsx` (new, variant creation UI in menu builder)
- `components/menus/variant-assignment-panel.tsx` (new, guest-to-variant assignment)
- `components/menus/front-of-house-menu.tsx` (extend to render variants)
- `lib/menus/foh-public-actions.ts` (extend to serve variant data)
- `lib/shopping/list-generator.ts` (split quantities by variant track)
- `lib/events/prep-timeline.ts` (parallel variant prep tasks)
- `lib/quotes/auto-generate.ts` (variant-aware pricing)
- `components/client-portal/dietary-accommodation-summary.tsx` (new, host sees "it's handled")
- `app/(chef)/events/[id]/service/page.tsx` (seat-level variant assignments for service day)
- Database: `dish_variants` table (dish_id, variant_name, dietary_tag, ingredient_swaps, cost_delta), `guest_variant_assignments` table (guest_id, event_id, course, variant_id)

---

## Verification

- [ ] Chef can add variant to any dish in menu builder
- [ ] Variant pre-populates from original dish, chef edits only what changes
- [ ] Variant tagged with dietary type (vegan, GF, etc.)
- [ ] Guests with matching dietary restrictions auto-suggested for variant assignment
- [ ] Shopping list splits quantities by variant track
- [ ] Prep timeline shows variant prep as parallel tasks
- [ ] Service notes show per-seat variant assignments
- [ ] Client portal shows dietary accommodations summary
- [ ] Public menu view shows "vegan option available" with expandable detail
- [ ] Quote supports per-variant pricing or flat pricing
- [ ] Multiple variant tracks work at same event (vegan + GF + nut-free)
- [ ] Guest dietary change after menu lock updates variant assignment
- [ ] Chef's swap library grows over time with past variant choices
- [ ] Printed menu cards generate per variant
