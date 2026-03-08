# Event Lock-In

## What It Does

Event Lock-In lets a chef "lock in" to a single event, hiding all navigation that isn't relevant to that event. The app stays the same, it just shows less. No new pages, no new UI patterns. The chef controls when to enter and exit.

## How It Works

1. Chef navigates to any event detail page
2. Clicks the "Lock In" button in the header
3. Sidebar collapses to only show event-relevant nav groups
4. Sidebar header swaps from "ChefFlow" logo to event name + date + exit button
5. Mobile tab bar swaps to event-focused tabs (Event, Inbox, Messaging, Documents)
6. Quick Create, Settings & Tools, Cannabis, Community sections are hidden
7. Chef clicks "Exit Lock-In" (or the X in sidebar header) to restore full nav

## What Stays Visible During Lock-In

**Nav groups:** Remy, Events, Clients, Culinary, Operations, Vendors, Finance

**Primary shortcuts:** Dashboard, Inbox, Events, Clients, Messaging, Documents

**Everything else is hidden** (not deleted, just filtered out).

## Technical Details

### Data layer

- `chef_preferences.locked_event_id` (UUID nullable, FK to events, ON DELETE SET NULL)
- Migration: `20260330000079_event_lock_in.sql`
- Layout cache: `lib/chef/layout-cache.ts` fetches `locked_event_id` + event title/date
- Cache invalidation: both `lockInToEvent()` and `unlockEvent()` bust `chef-layout-{chefId}` tag

### Server actions

- `lockInToEvent(eventId)` in `lib/chef/actions.ts` - validates event ownership, sets column
- `unlockEvent()` in `lib/chef/actions.ts` - clears column

### Client hook

- `useEventLockIn()` in `lib/hooks/use-event-lock-in.ts` - optimistic updates + localStorage mirror

### Navigation filtering

- `isLockInGroupVisible()` in `lib/navigation/focus-mode-nav.ts` - group whitelist
- `LOCK_IN_PRIMARY_SHORTCUT_HREFS` - primary shortcut whitelist
- Both `ChefSidebar` and `ChefMobileNav` in `chef-nav.tsx` respect `lockedEventId` prop

### UI components

- `EventLockInButton` in `components/events/event-lock-in-button.tsx` - toggle button on event detail
- Sidebar header swap: when locked in, logo area shows event name + date + exit icon
- Mobile menu header: shows event name + exit button when locked in

## Design Decisions

- **DB-backed, not just localStorage** - persists across devices, server layout can filter before HTML ships
- **Builds on existing focus mode infrastructure** - same filtering pattern, stricter filter
- **No route guards** - chef can navigate freely, nav filtering is enough, no redirects
- **No Remy scoping in v1** - Remy stays as-is, event context scoping is a follow-up
- **No automatic trigger** - chef decides when to enter/exit, no date-based automation
- **ON DELETE SET NULL** - if the event is deleted, lock-in clears automatically

## Not In V1

- Remy scoped to locked event context
- Automatic lock-in based on event date proximity
- Route guards/redirects
- Visual theme changes during lock-in
