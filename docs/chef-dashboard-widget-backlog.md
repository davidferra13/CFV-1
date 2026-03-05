# Chef Dashboard Widget Backlog

This is the aggressive gap list for Chef dashboard coverage across `app/(chef)`.

## Already Implemented

- [x] Schedule/ops core: `daily_plan`, `todays_schedule`, `week_strip`, `dop_tasks`, `prep_prompts`
- [x] Alert stack: `scheduling_gaps`, `response_time`, `pending_followups`, `holiday_outreach`, `onboarding_checklist`, `upcoming_calls`
- [x] Collaboration stack: `collaboration_invites`, `recipe_shares`, `collaborating_on`, `recipe_debt`, `invite_chef`
- [x] Business/health stack: `service_quality`, `business_snapshot`, `takeachef_command_center`, `wellbeing`, `concentration_risk`, `business_health`, `insurance_health`, `business_insights`
- [x] Commerce/ops stack: `commerce_hub`, `inventory_health`, `vendor_costs`, `payments_health`
- [x] Team/marketing/contracts stack: `staff_operations`, `marketing_pipeline`, `contracts_collections`
- [x] Productivity stack: `career_growth`, `hours`, `todo_list`, `activity`
- [x] New in this pass: `inbox_command_center`, `notifications_center`, `reviews_reputation`

## High-Priority Widgets (Completed)

- [x] `analytics_pulse`
  - Portal: `/analytics`, `/analytics/funnel`, `/analytics/pipeline`, `/analytics/demand`
  - Widget payload: MTD pipeline value, funnel conversion %, top demand channel, week trend sparkline
- [x] `goals_tracker`
  - Portal: `/goals`, `/finance/goals`, `/goals/revenue-path`
  - Widget payload: monthly goal progress, projected finish, blocked goals count
- [x] `operations_readiness`
  - Portal: `/operations`, `/operations/equipment`, `/operations/kitchen-rentals`
  - Widget payload: equipment issues, upcoming rental conflicts, unresolved ops alerts
- [x] `recipe_menu_engine`
  - Portal: `/recipes`, `/menus`, `/culinary/*`
  - Widget payload: draft recipes, recipe debt aging, menu approval backlog, prep timeline misses
- [x] `lead_funnel_live`
  - Portal: `/leads`, `/prospecting`, `/guest-leads`
  - Widget payload: new leads, contacted today, hot pipeline count, stale leads > N days
- [x] `network_collab_growth`
  - Portal: `/network`, `/network/collabs`, `/social`
  - Widget payload: pending requests, unread collaboration inbox, accepted collabs this month
- [x] `safety_risk_watch`
  - Portal: `/safety/incidents`, `/settings/protection/*`
  - Widget payload: open incidents, compliance expirations soon, continuity plan status
- [x] `travel_logistics`
  - Portal: `/travel`, `/events/[id]/travel`
  - Widget payload: upcoming travel events, missing travel plans, long-drive warnings

## Medium-Priority Widgets

- [x] `documents_compliance`
  - Portal: `/documents`, `/events/[id]/documents`, `/settings/compliance/*`
  - Payload: missing event docs, unsigned docs, expiring certifications
- [x] `client_growth_signals`
  - Portal: `/clients/insights`, `/clients/segments`, `/clients/history`
  - Payload: at-risk clients, dormant reactivation candidates, top-spend movement
- [x] `survey_testimonial_feed`
  - Portal: `/surveys`, `/testimonials`, `/reviews`
  - Payload: pending survey responses, new testimonials, review response backlog
- [x] `partners_referrals`
  - Portal: `/partners`, `/partners/referral-performance`
  - Payload: active partners, referral events generated, inactive partner count
- [x] `stations_ops_status`
  - Portal: `/stations`, `/stations/daily-ops`, `/stations/ops-log`, `/stations/waste`
  - Payload: open station tasks, waste today, unresolved ops-log items
- [x] `payments_finance_detail`
  - Portal: `/payments`, `/finance/payments`, `/finance/payouts`
  - Payload: failed payments, pending payouts, installment delinquency
- [x] `reports_snapshot`
  - Portal: `/reports`, `/finance/reporting/*`
  - Payload: most recent report run times, anomalies, export failures
- [x] `task_automation`
  - Portal: `/tasks`, `/tasks/templates`, `/settings/automations`
  - Payload: overdue tasks, automation failures, template usage

## Low-Priority / Specialized Widgets

- [x] `cannabis_control_center` (if module enabled)
  - Portal: `/cannabis/*`
  - Payload: compliance checklist progress, RSVP count, upcoming cannabis events
- [x] `charity_impact`
  - Portal: `/charity`, `/charity/hours`
  - Payload: donated hours, upcoming charity events, monthly impact summary
- [x] `community_commands`
  - Portal: `/community`, `/commands`, `/consulting`
  - Payload: pending templates, command usage, consulting opportunities
- [x] `guest_ops`
  - Portal: `/guests`, `/guest-analytics`, `/guest-leads`
  - Payload: guest count trend, reservation issues, top guest segments
- [x] `receipts_reconciliation`
  - Portal: `/receipts`, `/finance/ledger`, `/commerce/reconciliation`
  - Payload: unlinked receipts, reconciliation gaps, week-close readiness
- [x] `social_planner`
  - Portal: `/social`, `/social/planner`, `/social/vault`
  - Payload: upcoming posts, gaps in posting cadence, pending approvals
- [x] `wix_intake_health`
  - Portal: `/wix-submissions`
  - Payload: unprocessed submissions, conversion rate, stale submissions
- [x] `imports_sync_health`
  - Portal: `/import`, `/settings/integrations`, `/settings/zapier`, `/settings/webhooks`
  - Payload: last import status, failed sync jobs, integration uptime
- [x] `remy_status`
  - Portal: `/remy`, `/settings/remy`
  - Payload: automations enabled, last run status, blocked flows

## Build Order Recommendation

- 1. Medium-priority set (8 widgets)
- 2. Specialized set (9 widgets)

## Engineering Notes

- Prefer one server action per widget that returns concise summary data.
- Keep widgets collapse-compatible and toggleable via `DashboardWidgetId`.
- For large/expensive modules, lazy-load metrics with existing `safe(...)` pattern and strict fallbacks.
- If a module is feature-flagged (for example cannabis/remy), hide widget entirely when disabled.
