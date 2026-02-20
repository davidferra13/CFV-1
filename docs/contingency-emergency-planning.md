# Contingency & Emergency Planning

## What Changed
Added a personal emergency contacts directory and per-event contingency planning for six common failure scenarios: chef illness, equipment failure, ingredient unavailability, venue issues, severe weather, and other.

## Why
Private chefs are sole operators. If the chef is incapacitated, injured, or faces a critical equipment failure the night before an event, there is no corporate HR department or backup team to call. Having a structured contingency plan per event — with a named backup contact — transforms a potential catastrophe into a recoverable situation. Before this change, there was nowhere to capture this information in the system.

## What Was Built

### Database
**Migration:** `supabase/migrations/20260303000016_contingency_planning.sql`

**`chef_emergency_contacts`**
- `name`, `relationship` (sous chef, business partner, peer chef, etc.)
- `phone`, `email`, `notes`, `sort_order`
- Chef-scoped RLS

**`event_contingency_notes`**
- `event_id FK`, `chef_id FK`
- `scenario_type` enum: `chef_illness`, `equipment_failure`, `ingredient_unavailable`, `venue_issue`, `weather`, `other`
- `mitigation_notes TEXT` — free-text plan for this scenario
- `backup_contact_id FK nullable` — reference to an emergency contact
- Upserted per event+scenario (one note per scenario type per event)

### Server Actions
**File:** `lib/contingency/actions.ts`

**Emergency Contacts:**
| Action | What |
|--------|------|
| `createEmergencyContact(input)` | Add a backup contact |
| `updateEmergencyContact(id, input)` | Edit contact |
| `deleteEmergencyContact(id)` | Remove contact |
| `listEmergencyContacts()` | All contacts, ordered by sort_order |

**Event Contingency Notes:**
| Action | What |
|--------|------|
| `upsertContingencyNote(eventId, input)` | Create or update note for a specific scenario. Idempotent — looks up existing by event+scenario first |
| `deleteContingencyNote(id)` | Remove a note |
| `getEventContingencyNotes(eventId)` | All notes for an event with backup contact details joined |

Exports `SCENARIO_LABELS` map for display.

### UI
- **`app/(chef)/settings/emergency/page.tsx`** — Emergency contacts list with informational note that these are private
- **`app/(chef)/settings/emergency/emergency-contacts-client.tsx`** — Client component: view contacts, add/remove
- **`components/events/contingency-panel.tsx`** — Collapsible section on event detail page. Shows all 6 scenario types. Each can be expanded to write a mitigation plan and assign a backup contact. Existing plans show inline; edit button restores the form.

## Design Decisions
- **Upsert pattern**: Only one contingency note per scenario per event. Re-saving overwrites the previous note rather than creating duplicates.
- **No workflow**: These are structured notes only. No automated escalation, no notification to contacts, no status changes. The value is having the plan written down and findable when stress is high.
- **Backup contact is optional**: Some scenarios (ingredient unavailability) may not involve a contact — the mitigation is just a plan.

## Future Considerations
- Quick-call button for backup contact from event page
- Contingency plan template that auto-populates new events
- "Print contingency sheet" action for high-stakes events
