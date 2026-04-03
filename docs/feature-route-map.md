# ChefFlow Feature Route Map

This appendix maps every discovered page route in `app/` to the normalized feature registry. The mapping is route-family based and is intended to support discoverability, handoff, and future surface audits.

Summary:

- total page routes: 690
- mapped page routes: 690 (100.0%)
- unmatched page routes: 0 (0.0%)

## Route Map

| route                                       | feature id                      | feature name                        | classification  | visibility | status   |
| ------------------------------------------- | ------------------------------- | ----------------------------------- | --------------- | ---------- | -------- |
| /                                           | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /aar                                        | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| /about                                      | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /activity                                   | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| /admin                                      | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| /admin/analytics                            | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| /admin/audit                                | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| /admin/beta                                 | admin-beta-research             | Admin Beta Research                 | internal_admin  | internal   | complete |
| /admin/beta-surveys                         | admin-beta-research             | Admin Beta Research                 | internal_admin  | internal   | complete |
| /admin/beta-surveys/[id]                    | admin-beta-research             | Admin Beta Research                 | internal_admin  | internal   | complete |
| /admin/beta/onboarding                      | admin-beta-research             | Admin Beta Research                 | internal_admin  | internal   | complete |
| /admin/cannabis                             | admin-user-event-ops            | Admin User And Event Ops            | internal_admin  | internal   | complete |
| /admin/clients                              | admin-user-event-ops            | Admin User And Event Ops            | internal_admin  | internal   | complete |
| /admin/command-center                       | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| /admin/communications                       | admin-communications-social     | Admin Communications And Social     | internal_admin  | internal   | complete |
| /admin/conversations                        | admin-communications-social     | Admin Communications And Social     | internal_admin  | internal   | complete |
| /admin/conversations/[conversationId]       | admin-communications-social     | Admin Communications And Social     | internal_admin  | internal   | complete |
| /admin/directory                            | admin-directory-moderation      | Admin Directory Moderation          | internal_admin  | internal   | complete |
| /admin/directory-listings                   | admin-directory-moderation      | Admin Directory Moderation          | internal_admin  | internal   | complete |
| /admin/events                               | admin-user-event-ops            | Admin User And Event Ops            | internal_admin  | internal   | complete |
| /admin/feedback                             | admin-communications-social     | Admin Communications And Social     | internal_admin  | internal   | complete |
| /admin/financials                           | admin-financial-health-ops      | Admin Financial And Health Ops      | internal_admin  | internal   | complete |
| /admin/flags                                | admin-feature-flags             | Admin Feature Flags                 | internal_admin  | internal   | complete |
| /admin/hub                                  | admin-communications-social     | Admin Communications And Social     | internal_admin  | internal   | complete |
| /admin/hub/groups/[groupId]                 | admin-communications-social     | Admin Communications And Social     | internal_admin  | internal   | complete |
| /admin/inquiries                            | admin-user-event-ops            | Admin User And Event Ops            | internal_admin  | internal   | complete |
| /admin/notifications                        | admin-financial-health-ops      | Admin Financial And Health Ops      | internal_admin  | internal   | complete |
| /admin/openclaw                             | admin-financial-health-ops      | Admin Financial And Health Ops      | internal_admin  | internal   | complete |
| /admin/outreach                             | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| /admin/presence                             | admin-financial-health-ops      | Admin Financial And Health Ops      | internal_admin  | internal   | complete |
| /admin/price-catalog                        | admin-price-catalog-ops         | Admin Price Catalog Ops             | internal_admin  | internal   | complete |
| /admin/pulse                                | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| /admin/reconciliation                       | admin-financial-health-ops      | Admin Financial And Health Ops      | internal_admin  | internal   | complete |
| /admin/referral-partners                    | admin-directory-moderation      | Admin Directory Moderation          | internal_admin  | internal   | complete |
| /admin/silent-failures                      | admin-financial-health-ops      | Admin Financial And Health Ops      | internal_admin  | internal   | complete |
| /admin/social                               | admin-communications-social     | Admin Communications And Social     | internal_admin  | internal   | complete |
| /admin/system                               | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| /admin/system/payments                      | admin-financial-health-ops      | Admin Financial And Health Ops      | internal_admin  | internal   | complete |
| /admin/users                                | admin-user-event-ops            | Admin User And Event Ops            | internal_admin  | internal   | complete |
| /admin/users/[chefId]                       | admin-user-event-ops            | Admin User And Event Ops            | internal_admin  | internal   | complete |
| /analytics                                  | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| /analytics/benchmarks                       | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| /analytics/client-ltv                       | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| /analytics/daily-report                     | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| /analytics/demand                           | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| /analytics/funnel                           | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| /analytics/pipeline                         | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| /analytics/referral-sources                 | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| /analytics/reports                          | custom-reports                  | Custom Reports                      | chef_privileged | gated      | complete |
| /auth/client-signup                         | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /auth/forgot-password                       | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /auth/partner-signup                        | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /auth/reset-password                        | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /auth/role-selection                        | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /auth/signin                                | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /auth/signup                                | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /auth/verify-email                          | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /availability                               | availability-broadcaster        | Availability Broadcaster            | chef_privileged | visible    | complete |
| /availability/[token]                       | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /beta                                       | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| /beta-survey                                | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| /beta-survey/[token]                        | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| /beta/thank-you                             | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| /book                                       | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /book-now                                   | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /book/[chefSlug]                            | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /book/[chefSlug]/thank-you                  | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /book/campaign/[token]                      | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /briefing                                   | morning-briefing                | Morning Briefing                    | chef_privileged | visible    | complete |
| /calendar                                   | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /calendar/day                               | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /calendar/share                             | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /calendar/week                              | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /calendar/year                              | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /calls                                      | calls-consultations             | Calls And Consultations             | chef_standard   | visible    | complete |
| /calls/[id]                                 | calls-consultations             | Calls And Consultations             | chef_standard   | visible    | complete |
| /calls/[id]/edit                            | calls-consultations             | Calls And Consultations             | chef_standard   | visible    | complete |
| /calls/new                                  | calls-consultations             | Calls And Consultations             | chef_standard   | visible    | complete |
| /cannabis                                   | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis-invite/[token]                    | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/about                             | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/agreement                         | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/compliance                        | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/control-packet/template           | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/events                            | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/events/[id]/control-packet        | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/handbook                          | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/hub                               | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/invite                            | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/ledger                            | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/public                            | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/rsvps                             | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /cannabis/unlock                            | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /charity                                    | charity-programs                | Charity Programs                    | chef_standard   | visible    | partial  |
| /charity/hours                              | charity-programs                | Charity Programs                    | chef_standard   | visible    | partial  |
| /chat                                       | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| /chat/[id]                                  | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| /chef/[slug]                                | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /chef/[slug]/dashboard                      | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /chef/[slug]/gift-cards                     | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /chef/[slug]/gift-cards/success             | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /chef/[slug]/inquire                        | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /chef/[slug]/partner-signup                 | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /chef/cannabis/handbook                     | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /chef/cannabis/rsvps                        | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /chefs                                      | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| /circles                                    | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /client/[token]                             | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /client/[token]/events                      | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /clients                                    | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/[id]                               | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/[id]/preferences                   | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /clients/[id]/recurring                     | recurring-service-programs      | Recurring Service Programs          | chef_privileged | visible    | complete |
| /clients/active                             | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/communication                      | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| /clients/communication/follow-ups           | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| /clients/communication/notes                | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| /clients/communication/upcoming-touchpoints | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| /clients/duplicates                         | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/gift-cards                         | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| /clients/history                            | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/history/event-history              | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/history/past-menus                 | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/history/spending-history           | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/inactive                           | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/insights                           | client-insights                 | Client Insights                     | chef_privileged | visible    | complete |
| /clients/insights/at-risk                   | client-insights                 | Client Insights                     | chef_privileged | visible    | complete |
| /clients/insights/most-frequent             | client-insights                 | Client Insights                     | chef_privileged | visible    | complete |
| /clients/insights/top-clients               | client-insights                 | Client Insights                     | chef_privileged | visible    | complete |
| /clients/intake                             | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /clients/loyalty                            | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /clients/loyalty/points                     | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /clients/loyalty/referrals                  | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /clients/loyalty/rewards                    | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /clients/new                                | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/preferences                        | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /clients/preferences/allergies              | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /clients/preferences/dietary-restrictions   | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /clients/preferences/dislikes               | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /clients/preferences/favorite-dishes        | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /clients/presence                           | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/recurring                          | recurring-service-programs      | Recurring Service Programs          | chef_privileged | visible    | complete |
| /clients/segments                           | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /clients/vip                                | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| /commands                                   | mission-control-launcher        | Mission Control Launcher            | developer_tool  | internal   | complete |
| /commerce                                   | commerce-register               | Commerce Register                   | chef_privileged | visible    | complete |
| /commerce/observability                     | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/orders                            | commerce-service-modes          | Commerce Service Modes              | chef_privileged | visible    | complete |
| /commerce/parity                            | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/products                          | commerce-catalog                | Commerce Catalog                    | chef_privileged | visible    | complete |
| /commerce/products/[id]                     | commerce-catalog                | Commerce Catalog                    | chef_privileged | visible    | complete |
| /commerce/products/new                      | commerce-catalog                | Commerce Catalog                    | chef_privileged | visible    | complete |
| /commerce/promotions                        | commerce-catalog                | Commerce Catalog                    | chef_privileged | visible    | complete |
| /commerce/reconciliation                    | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/reconciliation/[id]               | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/register                          | commerce-register               | Commerce Register                   | chef_privileged | visible    | complete |
| /commerce/reports                           | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/reports/shifts                    | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/sales                             | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/sales/[id]                        | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/schedules                         | commerce-service-modes          | Commerce Service Modes              | chef_privileged | visible    | complete |
| /commerce/settlements                       | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/settlements/[id]                  | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| /commerce/table-service                     | commerce-service-modes          | Commerce Service Modes              | chef_privileged | visible    | complete |
| /commerce/virtual-terminal                  | commerce-register               | Commerce Register                   | chef_privileged | visible    | complete |
| /community/templates                        | community-template-exchange     | Community Template Exchange         | chef_privileged | visible    | complete |
| /compare                                    | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /compare/[slug]                             | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /consulting                                 | consulting-toolkit              | Consulting Toolkit                  | chef_standard   | visible    | complete |
| /contact                                    | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /content                                    | content-pipeline                | Content Pipeline                    | chef_privileged | visible    | partial  |
| /contracts                                  | contracts-approvals             | Contracts And Approvals             | chef_privileged | visible    | complete |
| /contracts/[id]/history                     | contracts-approvals             | Contracts And Approvals             | chef_privileged | visible    | complete |
| /culinary                                   | culinary-home                   | Culinary Home                       | chef_standard   | visible    | complete |
| /culinary-board                             | culinary-ideation-board         | Culinary Ideation Board             | chef_standard   | visible    | complete |
| /culinary/components                        | culinary-components             | Culinary Components                 | chef_standard   | visible    | complete |
| /culinary/components/ferments               | culinary-components             | Culinary Components                 | chef_standard   | visible    | complete |
| /culinary/components/garnishes              | culinary-components             | Culinary Components                 | chef_standard   | visible    | complete |
| /culinary/components/sauces                 | culinary-components             | Culinary Components                 | chef_standard   | visible    | complete |
| /culinary/components/shared-elements        | culinary-components             | Culinary Components                 | chef_standard   | visible    | complete |
| /culinary/components/stocks                 | culinary-components             | Culinary Components                 | chef_standard   | visible    | complete |
| /culinary/costing                           | costing-suite                   | Costing Suite                       | chef_standard   | visible    | complete |
| /culinary/costing/food-cost                 | costing-suite                   | Costing Suite                       | chef_standard   | visible    | complete |
| /culinary/costing/menu                      | costing-suite                   | Costing Suite                       | chef_standard   | visible    | complete |
| /culinary/costing/recipe                    | costing-suite                   | Costing Suite                       | chef_standard   | visible    | complete |
| /culinary/costing/sales                     | costing-suite                   | Costing Suite                       | chef_standard   | visible    | complete |
| /culinary/dish-index                        | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| /culinary/dish-index/[id]                   | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| /culinary/dish-index/insights               | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| /culinary/ingredients                       | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| /culinary/ingredients/receipt-scan          | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| /culinary/ingredients/seasonal-availability | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| /culinary/ingredients/vendor-notes          | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| /culinary/menus                             | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /culinary/menus/[id]                        | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /culinary/menus/approved                    | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /culinary/menus/drafts                      | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /culinary/menus/engineering                 | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| /culinary/menus/scaling                     | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /culinary/menus/substitutions               | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /culinary/menus/templates                   | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /culinary/my-kitchen                        | culinary-home                   | Culinary Home                       | chef_standard   | visible    | complete |
| /culinary/prep                              | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| /culinary/prep/shopping                     | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| /culinary/prep/timeline                     | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| /culinary/price-catalog                     | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| /culinary/recipes                           | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /culinary/recipes/[id]                      | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /culinary/recipes/dietary-flags             | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /culinary/recipes/drafts                    | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /culinary/recipes/seasonal-notes            | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /culinary/recipes/tags                      | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /culinary/substitutions                     | culinary-components             | Culinary Components                 | chef_standard   | visible    | complete |
| /culinary/vendors                           | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| /customers                                  | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /customers/[slug]                           | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /daily                                      | daily-ops-planner               | Daily Ops Planner                   | chef_standard   | visible    | complete |
| /dashboard                                  | dashboard-command-center        | Dashboard Command Center            | chef_standard   | visible    | complete |
| /demo                                       | public-demo-mode                | Public Demo Mode                    | developer_tool  | gated      | complete |
| /dev/simulate                               | developer-simulation-lab        | Developer Simulation Lab            | developer_tool  | gated      | complete |
| /discover                                   | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| /discover/[slug]                            | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| /discover/[slug]/enhance                    | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| /discover/join                              | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| /discover/submit                            | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| /discover/unsubscribe                       | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| /documents                                  | documents-workspace             | Documents Workspace                 | chef_privileged | visible    | complete |
| /embed/inquiry/[chefId]                     | embed-inquiry-widget            | Embed Inquiry Widget                | chef_privileged | visible    | complete |
| /event/[eventId]/guest/[secureToken]        | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /events                                     | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]                                | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/aar                            | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| /events/[id]/close-out                      | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| /events/[id]/debrief                        | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/documents                      | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/dop/mobile                     | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| /events/[id]/edit                           | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/financial                      | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| /events/[id]/grocery-quote                  | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/guest-card                     | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/interactive                    | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/invoice                        | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| /events/[id]/kds                            | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| /events/[id]/pack                           | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/receipts                       | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| /events/[id]/schedule                       | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| /events/[id]/split-billing                  | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/story                          | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/[id]/travel                         | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/awaiting-deposit                    | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/board                               | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/cancelled                           | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/completed                           | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/confirmed                           | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /events/new                                 | event-intake-builders           | Event Intake Builders               | chef_standard   | visible    | complete |
| /events/new/from-text                       | event-intake-builders           | Event Intake Builders               | chef_standard   | visible    | complete |
| /events/new/wizard                          | event-intake-builders           | Event Intake Builders               | chef_standard   | visible    | complete |
| /events/upcoming                            | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| /expenses                                   | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /expenses/[id]                              | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /expenses/new                               | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /faq                                        | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /feedback                                   | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| /feedback/[token]                           | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| /feedback/dashboard                         | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| /feedback/requests                          | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| /finance                                    | finance-home                    | Finance Home                        | chef_standard   | visible    | complete |
| /finance/bank-feed                          | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| /finance/cash-flow                          | finance-home                    | Finance Home                        | chef_standard   | visible    | complete |
| /finance/contractors                        | finance-home                    | Finance Home                        | chef_standard   | visible    | complete |
| /finance/disputes                           | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /finance/expenses                           | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /finance/expenses/food-ingredients          | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /finance/expenses/labor                     | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /finance/expenses/marketing                 | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /finance/expenses/miscellaneous             | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /finance/expenses/rentals-equipment         | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /finance/expenses/software                  | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /finance/expenses/travel                    | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /finance/forecast                           | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /finance/goals                              | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /finance/invoices                           | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /finance/invoices/cancelled                 | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /finance/invoices/draft                     | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /finance/invoices/overdue                   | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /finance/invoices/paid                      | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /finance/invoices/refunded                  | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /finance/invoices/sent                      | invoicing-billing               | Invoicing And Billing               | chef_standard   | visible    | complete |
| /finance/ledger                             | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| /finance/ledger/adjustments                 | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| /finance/ledger/owner-draws                 | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| /finance/ledger/transaction-log             | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| /finance/overview                           | finance-home                    | Finance Home                        | chef_standard   | visible    | complete |
| /finance/overview/cash-flow                 | finance-home                    | Finance Home                        | chef_standard   | visible    | complete |
| /finance/overview/outstanding-payments      | finance-home                    | Finance Home                        | chef_standard   | visible    | complete |
| /finance/overview/revenue-summary           | finance-home                    | Finance Home                        | chef_standard   | visible    | complete |
| /finance/payments                           | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /finance/payments/deposits                  | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /finance/payments/failed                    | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /finance/payments/installments              | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /finance/payments/refunds                   | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /finance/payouts                            | payouts-reconciliation          | Payouts And Reconciliation          | chef_privileged | visible    | complete |
| /finance/payouts/manual-payments            | payouts-reconciliation          | Payouts And Reconciliation          | chef_privileged | visible    | complete |
| /finance/payouts/reconciliation             | payouts-reconciliation          | Payouts And Reconciliation          | chef_privileged | visible    | complete |
| /finance/payouts/stripe-payouts             | payouts-reconciliation          | Payouts And Reconciliation          | chef_privileged | visible    | complete |
| /finance/payroll                            | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| /finance/payroll/941                        | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| /finance/payroll/employees                  | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| /finance/payroll/run                        | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| /finance/payroll/w2                         | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| /finance/planning/break-even                | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /finance/plate-costs                        | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /finance/recurring                          | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /finance/reporting                          | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/reporting/expense-by-category      | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/reporting/profit-by-event          | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/reporting/profit-loss              | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/reporting/revenue-by-client        | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/reporting/revenue-by-event         | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/reporting/revenue-by-month         | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/reporting/tax-summary              | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/reporting/year-to-date-summary     | finance-reporting               | Finance Reporting                   | chef_privileged | visible    | complete |
| /finance/retainers                          | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /finance/retainers/[id]                     | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /finance/retainers/new                      | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /finance/sales-tax                          | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/sales-tax/remittances              | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/sales-tax/settings                 | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/tax                                | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/tax/1099-nec                       | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/tax/depreciation                   | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/tax/home-office                    | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/tax/quarterly                      | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/tax/retirement                     | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/tax/year-end                       | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /finance/year-end                           | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| /financials                                 | finance-home                    | Finance Home                        | chef_standard   | visible    | complete |
| /food-cost                                  | food-cost-operations            | Food Cost Operations                | chef_privileged | visible    | complete |
| /food-cost/revenue                          | food-cost-operations            | Food Cost Operations                | chef_privileged | visible    | complete |
| /for-operators                              | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /g/[code]                                   | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /goals                                      | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /goals/[id]/history                         | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /goals/revenue-path                         | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /goals/setup                                | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| /growth                                     | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| /guest-analytics                            | guest-analytics                 | Guest Analytics                     | chef_privileged | hidden     | complete |
| /guest-feedback/[token]                     | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| /guest-leads                                | guest-lead-pipeline             | Guest Lead Pipeline                 | chef_standard   | visible    | complete |
| /guests                                     | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| /guests/[id]                                | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| /guests/reservations                        | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| /help                                       | help-guidance                   | Help And Guidance                   | chef_standard   | visible    | complete |
| /help/[slug]                                | help-guidance                   | Help And Guidance                   | chef_standard   | visible    | complete |
| /hub/g/[groupToken]                         | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /hub/join/[groupToken]                      | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /hub/me/[profileToken]                      | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /import                                     | import-pipelines                | Import Pipelines                    | chef_standard   | visible    | complete |
| /import/csv                                 | import-pipelines                | Import Pipelines                    | chef_standard   | visible    | complete |
| /import/history                             | import-pipelines                | Import Pipelines                    | chef_standard   | visible    | complete |
| /import/mxp                                 | import-pipelines                | Import Pipelines                    | chef_standard   | visible    | complete |
| /inbox                                      | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| /inbox/history-scan                         | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| /inbox/triage                               | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| /inbox/triage/[threadId]                    | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| /inquiries                                  | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /inquiries/[id]                             | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /inquiries/awaiting-client-reply            | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /inquiries/awaiting-response                | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /inquiries/declined                         | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /inquiries/menu-drafting                    | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /inquiries/new                              | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /inquiries/sent-to-client                   | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| /insights                                   | insights-suite                  | Insights Suite                      | chef_privileged | visible    | complete |
| /insights/time-analysis                     | insights-suite                  | Insights Suite                      | chef_privileged | visible    | complete |
| /intake/[token]                             | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| /intelligence                               | intelligence-hub                | Intelligence Hub                    | chef_privileged | gated      | complete |
| /inventory                                  | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/audits                           | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/audits/[id]                      | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/audits/new                       | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/counts                           | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/demand                           | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/expiry                           | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/food-cost                        | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/ingredients/[id]                 | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/locations                        | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/procurement                      | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/purchase-orders                  | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/purchase-orders/[id]             | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/purchase-orders/new              | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/staff-meals                      | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/transactions                     | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/vendor-invoices                  | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /inventory/waste                            | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| /kiosk                                      | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /kiosk/disabled                             | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /kiosk/pair                                 | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| /kitchen                                    | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /leads                                      | website-leads                   | Website Leads                       | chef_privileged | hidden     | complete |
| /leads/archived                             | website-leads                   | Website Leads                       | chef_privileged | hidden     | complete |
| /leads/contacted                            | website-leads                   | Website Leads                       | chef_privileged | hidden     | complete |
| /leads/converted                            | website-leads                   | Website Leads                       | chef_privileged | hidden     | complete |
| /leads/new                                  | website-leads                   | Website Leads                       | chef_privileged | hidden     | complete |
| /leads/qualified                            | website-leads                   | Website Leads                       | chef_privileged | hidden     | complete |
| /loyalty                                    | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /loyalty/learn                              | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /loyalty/raffle                             | monthly-raffle                  | Monthly Raffle                      | chef_privileged | gated      | complete |
| /loyalty/raffle/[id]                        | monthly-raffle                  | Monthly Raffle                      | chef_privileged | gated      | complete |
| /loyalty/rewards/new                        | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /loyalty/settings                           | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /marketing                                  | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /marketing/[id]                             | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /marketing/content-pipeline                 | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /marketing/push-dinners                     | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /marketing/push-dinners/[id]                | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /marketing/push-dinners/new                 | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /marketing/sequences                        | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /marketing/templates                        | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /marketplace                                | marketplace-command-center      | Marketplace Command Center          | chef_privileged | visible    | complete |
| /marketplace-chefs                          | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /marketplace/capture                        | marketplace-capture-ingestion   | Marketplace Capture And Ingestion   | chef_privileged | hidden     | partial  |
| /meal-prep                                  | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| /meal-prep/[programId]                      | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| /menus                                      | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /menus/[id]                                 | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /menus/[id]/editor                          | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /menus/dishes                               | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /menus/estimate                             | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /menus/new                                  | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /menus/tasting                              | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /menus/upload                               | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /my-bookings                                | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-cannabis                                | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| /my-chat                                    | client-portal-account           | Client Portal Account               | chef_standard   | visible    | complete |
| /my-chat/[id]                               | client-portal-account           | Client Portal Account               | chef_standard   | visible    | complete |
| /my-events                                  | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]                             | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/approve-menu                | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/choose-menu                 | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/contract                    | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/countdown                   | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/event-summary               | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/invoice                     | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/pay                         | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/payment-plan                | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/pre-event-checklist         | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/[id]/proposal                    | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/history                          | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-events/settings/dashboard               | client-portal-events            | Client Portal Events                | chef_standard   | visible    | complete |
| /my-hub                                     | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /my-hub/create                              | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /my-hub/friends                             | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /my-hub/friends/invite/[profileToken]       | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /my-hub/g/[groupToken]                      | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /my-hub/notifications                       | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /my-hub/share-chef                          | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| /my-inquiries                               | client-portal-account           | Client Portal Account               | chef_standard   | visible    | complete |
| /my-inquiries/[id]                          | client-portal-account           | Client Portal Account               | chef_standard   | visible    | complete |
| /my-profile                                 | client-portal-account           | Client Portal Account               | chef_standard   | visible    | complete |
| /my-quotes                                  | client-portal-account           | Client Portal Account               | chef_standard   | visible    | complete |
| /my-quotes/[id]                             | client-portal-account           | Client Portal Account               | chef_standard   | visible    | complete |
| /my-rewards                                 | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /my-rewards/about                           | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| /my-spending                                | client-portal-account           | Client Portal Account               | chef_standard   | visible    | complete |
| /network                                    | network-community               | Network And Community               | chef_privileged | visible    | complete |
| /network/[chefId]                           | network-community               | Network And Community               | chef_privileged | visible    | complete |
| /network/bridges/[bridgeId]                 | network-community               | Network And Community               | chef_privileged | visible    | complete |
| /network/channels/[slug]                    | network-community               | Network And Community               | chef_privileged | visible    | complete |
| /network/collabs                            | network-community               | Network And Community               | chef_privileged | visible    | complete |
| /network/collabs/[spaceId]                  | network-community               | Network And Community               | chef_privileged | visible    | complete |
| /network/notifications                      | network-community               | Network And Community               | chef_privileged | visible    | complete |
| /network/saved                              | network-community               | Network And Community               | chef_privileged | visible    | complete |
| /notifications                              | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /nutrition/[menuId]                         | nutrition-analysis              | Nutrition Analysis                  | chef_privileged | gated      | complete |
| /onboarding                                 | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /onboarding/[token]                         | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /onboarding/clients                         | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /onboarding/loyalty                         | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /onboarding/recipes                         | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /onboarding/staff                           | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /operations                                 | dashboard-command-center        | Dashboard Command Center            | chef_standard   | visible    | complete |
| /operations/equipment                       | operations-equipment            | Operations And Equipment            | chef_standard   | visible    | complete |
| /operations/kitchen-rentals                 | operations-equipment            | Operations And Equipment            | chef_standard   | visible    | complete |
| /partner-report/[token]                     | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partner-signup                             | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partner/dashboard                          | partner-portal                  | Partner Portal                      | chef_privileged | gated      | complete |
| /partner/events                             | partner-portal                  | Partner Portal                      | chef_privileged | gated      | complete |
| /partner/locations                          | partner-portal                  | Partner Portal                      | chef_privileged | gated      | complete |
| /partner/locations/[id]                     | partner-portal                  | Partner Portal                      | chef_privileged | gated      | complete |
| /partner/preview                            | partner-portal                  | Partner Portal                      | chef_privileged | gated      | complete |
| /partner/profile                            | partner-portal                  | Partner Portal                      | chef_privileged | gated      | complete |
| /partners                                   | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partners/[id]                              | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partners/[id]/edit                         | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partners/[id]/report                       | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partners/active                            | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partners/events-generated                  | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partners/inactive                          | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partners/new                               | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /partners/referral-performance              | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| /payments/splitting                         | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /portfolio                                  | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| /prices                                     | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| /prices/store/[storeId]                     | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| /print/menu/[id]                            | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /privacy                                    | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /privacy-policy                             | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /production                                 | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /proposal/[token]                           | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /proposals                                  | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| /proposals/addons                           | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| /proposals/builder                          | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| /proposals/templates                        | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| /prospecting                                | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /prospecting/[id]                           | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /prospecting/clusters                       | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /prospecting/import                         | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /prospecting/openclaw                       | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /prospecting/pipeline                       | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /prospecting/queue                          | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /prospecting/scripts                        | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /prospecting/scrub                          | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| /queue                                      | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| /quotes                                     | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/[id]                                | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/[id]/edit                           | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/accepted                            | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/draft                               | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/expired                             | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/new                                 | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/rejected                            | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/sent                                | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /quotes/viewed                              | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| /rate-card                                  | rate-card                       | Rate Card                           | chef_privileged | visible    | complete |
| /reactivate-account                         | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /receipts                                   | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| /recipes                                    | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /recipes/[id]                               | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /recipes/[id]/edit                          | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /recipes/dump                               | recipe-capture-import           | Recipe Capture And Import           | chef_standard   | visible    | complete |
| /recipes/import                             | recipe-capture-import           | Recipe Capture And Import           | chef_standard   | visible    | complete |
| /recipes/ingredients                        | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /recipes/new                                | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /recipes/photos                             | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /recipes/production-log                     | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| /recipes/sprint                             | recipe-capture-import           | Recipe Capture And Import           | chef_standard   | visible    | complete |
| /remy                                       | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /reports                                    | custom-reports                  | Custom Reports                      | chef_privileged | gated      | complete |
| /reputation/mentions                        | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| /review/[token]                             | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| /reviews                                    | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| /safety/backup-chef                         | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /safety/claims                              | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /safety/claims/documents                    | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /safety/claims/new                          | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /safety/incidents                           | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /safety/incidents/[id]                      | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /safety/incidents/new                       | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /schedule                                   | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /scheduling                                 | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| /settings                                   | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/ai-privacy                        | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /settings/api-keys                          | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /settings/appearance                        | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/automations                       | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| /settings/billing                           | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/calendar-sync                     | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /settings/change-password                   | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/client-preview                    | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /settings/communication                     | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/compliance                        | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/compliance/gdpr                   | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/compliance/haccp                  | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/contracts                         | contracts-approvals             | Contracts And Approvals             | chef_privileged | visible    | complete |
| /settings/credentials                       | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/culinary-profile                  | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| /settings/custom-fields                     | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/dashboard                         | dashboard-command-center        | Dashboard Command Center            | chef_standard   | visible    | complete |
| /settings/delete-account                    | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /settings/devices                           | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/embed                             | embed-inquiry-widget            | Embed Inquiry Widget                | chef_privileged | visible    | complete |
| /settings/emergency                         | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/event-types                       | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| /settings/favorite-chefs                    | favorite-chef-curation          | Favorite Chef Curation              | chef_standard   | visible    | complete |
| /settings/health                            | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/highlights                        | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| /settings/incidents                         | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/integrations                      | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /settings/journal                           | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/journal/[id]                      | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/journey                           | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/journey/[id]                      | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/menu-engine                       | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| /settings/menu-templates                    | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| /settings/modules                           | module-gating-and-focus-mode    | Module Gating And Focus Mode        | chef_privileged | hidden     | complete |
| /settings/my-profile                        | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/my-services                       | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/navigation                        | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/notifications                     | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| /settings/payment-methods                   | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/platform-connections              | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /settings/portfolio                         | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| /settings/pricing                           | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/print                             | documents-workspace             | Documents Workspace                 | chef_privileged | visible    | complete |
| /settings/professional                      | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| /settings/professional/momentum             | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| /settings/professional/skills               | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| /settings/profile                           | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/protection                        | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/protection/business-health        | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/protection/certifications         | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/protection/continuity             | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/protection/crisis                 | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/protection/insurance              | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/protection/nda                    | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/protection/portfolio-removal      | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| /settings/public-profile                    | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| /settings/remy                              | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| /settings/repertoire                        | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| /settings/repertoire/[id]                   | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| /settings/store-preferences                 | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/stripe-connect                    | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /settings/taxonomy                          | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/templates                         | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| /settings/touchpoints                       | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| /settings/webhooks                          | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /settings/yelp                              | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /settings/zapier                            | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| /share/[token]                              | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /share/[token]/recap                        | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /social                                     | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/calendar                            | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/compose/[eventId]                   | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/connections                         | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/hub-overview                        | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/planner                             | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/planner/[month]                     | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/posts/[id]                          | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/settings                            | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/templates                           | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /social/vault                               | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| /staff                                      | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /staff-dashboard                            | public-staff-experience         | Public Staff Experience             | chef_standard   | gated      | complete |
| /staff-login                                | public-staff-experience         | Public Staff Experience             | chef_standard   | gated      | complete |
| /staff-portal/[id]                          | public-staff-experience         | Public Staff Experience             | chef_standard   | gated      | complete |
| /staff-recipes                              | public-staff-experience         | Public Staff Experience             | chef_standard   | gated      | complete |
| /staff-schedule                             | public-staff-experience         | Public Staff Experience             | chef_standard   | gated      | complete |
| /staff-station                              | public-staff-experience         | Public Staff Experience             | chef_standard   | gated      | complete |
| /staff-tasks                                | public-staff-experience         | Public Staff Experience             | chef_standard   | gated      | complete |
| /staff-time                                 | public-staff-experience         | Public Staff Experience             | chef_standard   | gated      | complete |
| /staff/[id]                                 | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /staff/availability                         | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /staff/clock                                | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /staff/labor                                | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /staff/live                                 | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /staff/performance                          | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /staff/schedule                             | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| /stations                                   | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /stations/[id]                              | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /stations/[id]/clipboard                    | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /stations/[id]/clipboard/print              | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /stations/daily-ops                         | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /stations/ops-log                           | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /stations/orders                            | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /stations/orders/print                      | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /stations/waste                             | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| /survey/[token]                             | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| /surveys                                    | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| /tasks                                      | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| /tasks/gantt                                | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| /tasks/templates                            | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| /tasks/va                                   | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| /team                                       | team-collaboration              | Team Collaboration                  | chef_privileged | hidden     | complete |
| /terms                                      | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /testimonials                               | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| /tip/[token]                                | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| /travel                                     | travel-production               | Travel And Production               | chef_standard   | visible    | complete |
| /trust                                      | public-brand-marketing-site     | Public Brand Marketing Site         | chef_standard   | visible    | complete |
| /unauthorized                               | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| /unsubscribe                                | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| /vendors                                    | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| /vendors/[id]                               | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| /vendors/invoices                           | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| /vendors/price-comparison                   | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| /view/[token]                               | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| /waitlist                                   | waitlist-management             | Waitlist Management                 | chef_standard   | hidden     | complete |
| /wix-submissions                            | wix-processing                  | Wix Processing                      | internal_only   | internal   | complete |
| /wix-submissions/[id]                       | wix-processing                  | Wix Processing                      | internal_only   | internal   | complete |
| /worksheet/[token]                          | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |

## Unmatched Routes

No unmatched page routes.
