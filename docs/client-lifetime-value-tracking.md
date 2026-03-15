# Feature 2.11: Client Lifetime Value (CLV) Tracking

## What Changed

Added a deterministic CLV system that computes revenue, retention, and engagement metrics per client. Zero AI dependency; all metrics are SQL queries + math.

## Files Added

### Server Actions

- `lib/clients/lifetime-value-actions.ts` - Three server actions:
  - `getClientLifetimeValue(clientId)` - Per-client CLV: total revenue, event count, avg per event, months as client, projected annual revenue, tips, top occasions, event status breakdown
  - `getTopClientsByRevenue(limit?)` - Top N clients ranked by total revenue with tier badges
  - `getClientRetentionMetrics()` - Active/churning/lost client counts with avg lifetime and revenue
  - Helper: `getClientTier(eventCount)` - New (<3), Regular (3-10), VIP (10+), Champion (20+)
  - Constant: `TIER_CONFIG` - Labels and Tailwind classes for each tier

### UI Components

- `components/clients/client-value-card.tsx` - Card for client detail page showing total revenue, tier badge, event count, avg per event, months as client, projected annual revenue, tips, booking frequency, top occasions, and trend indicator (up/down/flat vs previous period)
- `components/clients/top-clients-widget.tsx` - Dashboard widget with table of top 10 clients by revenue (name, revenue, event count, last event, tier badge)
- `components/dashboard/retention-widget.tsx` - Dashboard widget with stacked horizontal bar showing active/churning/lost breakdown, counts, avg lifetime, avg revenue, and churning alert

## Architecture Decisions

- **Formula > AI**: All metrics computed from `event_financial_summary` view + `events` table. No Ollama/Gemini/Groq.
- **Tenant scoping**: All queries filter by `user.tenantId!` from `requireChef()` session.
- **Cents everywhere**: All monetary amounts stored and returned as integer cents.
- **Existing view reuse**: Uses `event_financial_summary` (total_paid_cents, tip_amount_cents) instead of raw ledger queries.
- **No new DB schema**: Everything derived from existing tables/views.
- **CSS-only visualization**: Retention bar chart uses Tailwind classes, no chart library.

## Client Tier System

| Tier     | Events | Badge Style     |
| -------- | ------ | --------------- |
| New      | <3     | Stone (neutral) |
| Regular  | 3-10   | Blue            |
| VIP      | 10-19  | Amber           |
| Champion | 20+    | Emerald         |

## Integration Points

These components need to be wired into their respective pages:

- `ClientValueCard` on the client detail page (`app/(chef)/clients/[id]/page.tsx`)
- `TopClientsWidget` on the chef dashboard (`app/(chef)/dashboard/page.tsx`)
- `RetentionWidget` on the chef dashboard

The server actions are ready to call from any server component.
