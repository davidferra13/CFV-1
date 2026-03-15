# Feature 6.6: Menu History Per Client

## Overview

Tracks every menu served to each client with dates, dishes, and feedback. Helps chefs avoid repetition and understand client preferences over time.

## Database

**Table:** `menu_service_history`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| chef_id | uuid FK | References chefs(id), tenant scope |
| client_id | uuid FK | References clients(id) |
| event_id | uuid FK | Nullable, links to the event |
| menu_id | uuid | Nullable, references the menu used |
| served_date | date | When the menu was served |
| dishes_served | jsonb | Array of {name, category, liked, disliked, notes} |
| overall_rating | int | 1-5 scale, nullable |
| client_feedback | text | Free-form client feedback |
| chef_notes | text | Chef's private notes |
| guest_count | int | Number of guests |
| created_at | timestamptz | Auto-set |

**RLS:** Chef-scoped via `user_roles` table lookup.

**Index:** Composite on (chef_id, client_id, served_date) for efficient timeline queries.

## Server Actions

All in `lib/menus/menu-history-actions.ts`, all tenant-scoped via `requireChef()`.

| Action | Purpose |
|--------|---------|
| `getClientMenuHistory(clientId)` | Full timeline for one client, date desc |
| `addMenuHistoryEntry(data)` | Manual menu logging |
| `autoLogMenuFromEvent(eventId)` | Auto-create history from completed event |
| `updateMenuFeedback(historyId, feedback)` | Add/edit ratings and feedback |
| `getDishFrequency(clientId)` | Dish serve counts (pure math) |
| `getNeverServedDishes(clientId)` | Cross-ref recipes vs history |
| `getMenuHistoryStats(clientId?)` | Aggregate stats |
| `searchMenuHistory(query)` | Search by dish name |

## Components

### MenuHistoryTimeline (`components/menus/menu-history-timeline.tsx`)
- Chronological timeline of menus served to a client
- Expandable entries showing dishes, ratings, feedback
- Date range filtering
- Inline "Log Menu" form
- Inline feedback editing with optimistic updates + rollback

### DishFrequencyChart (`components/menus/dish-frequency-chart.tsx`)
- CSS-only horizontal bar chart showing dish serve counts
- Highlights dishes served 3+ times (amber color, repetition risk badge)
- Sortable by frequency or alphabetical
- "Never Served" section showing unused recipes

### MenuHistoryWidget (`components/dashboard/menu-history-widget.tsx`)
- Dashboard compact widget showing last 5 menu events
- Shows date, dish count, guest count, rating
- "Add feedback" prompt for events without feedback

## Design Decisions

- **Formula > AI:** All frequency counting, repetition detection, and stats are pure math/queries. No AI involved.
- **Optimistic updates:** Feedback edits use optimistic UI with rollback on server failure.
- **Error handling:** All components show explicit error states, never silent failures or fake zeros.
- **Deduplication:** `autoLogMenuFromEvent` checks for existing entries before creating duplicates.

## Integration Points

- Use `MenuHistoryTimeline` on the client detail page
- Use `DishFrequencyChart` alongside timeline for dish analysis
- Use `MenuHistoryWidget` on the chef dashboard
- Call `autoLogMenuFromEvent` when events transition to "completed" status
