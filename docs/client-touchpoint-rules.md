# Client Touchpoint Rules (Feature 4F)

## What Changed

Added a configurable touchpoint rules system that surfaces client engagement opportunities for the chef. The chef always decides what to do; the system only reminds.

## New Files

### Migration

- `database/migrations/20260401000090_client_touchpoint_rules.sql` - creates `client_touchpoint_rules` table with RLS, indexes, and updated_at trigger

### Server Actions

- `lib/clients/touchpoint-actions.ts` - full CRUD for touchpoint rules plus `getUpcomingTouchpoints()` scanner

### Components

- `components/clients/touchpoint-rules-manager.tsx` - CRUD interface for managing rules (create, edit, toggle active/inactive, deactivate)
- `components/clients/upcoming-touchpoints.tsx` - dashboard widget showing matched touchpoints with Dismiss/Done buttons

## How It Works

### Rule Types

| Type                     | Trigger Value                | What It Does                                        |
| ------------------------ | ---------------------------- | --------------------------------------------------- |
| birthday                 | Days before (default 7)      | Checks client `date_of_birth`, alerts within window |
| anniversary              | Days before (default 7)      | Checks anniversary of first event with the client   |
| days_since_last_event    | Day threshold (default 90)   | Alerts when a client has not booked in N days       |
| lifetime_spend_milestone | Dollar amount (default 5000) | Alerts when client crosses a spend threshold        |
| streak_milestone         | Event count (default 10)     | Alerts when client reaches N total events           |
| custom                   | N/A                          | Manual reminder, no automatic evaluation            |

### Evaluation Logic

- Pure deterministic, rule-based. No AI involved.
- `getUpcomingTouchpoints()` loads active rules, scans all clients, and returns matches sorted by urgency (high, medium, low).
- Birthday and anniversary rules use a configurable lookahead window.
- Spend and streak milestones have a tolerance band to avoid re-firing indefinitely.

### Relationship to Existing Gifting System

This is complementary to the existing `client_followup_rules` and `client_gift_log` in `lib/clients/gifting-actions.ts`. The follow-up rules system handles rule-to-action mapping (reminder, email draft, gift suggestion). The touchpoint rules system handles broader engagement monitoring with flexible thresholds and freeform action suggestions.

## Integration Points

- Components accept initial data as props (server-side fetch, client-side render)
- The upcoming touchpoints widget is designed to be placed on the chef dashboard
- Dismiss and Done are client-side only (session state); no persistence needed since these are ephemeral suggestions
