# Last-Minute Guest Count Changes

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test, edge case: 3 cancel day-of, 2 surprise guests show up (2026-05-16)
> **Depends On:** Menu Variant Accommodations, Day-Of Timeline Auto-Generation, Equipment Packing List

---

## Problem Statement

20 confirmed guests. Menu locked. Shopping done. Prep started.

Then: "Hey, the Johnsons can't make it anymore. But my neighbor and her husband want to come, is that okay?"

20 -> 17 -> 19. Three drops, two adds. Net: 19.

What changes?

- Portions: 19 not 20 (minor, chef probably prepped for 20+ anyway)
- Variants: Were any of the cancellations the vegan guests? If so, variant count changes.
- Shopping: Already done. Probably fine. But if 5 more guests added, might need another run.
- Seating: Host's problem, not chef's. But service notes update.
- Price: Quote was per-head. Does the final invoice adjust?

System should handle this gracefully without chef rebuilding anything from scratch.

---

## Solution

### 1. Guest Count as a Living Number

Guest count is not locked at booking. It evolves:

- **Quoted count** (at booking): 20
- **Confirmed count** (from RSVPs/circle): 18
- **Final count** (day-of): 19
- **Actual served** (post-event): 19

Each stage tracked separately. The quote uses quoted count. The shopping uses confirmed count. The prep uses final count.

### 2. Change Detection and Impact Assessment

When guest count changes, system auto-assesses impact:

**Minor change (1-2 guests, same dietary mix):**

- "Guest count: 20 -> 19. No action needed. Prep as planned."
- Chef gets a notification, no forced action.

**Moderate change (3-5 guests or dietary mix shifts):**

- "3 cancellations include 1 vegan guest. Vegan variant count: 2 -> 1."
- "Shopping adjustment: reduce beef by 1 portion, reduce beet by 1 variant."
- Chef reviews, confirms or dismisses.

**Major change (6+ or doubling):**

- "Guest count increased from 20 to 30. Menu may need scaling review."
- Flags: shopping list needs update, prep timeline extends, equipment may be insufficient.
- Chef must acknowledge and adjust.

### 3. Cascade Updates

When chef confirms a guest count change:

- **Shopping list**: Quantities auto-adjust (if not yet purchased). If already purchased: "You've already shopped for 20. 19 served means slight surplus. No action needed."
- **Variant assignments**: If a vegan guest cancelled, remove their variant. If a new guest with allergies joins, flag for variant creation.
- **Prep timeline**: Recalculates based on new count (usually minimal change for 1-2 guest difference).
- **Invoice**: If pricing is per-head, final invoice adjusts. If flat-rate, no change. System shows: "Quote: 20 x $235 = $4,700. Actual: 19 x $235 = $4,465. Difference: -$235."
- **Service notes**: Per-seat assignments update.

### 4. Cutoff Policies

Chef sets policies per event or globally:

- **Hard cutoff**: "No changes after [date]." After cutoff, system warns host: "Changes after [date] may not be accommodated."
- **Soft cutoff**: "Changes accepted with caveat." After soft cutoff, system notes: "Chef has already shopped. Additional guests may result in menu adjustments."
- **Always flexible**: No cutoff. Chef handles changes as they come.

### 5. Pricing Implications

Three pricing models for guest count flex:

| Model                 | How It Works                                         | When to Use                               |
| --------------------- | ---------------------------------------------------- | ----------------------------------------- |
| **Exact per-head**    | Invoice = actual guests served x rate                | Standard                                  |
| **Minimum guarantee** | Invoice = max(quoted count, actual) x rate           | Protects chef from last-minute drops      |
| **Flat rate**         | Invoice unchanged regardless of count (within range) | Simpler for client, chef prices in buffer |

Chef selects model at quote time. System enforces at invoicing.

### 6. Day-Of Surprise Guests

Someone shows up unannounced:

- Host adds them to the circle (QR scan or manual add)
- System flags: "New guest added. Dietary needs?"
- If no special dietary: chef plates from surplus (professional chefs always prep 10-15% buffer)
- If dietary need: chef adapts in real-time (this is why buffer matters)
- Service notes update: "Seat added: [Name], no restrictions"
- Invoice: depends on pricing model selected

### 7. Communication to Chef

Changes communicated clearly:

- Push notification: "[Host] updated guest count: 20 -> 19"
- Change details: who dropped, who added, dietary implications
- Impact summary: "No prep changes needed" or "Variant count changed, review?"
- Chef can acknowledge with one tap

---

## Files Likely Touched

- `lib/events/guest-count-flex.ts` (new, change detection, impact assessment, cascade logic)
- `lib/events/guest-count-history.ts` (new, track quoted/confirmed/final/actual)
- `lib/shopping/list-generator.ts` (extend with quantity adjustment on count change)
- `lib/quotes/pricing-models.ts` (new, exact/minimum-guarantee/flat-rate)
- `lib/events/invoice-actions.ts` (extend with guest count flex invoicing)
- `components/events/guest-count-change-card.tsx` (new, impact summary for chef)
- `components/client-portal/guest-count-update.tsx` (new, host can update count)
- `lib/dinner-circles/circle-hub-actions.ts` (extend, RSVP changes trigger count update)
- `lib/events/prep-timeline.ts` (extend with count-based recalculation)
- `app/(chef)/events/[id]/page.tsx` (show guest count change notifications)
- Database: `guest_count_history` table (event_id, stage, count, changed_by, changed_at, notes)

---

## Verification

- [ ] Guest count tracked across 4 stages (quoted/confirmed/final/actual)
- [ ] Minor change (1-2) notifies chef, no forced action
- [ ] Moderate change (3-5 or dietary shift) prompts review
- [ ] Major change (6+) requires chef acknowledgment
- [ ] Shopping list auto-adjusts quantities on confirmed change
- [ ] Variant assignments update when dietary guests cancel/add
- [ ] Prep timeline recalculates for significant changes
- [ ] Invoice adjusts per pricing model (exact/minimum/flat)
- [ ] Cutoff policies enforce with host-facing warnings
- [ ] Day-of surprise guest handled via circle QR join
- [ ] Chef gets clear change notification with impact summary
