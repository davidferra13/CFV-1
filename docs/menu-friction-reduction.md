# Menu Friction Reduction — Implementation Summary

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## Problem Solved

The classic private chef friction loop:

- Client: "What do you like to make?"
- Chef: "What do you like to eat?"

Neither side had a starting point. Menus were built in a vacuum.

## What Changed

### Database (Migration: `20260330000013_menu_preferences_and_showcase.sql`)

- **New table: `menu_preferences`** — stores client menu briefs per event (cuisine preferences, loves/hates, service style, adventurousness, selection mode)
- **New column: `menus.is_showcase`** — marks menus as portfolio items visible to clients
- **New column: `menus.times_used`** — tracks how many events used each menu
- **RLS policies:** clients can view showcase menus and dishes for their chef; clients can submit/read their own preferences

### Server Actions

| File                                             | Actions                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `lib/menus/preference-actions.ts` (new)          | `submitMenuPreferences`, `getMenuPreferences`, `markPreferencesViewed`                                |
| `lib/menus/showcase-actions.ts` (new)            | `toggleShowcase`, `getMenuLibraryForEvent`, `getShowcaseMenus`, `getShowcaseMenuDetail`               |
| `lib/menus/actions.ts` (modified)                | `applyMenuToEvent` now increments `times_used` and duplicates showcase menus                          |
| `lib/events/menu-approval-actions.ts` (modified) | `sendMenuForApproval` now includes rich dish data in snapshot (descriptions, dietary tags, allergens) |
| `lib/events/client-actions.ts` (modified)        | `getClientEventById` now fetches dish details with menus                                              |

### Client-Facing UI

| Page/Component                                         | What It Does                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `app/(client)/my-events/[id]/choose-menu/` (new)       | **Four-path menu selection** — Browse Past Menus, I Have Some Ideas, I Know Exactly What I Want, Surprise Me |
| `components/menus/showcase-menu-card.tsx` (new)        | Reusable card for browsing showcase menus                                                                    |
| `components/menus/showcase-menu-preview.tsx` (new)     | Full menu preview modal with "Use as-is" and "Use as starting point"                                         |
| `components/menus/menu-preferences-form.tsx` (new)     | Cuisine multi-select, service style, loves/hates, adventurousness                                            |
| `app/(client)/my-events/[id]/approve-menu/` (upgraded) | **Rich menu approval** — course-grouped display, descriptions, dietary/allergen badges, per-course feedback  |
| `app/(client)/my-events/[id]/page.tsx` (modified)      | **Smart menu status card** — CTA to choose menu, live "chef is preparing" indicator, approval status         |

### Chef-Facing UI

| Page/Component                                            | What It Does                                                                                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/events/menu-library-picker.tsx` (new)         | **Menu Library Picker on event detail** — searchable/filterable list of templates, showcase, recent menus with one-click apply. Shows client preferences summary if submitted |
| `app/(chef)/menus/[id]/menu-detail-client.tsx` (modified) | **Showcase toggle** — switch to mark menu as client-visible portfolio item                                                                                                    |
| `app/(chef)/menus/menus-client-wrapper.tsx` (modified)    | Showcase badge in menu list                                                                                                                                                   |
| `app/(chef)/events/[id]/page.tsx` (modified)              | Integrated Menu Library Picker on Money tab                                                                                                                                   |

## Client Menu Selection Flows

| Path                   | What happens                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Browse & Pick**      | Client browses showcase menus → previews one → "Use This Menu" → chef gets notified with `selection_mode: 'picked'` |
| **Browse & Customize** | Client picks a base menu → adds customization notes → chef sees base + notes                                        |
| **Preferences**        | Client fills cuisine/style/loves/hates form → chef sees structured brief                                            |
| **Exact Request**      | Client types exactly what they want → chef builds to match                                                          |
| **Surprise Me**        | One-click → chef has full creative freedom                                                                          |

## Real-Time Menu Progress

When the chef attaches a menu but hasn't sent it for approval yet, the client sees:

- A pulsing green dot with "Your chef is preparing your menu"
- Menu name and description visible in real-time
- When revision is requested: pulsing amber dot with "Chef is revising the menu"

## Notifications

- When client submits preferences → chef gets in-app notification with context (what mode, for which event)
- When chef marks preferences as viewed → `chef_viewed_at` is set (auto-triggered on picker load)

## Architecture Decisions

- **Showcase vs Template:** A menu can be both. Templates are for internal reuse; showcase menus are visible to clients. `applyMenuToEvent` duplicates both to keep the original clean.
- **`menu_preferences` is per-event** (unique constraint on `event_id`) — clients can update preferences by re-submitting.
- **Backward compatible snapshots:** Rich menu approval snapshots include both legacy `dishes: string[]` and new `courses: Course[]`. Old snapshots render as plain text; new ones get the full treatment.
- **No AI involved:** All menu selection is deterministic. Formula > AI per project rules.
