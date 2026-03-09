# Event Lifecycle Terminology Cleanup

**Date:** 2026-03-09
**Branch:** feature/risk-gap-closure

## Problem

The event lifecycle used system/CRM language that didn't match how chefs think about their work. "Proposed" is database jargon (chefs think "I sent it to the client"). "Mark In Progress" and "Mark Completed" sound like clicking checkboxes in a CRM, not running a real event. The nav submenu said "Event Status" (vague) and "Awaiting Deposit" (system perspective instead of chef perspective).

## Approach

Compared every event-related UI label against the glossary ground truth. Fixed every label where the UI spoke in system language instead of chef language. Zero database changes.

## Changes

### Status Labels (event-status-badge.tsx + 7 other STATUS_LABELS maps)

| DB Value   | Old Label   | New Label      | Why                                     |
| ---------- | ----------- | -------------- | --------------------------------------- |
| `proposed` | Proposed    | Sent to Client | Chef's perspective: "I sent it to them" |
| All others | (unchanged) | (unchanged)    | Already clear                           |

Files updated: `event-status-badge.tsx`, `events-view-filter-bar.tsx`, `events-kanban.tsx`, `event-kanban-board.tsx`, `status-badge.tsx`, `agenda-view.tsx`, `event-detail-popover.tsx`, `calendar-view.tsx`, `pipeline-forecast.tsx`, `stuck-events-widget.tsx`, `lib/pipeline/forecast.ts`

### Transition Buttons (event-transitions.tsx)

| Old Button        | New Button     | Why                             |
| ----------------- | -------------- | ------------------------------- |
| Propose to Client | Send to Client | Matches "Sent to Client" status |
| Mark In Progress  | Start Event    | Action-oriented, chef language  |
| Mark Completed    | Finish Event   | Action-oriented, chef language  |

### Help Text (event-transitions.tsx)

| Status      | Old                                                         | New                                                     |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| draft       | "...correct before proposing"                               | "...correct before sending"                             |
| proposed    | "Waiting for client to accept the proposal..."              | "Waiting for the client to review and accept..."        |
| accepted    | "Client has accepted. Waiting for payment to be processed." | "Client accepted! Waiting for payment to come through." |
| confirmed   | "Mark as 'In Progress' when the event begins."              | "Start the event when you're on-site and ready to go."  |
| in_progress | "Mark as completed when finished."                          | "Finish it when you're done and cleaned up."            |

### Nav Config (nav-config.tsx)

| Old              | New             | Why                         |
| ---------------- | --------------- | --------------------------- |
| Event Status     | My Events       | More personal, less generic |
| Awaiting Deposit | Deposit Pending | Chef perspective            |

### Chef-Facing Pages

| Where                                | Old                                   | New                                               |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------- |
| Events page subtitle                 | "Manage your events and proposals"    | "All your events, from draft to done"             |
| Events empty state                   | "...managing proposals, timelines..." | "...managing timelines, menus..."                 |
| Upcoming page subtitle               | "Proposed, accepted, paid..."         | "Events that are active: sent, accepted, paid..." |
| Edit page (already proposed warning) | "Event Already Proposed"              | "Event Already Sent to Client"                    |
| Edit page warning body               | "...re-proposing the event"           | "...sending it again"                             |

### Client-Facing Pages (NOT Changed)

The word "proposal" in client-facing UI (my-events, accept-proposal-button) is kept as-is. From the client's perspective, they receive a proposal. This is the correct term for how clients think about receiving an event plan from their chef.

### Glossary (chefflow-glossary.md)

Updated the Event Lifecycle table to include DB values and new UI labels.

## No Database Changes

All changes are UI-only string replacements. The database enum values (`draft`, `proposed`, `accepted`, `paid`, `confirmed`, `in_progress`, `completed`, `cancelled`) are unchanged.

## Files Changed

- `components/events/event-status-badge.tsx`
- `components/events/event-transitions.tsx`
- `components/events/events-view-filter-bar.tsx`
- `components/events/events-kanban.tsx`
- `components/events/event-kanban-board.tsx`
- `components/ui/status-badge.tsx`
- `components/scheduling/agenda-view.tsx`
- `components/scheduling/event-detail-popover.tsx`
- `components/scheduling/calendar-view.tsx`
- `components/analytics/pipeline-forecast.tsx`
- `components/pipeline/stuck-events-widget.tsx`
- `components/navigation/nav-config.tsx`
- `lib/pipeline/forecast.ts`
- `app/(chef)/events/page.tsx`
- `app/(chef)/events/upcoming/page.tsx`
- `app/(chef)/events/[id]/edit/page.tsx`
- `docs/chefflow-glossary.md`
