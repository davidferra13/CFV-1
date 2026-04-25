# Event Operations Quality Bar Build Spec

> Source: Culinary School Quality Bar Audit, Domain 4 (Event Operations)
> Date: 2026-04-23
> Audit scope: FSM, pack list, grocery list, financials, terminology, day-of workflow, post-event wrap

This spec contains every finding from the audit. Organized into tiers by severity. Each item has exact file paths, line numbers, what is wrong, and what correct looks like.

---

## TIER 1: CRITICAL BUGS (Fix before anything else)

### 1A. Cartesian product in `event_financial_summary` DB view

**Bug:** The view joins `ledger_entries` AND `expenses` on the same event without subqueries. If an event has N ledger entries and M expenses, every SUM is inflated by the cross-product (expenses _ N, payments _ M).

**File:** `database/migrations/20260215000003_layer_3_events_quotes_financials.sql` around line 1026-1029

**Current (broken):**

```sql
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
LEFT JOIN expenses ex ON ex.event_id = e.id
GROUP BY e.id;
```

**Fix:** Use subqueries or CTEs to pre-aggregate each table independently before joining:

```sql
FROM events e
LEFT JOIN (
  SELECT event_id,
    SUM(CASE WHEN entry_type != 'refund' THEN amount_cents ELSE 0 END) AS total_paid_cents,
    SUM(CASE WHEN entry_type = 'refund' THEN ABS(amount_cents) ELSE 0 END) AS total_refunded_cents,
    SUM(CASE WHEN entry_type = 'tip' THEN amount_cents ELSE 0 END) AS total_tip_cents
  FROM ledger_entries
  GROUP BY event_id
) le ON le.event_id = e.id
LEFT JOIN (
  SELECT event_id,
    SUM(amount_cents) AS total_expenses_cents
  FROM expenses
  WHERE is_business = true
  GROUP BY event_id
) ex ON ex.event_id = e.id;
```

**Consumers affected:** `getEventFinancialSummary` (page.tsx:191-207), `getEventCloseOutData`, `getMonthlyFinancialSummary`, `computeProfitAndLoss`, client-facing financial summary. The money tab's primary profit summary (`getEventProfitSummary`) is immune because it queries ledger and expenses separately.

**Write a new migration** (not modify the existing one). Check timestamp ordering: glob `database/migrations/*.sql`, pick a timestamp strictly higher than the highest existing one.

**Verify:** After fixing, query an event that has 2+ ledger entries AND 2+ expenses. Compare the view output to manual SUMs. They must match.

---

### 1B. Tip double-counting in close-out wizard

**Bug:** `totalPaid` from the financial summary view already includes tip ledger entries. Adding `tip_amount_cents` from the events table computes `totalReceivedCents = totalPaid + tipCents`, double-counting tips.

**File:** `lib/events/financial-summary-actions.ts` around line 505-510

**Current (broken):**

```ts
const totalReceivedCents = totalPaid + tipCents
```

**Fix:** Either:

- (a) Exclude tips from `totalPaid` in the view (add `WHERE entry_type != 'tip'` to the paid sum), OR
- (b) Remove the separate `tipCents` addition here and just use `totalPaid` (which already includes tips), OR
- (c) Subtract tips from totalPaid before adding them back: `totalReceivedCents = (totalPaid - tipCents) + tipCents` which simplifies to just `totalPaid`

Option (b) is simplest. Show tips separately in the UI breakdown but don't add them to the total twice.

**Verify:** Find or create an event with a recorded tip + at least one payment. Check close-out wizard financial display. Tip should appear once, not inflated.

---

### 1C. Silent $0 for unset pricing

**Bug:** Events without a quoted price or deposit display "$0.00" instead of "Not set" or a dash.

**File:** `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx` around line 204 and 210

**Current:**

```tsx
{
  formatCurrency(event.quoted_price_cents ?? 0)
}
{
  formatCurrency(event.deposit_amount_cents ?? 0)
}
```

**Fix:**

```tsx
{
  event.quoted_price_cents != null ? (
    formatCurrency(event.quoted_price_cents)
  ) : (
    <span className="text-stone-500">Not set</span>
  )
}
{
  event.deposit_amount_cents != null ? (
    formatCurrency(event.deposit_amount_cents)
  ) : (
    <span className="text-stone-500">Not set</span>
  )
}
```

**Also check:** `lib/events/financial-summary-actions.ts` around line 173-177 where `foodCostPercent` and `grossMarginPercent` default to 0 when `actualRevenueCents` is 0. These should be `null` and display as "N/A" in the UI, not "0.0%".

---

## TIER 2: FUNCTIONAL GAPS (Pack list, prep sync, terminology)

### 2A. Pack list: Add serviceware section

**Problem:** No plates, flatware, glassware, serving platters, chargers, or linens in the pack list. Cannot execute a catering event without these.

**File:** `lib/documents/generate-packing-list.ts` around line 62-78 (the `STANDARD_KIT` and conditional items section)

**Add a new section** after equipment items. The section should include:

- **Based on service style:**
  - `plated`: dinner plates, salad plates, flatware sets, water glasses, wine glasses (if alcohol on menu)
  - `buffet`: serving platters, chafing dishes (already there), serving utensils, plates (stacked), flatware (bundled)
  - `family_style`: serving bowls, serving platters, large spoons/forks, dinner plates, flatware
  - `cocktail`: cocktail napkins, small plates, picks/skewers, glassware
  - `tasting_menu`: tasting spoons, small plates/bowls, amuse-bouche spoons
- **Always include:** cloth or paper napkins, serving utensils per dish count
- **Conditional on event data:** tablecloth (if `service_style !== 'cocktail'`), wine glasses (if menu has alcohol category dishes)

**Label the section** "Serviceware" in the generated list. Group separately from equipment and food.

### 2B. Pack list: Scale equipment to guest count

**Problem:** Same "Towels (min 6)" and "Sheet pans" for 4 guests or 40.

**File:** `lib/documents/generate-packing-list.ts` line 62-70

**Fix:** Add scaling logic. Example rules:

- Towels: `Math.max(6, Math.ceil(guestCount / 4))` (1 towel per 4 guests, minimum 6)
- Sheet pans: `Math.max(2, Math.ceil(guestCount / 8))` (1 per 8 guests, minimum 2)
- Mixing bowls: `Math.max(3, Math.ceil(guestCount / 10))`
- Plates: `guestCount + Math.ceil(guestCount * 0.1)` (10% buffer)
- Flatware sets: same formula as plates
- Napkins: `guestCount + Math.ceil(guestCount * 0.15)` (15% buffer)

The `guest_count` is available on the event object already fetched in the function. Pass it through.

### 2C. Pack list: Add custom items

**Problem:** Grocery list supports custom items; pack list does not. Chefs need event-specific equipment.

**File:** `components/events/packing-list-client.tsx`

**Add:** An input field at the bottom of the pack list (similar to `components/grocery/grocery-list-view.tsx` lines 424-463). Custom items stored in localStorage per event (key: `cf-pack-custom-${eventId}`). Render them in a "Custom Items" section at the end of the checklist.

### 2D. Pack list: Integrate Chef Gear Check

**Problem:** 24 personal items (chef jacket, thermometer, gloves, first aid kit) tracked in `lib/gear/defaults.ts` but never shown on the pack list.

**Fix:** In `lib/documents/generate-packing-list.ts`, import gear defaults and add a "Personal Gear" section to the pack list output. Pull from `getChefGearList()` in `lib/gear/actions.ts` if the chef has customized their list, otherwise use defaults from `lib/gear/defaults.ts`.

### 2E. Prep checklist: Server persistence

**Problem:** Prep item check-off state is localStorage-only. No cross-device sync. Chef checking items on phone loses progress on desktop.

**File:** `app/(chef)/events/[id]/_components/event-detail-prep-tab.tsx` lines 274-300

**Fix:**

1. Create a server action in `lib/prep-timeline/actions.ts`:
   ```ts
   'use server'
   export async function togglePrepCompletion(eventId: string, itemKey: string, completed: boolean)
   export async function getPrepCompletions(eventId: string): Promise<Set<string>>
   ```
2. Store in a new table `prep_completions` (event_id, item_key, completed_at, chef_id) or use the existing `chef_todos` or a JSONB column on events.
3. In the component, load from server on mount (with localStorage as instant fallback), sync toggles to server via `startTransition`. Keep localStorage as write-through cache for offline/fast UX.
4. The key format is already deterministic: `cf-prep-${eventId}-${recipeId}-${componentName}-${dishName}`.

**Migration needed** if using a new table. Keep it simple: event_id + item_key + completed_at.

### 2F. Terminology: "dinner" to "service" in 7 chef-facing locations

**Problem:** Chef-facing operational surfaces use "dinner" where "service" is correct. Events can be catering, meal prep, cooking classes, farm dinners.

**Files and exact changes:**

| File                                                           | Line | Current                              | Replace With                          |
| -------------------------------------------------------------- | ---- | ------------------------------------ | ------------------------------------- |
| `app/(chef)/events/[id]/aar/page.tsx`                          | ~76  | `'How did the dinner go?'`           | `'How did the service go?'`           |
| `app/(chef)/events/[id]/debrief/page.tsx`                      | ~39  | `"Post-Dinner Debrief"`              | `"Post-Service Debrief"`              |
| `app/(chef)/events/[id]/debrief/page.tsx`                      | ~57  | `"You just finished a dinner."`      | `"You just finished a service."`      |
| `app/(chef)/events/[id]/pack/page.tsx`                         | ~129 | `"Have a great dinner!"`             | `"Have a great service!"`             |
| `app/(chef)/events/[id]/_components/event-detail-wrap-tab.tsx` | ~57  | `"Ready to review this dinner?"`     | `"Ready to review this service?"`     |
| `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`  | ~424 | `"Dinner Photos"`                    | `"Service Photos"`                    |
| `components/events/packing-list-client.tsx`                    | ~541 | `"Car packed. Have a great dinner!"` | `"Car packed. Have a great service!"` |

**Also fix these secondary locations:**
| File | Line | Current | Replace With |
|------|------|---------|-------------|
| `app/(chef)/events/[id]/guest-card/page.tsx` | ~3 | `"Chef prints these and places them on the dinner table."` | `"Chef prints these and places at the table."` |
| `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` | ~323 | `"Send a pre-dinner worksheet"` | `"Send a pre-service worksheet"` |
| `app/(public)/worksheet/[token]/page.tsx` | ~17,41 | `"Pre-Dinner Details"` | `"Pre-Service Details"` |
| `components/events/send-worksheet-button.tsx` | ~3 | comment about "Pre-Dinner Worksheet Button" | `"Pre-Service Worksheet Button"` |
| `components/events/close-out-wizard.tsx` | ~591 | waste reason label `'Made too much'` | `'Overproduction'` |

**Do NOT change:** Client-facing social sharing text like "My private chef dinner is officially booked" (that's natural language for social media). Journey step labels shown to clients can keep "dinner" where it reads naturally.

### 2G. BEO (Banquet Event Order) document generation

**Problem:** No single consolidated operational document. Data exists across tabs but is not assembled into one printable PDF.

**Implementation:**

1. Create `lib/documents/generate-beo.ts` (following the pattern of `generate-packing-list.ts` and `generate-prep-sheet.ts`)
2. The BEO should consolidate:
   - Event name, date, time, status
   - Client name, phone, email
   - Venue address, access instructions, venue contact (if available)
   - Guest count, dietary restrictions, allergens (FDA Big 9)
   - Full menu (courses with dish descriptions)
   - Timeline (arrival, service start, departure)
   - Staff roster (if assigned)
   - Special requests / notes
   - Equipment checklist summary
   - Emergency contacts
3. Add a "Generate BEO" button to the event detail page header actions (next to "Documents")
4. Register the document type in the documents API route
5. The BEO is the master document a venue coordinator, co-host, or staff member receives. One page, everything they need.

**The restaurant archetype already acknowledges this** in `lib/documents/archetype-packs.ts:66` as a `futureDocs` entry.

---

## TIER 3: CACHE AND PROPAGATION FIXES

### 3A. Bust grocery price quote cache on guest count change

**Problem:** `lib/grocery/pricing-actions.ts` line 516 caches quotes for 24 hours. Guest count changes don't invalidate this cache.

**File:** `lib/guests/count-changes.ts` around line 214-258 (the `buildApprovedEventUpdate` function or the main `updateGuestCount` function)

**Fix:** After updating the event's guest count, call `revalidateTag('grocery-quote-' + eventId)` or delete the cached quote row directly. Check how the cache is keyed in `pricing-actions.ts` and invalidate it.

### 3B. Cron auto-progression: Use per-event timezone

**Problem:** `app/api/cron/event-progression/route.ts` line 43 uses server-time `today` for date comparison. Comment says "Today is computed per-event in the event's local timezone" but code doesn't do this.

**File:** `app/api/cron/event-progression/route.ts` lines 41-48

**Fix:** For each event, compute "today" in the event's timezone:

```ts
// After fetching events, for each event:
const tz = event.event_timezone || 'America/New_York'
const eventLocalDate = new Date().toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD
const eventDateStr = dateToDateString(event.event_date)
const shouldStart = eventDateStr <= eventLocalDate
```

The `event_timezone` column exists on the events table (visible in `page.tsx:631`). Fall back to chef's timezone or America/New_York.

### 3C. Grocery list: Use recipe-scaling-engine for better accuracy

**Problem:** `lib/grocery/generate-grocery-list.ts` line 253 uses simple linear scaling. The `lib/scaling/recipe-scaling-engine.ts` has sublinear spice/herb scaling, pack rounding, and waste buffers that produce more accurate quantities for larger events.

**Fix:** In `generate-grocery-list.ts`, replace the inline scaling with a call to the recipe-scaling-engine. This is a medium-effort refactor. The engine expects structured input; the grocery list generator would need to pass category information for each ingredient so the engine can apply the correct scaling curve.

**At minimum:** Apply the spice/herb sublinear scaling rule (converge toward 75% of linear above a threshold). This prevents over-buying dried herbs and spices for large events.

### 3D. Grocery list: Add "on-hand" / pantry exclusion

**Problem:** `is_staple` flag exists on ingredients but only used for pricing, not list generation.

**File:** `lib/grocery/generate-grocery-list.ts` around lines 178-319

**Fix:** Check `ingredient.is_staple` during list generation. Add a UI toggle in the grocery list view: "Hide staples" (default off). When on, staple items are dimmed or moved to a collapsed "Staples (assumed on hand)" section rather than fully hidden.

---

## TIER 4: OPERATIONAL UPGRADES

### 4A. Multi-event day: Turn time calculation

**Problem:** Same-date conflicts detected as soft warning, but no turn time calculated.

**File:** `lib/events/transitions.ts` lines 240-258 (same-date conflict check)

**Enhancement:** When conflicts found, calculate gap between events:

- Event A departure_time (or event_date + estimated service duration) vs Event B arrival_time
- If gap < 120 minutes, escalate warning to: "Only X minutes between events. Account for breakdown, travel, and setup."
- Show this warning in the UI (EventTransitions component)

### 4B. Post-booking detail editing

**Problem:** Edit page locked after `accepted`. Real operations need flexible editing.

**File:** `app/(chef)/events/[id]/edit/page.tsx` line 31

**Fix:** Allow editing for all non-terminal states. For states beyond `accepted`, show a confirmation: "This event is already [status]. Changes may affect quotes, grocery lists, and prep schedules." Log the edit in the activity timeline.

Alternatively: keep the full edit locked but allow inline editing of specific fields (serve_time, guest_count, location, special_requests) directly on the event detail page for any non-terminal state.

### 4C. Contract gate before confirmation

**Problem:** No signed-contract readiness gate before `paid->confirmed`.

**File:** `lib/events/readiness.ts` around line 64-86

**Fix:** Add `signed_contract` to the `confirmed` blockers list, but as a **soft** gate (warning, not hard block). Many private chef events proceed without formal contracts. Make it hard-blockable via a chef preference toggle (`require_contract_before_confirm`).

### 4D. Venue contact field

**Problem:** No separate venue manager or day-of coordinator contact. Only client contact available.

**Enhancement:** Add `venue_contact_name`, `venue_contact_phone`, `venue_contact_email` fields to the events table (or a related `event_venues` table). Show in the event form under location details. Display on pack list departure card and BEO.

### 4E. Load-in / Load-out as timeline phases

**Problem:** Schema has `load_in_path_notes` and `loading_dock` fields but no operational timeline phase.

**Enhancement:** Add "Load-In" and "Load-Out" (or "Strike") as named phases in the timeline generator (`lib/scheduling/timeline.ts`). Load-in = arrival_time to service_start. Load-out = service_end to departure. These already have implicit time but aren't labeled.

### 4F. Time tracking: "Reset" to "Breakdown"

**Problem:** `time_reset_minutes`, `reset_started_at`, `reset_completed_at` use restaurant table-turning language. Catering standard is "breakdown" or "strike."

**Decision needed:** This is a DB column rename which requires a migration. The column is referenced in:

- `app/(chef)/events/[id]/execution/page.tsx` lines 99, 108-109
- `components/events/time-tracking.tsx` (multiple references)
- `lib/events/actions.ts` (time card update)

**Option A (safe):** Keep the column names, change only UI labels from "Reset" to "Breakdown" in the time tracking component.
**Option B (thorough):** Additive migration: add `time_breakdown_minutes`, `breakdown_started_at`, `breakdown_completed_at` columns. Backfill from reset columns. Update all references. Drop old columns in a future migration after verification.

**Recommend Option A** (UI-only change) for now. The internal column name doesn't affect users.

### 4G. HACCP-style temperature logging

**Problem:** Temp logs exist but aren't tied to protocol-driven checkpoints.

**Enhancement:** Add predefined temp check types to the temp log form:

- Receiving (ingredient delivery): target varies by item
- Cold holding: must be <= 41F / 5C
- Hot holding: must be >= 135F / 57C
- Cooking: varies (165F poultry, 145F fish, etc.)
- Cooling: must pass through 135F->70F in 2 hours, 70F->41F in 4 hours
- Serving: same as hot/cold holding

The `TempLogPanel` component at `components/events/temp-log-panel.tsx` already exists. Add a `checkpoint_type` field and auto-populate checkpoints based on the menu's protein items.

### 4H. Real-time 86'd tracking during live service

**Problem:** KDS has 86'd status but no way to mark a dish as 86'd during `in_progress` and propagate it to guests/staff.

**Enhancement:** During `in_progress`, add a quick "86 Item" button per dish on the ops tab. When fired:

- Mark dish as unavailable in the KDS
- If guest experience portal is active, update it
- Log in the activity timeline
- Surface in the AAR as a "menu modification"

The KDS at `components/operations/kds-view.tsx` already has 86'd as a status. The gap is surfacing this action prominently during live service outside the full KDS view.

---

## TIER 5: COSMETIC / LOW PRIORITY

### 5A. "Number of Guests" label inconsistency

Three different labels used across forms: "Number of Guests", "Guest Count", "Guests". Pick one and use it everywhere. Recommend "Guest Count" (shortest, clearest).

**Files:**

- `components/events/event-form.tsx:779` - "Number of Guests"
- `components/events/event-creation-wizard.tsx:391` - "Number of Guests"
- `components/events/event-nl-form.tsx:290` - "Guest Count"
- `components/events/pre-event-checklist-client.tsx:204` - "Guest Count"

### 5B. "Covers" in kitchen-facing surfaces

Add "(X covers)" next to guest count on chef-facing operational documents:

- Prep sheet
- Pack list header
- Schedule page
- Production report
- Staff briefing

Don't change client-facing surfaces. "Guests" stays for client-facing, "covers" added parenthetically for chef-facing.

### 5C. BOH terminology

FOH (front of house) is used correctly throughout. BOH (back of house) is never used. Add where relevant:

- Prep sheet header: "BOH Prep Sheet"
- Kitchen notes labeled as "BOH Notes" in staff briefing

### 5D. Inline side effects on confirmed transition

**Problem:** 25+ non-blocking side effects fire inline during `confirmed` transition (transitions.ts:726-1317). Slow PDF generation could cause timeout.

**Future fix:** Move heavy side effects (PDF generation, email sends with attachments) to a background job queue (Inngest is already used for post-event follow-up). This is architectural and should be a separate spec.

---

## BUILD ORDER

Execute in this order to minimize risk and maximize value:

1. **1A** - Fix Cartesian join (migration + verify)
2. **1B** - Fix tip double-count (one line change + verify)
3. **1C** - Fix silent $0 (UI change)
4. **2F** - Terminology fixes (string replacements, low risk)
5. **2E** - Prep checklist server persistence (new table + server action + component update)
6. **2A + 2B** - Pack list serviceware + scaling (same file, do together)
7. **2C + 2D** - Pack list custom items + gear integration
8. **3A** - Bust grocery cache on guest count change
9. **3B** - Cron timezone fix
10. **2G** - BEO document generation
11. **4A-4H** - Operational upgrades (pick order based on priority)
12. **5A-5D** - Cosmetic fixes (batch together)

## VERIFICATION CHECKLIST

After all changes:

- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] `npx next build --no-lint` exits 0
- [ ] Event with 3 payments + 2 expenses: financial summary view shows correct totals (not inflated)
- [ ] Event with tip: close-out wizard shows tip once (not doubled)
- [ ] Event with no quote: money tab shows "Not set" not "$0.00"
- [ ] All 7 terminology locations show "service" not "dinner"
- [ ] Pack list for buffet event includes chafing dishes + serving platters + plates
- [ ] Pack list for 40-guest event has more towels than 4-guest event
- [ ] Prep checklist: check item on phone, reload on desktop, item still checked
- [ ] Change guest count: grocery price quote regenerates (not cached)
- [ ] BEO PDF generates with all sections populated
