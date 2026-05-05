# Codex Build Spec: PIE Volatility Alerts UI

> **Priority:** P2 - Active volatility alerts exist in backend, chef never sees them
> **Risk:** LOW - new UI surface, reads existing data
> **Estimated scope:** ~150 lines, 1 new component + 1 server action

## Context

`lib/pricing/trend-intelligence.ts` exports `getActiveVolatilityAlerts()` and `dismissAlert()`. These detect when ingredient prices are swinging wildly. Chefs should see these alerts before planning events with volatile ingredients.

## What to Build

### 1. Server action

Create or extend an action:

- `getMyVolatilityAlerts()` - returns active alerts for ingredients the chef commonly uses
- Filter to ingredients in chef's recent recipes/events (last 90 days)
- Don't show alerts for ingredients the chef never uses

### 2. Alert component

Create `components/pricing/VolatilityAlertBanner.tsx`:

- Rendered on dashboard or pricing settings page
- Shows: "3 ingredients you use have volatile prices"
- Expandable list: ingredient name, current price, avg price, % swing, severity
- Dismiss button per alert (calls `dismissAlert`)
- Empty state: nothing rendered (not "no alerts" message)

### 3. Event planning integration

On event creation/editing, if any menu ingredient has active volatility alert:

- Yellow banner: "2 ingredients in this menu have volatile prices. Costs may change."
- Link to the specific ingredients with their alerts

## Do NOT

- Create notifications/emails for volatility (that's a different system)
- Modify trend-intelligence.ts logic
- Show alerts for ingredients not in chef's repertoire
- Add new database tables

## Acceptance Criteria

- Active alerts visible on relevant surfaces
- Dismiss works and persists
- No alerts = no UI rendered
- `npx tsc --noEmit --skipLibCheck` passes
