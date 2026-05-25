# Communication Capture Loop

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** Exit-points analysis (exits 25-31), Category 5: "The Messy Reality"
> **Pillar:** OPERATE (Client Relationship Memory)

---

## Problem Statement

Chefs communicate with clients and vendors through text, calls, WhatsApp, and email constantly. These are permanent exits. ChefFlow will never replace iMessage, WhatsApp, or phone calls. That is not the problem.

The problem is information loss.

Chef calls a client, learns they switched to pescatarian. That fact lives in the chef's head. Chef texts about changing guest count from 8 to 12. ChefFlow still says 8. Chef coordinates a delivery time with the florist. No record in ChefFlow. The information exchanged in external conversations never makes it back into the system.

This is the second most frequent exit category (daily), and the real cost is not the exit itself. It is the intelligence that evaporates after the exit. Every unlogged call is a dietary preference forgotten, a date change missed, a vendor commitment lost.

---

## Design Principles

1. **Capture, not communication.** ChefFlow records what was learned, not where it was said.
2. **One tap to start, structured by default.** The capture widget is faster than opening a notes app.
3. **Detect and prompt, never auto-mutate.** When a note mentions a guest count change, prompt the chef to update the record. Never silently change data.
4. **Unified timeline, mixed sources.** Remy emails, SMS bridge messages, and manual logs all appear in one chronological view per client.
5. **Vendor coordination is first-class.** Multi-vendor events need a contact log, not just a vendor list.

---

## Success Criteria

- Chef finishes a 3-minute phone call, taps one button, logs the key info in under 30 seconds
- ChefFlow detects "guest count now 12" in the log and offers a one-tap update to the event record
- Before a dinner, chef sees every touchpoint with the client (Remy emails, texts logged, calls logged, notes) in one timeline
- For a multi-vendor event, chef sees which vendors were contacted, when, and what was confirmed
- No external integration required. No API to iMessage, WhatsApp, or phone. Pure manual capture with smart assistance.

---

## Exit Points Closed

| Exit # | Scenario                                 | How This Spec Addresses It                                                                                |
| ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 25     | Text/iMessage a client                   | Quick Capture widget logs what was discussed, links to client + event                                     |
| 26     | WhatsApp with a client                   | Same widget; channel tag distinguishes source                                                             |
| 27     | Call a client                            | Post-call capture flow with duration and key-info prompts                                                 |
| 28     | Check personal email for client replies  | Communication Timeline surfaces Remy-managed emails alongside manual logs; reduces need to context-switch |
| 29     | Respond to inquiry on 3rd-party platform | Reference to Inquiry Consolidation Hub (existing specs, not re-specced here)                              |
| 30     | Send food photos to client               | Capture widget logs "sent photos of X to client via Y"; photo itself stays external                       |
| 31     | Coordinate with other vendors            | Vendor Coordination Log per event tracks all vendor touchpoints                                           |

**Note on Exit 29:** Inquiry consolidation is covered by existing specs (`inquiry-to-booking-orchestration.md`, `codex-inquiry-event-urgency.md`, `system-integrity-question-set-inquiry-pipeline.md`). This spec does not re-spec that work. The Communication Timeline will surface inquiry-channel messages alongside other touchpoints once both systems are built.

---

## Deliverables

### 1. Quick Capture Widget

**What it is:** A persistent, one-tap entry point for logging external communication. Available from the dashboard, any client profile, any event detail page, and the mobile action bar.

**Not a CRM.** Not a message composer. A fast note with structured metadata.

**Capture form fields:**

| Field            | Required | Type                                                                                                                                    | Notes                                                                     |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Who              | Yes      | Client picker or free text                                                                                                              | Auto-suggests from recent clients. Free text for new contacts or vendors. |
| Channel          | Yes      | Enum: `text`, `call`, `whatsapp`, `email`, `in_person`, `other`                                                                         | Defaults to `call` (most common unlogged channel)                         |
| Direction        | Yes      | `inbound` / `outbound`                                                                                                                  | Did the client reach out, or did the chef?                                |
| Key info         | Yes      | Free text (max 2000 chars)                                                                                                              | What was learned, decided, or promised                                    |
| Linked event     | No       | Event picker                                                                                                                            | Auto-suggests upcoming events for this client                             |
| Tags             | No       | Multi-select: `dietary_change`, `guest_count`, `date_change`, `menu_feedback`, `logistics`, `payment`, `vendor_coordination`, `general` | Used for Info Change Detection (Deliverable 2)                            |
| Duration         | No       | Minutes (integer)                                                                                                                       | For calls; helps track time investment per client                         |
| Follow-up needed | No       | Boolean + date                                                                                                                          | Creates a task in the chef's task queue                                   |

**Interaction model:**

1. Chef taps the capture button (floating action button on mobile, toolbar button on desktop)
2. If opened from a client profile or event page, `Who` and `Linked event` are pre-filled
3. Chef types or voice-dictates the key info
4. Submits. Takes under 30 seconds for typical entries.
5. Entry is persisted as a `communication_events` row with `source = 'manual_log'`

**Where it lives in existing infrastructure:**

- Storage: `communication_events` table (canonical, already supports `manual_log` source per `unified-thread.ts`)
- Thread linkage: creates or appends to `conversation_threads` for the client
- Compatibility: mirrors to `messages` table per the Communication Ingestion Pipeline contract
- Capture entries (`capture_entries` table) are a separate system for brain dumps; this widget writes directly to `communication_events` because it is a communication log, not a general capture

**New code:**

| File                                                 | Purpose                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `lib/communication/quick-capture-actions.ts`         | Server actions: `logExternalCommunication`, `getRecentCaptures` |
| `components/communication/quick-capture-widget.tsx`  | Modal/sheet UI for the capture form                             |
| `components/communication/quick-capture-trigger.tsx` | FAB on mobile, toolbar button on desktop                        |

**Existing code reused:**

| File                                                      | How                                           |
| --------------------------------------------------------- | --------------------------------------------- |
| `lib/communication/pipeline.ts::ingestCommunicationEvent` | Canonical writer for the new manual_log event |
| `lib/communication/unified-thread.ts`                     | Already maps `manual_log` source type         |
| `lib/clients/`                                            | Client picker/resolver                        |
| `lib/events/`                                             | Event picker/resolver                         |

### 2. Info Change Detection Prompts

**What it is:** After a capture is saved, Remy scans the key-info text for signals that a record should be updated. Prompts the chef; never auto-mutates.

**Detection targets:**

| Signal               | Detected Pattern                                                                             | Prompted Update                                              |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Guest count change   | Numbers near "guest", "people", "covers", "seats", "pax"                                     | Update `events.guest_count`                                  |
| Date/time change     | Date patterns near "moved", "rescheduled", "changed", "pushed"                               | Update `events.date` or `events.start_time`                  |
| Dietary change       | Keywords: "vegetarian", "pescatarian", "vegan", "allergy", "gluten", "kosher", "halal", etc. | Update client dietary profile or event dietary notes         |
| Menu feedback        | "loved the", "didn't like", "wants more", "skip the"                                         | Create a menu note or recipe note on the linked event's menu |
| Cancellation signal  | "cancel", "postpone", "not happening", "called it off"                                       | Prompt lifecycle transition (do not auto-transition)         |
| Payment mention      | "paid", "sent deposit", "Venmo", "Zelle", "check"                                            | Prompt to log informal payment against the event             |
| Address/venue change | "new address", "changed location", "different venue"                                         | Update event location                                        |

**How it works:**

1. After `logExternalCommunication` persists the event, it calls a lightweight detection function
2. Detection is heuristic-first (keyword + regex), not AI-dependent. Works without Ollama.
3. If Ollama is available, a short prompt refines the detection (confirm/reject heuristic matches, extract structured values)
4. Matches are returned as `SuggestedUpdate[]` and surfaced as a toast or inline card: "It sounds like the guest count changed to 12. Update the event?"
5. Chef taps "Update" (one tap) or "Dismiss"
6. If updated, the change is attributed: "Updated from communication log on [date]"

**New code:**

| File                                                 | Purpose                                           |
| ---------------------------------------------------- | ------------------------------------------------- |
| `lib/communication/info-change-detector.ts`          | Heuristic + optional AI detection engine          |
| `lib/communication/info-change-types.ts`             | `SuggestedUpdate` type, detection target registry |
| `components/communication/suggested-update-card.tsx` | Inline prompt UI for detected changes             |

**Existing code reused:**

| File                         | How                                          |
| ---------------------------- | -------------------------------------------- |
| `lib/ai/parse-brain-dump.ts` | Pattern reference for entity extraction      |
| `lib/ai/parseWithOllama`     | Optional AI refinement when Ollama is online |
| `lib/events/actions.ts`      | Mutation targets for event updates           |
| `lib/clients/`               | Mutation targets for dietary/profile updates |

### 3. Vendor Coordination Log

**What it is:** A per-event log of all vendor touchpoints. Who was contacted, when, through what channel, what was confirmed or outstanding.

Distinct from the vendor trust ledger (`lib/vendors/vendor-trust-ledger-contract.ts`), which tracks vendor reliability over time. The coordination log tracks operational communication for a single event.

**Data model:**

The coordination log reuses `communication_events` with a vendor-specific linkage:

| Field                | Value                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| `source`             | `manual_log`                                                           |
| `linked_entity_type` | `event`                                                                |
| `linked_entity_id`   | The event ID                                                           |
| `resolved_vendor_id` | New nullable column on `communication_events` (or metadata JSON field) |

Alternatively, if adding a column is too invasive, vendor coordination entries are stored as `communication_events` with a structured tag in metadata: `{ "vendor_id": "...", "vendor_name": "..." }`.

**Coordination entry fields:**

| Field          | Required | Notes                                                           |
| -------------- | -------- | --------------------------------------------------------------- |
| Vendor         | Yes      | Picker from chef's vendor list, or free text for ad-hoc vendors |
| Channel        | Yes      | Same enum as Quick Capture                                      |
| Status         | Yes      | `contacted`, `waiting`, `confirmed`, `issue`                    |
| Notes          | Yes      | What was discussed or confirmed                                 |
| Event          | Yes      | Pre-filled when opened from event detail                        |
| Follow-up date | No       | When to check back if status is `waiting`                       |

**UI surface:**

- Tab or section on the event detail page: "Vendor Coordination"
- Shows all vendor touchpoints for this event, sorted chronologically
- Status badges: green (confirmed), yellow (waiting), red (issue), gray (contacted)
- "Add vendor contact" button opens a variant of the Quick Capture widget scoped to vendors

**New code:**

| File                                            | Purpose                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `lib/vendors/vendor-coordination-actions.ts`    | Server actions: `logVendorContact`, `getEventVendorCoordination`, `updateVendorContactStatus` |
| `components/events/vendor-coordination-log.tsx` | Event detail section showing vendor touchpoints                                               |
| `components/events/vendor-contact-entry.tsx`    | Individual vendor contact card                                                                |

**Existing code reused:**

| File                                          | How                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/vendors/vendor-communication-actions.ts` | Vendor picker, vendor profile resolution                                                       |
| `lib/communication/pipeline.ts`               | Canonical event persistence                                                                    |
| `lib/vendors/vendor-trust-ledger-contract.ts` | Link coordination outcomes to trust signals (e.g., `late_delivery` from a logged vendor issue) |

### 4. Communication Timeline

**What it is:** A unified, chronological view of every touchpoint with a client across all channels. One place to see the full relationship history.

**Already mostly built.** `lib/communication/unified-thread.ts::getUnifiedThread` already merges `communication_events`, `messages`, and client notes into a single `UnifiedThreadItem[]` sorted by timestamp. It already supports types: `email`, `sms`, `chat`, `phone`, `note`, `whatsapp`, `manual_log`, `other`.

**What remains:**

1. **UI surface.** The unified thread data exists but has no dedicated timeline view on the client profile page. Build a "Communication History" tab or expandable section on the client detail page.
2. **Channel filter.** Let chef filter by channel (show only calls, show only texts, etc.)
3. **Search within timeline.** Text search across all touchpoints for a client ("when did we discuss the nut allergy?")
4. **Quick Capture integration.** The capture widget entries appear here automatically (they are `communication_events` with `source = manual_log`)
5. **Vendor coordination entries.** When a vendor coordination log entry is linked to an event that is linked to a client, it appears in the client timeline with a vendor badge.

**New code:**

| File                                            | Purpose                                      |
| ----------------------------------------------- | -------------------------------------------- |
| `components/clients/communication-timeline.tsx` | Timeline UI component                        |
| `components/clients/timeline-filter-bar.tsx`    | Channel and date range filters               |
| `lib/communication/timeline-search.ts`          | Full-text search across unified thread items |

**Existing code reused:**

| File                                  | How                                |
| ------------------------------------- | ---------------------------------- |
| `lib/communication/unified-thread.ts` | Core data fetching (already built) |
| `app/(chef)/clients/[id]/page.tsx`    | Mount point for the timeline tab   |

### 5. Inquiry Consolidation Hub (Reference Only)

This spec does not re-spec the Inquiry Consolidation Hub. Existing specs cover it:

- `docs/specs/inquiry-to-booking-orchestration.md` (orchestration layer)
- `docs/specs/codex-inquiry-event-urgency.md` (urgency classification)
- `docs/specs/system-integrity-question-set-inquiry-pipeline.md` (integrity checks)
- `docs/specs/inquiry-parse-reliability.md` (parse quality)

The Communication Timeline (Deliverable 4) will surface inquiry-channel messages alongside manual logs once both systems mature. No additional work is specified here.

---

## Data Flow

```
Chef has external conversation (text, call, WhatsApp, in-person)
    |
    v
Opens Quick Capture Widget (one tap)
    |
    v
Fills: who, channel, key info, optional event link
    |
    v
logExternalCommunication() server action
    |
    +---> ingestCommunicationEvent() [canonical writer]
    |         |
    |         +---> communication_events row (source: manual_log)
    |         +---> conversation_threads row (created or appended)
    |         +---> messages compatibility row
    |         +---> communication_action_log audit entry
    |
    +---> runInfoChangeDetection() [post-capture]
              |
              +---> Heuristic scan of key-info text
              +---> Optional Ollama refinement
              +---> Returns SuggestedUpdate[] to client
              +---> Chef sees: "Guest count changed to 12. Update?"
              +---> Chef taps Update or Dismiss
```

---

## Migration

### New database objects

**Option A (preferred): Zero new tables.** All manual log entries go into `communication_events` (canonical store). Vendor coordination entries use a JSON metadata field for vendor linkage. Info Change Detection is stateless (computes on read, stores nothing unless chef approves an update).

**Option B (if metadata querying becomes a bottleneck):** Add `resolved_vendor_id` nullable column to `communication_events`. One migration, additive only.

Either way: no new tables. This system layers on top of the existing communication infrastructure.

### Suggested updates storage

When a chef dismisses a suggested update, that dismissal should be persisted so the same suggestion is not repeated. Options:

1. A `dismissed_suggestions` array in the `communication_events` metadata JSON
2. A lightweight `communication_capture_suggestions` table (id, event_id, suggestion_type, status, dismissed_at)

Option 2 is cleaner but adds a table. Decision deferred to build time.

---

## Remy Integration

Remy should be aware of manual communication logs:

1. **Context loading.** When Remy loads client context (`lib/ai/remy-context.ts`), include recent manual log entries. "Chef logged a call on May 20: client is now pescatarian."
2. **Brain dump bridge.** If a chef brain-dumps "called Sarah, she changed to 12 guests and wants more seafood" into Remy, the brain dump pipeline should detect this as a communication log and route it through `logExternalCommunication` in addition to creating any tasks.
3. **Proactive prompts.** After an event, Remy could prompt: "You had dinner with the Johnsons last night. Any notes from the service?" This nudges capture without requiring the chef to remember.

---

## Mobile Considerations

The Quick Capture Widget must be mobile-first:

- Floating action button (bottom-right, above nav bar) on mobile views
- Sheet/drawer interaction (slides up from bottom), not a modal
- Large touch targets for channel selection (icon buttons, not a dropdown)
- Voice input supported via native browser speech-to-text for the key-info field
- Works offline: queue captures in localStorage, sync when reconnected

---

## What This Is Not

- **Not a messaging platform.** ChefFlow does not send texts, make calls, or connect to WhatsApp. Those are permanent exits.
- **Not a CRM.** No pipeline stages, no lead scoring, no automated follow-up sequences for manual logs. (Remy and the lifecycle intelligence layer handle automated follow-up for managed channels.)
- **Not a replacement for Remy email.** Remy manages the email channel. This captures what happens on channels Remy cannot see.
- **Not automatic.** There is no integration that reads the chef's texts or call log. The chef manually logs what matters. The value is in the structured capture and the change detection, not in automation.

---

## Implementation Order

1. **Quick Capture Widget** (core value; everything else depends on captures existing)
2. **Info Change Detection Prompts** (multiplies the value of every capture)
3. **Communication Timeline** (mostly built; needs UI surface)
4. **Vendor Coordination Log** (specialized variant of Quick Capture for events)
5. **Remy Integration** (enhancement layer; not blocking)

---

## Open Questions

1. Should the Quick Capture widget also support attaching a photo (e.g., screenshot of a text conversation)? Adds complexity but captures more context.
2. Should vendor coordination status changes (waiting to confirmed) automatically update an event readiness score in the completion contract?
3. How aggressively should Info Change Detection prompt? Every keyword match, or only high-confidence matches? Start conservative (high-confidence only) and tune.
