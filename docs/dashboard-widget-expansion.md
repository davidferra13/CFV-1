# Dashboard Widget Expansion (2026-03-06)

## Summary

Expanded the chef dashboard from 30 active widgets to 44 by wiring 7 existing-but-unwired components and building 7 brand new widgets.

## Phase 1: Wired Existing Components (7 widgets)

These components already existed with full data fetching but were not rendered on the dashboard.

| Widget                     | Component                                         | Section      | Notes                            |
| -------------------------- | ------------------------------------------------- | ------------ | -------------------------------- |
| Stuck Events               | `components/pipeline/stuck-events-widget.tsx`     | Alerts       | Events stuck in pipeline stages  |
| Client Actions (Next Best) | `components/clients/next-best-actions-widget.tsx` | Alerts       | AI-suggested per-client actions  |
| Cooling Relationships      | `components/clients/cooling-alert-widget.tsx`     | Alerts       | Client relationships going cold  |
| Active Clients Now         | `components/dashboard/active-clients-card.tsx`    | Business     | Real-time client portal activity |
| Work Surface               | `components/dashboard/work-surface.tsx`           | Intelligence | Context-aware preparable work    |
| Prospecting                | `components/dashboard/prospecting-widget.tsx`     | Business     | Admin-only, pipeline stats       |
| Beta Program               | `components/beta/beta-testers-widget.tsx`         | Business     | Admin-only, tester progress      |

## Phase 2: Built New Widgets (7 widgets)

### Server Actions

All new data-fetching logic in `lib/dashboard/widget-actions.ts`:

- `getUpcomingPaymentsDue()` - events with outstanding balances
- `getExpiringQuotes()` - quotes expiring within 7 days
- `getDietaryAlertSummary()` - dietary/allergy info for upcoming events
- `getUpcomingBirthdays()` - client milestones from `personal_milestones` field
- `getShoppingWindowItems()` - events in next 3 days vs grocery list status
- `getUnreadHubMessages()` - hub groups with unread messages

### Components

| Widget                   | Component                        | Section  | Data Source                             |
| ------------------------ | -------------------------------- | -------- | --------------------------------------- |
| Revenue This Month       | `revenue-comparison-widget.tsx`  | Business | `getMonthOverMonthRevenue()` (existing) |
| Payments Due             | `payments-due-widget.tsx`        | Alerts   | `getUpcomingPaymentsDue()` (new)        |
| Expiring Quotes          | `expiring-quotes-widget.tsx`     | Alerts   | `getExpiringQuotes()` (new)             |
| Dietary & Allergy Alerts | `dietary-alerts-widget.tsx`      | Alerts   | `getDietaryAlertSummary()` (new)        |
| Client Birthdays         | `client-birthdays-widget.tsx`    | Alerts   | `getUpcomingBirthdays()` (new)          |
| Shopping Window          | `shopping-window-widget.tsx`     | Schedule | `getShoppingWindowItems()` (new)        |
| Hub Messages             | `unread-hub-messages-widget.tsx` | Alerts   | `getUnreadHubMessages()` (new)          |

## Widget ID Registration

14 new widget IDs added to `lib/scheduling/types.ts`:
`stuck_events`, `next_best_actions`, `cooling_alerts`, `active_clients_now`, `work_surface`, `prospecting_hub`, `beta_program`, `revenue_comparison`, `payments_due`, `expiring_quotes`, `dietary_allergy_alerts`, `client_birthdays`, `shopping_window`, `unread_hub_messages`

All widgets are toggleable via Dashboard Quick Settings and respect the CollapsibleWidget system.

## Files Changed

- `lib/scheduling/types.ts` - 14 new widget IDs + labels
- `lib/dashboard/widget-actions.ts` - NEW: 6 server actions for new widgets
- `components/dashboard/revenue-comparison-widget.tsx` - NEW
- `components/dashboard/payments-due-widget.tsx` - NEW
- `components/dashboard/expiring-quotes-widget.tsx` - NEW
- `components/dashboard/dietary-alerts-widget.tsx` - NEW
- `components/dashboard/client-birthdays-widget.tsx` - NEW
- `components/dashboard/shopping-window-widget.tsx` - NEW
- `components/dashboard/unread-hub-messages-widget.tsx` - NEW
- `app/(chef)/dashboard/_sections/alerts-section.tsx` - +8 widgets wired
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - +1 widget wired
- `app/(chef)/dashboard/_sections/intelligence-section.tsx` - +1 widget wired
- `app/(chef)/dashboard/_sections/business-section-mobile-content.tsx` - +4 widgets wired

## Remaining Dashboard Gaps (for future)

Features with zero dashboard presence still:

- Marketplace
- Equipment & Facilities
- Recurring Subscriptions
- Food Cost Analysis
- Vendor Management (beyond the metric card)
