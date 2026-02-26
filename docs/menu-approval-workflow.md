# Menu Approval Workflow

## What Changed

Added a formal client menu approval loop between menu creation and the event date. Chefs can now send menu snapshots to clients, clients can approve or request changes, and both parties have a clear record of what was agreed.

## Why

Before this change, menus were finalized by the chef and sent to the client only as a front-of-house PDF after the event was confirmed — too late for client input. This caused friction and surprises. The new workflow creates a structured pre-event approval step.

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000004_menu_approval_workflow.sql`

**New columns on `events` table:**

- `menu_approval_status` — enum: `not_sent | sent | approved | revision_requested`
- `menu_sent_at`, `menu_approved_at` — timestamps
- `menu_revision_notes` — client's revision request text

**New table: `menu_approval_requests`**

- One row per send round. Supports multiple rounds of revision.
- Stores a `menu_snapshot` JSONB (array of `{ menu_name, dishes[] }`) capturing the exact menu at the time of send.
- Status: `sent → approved | revision_requested`

### Server Actions

**File:** `lib/events/menu-approval-actions.ts`

| Action                                    | Who    | What                                                                         |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `sendMenuForApproval(eventId)`            | Chef   | Snapshots menus, creates request record, updates event status, emails client |
| `getMenuApprovalStatus(eventId)`          | Chef   | Returns event approval state + latest request                                |
| `approveMenu(requestId)`                  | Client | Marks approved, updates event                                                |
| `requestMenuRevision(input)`              | Client | Records revision notes, updates event                                        |
| `getClientMenuApprovalRequest(requestId)` | Client | Load request for approval page                                               |

### UI

- **`components/events/menu-approval-status.tsx`** — Embedded in chef event detail page. Shows current status and Send/Resend button.
- **`app/(client)/my-events/[id]/approve-menu/page.tsx`** — Client-facing page. Shows menu snapshot with Approve / Request Changes options.
- **`app/(client)/my-events/[id]/approve-menu/menu-approval-client.tsx`** — Interactive approve/revision form.

### Email

**`lib/email/templates/menu-approval-request.tsx`** — Sent to client when menu is ready for review. Includes menu snapshot and a direct CTA link.

## How It Connects to the System

The menu approval status is **parallel** to the event FSM — it does not block state transitions. An event can be confirmed whether or not the menu has been approved. This is intentional: approval is a communication layer, not a gate.

The approval URL (`/my-events/{id}/approve-menu?req={requestId}`) is included in the email and requires client authentication.

## Revision Rounds

Multiple rounds are supported. Each call to `sendMenuForApproval()` creates a new `menu_approval_requests` row. The event's `menu_approval_status` always reflects the latest round.

## Future Considerations

- Push notification to chef when client approves or requests revision
- Automation trigger: "when menu approved → automatically advance event to next state"
- PDF export of approved menu snapshot
