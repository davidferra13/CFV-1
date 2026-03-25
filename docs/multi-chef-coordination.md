# Multi-Chef Event Coordination (Feature 5E)

## What Changed

Added a system for coordinating events that involve multiple chefs or collaborators. Chefs can assign collaborators to events with station assignments, roles, and revenue split percentages.

## Files Created

### Migration: `database/migrations/20260401000092_multi_chef_coordination.sql`

- New `event_collaborators` table with columns for collaborator identity, station assignment, role, revenue split, status
- RLS policy scoped to host chef (via `chef_id`)
- Updated_at trigger
- Indexes on `event_id` and `chef_id`

### Server Actions: `lib/events/collaborator-actions.ts`

- `getEventCollaborators(eventId)` - list all collaborators for an event
- `addCollaborator(eventId, input)` - add with validation (split cannot exceed 100%)
- `updateCollaborator(id, input)` - update any field, validates split totals
- `removeCollaborator(id)` - delete with ownership verification
- `getCollaboratorSummary(eventId, eventTotalCents)` - full breakdown with dollar amounts
- All actions tenant-scoped via `requireChef()`

### UI Component: `components/events/collaborator-panel.tsx`

- Collapsible panel (same pattern as ContingencyPanel)
- Add/edit forms with station dropdown, role selector, revenue split input
- Status badges (invited/confirmed/declined) with quick toggle buttons
- Revenue split summary table showing dollar amounts based on event total
- Validation: split percentages cannot exceed 100%
- Note: revenue splits are informational only, no automatic ledger entries

## Design Decisions

1. **`collaborator_chef_id` is optional** - collaborators may not be ChefFlow users. The `collaborator_name` field is always required for display.
2. **Revenue splits are informational** - they show the agreed split but do not auto-create ledger entries. The host chef handles actual payments outside the system.
3. **Station options are predefined** - common kitchen stations (Grill, Saute, Pastry, Garde Manger, Prep, Plating, Bar, Front of House, Other).
4. **RLS scoped to host chef only** - only the chef who owns the event can see/manage collaborators. Guest chef access can be added later if needed.

## Integration

The `CollaboratorPanel` component accepts:

- `eventId` - the event UUID
- `initialCollaborators` - pre-fetched collaborator list
- `eventTotalCents` - event total in cents (for revenue split dollar calculations)

To integrate into the event detail page, fetch collaborators server-side and pass them as props.
