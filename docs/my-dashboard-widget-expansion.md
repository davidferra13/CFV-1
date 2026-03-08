# My Dashboard - Widget Data Expansion

## What Changed

Expanded the My Dashboard tab from 8 data-driven widgets to 26. Every widget that appears in any of the 10 dashboard templates now renders live data instead of a static shortcut card.

## New Widgets (18 added)

### Schedule & Prep

| Widget             | Data Source                                     | What It Shows                                       |
| ------------------ | ----------------------------------------------- | --------------------------------------------------- |
| `todays_schedule`  | events table (today's date)                     | Event list with time, occasion, client, guest count |
| `dop_tasks`        | chef_todos + events                             | Pending task count, overdue count, due today        |
| `prep_prompts`     | events in next 7 days (accepted/paid/confirmed) | Upcoming events needing prep with guest count       |
| `multi_event_days` | events in next 14 days, grouped by date         | Days with 2+ events, with details per event         |
| `scheduling_gaps`  | events missing time_prep_minutes                | Confirmed events with no prep time allocated        |

### Clients & Relationships

| Widget                   | Data Source                                        | What It Shows                                       |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------- |
| `dietary_allergy_alerts` | events + clients (dietary_restrictions, allergies) | Upcoming events where client has dietary needs      |
| `client_birthdays`       | clients.birthday                                   | Clients with birthdays in next 30 days              |
| `dormant_clients_list`   | clients.last_event_date (90+ days)                 | Inactive clients with rebook button                 |
| `unread_hub_messages`    | hub_messages.is_read count                         | Unread message count                                |
| `loyalty_approaching`    | clients.loyalty_points                             | Clients 60%+ to next loyalty tier with progress bar |

### Financial

| Widget                 | Data Source                                     | What It Shows                               |
| ---------------------- | ----------------------------------------------- | ------------------------------------------- |
| `food_cost_trend`      | event_financial_summary (expense/revenue ratio) | Average food cost % across recent events    |
| `revenue_goal`         | chef_preferences + event_financial_summary      | Monthly revenue progress vs target with bar |
| `pipeline_forecast`    | events in proposed/accepted/paid + financials   | Total pipeline value split by stage         |
| `quick_expense`        | ledger_entries (last 30 days, type=expense)     | Recent expense total + last 3 items         |
| `overdue_installments` | payment_schedules (pending, past due)           | Overdue payment installments with amounts   |
| `revenue_comparison`   | event_financial_summary (this vs last month)    | Month-over-month revenue change %           |

### Operations

| Widget                 | Data Source                    | What It Shows                                   |
| ---------------------- | ------------------------------ | ----------------------------------------------- |
| `staff_operations`     | staff_members + event_staff    | Active staff count, upcoming assignments, names |
| `active_shopping_list` | shopping_lists (status=active) | Active shopping list names                      |

## Architecture

All data loaders are in `lib/dashboard/my-dashboard-actions.ts` inside a single `Promise.all` block. Each loader:

- Checks if the widget was requested (via `requested` Set)
- Wraps in try/catch with a typed fallback
- Uses tenant-scoped Supabase queries
- Returns a specific data shape the renderer expects

All renderers are in `components/dashboard/my-dashboard/widget-renderer.tsx`. Each renderer:

- Accepts `data: unknown` and casts to the expected type
- Shows an `EmptyWidget` or meaningful empty state when no data
- Links items to their detail pages
- Uses color coding for status/severity

## What's Still Fallback (shortcut cards)

The remaining ~93 widgets that aren't in any template still render as styled shortcut cards with icon + label + "Tap to open" linking to their detail page. These include niche widgets like `cannabis_control_center`, `wix_intake_health`, `charity_impact`, etc. that don't need inline data rendering.

## Files Modified

- `lib/dashboard/my-dashboard-actions.ts` - 18 new data loaders added to `loadWidgetData()`
- `components/dashboard/my-dashboard/widget-renderer.tsx` - 18 new content components + `formatShortDate` helper
