# Equipment Packing List Auto-Generation

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test, edge case: chef brought "food and some equipment" to beach mansion but can't remember what (2026-05-16)
> **Depends On:** Event Total Recall (venue memory), Menu Variant Accommodations

---

## Problem Statement

Chef is packing the car for a 20-person dinner at a beach mansion 2 hours away. They cooked there 2 years ago. They KNOW they brought a prep table because the counter space was tight. They KNOW the venue has a Viking 6-burner. But they can't remember what else they brought or what the kitchen was missing.

They're also doing 5 courses with vegan variants. The menu requires: immersion circulator (sous vide the beef), torch (brulee), ring molds (plating), extra sheet pans (20 portions), and a folding prep table.

All of this should be auto-generated. Chef shouldn't pack from memory.

---

## Solution

### 1. Equipment Registry (Chef's Inventory)

Chef maintains a list of equipment they OWN:

- Categories: cooking (pans, pots, specialty), prep (boards, tools, containers), plating (molds, tweezers, squeeze bottles), service (chafing, warmers, platters), transport (coolers, insulated bags, carts), misc (folding table, extension cords, aprons)
- Each item: name, category, quantity owned, condition notes
- Chef adds items over time (not a one-time data entry chore)
- System learns from past events: "You packed [X] for 3 events. Add to your registry?"

### 2. Venue Equipment Profile

From Event Total Recall venue memory:

- What the venue HAS: range type/burners, oven count, grill, counter space, refrigeration, freezer, dishwasher, sink count, outdoor cooking, power outlets
- What's MISSING or limited: "Only 3 feet of counter space near stove. No prep area."
- Equipment notes from past events: "Brought folding table. Essential."
- Client-provided equipment: "Client said use anything you need. Has stand mixer, food processor."

### 3. Menu-Driven Equipment Requirements

Each dish/technique implies equipment:

| Technique                       | Equipment Needed                                       |
| ------------------------------- | ------------------------------------------------------ |
| Sous vide                       | Immersion circulator + container + vacuum sealer       |
| Brulee                          | Torch + fuel                                           |
| Plated (fine dining, 20 covers) | Ring molds, tweezers, squeeze bottles, offset spatulas |
| Deep fry                        | Deep fryer or heavy pot + thermometer + spider         |
| Grill (no venue grill)          | Portable grill + charcoal/propane                      |
| Large batch (20+)               | Hotel pans, sheet pans, extra burner                   |
| Cold prep                       | Coolers with ice, insulated bags for transport         |

System maps menu techniques to equipment needs. Chef validates/adjusts.

### 4. Auto-Generated Packing List

When event has: venue + menu + guest count, system generates:

**Packing list with 3 sections:**

1. **Must bring** (menu requires, venue doesn't have)
   - Immersion circulator (sous vide beef course)
   - Torch (brulee dessert)
   - Ring molds x20 (plated presentation)
   - Folding prep table (venue has limited counter)

2. **Recommended** (past event notes, quality-of-life)
   - Extra sheet pans (20 portions across 5 courses)
   - Extension cord (outdoor setup, outlets far from prep)
   - Extra towels (always run out)

3. **Don't need** (venue provides)
   - Stand mixer (client has one)
   - Food processor (client has one)
   - Grill (venue has gas grill, 4 burner)

### 5. Past Event Comparison

"Last time at this venue you packed:" [list from 2024 event]
"This time, menu also requires:" [delta from new menu]
"Removed (not needed this time):" [items from last menu not in this one]

### 6. Transport Planning

- Total equipment weight/volume estimate
- "Will this fit in one car load?" indicator
- Suggested container/packing strategy
- Cooler space needed (based on perishable ingredient volume)
- Ice requirements

### 7. Post-Event Equipment Debrief

After each event, quick prompt:

- "Anything you wished you'd brought?"
- "Anything you brought but didn't use?"
- System learns. Adjusts future suggestions.

---

## Files Likely Touched

- `lib/equipment/registry-actions.ts` (new, chef equipment inventory CRUD)
- `lib/equipment/packing-generator.ts` (new, auto-generate from venue + menu + guest count)
- `lib/equipment/technique-map.ts` (new, technique -> equipment mapping)
- `lib/events/venue-memory.ts` (extend with equipment profile)
- `components/equipment/packing-list-panel.tsx` (new, 3-section checklist UI)
- `components/equipment/past-event-comparison.tsx` (new, delta view)
- `app/(chef)/events/[id]/prep/page.tsx` (integrate packing list)
- `app/(chef)/settings/equipment/page.tsx` (new, equipment registry management)
- Database: `chef_equipment` table (chef_id, name, category, quantity, condition), `venue_equipment` table (venue_id, items[], notes), `event_packing_lists` table (event_id, items[], packed_status, post_event_notes)

---

## Verification

- [ ] Chef can manage equipment registry (add/edit/remove items)
- [ ] Venue profile stores available equipment from past events
- [ ] Menu techniques auto-map to required equipment
- [ ] Packing list auto-generates with must-bring/recommended/not-needed sections
- [ ] Past event comparison shows delta from last time at same venue
- [ ] Post-event debrief captures "wished I'd brought" and "didn't use"
- [ ] System learns from debrief (adjusts future recommendations)
- [ ] Packing list is checkable (chef checks off items as packed)
