# Event Immutability Triggers

**Migration:** `supabase/migrations/20260306000001_event_immutability_triggers.sql`

## What Changed

Two new database triggers added to the `events` table, enforcing immutability promises that previously existed only as schema comments and app-layer checks.

---

## Why This Existed as a Gap

The Layer 3 migration (`20260215000003_layer_3_events_quotes_financials.sql`) already had:

- A column comment: `COMMENT ON COLUMN events.allergies IS 'IMMUTABLE after event creation - safety-critical data'`
- App-layer code in server actions that prevented pricing updates post-acceptance
- A `pricing_snapshot` that froze a JSON copy of pricing at creation time

But none of these stop a direct SQL UPDATE, a service-role call, or a future server action that forgets the constraint. The ledger has a DB-level trigger (added in Layer 3). Event pricing and allergies did not. This migration closes that gap.

---

## Trigger 1: Event Pricing Immutability

**Trigger:** `prevent_event_price_mutation_trigger`
**Function:** `prevent_event_price_mutation_after_acceptance()`
**Fires on:** `BEFORE UPDATE OF quoted_price_cents, deposit_amount_cents, pricing_model ON events`

**Rule:** If the event status is NOT `draft` or `proposed`, any attempt to change `quoted_price_cents`, `deposit_amount_cents`, or `pricing_model` raises an exception.

**Why after `accepted`:** The moment a client accepts the proposal, they have agreed to specific pricing. Changing the price after that point would:
- Break financial reconciliation against the ledger
- Create a discrepancy between what the client agreed to and what was charged
- Undermine trust in the audit trail

**What is still allowed:**
- Changing any other field on an accepted event (title, location, notes, status transitions, etc.)
- Changing pricing during `draft` or `proposed` phases (normal workflow)

---

## Trigger 2: Event Allergy Immutability

**Trigger:** `prevent_event_allergy_mutation_trigger`
**Function:** `prevent_event_allergy_mutation()`
**Fires on:** `BEFORE UPDATE OF allergies ON events`

**Rule:** If the event status is NOT `draft` or `proposed`, any attempt to change the `allergies` array raises an exception.

**Why this matters:** An allergy field getting silently erased or changed after a client has confirmed an event is a food safety and legal liability. If a guest has a nut allergy that gets removed from the record, the chef has no warning. This trigger makes the schema comment a hard guarantee.

**What is still allowed:**
- Setting allergies during `draft` or `proposed` phases (normal workflow)
- Adding allergies during `draft` or `proposed` if the client reports them before accepting

**If allergies must change post-acceptance:** This should go through a support workflow with an explicit audit trail entry — not a field update.

---

## Pattern Notes

Both triggers use `UPDATE OF column_name` syntax (not just `UPDATE`), which means they only fire when the specific column is included in an UPDATE statement. This is important for performance — status transitions, note updates, and other routine event mutations do NOT trigger these checks.

Both functions use `IS DISTINCT FROM` rather than `!=` to correctly handle NULL comparison.

---

## Testing

Via Supabase SQL editor or a test script:

```sql
-- 1. Create a test event in 'accepted' status
-- 2. Attempt to change pricing:
UPDATE events
SET quoted_price_cents = 0
WHERE id = '<test-event-id>' AND status = 'accepted';
-- Should raise: "Event pricing is immutable once accepted..."

-- 3. Attempt to change allergies:
UPDATE events
SET allergies = '{}'
WHERE id = '<test-event-id>' AND status = 'accepted';
-- Should raise: "Event allergy information is immutable once accepted..."

-- 4. Confirm that status transitions still work:
UPDATE events
SET status = 'paid'
WHERE id = '<test-event-id>' AND status = 'accepted';
-- Should succeed (status is not a guarded column on these triggers)
```

---

## Connection to Existing System

This completes a set of three immutability guarantees in the database:

| Data | Trigger | Added In |
|------|---------|---------|
| Ledger entries | `prevent_ledger_update` + `prevent_ledger_delete` | Layer 3 migration |
| Event state transitions | `prevent_event_transition_update` + `_delete` | Layer 3 migration |
| Quote state transitions | `prevent_quote_transition_update` + `_delete` | Layer 3 migration |
| **Event pricing** | **`prevent_event_price_mutation_trigger`** | **This migration** |
| **Event allergies** | **`prevent_event_allergy_mutation_trigger`** | **This migration** |
