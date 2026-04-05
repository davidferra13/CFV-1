# Events

**What:** The core business transaction. An event is a job: a date, a client, a menu, a price, and everything needed to execute it.

**Route:** `/events`, `/events/[id]`
**Key files:** `components/events/event-form.tsx`, `lib/events/transitions.ts`
**Status:** DONE

## What's Here

- Event list with dual view (list/kanban), 9 status filters
- 8-state FSM: draft > proposed > accepted > paid > confirmed > in_progress > completed | cancelled
- 4-tab detail view:
  - Overview: client info, guest RSVPs, dietary, allergens, contracts, lifecycle
  - Money: menu picker, financials, payments, expenses, cost forecast, profit
  - Ops: time tracking, staff, temp logging, substitutions, prep docs, readiness gates
  - Wrap-Up: post-event checklist, AAR summary, lifecycle progress
- Guest experience portal (messages, reminders, dietary confirmation, documents, feedback)
- AI contract generator
- Allergen conflict detection (FDA Big 9)
- Service lifecycle intelligence (auto-detects stage from conversations)

## Open Items

- Event detail tab nav hard to see on desktop (interface philosophy violation)
