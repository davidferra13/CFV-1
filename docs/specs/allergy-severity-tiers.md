# Allergy Severity Tiers

> **Status:** SPEC-READY
> **Priority:** P0
> **Origin:** "Picky Client" persona stress test, edge case: vegan (choice) vs anaphylactic allergy (life-threatening) treated identically (2026-05-16)
> **Depends On:** Menu Variant Accommodations, Guest Dietary Surfacing

---

## Problem Statement

"Vegan" and "anaphylactic shellfish allergy" are fundamentally different things. One is a lifestyle choice. The other can kill someone. ChefFlow currently treats both as "dietary restrictions" with no severity differentiation.

A chef who sees "no shellfish" without context might:

- Use fish sauce in a dish (contains shellfish derivatives) thinking "close enough"
- Prep shellfish on the same cutting board
- Not ask about the severity

If that guest has anaphylaxis, this is negligent. The system must distinguish severity and trigger different protocols.

---

## Solution

### 1. Three Severity Tiers

| Tier            | Label  | Meaning                                                 | Chef Protocol                                                             | Visual          |
| --------------- | ------ | ------------------------------------------------------- | ------------------------------------------------------------------------- | --------------- |
| **Preference**  | Yellow | Won't eat it, not dangerous. Lifestyle, taste, ethical. | Avoid in their dishes. Cross-contact OK.                                  | Yellow tag      |
| **Intolerance** | Orange | Will get sick. Digestive, inflammatory, uncomfortable.  | Avoid in their dishes. Minimize cross-contact.                            | Orange tag      |
| **Allergy**     | Red    | Medical emergency. Anaphylaxis, hospitalization risk.   | Zero tolerance. Separate prep. No cross-contact. Verify every ingredient. | Red alert badge |

### 2. Data Capture

When guests submit dietary restrictions (via circle, portal, or intake):

- Each restriction gets a severity selector: Preference / Intolerance / Allergy
- Default: Preference (safest assumption until specified)
- Allergy selection triggers follow-up: "Is this a severe/anaphylactic allergy?" (yes/no)
- Severe allergies get additional flags: cross-contamination concern, EpiPen on site, emergency contact

### 3. Chef-Facing Display

On event detail, dietary summary, and prep notes:

- **Red section (top, impossible to miss):** "ALLERGIES: [Guest] - Shellfish (SEVERE, anaphylaxis risk). Zero cross-contact."
- **Orange section:** "INTOLERANCES: [Guest] - Lactose. Avoid dairy in their courses."
- **Yellow section:** "PREFERENCES: [Guest], [Guest] - Vegan (lifestyle choice)."

Allergies ALWAYS display first. Color-coded. Cannot be collapsed or hidden.

### 4. Prep Protocol Triggers

When an allergy-tier restriction exists for an event:

- Shopping list flags allergen-containing ingredients: "CONTAINS SHELLFISH - Guest [Name] has severe allergy"
- Prep timeline inserts: "Prep allergy-safe dishes FIRST, before any shellfish enters the kitchen"
- Separate cutting board/knife reminder
- "Verify ingredient labels for hidden allergens" checklist item
- If menu contains the allergen for other guests: explicit separation protocol in service notes

### 5. Menu Builder Integration

When chef builds a menu for an event with allergy-tier guests:

- Any dish containing the allergen gets a red warning: "Contains [allergen]. [Guest] has severe allergy. Variant required or separation protocol needed."
- Variant auto-suggested: "Create allergen-free variant for [Guest]?"
- If chef doesn't create a variant, system requires acknowledgment: "No variant created for [Guest]'s allergy. Chef confirms separation protocol is sufficient."

### 6. Day-Of Service Notes

Per-seat service notes (from menu variant spec) include allergy status:

- "Seat 7 (Sarah): ALLERGY - Shellfish (severe). Serve allergen-free variant ONLY. Verify plate before service."
- Red highlight, not just text
- If staff is helping: briefing note for front-of-house

### 7. Emergency Information (Allergy Tier Only)

For severe allergies:

- "Does this guest carry an EpiPen?" (yes/no/unknown)
- Emergency contact for this guest
- Nearest hospital (auto from venue address)
- Chef acknowledgment: "I understand the severity and will follow allergen protocols"

Not paranoia. Professional due diligence. One incident ends a career.

---

## Edge Cases

### A. Guest Doesn't Specify Severity

They just say "no nuts." Is that preference or allergy?

- Default to Preference until clarified
- System prompts (via circle): "Is this a preference, intolerance, or allergy? This helps your chef plan safely."
- If unspecified and chef is concerned: flag for follow-up before menu finalization

### B. Multiple Allergens, Same Guest

Guest has: shellfish allergy (severe) + dairy intolerance + no cilantro (preference).

- Each restriction tracked separately with its own tier
- All three display on the guest profile, color-coded by severity
- Prep protocol driven by the highest tier (allergy protocols cover the intolerance too)

### C. Allergen is a Core Menu Ingredient

Main course is lobster. One guest has severe shellfish allergy.

- System doesn't say "remove the lobster from the menu." That's the chef's choice.
- System says: "This menu's main course contains [allergen]. [Guest] has severe allergy. Options: (1) Create allergen-free variant, (2) Prep and serve with strict separation protocol."
- Chef decides. System documents the decision.

### D. Child with Allergy

Parent submits on behalf of child. Extra caution needed.

- "This restriction is for a minor" flag
- Heightened protocol (children less able to self-advocate at the table)
- Parent contact info linked to child's allergy record

---

## Files Likely Touched

- `lib/dietary/severity-types.ts` (new, tier definitions, types)
- `lib/dietary/actions.ts` (extend with severity field on all dietary records)
- `components/dietary/severity-selector.tsx` (new, preference/intolerance/allergy picker)
- `components/dietary/allergy-alert-banner.tsx` (new, red alert display for events with allergies)
- `components/circles/circle-dietary-form.tsx` (extend with severity question)
- `components/events/dietary-summary-panel.tsx` (extend with tiered display, red/orange/yellow)
- `lib/menus/variant-actions.ts` (extend with allergen warnings in menu builder)
- `lib/shopping/list-generator.ts` (extend with allergen flags on ingredients)
- `lib/events/prep-timeline.ts` (extend with allergen separation protocol steps)
- `app/(chef)/events/[id]/service/page.tsx` (extend with per-seat allergy alerts)
- Database: add `severity` column to dietary restriction records (enum: preference, intolerance, allergy), `allergy_details` table (guest_id, allergen, severity, epipen, emergency_contact, notes)

---

## Verification

- [ ] Guest can specify severity tier when submitting dietary info
- [ ] Default is Preference when unspecified
- [ ] Allergy tier displays with red alert badge, always first
- [ ] Intolerance displays orange, preferences yellow
- [ ] Shopping list flags allergen-containing ingredients
- [ ] Prep timeline inserts separation protocol for allergy-tier
- [ ] Menu builder warns when dish contains guest's allergen
- [ ] Variant auto-suggested for allergy-tier guests
- [ ] Day-of service notes show per-seat allergy alerts in red
- [ ] Severe allergy captures EpiPen status and emergency contact
- [ ] Chef must acknowledge allergy protocol before finalizing menu
- [ ] Multiple allergens per guest tracked separately with individual tiers
