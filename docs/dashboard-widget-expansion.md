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

## Phase 3: Rich Widgets for Loaded-but-Unrepresented Data (13 widgets)

Data sources that were already loaded in `business-section-loader.ts` but had zero dedicated dashboard widget. All 13 now have rich interactive widgets.

### Components

| Widget               | Component                         | Data Source                      | What It Shows                                       |
| -------------------- | --------------------------------- | -------------------------------- | --------------------------------------------------- |
| Top Events by Profit | `top-events-profit-widget.tsx`    | `getTopEventsByProfit()`         | 5 most profitable events with margin %              |
| Pipeline Forecast    | `pipeline-forecast-widget.tsx`    | `getPipelineRevenueForecast()`   | Weighted pipeline value by stage with expected/best |
| Multi-Event Days     | `multi-event-days-widget.tsx`     | `getMultiEventDays()`            | Days with 2+ events in next 90 days (scheduling)    |
| AAR Performance      | `aar-performance-widget.tsx`      | `getAARStats()`                  | Calm/prep ratings, trend, top forgotten items       |
| Avg Hourly Rate      | `avg-hourly-rate-widget.tsx`      | `getMonthlyAvgHourlyRate()`      | Effective hourly rate from completed events         |
| Payout Summary       | `payout-summary-widget.tsx`       | `getChefPayoutSummary()`         | Stripe net received, fees, pending transfers        |
| Revenue Goal         | `revenue-goal-widget.tsx`         | `getRevenueGoalSnapshot()`       | Monthly/annual goal progress bars, gap, open dates  |
| Loyalty Rewards      | `loyalty-approaching-widget.tsx`  | `getClientsApproachingRewards()` | Clients near reward thresholds with point distance  |
| Food Cost Trend      | `food-cost-trend-widget.tsx`      | `getFoodCostTrend()`             | 6-month bar chart with rising trend alerts          |
| Booking Seasonality  | `booking-seasonality-widget.tsx`  | `getBookingSeasonality()`        | 12-month heatmap with peak/quiet signals            |
| Year-over-Year       | `yoy-comparison-widget.tsx`       | `getYoYData()`                   | Revenue, event count, avg value vs previous year    |
| Overdue Installments | `overdue-installments-widget.tsx` | `getOverdueInstallments()`       | Past-due payment installments with amounts/days     |
| Dormant Clients      | `dormant-clients-widget.tsx`      | `getDormantClients()`            | Clients with 90+ day inactivity, LTV displayed      |

### Widget ID Registration

13 new widget IDs added to `lib/scheduling/types.ts`:
`top_events_profit`, `pipeline_forecast`, `multi_event_days`, `aar_performance`, `avg_hourly_rate`, `payout_summary`, `revenue_goal`, `loyalty_approaching`, `food_cost_trend`, `booking_seasonality`, `yoy_comparison`, `overdue_installments`, `dormant_clients_list`

### Files Changed

- `lib/scheduling/types.ts` - +13 widget IDs and labels
- `components/dashboard/top-events-profit-widget.tsx` - NEW
- `components/dashboard/pipeline-forecast-widget.tsx` - NEW
- `components/dashboard/multi-event-days-widget.tsx` - NEW
- `components/dashboard/aar-performance-widget.tsx` - NEW
- `components/dashboard/avg-hourly-rate-widget.tsx` - NEW
- `components/dashboard/payout-summary-widget.tsx` - NEW
- `components/dashboard/revenue-goal-widget.tsx` - NEW
- `components/dashboard/loyalty-approaching-widget.tsx` - NEW
- `components/dashboard/food-cost-trend-widget.tsx` - NEW
- `components/dashboard/booking-seasonality-widget.tsx` - NEW
- `components/dashboard/yoy-comparison-widget.tsx` - NEW
- `components/dashboard/overdue-installments-widget.tsx` - NEW
- `components/dashboard/dormant-clients-widget.tsx` - NEW
- `app/(chef)/dashboard/_sections/business-section-mobile-content.tsx` - +13 widgets wired

## Total Widget Count

Dashboard now has **57 active widgets** (up from 30 at start, 44 after Phase 2).

## Remaining Metric Cards

The following are still rendered as simple 3-row metric cards. They already show useful data. Upgrading them to rich widgets is a lower priority since the data is already visible:

business_snapshot, commerce_hub, inventory_health, vendor_costs, payments_health, staff_operations, marketing_pipeline, contracts_collections, analytics_pulse, goals_tracker, operations_readiness, recipe_menu_engine, lead_funnel_live, network_collab_growth, safety_risk_watch, travel_logistics, inbox_command_center, notifications_center, reviews_reputation, documents_compliance, client_growth_signals, survey_testimonial_feed, partners_referrals, stations_ops_status, payments_finance_detail, reports_snapshot, task_automation, cannabis_control_center, charity_impact, community_commands, guest_ops, receipts_reconciliation, social_planner, wix_intake_health, imports_sync_health, remy_status
