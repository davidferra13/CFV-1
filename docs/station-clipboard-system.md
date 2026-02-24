# Station Clipboard System

**Created:** 2026-02-24
**Status:** Implementation complete (pending database migration + build verification)

## Overview

The Station Clipboard System digitizes the physical kitchen clipboard workflow. Every kitchen station (Grill, Saute, Pastry, etc.) has a daily clipboard showing what needs to be prepped, what's on hand, what was made, what needs ordering, and what was wasted. This system also tracks shift handoffs, 86'd items, shelf life expiration, and provides a unified order sheet across all stations.

## Architecture

### Server Actions (5 files)

| File                                | Purpose                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `lib/stations/actions.ts`           | Station CRUD, menu item assignment, component management                |
| `lib/stations/clipboard-actions.ts` | Daily clipboard entries, batch updates, 86 toggling, shift check-in/out |
| `lib/stations/order-actions.ts`     | Order requests from stations, batch mark ordered/received               |
| `lib/stations/waste-actions.ts`     | Waste logging, waste summaries by reason/station/value                  |
| `lib/stations/ops-log-actions.ts`   | Append-only operations log, paginated/filterable retrieval              |

### Pages (4 routes)

| Route                      | File                                          | Purpose                                          |
| -------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `/stations`                | `app/(chef)/stations/page.tsx`                | Station list, 86 banner, create station          |
| `/stations/[id]`           | `app/(chef)/stations/[id]/page.tsx`           | Station detail, menu items, components           |
| `/stations/[id]/clipboard` | `app/(chef)/stations/[id]/clipboard/page.tsx` | Daily clipboard grid, shift controls, print view |
| `/stations/orders`         | `app/(chef)/stations/orders/page.tsx`         | Unified order sheet, history                     |

### Components (10 files)

| Component            | File                                            | Purpose                                    |
| -------------------- | ----------------------------------------------- | ------------------------------------------ |
| `StationForm`        | `components/stations/station-form.tsx`          | Create/edit station                        |
| `ClipboardGrid`      | `components/stations/clipboard-grid.tsx`        | The Excel-like daily grid (core view)      |
| `ShiftCheckIn`       | `components/stations/shift-check-in.tsx`        | Start of shift with last handoff summary   |
| `ShiftCheckOut`      | `components/stations/shift-check-out.tsx`       | End of shift with snapshot + handoff notes |
| `OrderHandoff`       | `components/stations/order-handoff.tsx`         | Compiled order list with batch actions     |
| `WeeklySummary`      | `components/stations/weekly-summary.tsx`        | Mon-Sun aggregated stats per component     |
| `WasteLog`           | `components/stations/waste-log.tsx`             | Waste entries table with reason badges     |
| `EightySixBanner`    | `components/stations/eighty-six-banner.tsx`     | Red banner showing all 86'd items          |
| `ShelfLifeIndicator` | `components/stations/shelf-life-indicators.tsx` | Expiration badges (green/yellow/red)       |
| `ClipboardPrint`     | `components/stations/clipboard-print.tsx`       | Print-friendly clipboard layout            |
| `OpsLogViewer`       | `components/stations/ops-log-viewer.tsx`        | Searchable paginated ops log               |

## Database Tables Required

These tables must exist before the feature works. A migration is needed:

- `stations` — id, chef_id, name, description, display_order, created_at
- `station_menu_items` — id, chef_id, station_id, name, description, menu_item_id (FK nullable)
- `station_components` — id, chef_id, station_menu_item_id, name, unit, par_level, par_unit, shelf_life_days, notes
- `clipboard_entries` — id, chef_id, station_id, component_id, entry_date, on_hand, made, need_to_make, need_to_order, waste_qty, waste_reason_code, is_86d, eighty_sixed_at, location, notes
- `shift_logs` — id, chef_id, station_id, staff_member_id, shift_type, check_in_at, check_out_at, notes, snapshot (JSONB)
- `order_requests` — id, chef_id, component_id, station_id, quantity, unit, requested_by, status, ordered_at, fulfilled_at
- `waste_log` — id, chef_id, station_id, component_id, staff_member_id, quantity, unit, reason, estimated_value_cents, notes
- `ops_log` — id, chef_id, station_id, staff_member_id, action_type, details (JSONB), created_at

All tables scoped by `chef_id` referencing `chefs(id)`.

## Key Design Decisions

1. **Auto-generation of clipboard entries:** When `getClipboardForDate` is called and no entries exist for that date, it auto-creates entries from station components with default values. This eliminates manual setup each day.

2. **Batch save:** The clipboard grid uses local state and a "Save All" button rather than auto-saving each cell. This reduces database calls and prevents accidental saves mid-edit.

3. **Shift snapshots:** When a cook checks out, the entire clipboard state is captured as JSONB in the shift_log. This provides a historical record of exactly what the station looked like at handoff time.

4. **86'd items are cross-station visible:** The 86 banner on the stations list page aggregates across all stations so the chef can see at a glance what's unavailable anywhere.

5. **Order aggregation:** The order sheet groups by component across stations, summing quantities. This mirrors how a chef would actually call in orders to vendors.

6. **Print-friendly views:** The clipboard print view uses white background, black text, and @media print CSS to hide navigation. It opens in a new tab for clean printing.

## What's Needed Next

1. **Database migration** — Create all 8 tables listed above
2. **Navigation integration** — Add `/stations` to the chef sidebar nav
3. **Tier assignment** — Determine if this is Free or Pro tier
4. **Build verification** — Run `npx tsc --noEmit --skipLibCheck` and `npx next build --no-lint`
5. **App audit update** — Add all new routes and UI elements to `docs/app-complete-audit.md`
