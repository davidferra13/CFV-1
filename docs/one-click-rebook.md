# One-Click Client Rebooking

**Date:** 2026-03-08
**Branch:** feature/risk-gap-closure (worktree)

## What This Does

Adds a "Rebook" button to cooling alerts and client profiles that creates a new draft event pre-filled from the client's most recent completed event. This closes the gap between detecting a cooling relationship and taking action.

## Files Changed

### New Files
- `lib/clients/cooling-alert.ts` - Missing cooling alert logic module (was imported but didn't exist). Contains `findCoolingClients()` and `CoolingClient` type.
- `lib/clients/rebook-actions.ts` - Server actions: `rebookClient(clientId)` creates a draft event from last completed event; `clientHasCompletedEvents(clientId)` for conditional UI display.
- `components/clients/rebook-button.tsx` - Reusable client component for the rebook action with loading state and error fallback.

### Modified Files
- `components/clients/cooling-alert-widget.tsx` - Added "Rebook" button next to each cooling client entry.
- `components/dashboard/my-dashboard/widget-renderer.tsx` - Added "Rebook" link in the dashboard cooling alerts widget.
- `app/(chef)/clients/[id]/page.tsx` - Added "Rebook" button in header actions (only shows if client has completed events) and in the dormancy warning banner.

## How It Works

1. Chef sees a cooling alert (dashboard widget, cooling alert card, or dormancy warning on client profile)
2. Clicks "Rebook"
3. Server action finds the client's most recent completed event
4. Creates a new draft event with the same: client, guest count, event type, location, service style, pricing, dietary info, menus, and dishes
5. Date is left empty (chef picks)
6. Occasion is marked "(rebook)" so the chef knows it was auto-created
7. Chef is navigated to `/events/[newId]/edit` to finalize
8. If no completed events exist, falls back to `/events/new?client_id=X`

## Architecture Notes

- Follows the `cloneEvent` pattern from `lib/events/clone-actions.ts` for event creation and menu cloning
- Menu/dish cloning is non-blocking (event creation succeeds even if menu clone fails)
- Uses `requireChef()` + `tenantId` from session (never from request)
- Logs state transition and chef activity (non-blocking)
- Revalidates `/events` and `/clients/[id]` paths after creation
