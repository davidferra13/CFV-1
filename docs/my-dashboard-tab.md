# My Dashboard - Customizable Personal Dashboard Tab

## What Changed

Added a new "My Dashboard" tab to the chef dashboard. This is a fully customizable space where chefs can build their own dashboard from any widget in the system.

## Architecture

### Tab System

The dashboard now has 5 tabs: **My Dashboard** (default), Schedule, Alerts, Business, Intelligence.

- Tab switching is client-side (no URL params, no server re-renders)
- The 4 category tabs render pre-built server components (unchanged from before)
- "My Dashboard" is a client component that dynamically loads widget data

### Storage

Three new columns on `chef_preferences`:

- `my_dashboard_widgets` (JSONB array of widget ID strings, ordered)
- `my_dashboard_notes` (text, auto-saved scratchpad)
- `my_dashboard_pinned_menu_id` (UUID, optional pinned menu reference)

Migration: `20260330000078_my_dashboard_preferences.sql`

### Data Flow

1. Chef opens dashboard, "My Dashboard" tab loads by default
2. Client calls `getMyDashboardConfig()` to get ordered widget IDs + notes
3. Client calls `loadWidgetData(widgetIds)` to bulk-fetch data for all selected widgets
4. `WidgetRenderer` maps each widget ID to a visual card with its data
5. Widgets without a data loader render as styled shortcut cards linking to their detail page

### Edit Mode

- "Customize" button enters edit mode
- Drag-and-drop reordering (HTML5 native) + up/down arrow buttons for mobile
- "Add Widgets" opens the picker modal (categorized, searchable)
- Remove widgets with X button
- Save persists new order to `chef_preferences`

## Key Files

| File                                                              | Purpose                                            |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| `components/dashboard/my-dashboard/dashboard-tabs.tsx`            | Tab bar wrapper                                    |
| `components/dashboard/my-dashboard/my-dashboard-tab.tsx`          | Main tab: loads config, edit mode, renders widgets |
| `components/dashboard/my-dashboard/widget-picker-modal.tsx`       | Categorized widget browser                         |
| `components/dashboard/my-dashboard/widget-renderer.tsx`           | Maps widget ID to visual card                      |
| `lib/dashboard/my-dashboard-actions.ts`                           | Server actions: config CRUD, bulk data loader      |
| `supabase/migrations/20260330000078_my_dashboard_preferences.sql` | Schema change                                      |

## Widget Data Coverage

Widgets with full data rendering (8 widgets):

- payments_due, expiring_quotes, business_snapshot, stuck_events
- cooling_alerts, response_time, pending_followups, invoice_pulse

All other 112 widgets render as styled shortcut cards with their icon, label, and a link to the relevant page. Data renderers can be added incrementally.

## Notes Widget

A scratchpad always visible on "My Dashboard" (when not empty). Auto-saves on blur with 1-second debounce. Stored in `my_dashboard_notes`.

## Future Enhancements

- Add data renderers for more widgets (revenue_goal, food_cost_trend, etc.)
- Pinned menu widget (schema ready, UI not wired yet)
- Widget size selection (compact vs expanded)
- Drag-and-drop via @dnd-kit for better touch support
