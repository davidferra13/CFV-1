# Events

**What:** The core business transaction. An event is a job: a date, a client, a menu, a price, and everything needed to execute it.

**Route:** `/events`, `/events/[id]`
**Key files:** `components/events/event-form.tsx`, `components/events/service-simulation-panel.tsx`, `lib/service-simulation/engine.ts`, `lib/events/transitions.ts`
**Status:** DONE

## What's Here

- Event list with dual view (list/kanban), 9 status filters
- Event operating spine on detail: deterministic next action, owner, missing info, and readiness lanes for intake, booking, menu/dietary, prep/stock, Finance, communication, and follow-up
- 8-state FSM: draft > proposed > accepted > paid > confirmed > in_progress > completed | cancelled
- 4-tab detail view:
  - Overview: client info, guest RSVPs, dietary, allergens, contracts, lifecycle
  - Finance: menu picker, financials, payments, expenses, cost forecast, profit
  - Ops: time tracking, prep plan, service simulation, staff, temp logging, substitutions, prep docs, readiness gates
  - Wrap-Up: post-event checklist, AAR summary, lifecycle progress
- Event header quick proposal entry: shown when an event has a linked client and is not cancelled; opens a generation-only preview that can surface CP-Engine client profile guidance without persisting quote data
- Guest experience portal (messages, reminders, dietary confirmation, documents, feedback)
- AI contract generator
- Allergen conflict detection (FDA Big 9)
- Service lifecycle intelligence (auto-detects stage from conversations)
- Service simulation run history with deterministic stale detection against current event conditions
- Event command panel on `/events/[id]`: right-side desktop panel and mobile drawer summarize next action, payment state, dietary/allergy risk, prep readiness, client communication, and recent activity using only loaded event data. If finance data is unavailable, the panel shows an unavailable state instead of rendering zero balances.

## Open Items

- Event detail tab nav hard to see on desktop (interface philosophy violation)
