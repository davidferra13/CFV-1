# Workflow Readiness Engine

**Branch:** `feature/packing-list-system`
**Date:** 2026-02-19
**Status:** Complete — 5 phases implemented

---

## Overview

A private chef's real value-add — cooking and being present with the client — represents only 3–7% of the total workflow from inquiry to service completion. The Workflow Readiness Engine is the system that does everything else as fast as humanly possible, the moment it becomes possible.

The engine has three components:

1. **Signal Scanner** — Always-on, reads every client message. Detects allergy mentions, dietary preferences, and preferences the moment they appear. Escalates high-confidence findings immediately without waiting for the chef to open the chat panel.

2. **Precondition Gates** — Per-event monitors that know exactly what must be true before the next FSM state transition. Blocks life-threatening safety gaps (anaphylaxis, unconfirmed allergies). Warns on everything else (with override + audit trail).

3. **Structured Allergy Records** — Replaces the flat `allergies: string[]` on clients with per-allergen records carrying severity classification, source provenance, AI detection lineage, and a chef confirmation workflow.

---

## What Changed

### New Database Schema

#### `client_allergy_records` (migration `20260304000001`)
Structured allergen records per client. Every record carries:
- `allergen` — the substance (unique per client, case-insensitive)
- `severity` — `preference | intolerance | allergy | anaphylaxis`
- `source` — `chef_entered | ai_detected | intake_form | client_stated`
- `confirmed_by_chef` — `false` for AI-detected records until chef reviews
- `confirmed_at` — timestamp when chef confirmed
- `notes` — free text (e.g., "small amounts OK", "EpiPen required")
- `detected_in_message_id` — links to the chat message where AI found it

The unique index `(client_id, LOWER(allergen))` prevents duplicate records for the same allergen. AI detections do not overwrite chef-entered records (INSERT with `ignoreDuplicates: true`).

#### `event_readiness_gates` (migration `20260304000002`)
One row per gate per event. Tracks which preconditions have been met before each FSM transition.

Gate catalog:
| Gate | Transition | Type |
|---|---|---|
| `allergies_verified` | `paid → confirmed` | Auto-checked |
| `documents_generated` | `paid → confirmed` | Auto-checked |
| `menu_client_approved` | `paid → confirmed` | Auto-checked |
| `packing_reviewed` | `confirmed → in_progress` | Chef action required |
| `equipment_confirmed` | `confirmed → in_progress` | Chef action required |
| `receipts_uploaded` | `in_progress → completed` | Chef action required |
| `kitchen_clean` | `in_progress → completed` | Chef action required |
| `dop_complete` | `in_progress → completed` | Chef action required |
| `financial_reconciled` | `in_progress → completed` | Chef action required |

Each gate has status `pending | passed | overridden`. Overrides require a mandatory reason and are logged in the audit trail.

---

### Signal Scanner Enhancement (`lib/insights/actions.ts`)

**Before:** `processMessageInsights()` ran AI extraction and stored results in `chat_insights` as `pending`. Results sat there until the chef opened the chat panel and manually reviewed them.

**After:** High-confidence allergy/dietary insights (≥ 0.75 confidence) are auto-escalated immediately via `autoEscalateAllergyInsight()`:

1. Upserts a `client_allergy_records` row (`confirmed_by_chef: false`, `source: ai_detected`)
2. Creates a pinned dietary note on the client profile
3. Sends a chef notification immediately

For anaphylaxis-severity detections, the notification title is `CRITICAL: Possible anaphylaxis allergen detected`. For regular allergies, it's `Allergy detected in chat: [allergen]`.

The original `chat_insights` record is still created (for the chef's review UI). The escalation is additive, not a replacement.

---

### Readiness Engine (`lib/events/readiness.ts`)

Core module. Exports:

**`evaluateReadinessForTransition(eventId, fromStatus, toStatus)`**
Evaluates all gates for a given FSM transition. Returns:
- `ready` — boolean (all gates passed or overridden)
- `hardBlocked` — boolean (any gate is a hard block — anaphylaxis present)
- `gates` — full gate results
- `blockers` — pending gates (the things still needing action)
- `warnings` — overridden gates (logged bypasses)

**`getEventReadiness(eventId)`**
Convenience wrapper. Looks up the event's current status, determines the next logical transition, and returns readiness for it.

**`checkMenuAllergyConflicts(eventId)`**
Cross-event consistency checker. Scans menu components for text matching confirmed allergens. Returns `hasConflicts` and a `conflicts[]` array with `allergen`, `severity`, and `menuItem`.

**Gate actions:**
- `markGatePassed(eventId, gate, metadata?)` — chef marks a gate done
- `overrideGate(eventId, gate, reason)` — chef bypasses with mandatory reason (hard blocks cannot be overridden)
- `confirmAllergyRecord(id, options?)` — chef confirms AI-detected allergen
- `dismissAllergyRecord(id)` — chef rejects AI detection as incorrect
- `addAllergyRecord(clientId, data)` — chef manually enters allergen (auto-confirmed)
- `getClientAllergyRecords(clientId)` — fetch all records for a client

---

### FSM Integration (`lib/events/transitions.ts`)

`transitionEvent()` now runs readiness checks before applying any state update:

```
→ evaluateReadinessForTransition(eventId, fromStatus, toStatus)
  if hardBlocked: throw "Cannot proceed: [hard blocker details]"
  else: collect soft warnings (logged in transition metadata)
→ apply state update
→ log transition with readiness_warnings[] in metadata
→ return { success, fromStatus, toStatus, warnings[] }
```

System transitions (Stripe webhooks) skip readiness checks entirely.

Infrastructure errors in the readiness check are caught and logged but never block the transition (fail-safe).

---

### UI Components

#### `ReadinessGatePanel` (`components/events/readiness-gate-panel.tsx`)
Shown on the event detail page for any event with applicable gates. Displays each gate as a card with:
- Status icon (green check, amber warning, red shield for hard block)
- Label and description
- "Mark Done" button (triggers `markGatePassed`)
- "Skip" button → expand inline override form (triggers `overrideGate`)
- Hard-blocked gates: no skip available, explains why

Appears on: [app/(chef)/events/[id]/page.tsx](app/(chef)/events/[id]/page.tsx) — rendered above `EventTransitions`.

#### `AllergyRecordsPanel` (`components/clients/allergy-records-panel.tsx`)
Shown on the client detail page. Displays all allergen records for the client with:
- Severity-colored rows (anaphylaxis = red, allergy = orange, intolerance = amber, preference = blue)
- Unconfirmed records prominently first, with Confirm/Dismiss actions
- Confirm action lets chef adjust severity before confirming
- Add button opens inline form for manual allergen entry
- Anaphylaxis risk badge on panel header when any anaphylaxis record exists

Appears on: [app/(chef)/clients/[id]/page.tsx](app/(chef)/clients/[id]/page.tsx) — rendered above `QuickNotes`.

---

## Data Flow: Allergy Lifecycle

```
1. Client sends chat message
   ↓
2. sendChatMessage() → processMessageInsights() [fire-and-forget]
   ↓
3. analyzeMessageForInsights() extracts insights
   ↓
4. All insights ≥ 0.5 confidence → saved to chat_insights (pending)
   ↓
5. Allergy/dietary insights ≥ 0.75 confidence → autoEscalateAllergyInsight()
   ├── Upsert client_allergy_records (confirmed_by_chef: false)
   ├── Create pinned dietary note
   └── Notify chef (in-app)
   ↓
6. Chef sees notification → goes to client profile → AllergyRecordsPanel
   ↓
7. Chef confirms or dismisses each record
   ↓
8. When chef tries to confirm event (paid → confirmed):
   └── evaluateReadinessForTransition() runs allergies_verified gate
       ├── If unconfirmed anaphylaxis: HARD BLOCK (cannot proceed)
       ├── If unconfirmed allergy: soft warning (can override with reason)
       └── If all confirmed: gate passes automatically
   ↓
9. Transition succeeds → audit trail includes readiness_warnings[]
```

---

## Data Flow: Gate Lifecycle

```
1. Event moves to 'paid' state (via Stripe webhook)
2. Chef opens event detail page
3. ReadinessGatePanel renders, showing:
   - allergies_verified: pending/passed based on client_allergy_records
   - documents_generated: pending/passed based on event columns
4. Chef takes action (generates docs, confirms allergies)
5. Gates auto-pass OR chef marks them done
6. Chef clicks "Confirm Event" → EventTransitions fires confirmEvent()
7. transitionEvent() re-evaluates gates:
   - Hard blocks: throws error, transition aborted
   - Soft blockers: logged as warnings, transition proceeds
8. Audit trail records all overrides and warnings
```

---

## AI Policy Compliance

This system complies fully with `docs/AI_POLICY.md`:

- AI detections go into `client_allergy_records` with `confirmed_by_chef: false`
- No AI-detected allergen influences planning documents until chef confirms it
- Chef confirmation is the canonical action — unplug AI and chef-entered records persist
- No lifecycle transitions happen silently — all allergy gates require explicit chef action
- Override audit trail ensures every bypass is attributed and justified

---

## Files Created / Modified

| File | Type | Description |
|---|---|---|
| `supabase/migrations/20260304000001_structured_allergy_records.sql` | New | Structured allergen records table |
| `supabase/migrations/20260304000002_event_readiness_gates.sql` | New | Event readiness gate tracking table |
| `lib/events/readiness.ts` | New | Readiness engine — all gate logic and allergy record actions |
| `lib/insights/actions.ts` | Modified | Added auto-escalation for high-confidence allergy insights |
| `lib/events/transitions.ts` | Modified | Pre-transition readiness check; warnings in audit trail; return warnings |
| `components/events/readiness-gate-panel.tsx` | New | Gate panel UI for event detail page |
| `components/clients/allergy-records-panel.tsx` | New | Allergen record panel UI for client detail page |
| `app/(chef)/events/[id]/page.tsx` | Modified | Fetches `eventReadiness`, renders `ReadinessGatePanel` |
| `app/(chef)/clients/[id]/page.tsx` | Modified | Fetches `allergyRecords`, renders `AllergyRecordsPanel` |

---

## Migration Instructions

These migrations are additive — no existing data is modified.

```bash
# Apply both migrations
supabase db push --linked
```

No seed data is required. Existing `clients.allergies` string arrays are preserved.
New `client_allergy_records` starts empty and fills over time via:
- AI detection from chat messages (automatic)
- Chef manual entry via `AllergyRecordsPanel`

---

## Future Work

- **Guest allergy tracking**: Add per-guest allergy records for multi-person events (currently only client is tracked)
- **Allergy severity on menu documents**: Show confirmed allergens with severity on Prep Sheet and Execution Sheet header
- **Cross-event allergy reconciliation**: `checkMenuAllergyConflicts()` is implemented and ready — wire its results into the `documents_generated` gate check
- **Scheduled allergy confirmation reminders**: If a client has unconfirmed allergens 48h before an event, auto-notify the chef
