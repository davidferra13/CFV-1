# Quality Sourcing Tracker (Feature 8.6)

Opt-in carbon footprint tracking positioned as "quality sourcing" reporting. Tracks local/organic sourcing percentages, food miles, waste reduction, and estimated CO2 savings.

## Overview

Private chefs who source locally and organically can now track and report on their ingredient sourcing quality. The feature is framed around quality and transparency rather than activism, making it approachable for all chefs regardless of their sustainability stance.

## Database

**Table:** `sourcing_entries`

- One row per ingredient sourced
- Linked to chef via `chef_id` (tenant scoped)
- Optionally linked to an event via `event_id`
- Tracks: ingredient name, source type, supplier name, distance, cost, weight, organic/local flags
- RLS policies scope all access to the authenticated chef

**Migration:** `supabase/migrations/20260401000037_carbon_sourcing.sql`

## Source Types

| Type | Label | CO2 Category |
|------|-------|-------------|
| `local_farm` | Local Farm | local (0.5 lbs CO2/lb) |
| `farmers_market` | Farmer's Market | local |
| `organic` | Organic Supplier | conventional (2.5 lbs CO2/lb) |
| `conventional` | Conventional | conventional |
| `imported` | Imported | imported (5.0 lbs CO2/lb) |
| `foraged` | Foraged | local |
| `garden` | Garden Grown | local |
| `specialty` | Specialty Purveyor | conventional |

## Scorecard Grading

Points (0-100) computed from three factors:

- **Local %** (up to 40 points): `(localPercent / 100) * 40`
- **Organic %** (up to 30 points): `(organicPercent / 100) * 30`
- **Distance** (up to 30 points): lower distance = more points, capped at 100 miles

| Score | Grade |
|-------|-------|
| 85+ | A |
| 70-84 | B |
| 55-69 | C |
| 40-54 | D |
| 0-39 | F |

## CO2 Savings Estimate

Simple deterministic formula comparing actual sourcing against a baseline of 100% conventional:

- Local sources: 0.5 lbs CO2 per lb of food
- Conventional sources: 2.5 lbs CO2 per lb of food
- Imported sources: 5.0 lbs CO2 per lb of food
- **Savings = (conventional baseline CO2) - (actual CO2)**

This is a rough estimate for directional guidance, not a certified carbon audit.

## Server Actions

All in `lib/sustainability/sourcing-actions.ts`:

| Action | Purpose |
|--------|---------|
| `addSourcingEntry` | Log a new sourcing entry |
| `getSourcingEntries` | List entries with date/event filters |
| `deleteSourcingEntry` | Remove an entry |
| `getSourcingStats` | Computed stats: local %, organic %, avg miles, CO2 saved, breakdown |
| `getSourceBreakdown` | Pie chart data by source type |
| `getMonthlyTrend` | Local/organic % over last 12 months |
| `getSourcingScorecard` | Letter grade (A-F) with explanation |
| `getEventSourcingReport` | Per-event sourcing breakdown |

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| `SourcingLog` | `components/sustainability/sourcing-log.tsx` | Add entry form + entries table with filter and quick-add mode |
| `SourcingDashboard` | `components/sustainability/sourcing-dashboard.tsx` | Full dashboard: scorecard, stats, donut chart, monthly trend |
| `SourcingWidget` | `components/dashboard/sourcing-widget.tsx` | Compact widget for chef dashboard |

## Charts

All charts are CSS-only (no chart library dependency):

- **Donut chart:** CSS `conic-gradient` with inner circle cutout
- **Bar chart:** Flexbox bars with proportional heights
- **Progress bars:** Simple div width percentages

## Design Decisions

1. **Formula over AI:** All calculations are deterministic math. No Ollama or cloud AI involved.
2. **Quality framing:** UI copy says "Quality Sourcing" not "Carbon Footprint" or "Sustainability."
3. **Opt-in:** No data is tracked automatically. Chefs manually log entries.
4. **Per-event linking:** Entries can optionally link to events for per-event sourcing reports.
5. **Quick-add mode:** Retains source type and supplier between entries for batch logging.
