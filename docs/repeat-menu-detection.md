# Repeat Menu Detection

## What Changed

Added a feature that detects when a chef is about to serve a menu with recipes that overlap with past menus served to the same client.

## Files Created

- `lib/menus/repeat-detection.ts` - Server actions for repeat detection and client menu history
- `components/menus/repeat-menu-alert.tsx` - Amber alert banner component (client-side)
- `components/menus/client-menu-history.tsx` - Expandable menu history table (client-side)

## Files Modified

- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` - Added RepeatMenuAlert to event detail (shown when event has a menu and is not draft/cancelled)
- `app/(chef)/clients/[id]/page.tsx` - Added ClientMenuHistory section after Event History

## How It Works

### Repeat Detection (`checkRepeatMenu`)

1. Takes an `eventId`, gets the event's menu and client
2. Extracts all recipe IDs from the current menu via dishes -> components -> recipe_id
3. Finds all past events for the same client that have a menu
4. For each past menu, extracts recipe IDs the same way
5. Computes overlap percentage: (shared recipes / current menu recipes) \* 100
6. Returns overlap data and swap suggestions

### Alert Threshold

The `RepeatMenuAlert` component only displays when at least one past menu has > 30% recipe overlap. Below that threshold, repeats are considered normal (e.g., a signature dish that appears often).

### Client Menu History (`getClientMenuHistory`)

Returns a full history of all menus served to a client, including:

- Event date and occasion
- Menu name
- All dishes (course name, course number, dish name)
- All components with linked recipe names

## Architecture Notes

- Pure deterministic logic, no AI/LLM calls
- All queries tenant-scoped via `requireChef()` session
- Server actions use `'use server'` directive
- Client components handle loading, error, and empty states
- Error handling follows zero-hallucination rules (errors shown, not hidden as empty data)
- The alert is dismissible per-session (state resets on page reload)
