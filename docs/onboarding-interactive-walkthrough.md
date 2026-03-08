# Onboarding Interactive Walkthrough Overhaul

**Date:** 2026-03-08
**Branch:** `feature/risk-gap-closure`

## What Changed

The onboarding tour was redesigned from a passive "chat-style" text window into an interactive visual walkthrough that physically guides users through the app.

### Before

- Tour showed a centered text card with descriptions
- Most steps had `target: null` (no element highlighting)
- No visual cursor or pointer
- Overlay blocked the entire page
- Felt like reading a chat, not being guided

### After

- Tour navigates to each page and highlights real UI elements
- Animated cursor glides to each target, pulsing to show where to click
- Spotlight overlay is lighter (45% opacity) so users can see the page
- Highlighted elements are click-through (users can interact with them during the tour)
- Tooltip appears with smart placement and fade-in animation
- Progress dots show active step as a wider pill shape

## Files Changed

### New

- `components/onboarding/tour-cursor.tsx` - Animated fake cursor component. Glides from viewport center to target element with ease-out cubic motion. Pulses when arrived. Click ripple effect.

### Modified

- `components/onboarding/tour-spotlight.tsx` - Complete rewrite. Integrates cursor, adds click-through on highlighted elements, smart tooltip placement with viewport-aware fallbacks, navigation state handling, scroll-into-view for off-screen targets.
- `lib/onboarding/tour-config.ts` - Redesigned chef tour from 7 to 8 steps, all with proper `target` selectors and `route` values. Added new steps: "Quick Actions" (shortcut strip), "Your Navigation" (sidebar), "Meet Remy" (AI button). Updated welcome copy to set expectations for visual walkthrough.
- `components/onboarding/welcome-modal.tsx` - Updated button text ("Show Me Around" instead of "Take the Tour").
- `tailwind.config.ts` - Added 3 new animations: `tour-cursor-pulse`, `tour-click-ripple`, `tour-target-pulse`.
- `app/(chef)/dashboard/page.tsx` - Added `data-tour="dashboard-header"`.
- `components/dashboard/shortcut-strip.tsx` - Added `data-tour="shortcut-strip"`.
- `components/navigation/chef-nav.tsx` - Added `data-tour="sidebar-nav"` on `<aside>`, `data-tour="remy-button"` on Remy button.
- `app/(chef)/calendar/page.tsx` - Added `data-tour="calendar-view"`.

## Chef Tour Steps (8 steps)

| #   | Step ID               | Target                           | Route      | What It Shows                                           |
| --- | --------------------- | -------------------------------- | ---------- | ------------------------------------------------------- |
| 1   | chef.dashboard        | `[data-tour="dashboard-header"]` | /dashboard | Dashboard header with greeting, briefing, queue buttons |
| 2   | chef.shortcuts        | `[data-tour="shortcut-strip"]`   | /dashboard | Quick action icon strip                                 |
| 3   | chef.sidebar          | `[data-tour="sidebar-nav"]`      | /dashboard | Full sidebar navigation                                 |
| 4   | chef.create_event     | `[data-tour="create-event"]`     | /events    | New Event button                                        |
| 5   | chef.add_client       | `[data-tour="add-client"]`       | /clients   | Add Client button                                       |
| 6   | chef.add_recipe       | `[data-tour="add-recipe"]`       | /recipes   | New Recipe button                                       |
| 7   | chef.meet_remy        | `[data-tour="remy-button"]`      | /dashboard | Remy AI concierge button in sidebar                     |
| 8   | chef.explore_calendar | `[data-tour="calendar-view"]`    | /calendar  | Calendar grid                                           |

## How the Cursor Works

1. On first step: cursor appears from bottom-right of viewport and glides to target (600ms ease-out cubic)
2. On subsequent steps: cursor glides from its current position to the new target (500ms)
3. Once arrived: cursor starts a gentle pulse animation + click ripple effect
4. The target element gets a pulsing brand-colored border (2s infinite)
5. The tooltip fades in 400ms after the cursor arrives (so user sees the cursor first, then reads the explanation)

## data-tour Attribute Registry

| Attribute          | Element                           | File                                      |
| ------------------ | --------------------------------- | ----------------------------------------- |
| `dashboard-header` | Dashboard header row              | `app/(chef)/dashboard/page.tsx`           |
| `shortcut-strip`   | Shortcut icon strip               | `components/dashboard/shortcut-strip.tsx` |
| `sidebar-nav`      | Sidebar `<aside>`                 | `components/navigation/chef-nav.tsx`      |
| `remy-button`      | Remy AI button (expanded sidebar) | `components/navigation/chef-nav.tsx`      |
| `create-event`     | New Event button                  | `app/(chef)/events/page.tsx`              |
| `add-client`       | Add Client button                 | `app/(chef)/clients/page.tsx`             |
| `add-recipe`       | New Recipe button                 | `app/(chef)/recipes/recipes-client.tsx`   |
| `calendar-view`    | Calendar grid wrapper             | `app/(chef)/calendar/page.tsx`            |

## Replay

Users can replay the tour from Settings (`components/onboarding/replay-tour-button.tsx`). The tour checklist also has a "Take the Guided Tour" button.
