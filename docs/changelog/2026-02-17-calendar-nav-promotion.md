# Calendar Nav Promotion

**Date:** 2026-02-17
**File changed:** `components/navigation/chef-nav.tsx`

## What changed

- The "Schedule" item was **removed from the Pipeline collapsible group** and **promoted to a top-level standalone nav item** renamed "Calendar".
- New position in the sidebar: Dashboard > Messages > **Calendar** > Queue > Network.
- The route (`/schedule`) and the page itself are unchanged -- same calendar view, same functionality.

## Why

The calendar is a high-frequency, at-a-glance tool for a working chef. Burying it inside a collapsible Pipeline group added unnecessary clicks and made it easy to overlook. Promoting it to the always-visible top section puts it one click away from any screen, on par with Messages and Queue.

## How it connects

- **Desktop sidebar (expanded):** Calendar renders as a standalone link between Messages and Queue.
- **Desktop sidebar (collapsed/rail mode):** Calendar icon appears in the standalone icon strip, not inside the Pipeline flyout.
- **Mobile slide-out menu:** Calendar appears in the standalone top section above the collapsible groups.
- **Pipeline group:** Now contains Leads, Inquiries, Quotes, Events (4 items instead of 5).
- No route, page, or component changes required -- only the nav configuration arrays were modified.
