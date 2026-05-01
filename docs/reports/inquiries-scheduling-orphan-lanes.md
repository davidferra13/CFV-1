# Inquiries And Scheduling Orphan Lanes

- Date: 2026-05-01
- Scope: focused display-only prune proof for inquiry and scheduling component orphans
- Decision: delete only no-caller display duplicates with canonical owners

## Deleted Components

| Deleted file | Export | Canonical owner |
| --- | --- | --- |
| `components/inquiries/completeness-ring.tsx` | `CompletenessRing` | `components/inquiries/readiness-score-badge.tsx` |
| `components/inquiries/inquiries-view-wrapper.tsx` | `InquiriesViewWrapper` | `app/(chef)/inquiries/page.tsx` |
| `components/inquiries/kanban-board.tsx` | `KanbanBoard` | `app/(chef)/inquiries/page.tsx` |
| `components/inquiries/kanban-card.tsx` | `KanbanCard` | `app/(chef)/inquiries/page.tsx` |
| `components/scheduling/location-badge.tsx` | default `LocationBadge` | retained seasonal/location surfaces, including `current-location-badge.tsx` |
| `components/scheduling/multi-event-day-alert.tsx` | `MultiEventDayAlert` | `components/dashboard/multi-event-days-widget.tsx` |
| `components/scheduling/weekly-schedule-view.tsx` | `WeeklyScheduleView` | `app/(chef)/calendar/week/page.tsx` |

## Retained In This Slice

The classifier found multiple recover or uncertain files in `components/inquiries` and `components/scheduling`. This prune did not touch inquiry conversion, bulk mutation, marketplace capture, waitlist, booking capacity, seasonal availability, DOP, prep timeline, or client communication files.

## Validation

```text
rg -n "completeness-ring|CompletenessRing|inquiries-view-wrapper|InquiriesViewWrapper|kanban-board|KanbanBoard|kanban-card|KanbanCard|location-badge|LocationBadge|multi-event-day-alert|MultiEventDayAlert|weekly-schedule-view|WeeklyScheduleView" app components lib hooks scripts tsconfig.ci.expanded.json --glob '!docs/**'
```

Expected result after deletion and tsconfig cleanup: no deleted-file or deleted-export live references. Live event kanban files are separate owners and are not part of this slice.
