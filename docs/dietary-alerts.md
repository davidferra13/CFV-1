# Dietary Trend Alerts (Feature 2.18)

## Overview

Alerts chefs when clients update their dietary information and surfaces trends across the entire client base. All analysis is deterministic (Formula > AI).

## Architecture

### Database

**Table: `dietary_change_log`** (migration `20260401000033`)

Tracks every dietary info change per client. Fields:

- `change_type`: allergy_added, allergy_removed, restriction_added, restriction_removed, preference_updated, note_updated
- `severity`: Deterministic classification. Allergen changes = critical, restriction changes = warning, preference/note changes = info
- `acknowledged`: Boolean, allows chefs to dismiss alerts
- RLS scoped by `chef_id`

### Server Actions (`lib/clients/dietary-alert-actions.ts`)

| Action | Purpose |
|--------|---------|
| `getDietaryAlerts(unacknowledgedOnly?)` | Fetch alerts, optionally filtered to unacknowledged |
| `acknowledgeAlert(alertId)` | Mark single alert as seen |
| `acknowledgeAllAlerts()` | Mark all alerts as seen |
| `logDietaryChange(clientId, changeType, fieldName, oldValue, newValue)` | Create a change log entry with deterministic severity |
| `getDietaryTrends()` | Aggregate analysis: common allergies, common restrictions, rising trends (last 90 days) |
| `getClientDietaryTimeline(clientId)` | Full change history for one client |
| `getAlertStats()` | Count breakdowns by severity and acknowledgment status |

### UI Components

1. **`DietaryAlertPanel`** (`components/clients/dietary-alert-panel.tsx`)
   - Full alert list with severity badges (red/amber/blue)
   - Filter by severity
   - Acknowledge per-alert or all at once
   - Optimistic updates with rollback on failure

2. **`DietaryTrendDashboard`** (`components/clients/dietary-trend-dashboard.tsx`)
   - CSS bar charts for most common allergies and restrictions
   - Rising trends section (items with 2+ occurrences in last 90 days)

3. **`DietaryAlertsWidget`** (`components/dashboard/dietary-alerts-widget.tsx`)
   - Compact dashboard widget
   - Shows unacknowledged count badge
   - Lists latest 3 critical alerts
   - Summary counts by severity

## Integration Points

To log dietary changes, call `logDietaryChange()` from any server action that modifies client dietary fields (allergies, restrictions, preferences, dietary notes). The severity is classified automatically:

- Allergen changes (added/removed) = `critical`
- Restriction changes (added/removed) = `warning`
- Preference or note changes = `info`

## Design Principles

- **Formula > AI**: All trend analysis is pure aggregation and math. No LLM involved.
- **Deterministic severity**: Classification is a simple switch on change_type, not AI inference.
- **Optimistic UI**: All acknowledge actions use startTransition with try/catch and rollback.
- **Tenant-scoped**: Every query filters by `chef_id` from session. Never trusts client input.
