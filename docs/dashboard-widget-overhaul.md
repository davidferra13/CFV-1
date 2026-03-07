# Dashboard Widget Overhaul

**Date:** 2026-03-06
**Branch:** feature/risk-gap-closure
**Status:** Phase 1 complete (card components + page rewrite)

## What Changed

The dashboard was a vertical list of 150+ collapsed accordion bars. You had to click each one to see any data. It looked like a table of contents, not a dashboard.

Now it's a grid of always-visible widget cards. Each card shows its key metric immediately without any clicks. The grid is 4 columns on desktop, 2 on tablet, 1 on mobile.

## New Components

| File                                                      | Purpose                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `components/dashboard/widget-cards/widget-card-shell.tsx` | Universal card wrapper (sizes: sm/md/lg, loading/error/empty states, category color accent) |
| `components/dashboard/widget-cards/stat-card.tsx`         | Small (1-col) card: hero number + trend + optional sparkline                                |
| `components/dashboard/widget-cards/list-card.tsx`         | Medium (2-col) card: count + item list + action link                                        |
| `components/dashboard/shortcut-strip.tsx`                 | Horizontal icon shortcuts row (Events, Inquiries, Clients, Remy, Recipes, etc.)             |

## New Section Files

| File                                                    | Purpose                                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `app/(chef)/dashboard/_sections/schedule-cards.tsx`     | Today's schedule, week strip, DOP tasks, prep prompts as cards               |
| `app/(chef)/dashboard/_sections/alerts-cards.tsx`       | Response time, payments due, gaps, quotes, stuck events, follow-ups as cards |
| `app/(chef)/dashboard/_sections/business-cards.tsx`     | Revenue, goal, food cost, lead funnel, invoices, upcoming events as cards    |
| `app/(chef)/dashboard/_sections/intelligence-cards.tsx` | Business health score with sub-scores and inline alerts                      |

## Dashboard Page Rewrite

`app/(chef)/dashboard/page.tsx` now uses a 4-column CSS grid with:

1. Header (greeting + action buttons)
2. Shortcut strip (8 icon links to key pages)
3. Priority banner (next action or "all caught up")
4. Priority queue (list card, if items exist)
5. Schedule cards (Suspense-streamed)
6. Intelligence cards (Suspense-streamed)
7. Alert cards (Suspense-streamed)
8. Business cards (Suspense-streamed, heaviest, loads last)

## What the Cards Show (Top 12)

| Widget            | Card Type    | What's Visible at a Glance                               |
| ----------------- | ------------ | -------------------------------------------------------- |
| Today's Schedule  | List (md)    | Event count + list with times, clients, guests           |
| Priority Queue    | List (md)    | Item count + top 5 with urgency colors                   |
| Business Snapshot | Stat (sm)    | Monthly revenue + expenses + trend %                     |
| Revenue Goal      | Stat (sm)    | Progress % + realized/target amounts                     |
| Response Time     | Stat (sm)    | Avg hours or pending count + SLA status                  |
| Payments Due      | Stat (sm)    | Total outstanding $ + invoice count                      |
| Business Health   | Special (md) | Overall score + 4 sub-scores with progress bars + alerts |
| Week Strip        | Special (md) | 7-day calendar strip                                     |
| Lead Funnel       | Stat (sm)    | Open inquiries + hot pipeline count                      |
| Stuck Events      | List (sm)    | Events stuck in a state + days stuck                     |
| Food Cost Trend   | Stat (sm)    | Avg % + sparkline                                        |
| Onboarding        | Stat (sm)    | Phases complete + progress %                             |

## Old Files (Not Deleted)

The original section files still exist and are not imported by the new page:

- `_sections/schedule-section.tsx`
- `_sections/alerts-section.tsx`
- `_sections/business-section.tsx`
- `_sections/intelligence-section.tsx`
- `_sections/business-section-mobile-content.tsx`

These can be removed once the new dashboard is validated.

## What's Next (v2)

- Widget gallery (browse + add widgets from a picker)
- Drag-and-drop reorder
- Widget resize (sm/md/lg toggle)
- Edit mode (wobble animation, remove button)
- Chart cards (large, 2x2, with real charts)
- Persist widget selection to chef_preferences
