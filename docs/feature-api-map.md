# ChefFlow Feature API Map

This appendix maps route handlers and service endpoints to the normalized feature registry. API mappings intentionally favor owning service families when the endpoint is internal or scheduled.

Summary:

- total API routes: 311
- mapped API routes: 311 (100.0%)
- unmatched API routes: 0 (0.0%)

## API Map

| api route                                        | feature id                      | feature name                        | classification  | visibility | status   |
| ------------------------------------------------ | ------------------------------- | ----------------------------------- | --------------- | ---------- | -------- |
| /admin/price-catalog/csv-export                  | admin-price-catalog-ops         | Admin Price Catalog Ops             | internal_admin  | internal   | complete |
| /api/activity/breadcrumbs                        | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| /api/activity/feed                               | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| /api/activity/track                              | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| /api/admin/directory/image-queue                 | admin-directory-moderation      | Admin Directory Moderation          | internal_admin  | internal   | complete |
| /api/ai/health                                   | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/ai/monitor                                  | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/ai/wake                                     | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/auth/[...nextauth]                          | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /api/auth/google/connect                         | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /api/auth/google/connect/callback                | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /api/book                                        | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /api/build-version                               | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/calendar/event/[id]                         | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /api/cannabis/rsvps/[eventId]/summary            | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /api/clients/preferences                         | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /api/comms/sms                                   | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/cron/account-purge                          | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/cron/brand-monitor                          | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/cron/circle-digest                          | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /api/cron/cooling-alert                          | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/cron/developer-digest                       | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/cron/event-progression                      | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/cron/momentum-snapshot                      | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/cron/morning-briefing                       | morning-briefing                | Morning Briefing                    | chef_privileged | visible    | complete |
| /api/cron/openclaw-polish                        | price-sync-local-mirror         | Price Sync Local Mirror             | internal_only   | internal   | partial  |
| /api/cron/openclaw-sync                          | price-sync-local-mirror         | Price Sync Local Mirror             | internal_only   | internal   | partial  |
| /api/cron/price-sync                             | price-sync-local-mirror         | Price Sync Local Mirror             | internal_only   | internal   | partial  |
| /api/cron/quarterly-checkin                      | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/cron/recall-check                           | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/cron/renewal-reminders                      | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/demo/data                                   | public-demo-mode                | Public Demo Mode                    | developer_tool  | gated      | complete |
| /api/demo/switch                                 | public-demo-mode                | Public Demo Mode                    | developer_tool  | gated      | complete |
| /api/demo/tier                                   | public-demo-mode                | Public Demo Mode                    | developer_tool  | gated      | complete |
| /api/documents/[eventId]                         | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/[eventId]/bulk-generate           | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/commerce-receipt/[saleId]         | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/commerce-shift-report/[sessionId] | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/consolidated-grocery              | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/contract/[contractId]             | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/financial-summary/[eventId]       | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/foh-menu/[eventId]                | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/foh-preview/[menuId]              | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/invoice-pdf/[eventId]             | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/invoice/[eventId]                 | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/quote-client/[quoteId]            | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/quote/[quoteId]                   | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/receipt/[eventId]                 | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/snapshots/[snapshotId]            | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/snapshots/export                  | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/documents/templates/[template]              | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/e2e/auth                                    | developer-simulation-lab        | Developer Simulation Lab            | developer_tool  | gated      | complete |
| /api/embed/inquiry                               | embed-inquiry-widget            | Embed Inquiry Widget                | chef_privileged | visible    | complete |
| /api/feeds/calendar/[token]                      | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /api/gmail/sync                                  | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| /api/health                                      | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/health/ping                                 | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/health/readiness                            | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/inngest                                     | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/integrations/[provider]/callback            | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/[provider]/connect             | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/connect                        | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/docusign/callback              | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/quickbooks/callback            | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/social/callback/[platform]     | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/social/connect/[platform]      | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/social/disconnect/[platform]   | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/square/callback                | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/integrations/zapier/subscribe               | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/kiosk/end-session                           | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/kiosk/heartbeat                             | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/kiosk/inquiry                               | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/kiosk/order/catalog                         | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/kiosk/order/checkout                        | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/kiosk/order/drawer                          | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/kiosk/pair                                  | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/kiosk/status                                | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/kiosk/verify-pin                            | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /api/menus/upload                                | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /api/monitoring/report-error                     | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/notifications/send                          | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/ollama-status                               | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/openclaw/image                              | price-sync-local-mirror         | Price Sync Local Mirror             | internal_only   | internal   | partial  |
| /api/prospecting/[id]/convert                    | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/prospecting/[id]/draft-email                | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/prospecting/[id]/enrich                     | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/prospecting/[id]/log-outreach               | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/prospecting/by-email                        | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/prospecting/check-dups                      | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/prospecting/import                          | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/prospecting/queue                           | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/prospecting/webhook/reply                   | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /api/public/client-lookup                        | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /api/push/resubscribe                            | realtime-push-fabric            | Realtime Push Fabric                | internal_only   | internal   | complete |
| /api/push/subscribe                              | realtime-push-fabric            | Realtime Push Fabric                | internal_only   | internal   | complete |
| /api/push/unsubscribe                            | realtime-push-fabric            | Realtime Push Fabric                | internal_only   | internal   | complete |
| /api/push/vapid-public-key                       | realtime-push-fabric            | Realtime Push Fabric                | internal_only   | internal   | complete |
| /api/qol/metrics                                 | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/realtime/[channel]                          | realtime-push-fabric            | Realtime Push Fabric                | internal_only   | internal   | complete |
| /api/realtime/presence                           | realtime-push-fabric            | Realtime Push Fabric                | internal_only   | internal   | complete |
| /api/realtime/typing                             | realtime-push-fabric            | Realtime Push Fabric                | internal_only   | internal   | complete |
| /api/remy/client                                 | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/remy/landing                                | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/remy/public                                 | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/remy/stream                                 | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/remy/warmup                                 | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/reports/financial                           | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /api/scheduled/activity-cleanup                  | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/automations                       | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/call-reminders                    | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/campaigns                         | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/scheduled/copilot                           | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/daily-report                      | morning-briefing                | Morning Briefing                    | chef_privileged | visible    | complete |
| /api/scheduled/email-history-scan                | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| /api/scheduled/follow-ups                        | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| /api/scheduled/integrations/pull                 | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/scheduled/integrations/retry                | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/scheduled/lifecycle                         | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/loyalty-expiry                    | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/monitor                           | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/scheduled/push-cleanup                      | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/raffle-draw                       | monthly-raffle                  | Monthly Raffle                      | chef_privileged | gated      | complete |
| /api/scheduled/revenue-goals                     | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/scheduled/reviews-sync                      | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| /api/scheduled/rsvp-reminders                    | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/rsvp-retention                    | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/sequences                         | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/scheduled/simulation                        | developer-simulation-lab        | Developer Simulation Lab            | developer_tool  | gated      | complete |
| /api/scheduled/simulation/check                  | developer-simulation-lab        | Developer Simulation Lab            | developer_tool  | gated      | complete |
| /api/scheduled/social-publish                    | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /api/scheduled/stale-leads                       | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/waitlist-sweep                    | waitlist-management             | Waitlist Management                 | chef_standard   | hidden     | complete |
| /api/scheduled/wellbeing-signals                 | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| /api/scheduled/wix-process                       | wix-processing                  | Wix Processing                      | internal_only   | internal   | complete |
| /api/scheduling/availability                     | availability-broadcaster        | Availability Broadcaster            | chef_privileged | visible    | complete |
| /api/sentinel/auth                               | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/sentinel/health                             | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/sentinel/sync-status                        | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/social/google/callback                      | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/social/google/connect                       | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/social/google/sync                          | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/social/instagram/callback                   | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/social/instagram/connect                    | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/social/instagram/sync                       | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/storage/[...path]                           | api-service-layer               | API Service Layer                   | internal_only   | internal   | complete |
| /api/storage/public/[...path]                    | api-service-layer               | API Service Layer                   | internal_only   | internal   | complete |
| /api/stripe/connect/callback                     | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /api/system/heal                                 | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/system/health                               | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| /api/v2/booking/instant-checkout                 | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /api/v2/calls                                    | calls-consultations             | Calls And Consultations             | chef_standard   | visible    | complete |
| /api/v2/calls/[id]                               | calls-consultations             | Calls And Consultations             | chef_standard   | visible    | complete |
| /api/v2/clients                                  | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /api/v2/clients/[id]                             | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /api/v2/clients/[id]/merge                       | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /api/v2/commerce/checkout                        | commerce-service-modes          | Commerce Service Modes              | chef_privileged | visible    | complete |
| /api/v2/commerce/products                        | commerce-catalog                | Commerce Catalog                    | chef_privileged | visible    | complete |
| /api/v2/commerce/products/[id]                   | commerce-catalog                | Commerce Catalog                    | chef_privileged | visible    | complete |
| /api/v2/commerce/promotions                      | commerce-catalog                | Commerce Catalog                    | chef_privileged | visible    | complete |
| /api/v2/commerce/register                        | commerce-register               | Commerce Register                   | chef_privileged | visible    | complete |
| /api/v2/commerce/register/[id]                   | commerce-register               | Commerce Register                   | chef_privileged | visible    | complete |
| /api/v2/commerce/register/[id]/cash-drawer       | commerce-register               | Commerce Register                   | chef_privileged | visible    | complete |
| /api/v2/commerce/register/history                | commerce-register               | Commerce Register                   | chef_privileged | visible    | complete |
| /api/v2/commerce/reports                         | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /api/v2/commerce/sales                           | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /api/v2/commerce/sales/[id]                      | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /api/v2/commerce/sales/[id]/items                | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /api/v2/commerce/sales/[id]/payments             | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /api/v2/commerce/sales/[id]/refunds              | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /api/v2/commerce/settlements                     | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /api/v2/commerce/settlements/[id]                | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /api/v2/documents                                | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/v2/documents/generate                       | pdf-document-services           | PDF Document Services               | internal_only   | internal   | complete |
| /api/v2/events                                   | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /api/v2/events/[id]                              | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /api/v2/events/[id]/archive                      | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /api/v2/events/[id]/clone                        | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /api/v2/events/[id]/transition                   | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /api/v2/expenses                                 | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /api/v2/expenses/[id]                            | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /api/v2/financials/summary                       | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /api/v2/goals                                    | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/goals/[id]                               | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/goals/[id]/check-ins                     | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/goals/categories                         | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/goals/dashboard                          | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/goals/service-types                      | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/goals/service-types/[id]                 | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/goals/service-types/reorder              | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/goals/suggestions/[id]                   | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /api/v2/inquiries                                | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /api/v2/inquiries/[id]                           | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /api/v2/inquiries/[id]/convert                   | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /api/v2/inventory                                | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /api/v2/inventory/[id]                           | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /api/v2/invoices                                 | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /api/v2/invoices/[id]                            | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /api/v2/ledger                                   | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| /api/v2/loyalty/clients/[id]                     | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/clients/[id]/adjust              | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/clients/[id]/bonus               | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/clients/[id]/points              | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/clients/[id]/redeem              | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/clients/[id]/transactions        | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/config                           | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/event-points                     | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/incentives/redeem                | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/incentives/validate              | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/members                          | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/members/[id]                     | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/overview                         | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/programs                         | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/programs/[id]                    | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/raffles                          | monthly-raffle                  | Monthly Raffle                      | chef_privileged | gated      | complete |
| /api/v2/loyalty/raffles/[id]                     | monthly-raffle                  | Monthly Raffle                      | chef_privileged | gated      | complete |
| /api/v2/loyalty/raffles/[id]/draw                | monthly-raffle                  | Monthly Raffle                      | chef_privileged | gated      | complete |
| /api/v2/loyalty/rewards                          | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/rewards/[id]                     | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /api/v2/loyalty/vouchers                         | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| /api/v2/loyalty/vouchers/[id]                    | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| /api/v2/loyalty/vouchers/send                    | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| /api/v2/marketing/ab-tests                       | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/ab-tests/[id]                  | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/campaigns                      | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/campaigns/[id]                 | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/campaigns/[id]/send            | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/campaigns/[id]/stats           | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/segments                       | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/segments/[id]                  | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/sequences                      | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/sequences/[id]                 | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/sequences/[id]/enroll          | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/social-templates               | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /api/v2/marketing/social-templates/[id]          | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /api/v2/marketing/templates                      | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/marketing/templates/[id]                 | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/v2/menus                                    | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /api/v2/menus/[id]                               | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /api/v2/menus/[id]/approve                       | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /api/v2/notifications                            | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/v2/notifications/[id]                       | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/v2/notifications/experience                 | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/v2/notifications/preferences                | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/v2/notifications/sms-settings               | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/v2/notifications/tiers                      | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/v2/notifications/tiers/reset                | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/v2/partners                                 | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /api/v2/partners/[id]                            | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /api/v2/partners/[id]/assign-events              | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /api/v2/partners/[id]/images                     | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /api/v2/partners/[id]/invite                     | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /api/v2/partners/[id]/locations                  | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /api/v2/partners/[id]/share-link                 | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /api/v2/partners/analytics                       | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /api/v2/payments                                 | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /api/v2/queue                                    | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| /api/v2/quotes                                   | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /api/v2/quotes/[id]                              | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /api/v2/quotes/[id]/accept                       | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /api/v2/quotes/[id]/send                         | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /api/v2/recipes                                  | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /api/v2/recipes/[id]                             | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /api/v2/remy/policies                            | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/v2/remy/policies/[id]                       | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /api/v2/safety/backup-contacts                   | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /api/v2/safety/backup-contacts/[id]              | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /api/v2/safety/incidents                         | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /api/v2/safety/incidents/[id]                    | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /api/v2/safety/incidents/[id]/follow-ups         | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /api/v2/safety/incidents/[id]/resolution         | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /api/v2/safety/recalls                           | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /api/v2/safety/recalls/[id]/dismiss              | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /api/v2/search                                   | api-service-layer               | API Service Layer                   | internal_only   | internal   | complete |
| /api/v2/settings/automations                     | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| /api/v2/settings/automations/[id]                | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| /api/v2/settings/booking                         | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /api/v2/settings/dashboard                       | dashboard-command-center        | Dashboard Command Center            | chef_standard   | visible    | complete |
| /api/v2/settings/menu-engine                     | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| /api/v2/settings/modules                         | module-gating-and-focus-mode    | Module Gating And Focus Mode        | chef_privileged | hidden     | complete |
| /api/v2/settings/notification-tiers              | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/v2/settings/preferences                     | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /api/v2/settings/pricing                         | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /api/v2/settings/tax-rates                       | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /api/v2/settings/taxonomy                        | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /api/v2/settings/taxonomy/[id]                   | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /api/v2/staff                                    | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /api/v2/staff/[id]                               | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /api/v2/taxonomy                                 | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /api/v2/taxonomy/[id]                            | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /api/v2/taxonomy/hidden                          | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /api/v2/taxonomy/hidden/[category]/[value]       | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /api/v2/vendors                                  | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| /api/v2/vendors/[id]                             | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| /api/v2/webhooks                                 | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/v2/webhooks/[id]                            | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/v2/webhooks/[id]/logs                       | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/v2/webhooks/[id]/test                       | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/webhooks/[provider]                         | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /api/webhooks/docusign                           | contracts-approvals             | Contracts And Approvals             | chef_privileged | visible    | complete |
| /api/webhooks/resend                             | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /api/webhooks/stripe                             | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /api/webhooks/twilio                             | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /api/webhooks/wix                                | wix-processing                  | Wix Processing                      | internal_only   | internal   | complete |
| /auth/callback                                   | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /book/[chefSlug]/availability                    | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /clients/csv-export                              | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /culinary/price-catalog/csv-export               | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| /events/csv-export                               | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /feed.xml                                        | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /finance/export                                  | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/year-end/export                         | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |

## Unmatched API Routes

No unmatched API routes.
