# Staff & Team Management

## What Changed
Added a full staff management system allowing chefs to maintain a roster of sous chefs, kitchen assistants, and service staff, assign them to events, log actual hours after the event, and have labor costs automatically factored into event profit analysis.

## Why
Private chef businesses often work with other people — even a one-person chef regularly brings help for larger events. Before this change, the app had no way to track staff at all, meaning labor cost was invisible and effective hourly rate calculations were inaccurate.

## What Was Built

### Database
**Migration:** `supabase/migrations/20260303000005_staff_management.sql`

**New table: `staff_members`**
- Chef-scoped roster with name, role, contact info, default hourly rate, and active/inactive status
- Roles: `sous_chef | kitchen_assistant | service_staff | server | bartender | dishwasher | other`

**New table: `event_staff_assignments`**
- Links staff members to events with role/rate overrides
- Tracks `scheduled_hours` and `actual_hours` (recorded post-event)
- `pay_amount_cents` is computed and stored when hours are logged: `actual_hours × effective_rate`
- Unique constraint: one assignment per staff per event
- Status: `scheduled | confirmed | completed | no_show`

### Server Actions
**File:** `lib/staff/actions.ts`

| Action | What |
|--------|------|
| `createStaffMember(input)` | Add to roster |
| `updateStaffMember(id, input)` | Edit details |
| `deactivateStaffMember(id)` | Soft deactivate |
| `listStaffMembers(activeOnly?)` | List roster |
| `assignStaffToEvent(input)` | Schedule staff for event (upsert) |
| `removeStaffFromEvent(id, eventId)` | Unschedule |
| `getEventStaffRoster(eventId)` | Load all assignments for event |
| `recordStaffHours(input)` | Post-event: log actual hours, compute pay |
| `computeEventLaborCost(eventId)` | Sum all staff pay for event → cents |

### UI
- **`app/(chef)/staff/page.tsx`** — Staff roster: view, add, deactivate team members
- **`components/staff/staff-member-form.tsx`** — Add/edit form with role, rate, contact
- **`components/events/event-staff-panel.tsx`** — Embedded on event detail page: assign staff, view roster, log hours after event

## Integration with Profit Analysis

`computeEventLaborCost(eventId)` returns total staff labor in cents and can be called from `getEventProfitAnalysis()` in `lib/expenses/actions.ts` to add a labor cost line to the event P&L.

**Example profit analysis enrichment:**
```
Revenue:        $2,500
Food cost:       -$480   (19.2%)
Staff labor:     -$320   (2× 8hrs @ $20/hr)
Gross profit:  $1,700   (68%)
```

## Rate Override Logic

Each assignment can override the staff member's default rate for a specific event. The effective rate is:
1. `rate_override_cents` if set on the assignment
2. `staff_members.hourly_rate_cents` otherwise

This allows negotiating a different rate for specific events without changing the staff member's default.

## Future Considerations

- Staff-facing portal: allow staff to confirm their attendance and log their own hours
- Staff payment recording in the ledger (cash, Venmo, etc.)
- W-2/1099 classification flag for tax tracking
- Calendar view: which events does each staff member work?
