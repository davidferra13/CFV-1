# ChefFlow Feature Schema Map

This appendix maps database tables from `clean-schema.sql` to the dominant feature they imply. Schema mappings are capability inference rather than strict ownership and are meant to surface hidden systems that may not have first-class UI.

Summary:

- total tables: 614
- mapped tables: 614 (100.0%)
- unmatched tables: 0 (0.0%)

## Table Map

| table                                   | feature id                      | feature name                        | classification  | visibility | status   |
| --------------------------------------- | ------------------------------- | ----------------------------------- | --------------- | ---------- | -------- |
| ab_tests                                | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| account_deletion_audit                  | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| activity_events                         | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| activity_events_archive                 | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| admin_audit_log                         | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| admin_time_logs                         | admin-platform-overview         | Admin Platform Overview             | internal_admin  | internal   | complete |
| after_action_reviews                    | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| ai_preferences                          | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| ai_task_queue                           | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| aisle_preferences                       | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| audit_log                               | founder-command-hub             | Founder Command Hub                 | developer_tool  | gated      | complete |
| automated_sequences                     | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| automation_execution_log                | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| automation_executions                   | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| automation_rules                        | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| availability_signal_notification_log    | availability-broadcaster        | Availability Broadcaster            | chef_privileged | visible    | complete |
| bake_schedule                           | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bakery_batches                          | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bakery_orders                           | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bakery_ovens                            | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bakery_par_stock                        | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bakery_production_log                   | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bakery_seasonal_items                   | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bakery_tastings                         | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bakery_yield_records                    | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| bank_connections                        | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| bank_transactions                       | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| benchmark_snapshots                     | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| beta_signup_trackers                    | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| beta_signups                            | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| beta_survey_definitions                 | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| beta_survey_invites                     | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| beta_survey_responses                   | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| beverages                               | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| booking_availability_rules              | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| booking_daily_caps                      | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| booking_date_overrides                  | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| booking_event_types                     | public-booking-funnels          | Public Booking Funnels              | chef_standard   | visible    | complete |
| business_locations                      | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| campaign_recipients                     | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| campaign_templates                      | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| cancellation_policies                   | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| cannabis_control_packet_evidence        | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| cannabis_control_packet_reconciliations | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| cannabis_control_packet_snapshots       | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| cannabis_event_details                  | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| cannabis_host_agreements                | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| cannabis_tier_invitations               | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| cannabis_tier_users                     | cannabis-vertical               | Cannabis Vertical                   | chef_privileged | visible    | complete |
| cash_drawer_movements                   | commerce-register               | Commerce Register                   | chef_privileged | visible    | complete |
| charity_hours                           | charity-programs                | Charity Programs                    | chef_standard   | visible    | partial  |
| chat_messages                           | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| chef_activity_log                       | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| chef_api_keys                           | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| chef_automation_settings                | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| chef_availability_blocks                | availability-broadcaster        | Availability Broadcaster            | chef_privileged | visible    | complete |
| chef_availability_share_tokens          | availability-broadcaster        | Availability Broadcaster            | chef_privileged | visible    | complete |
| chef_availability_signals               | availability-broadcaster        | Availability Broadcaster            | chef_privileged | visible    | complete |
| chef_backup_contacts                    | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| chef_brand_mentions                     | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| chef_breadcrumbs                        | activity-queue                  | Activity And Queue                  | chef_standard   | visible    | complete |
| chef_budgets                            | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| chef_business_health_items              | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| chef_calendar_entries                   | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| chef_capability_inventory               | rate-card                       | Rate Card                           | chef_privileged | visible    | complete |
| chef_capacity_settings                  | availability-broadcaster        | Availability Broadcaster            | chef_privileged | visible    | complete |
| chef_certifications                     | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| chef_channel_memberships                | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| chef_comment_reactions                  | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| chef_connections                        | network-community               | Network And Community               | chef_privileged | visible    | complete |
| chef_creative_projects                  | culinary-ideation-board         | Culinary Ideation Board             | chef_standard   | visible    | complete |
| chef_crisis_plans                       | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| chef_culinary_profiles                  | culinary-home                   | Culinary Home                       | chef_standard   | visible    | complete |
| chef_culinary_words                     | culinary-ideation-board         | Culinary Ideation Board             | chef_standard   | visible    | complete |
| chef_daily_briefings                    | morning-briefing                | Morning Briefing                    | chef_privileged | visible    | complete |
| chef_deposit_settings                   | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| chef_directory_listings                 | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| chef_documents                          | documents-workspace             | Documents Workspace                 | chef_privileged | visible    | complete |
| chef_education_log                      | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| chef_emergency_contacts                 | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| chef_equipment                          | operations-equipment            | Operations And Equipment            | chef_standard   | visible    | complete |
| chef_equipment_master                   | operations-equipment            | Operations And Equipment            | chef_standard   | visible    | complete |
| chef_event_type_labels                  | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| chef_feature_flags                      | feature-flag-and-tier-system    | Feature Flag And Tier System        | internal_only   | internal   | complete |
| chef_feedback                           | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| chef_folders                            | documents-workspace             | Documents Workspace                 | chef_privileged | visible    | complete |
| chef_follows                            | network-community               | Network And Community               | chef_privileged | visible    | complete |
| chef_goals                              | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| chef_growth_checkins                    | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| chef_handoff_events                     | team-collaboration              | Team Collaboration                  | chef_privileged | hidden     | complete |
| chef_handoff_recipients                 | team-collaboration              | Team Collaboration                  | chef_privileged | hidden     | complete |
| chef_handoffs                           | team-collaboration              | Team Collaboration                  | chef_privileged | hidden     | complete |
| chef_incidents                          | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| chef_insurance_policies                 | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| chef_journal_media                      | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| chef_journal_recipe_links               | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| chef_journey_entries                    | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| chef_journey_ideas                      | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| chef_journeys                           | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| chef_marketplace_profiles               | marketplace-command-center      | Marketplace Command Center          | chef_privileged | visible    | complete |
| chef_momentum_snapshots                 | growth-hub                      | Growth Hub                          | chef_standard   | visible    | complete |
| chef_network_contact_shares             | network-community               | Network And Community               | chef_privileged | visible    | complete |
| chef_network_feature_preferences        | network-community               | Network And Community               | chef_privileged | visible    | complete |
| chef_network_posts                      | network-community               | Network And Community               | chef_privileged | visible    | complete |
| chef_portfolio_removal_requests         | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| chef_post_comments                      | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_post_hashtags                      | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_post_mentions                      | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_post_reactions                     | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_post_saves                         | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_preferences                        | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| chef_preferred_stores                   | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| chef_profiles                           | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| chef_reminders                          | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| chef_scheduling_rules                   | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| chef_seasonal_availability              | availability-broadcaster        | Availability Broadcaster            | chef_privileged | visible    | complete |
| chef_service_types                      | rate-card                       | Rate Card                           | chef_privileged | visible    | complete |
| chef_social_channels                    | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_social_hashtags                    | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_social_notifications               | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_social_posts                       | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| chef_stories                            | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| chef_story_reactions                    | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| chef_story_views                        | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| chef_team_members                       | team-collaboration              | Team Collaboration                  | chef_privileged | hidden     | complete |
| chef_todos                              | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| chef_trusted_circle                     | network-community               | Network And Community               | chef_privileged | visible    | complete |
| chefs                                   | public-chef-marketplace         | Public Chef Marketplace             | chef_standard   | visible    | complete |
| class_registrations                     | cooking-classes                 | Cooking Classes                     | chef_standard   | hidden     | partial  |
| client_allergy_records                  | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| client_connections                      | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| client_followup_rules                   | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| client_gift_log                         | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| client_incentives                       | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| client_intake_forms                     | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| client_intake_responses                 | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| client_intake_shares                    | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| client_invitations                      | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| client_kitchen_inventory                | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| client_meal_prep_preferences            | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| client_meal_requests                    | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| client_ndas                             | contracts-approvals             | Contracts And Approvals             | chef_privileged | visible    | complete |
| client_notes                            | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| client_outreach_log                     | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| client_photos                           | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| client_preference_patterns              | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| client_preferences                      | client-preferences-intake       | Client Preferences And Intake       | chef_standard   | visible    | complete |
| client_quick_requests                   | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| client_referrals                        | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| client_reviews                          | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| client_satisfaction_surveys             | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| client_segments                         | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| client_tags                             | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| clients                                 | client-crm                      | Client CRM                          | chef_standard   | visible    | complete |
| clipboard_entries                       | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| commerce_dining_checks                  | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| commerce_dining_tables                  | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| commerce_dining_zones                   | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| commerce_payment_schedules              | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| commerce_payments                       | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| commerce_promotions                     | commerce-catalog                | Commerce Catalog                    | chef_privileged | visible    | complete |
| commerce_refunds                        | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| communication_action_log                | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| communication_classification_rules      | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| communication_events                    | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| communication_log                       | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| community_benchmarks                    | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| community_messages                      | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| community_profiles                      | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| community_templates                     | community-template-exchange     | Community Template Exchange         | chef_privileged | visible    | complete |
| competitor_benchmarks                   | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| compliance_cleaning_logs                | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| compliance_temp_logs                    | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| components                              | culinary-components             | Culinary Components                 | chef_standard   | visible    | complete |
| contact_submissions                     | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| container_inventory                     | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| container_transactions                  | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| content_performance                     | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| contract_templates                      | contracts-approvals             | Contracts And Approvals             | chef_privileged | visible    | complete |
| contractor_payments                     | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| contractor_service_agreements           | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| conversation_participants               | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| conversation_thread_reads               | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| conversation_threads                    | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| conversations                           | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| cooking_classes                         | cooking-classes                 | Cooking Classes                     | chef_standard   | hidden     | partial  |
| copilot_actions                         | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| copilot_recommendations                 | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| copilot_run_errors                      | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| copilot_runs                            | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| cron_executions                         | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| custom_field_definitions                | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| custom_field_values                     | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| daily_plan_dismissals                   | daily-ops-planner               | Daily Ops Planner                   | chef_standard   | visible    | complete |
| daily_plan_drafts                       | daily-ops-planner               | Daily Ops Planner                   | chef_standard   | visible    | complete |
| daily_reconciliation_reports            | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| daily_reports                           | daily-ops-planner               | Daily Ops Planner                   | chef_standard   | visible    | complete |
| daily_revenue                           | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| daily_specials                          | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| daily_tax_summary                       | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| dead_letter_queue                       | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| demand_forecasts                        | food-cost-operations            | Food Cost Operations                | chef_privileged | visible    | complete |
| device_events                           | mobile-portal-surfaces          | Mobile Portal Surfaces              | chef_privileged | hidden     | partial  |
| device_sessions                         | mobile-portal-surfaces          | Mobile Portal Surfaces              | chef_privileged | hidden     | partial  |
| devices                                 | mobile-portal-surfaces          | Mobile Portal Surfaces              | chef_privileged | hidden     | partial  |
| dietary_change_log                      | nutrition-analysis              | Nutrition Analysis                  | chef_privileged | gated      | complete |
| dietary_confirmations                   | nutrition-analysis              | Nutrition Analysis                  | chef_privileged | gated      | complete |
| dietary_conflict_alerts                 | nutrition-analysis              | Nutrition Analysis                  | chef_privileged | gated      | complete |
| direct_outreach_log                     | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| dish_appearances                        | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| dish_feedback                           | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| dish_index                              | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| dish_variations                         | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| dishes                                  | menu-engineering                | Menu Engineering                    | chef_privileged | visible    | complete |
| display_case_items                      | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| document_comments                       | documents-workspace             | Documents Workspace                 | chef_privileged | visible    | complete |
| document_intelligence_items             | document-intelligence           | Document Intelligence               | internal_only   | internal   | partial  |
| document_intelligence_jobs              | document-intelligence           | Document Intelligence               | internal_only   | internal   | partial  |
| document_versions                       | documents-workspace             | Documents Workspace                 | chef_privileged | visible    | complete |
| dop_task_completions                    | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| email_sender_reputation                 | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| email_sequence_enrollments              | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| email_sequence_steps                    | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| email_sequences                         | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| employees                               | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| entity_photos                           | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| entity_templates                        | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| equipment_depreciation_schedules        | operations-equipment            | Operations And Equipment            | chef_standard   | visible    | complete |
| equipment_items                         | operations-equipment            | Operations And Equipment            | chef_standard   | visible    | complete |
| equipment_rentals                       | operations-equipment            | Operations And Equipment            | chef_standard   | visible    | complete |
| event_alcohol_logs                      | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_cannabis_course_config            | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_cannabis_settings                 | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_collaborators                     | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_contingency_notes                 | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_contract_signers                  | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_contract_versions                 | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_contracts                         | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_document_generation_jobs          | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_document_snapshots                | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_equipment_assignments             | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_equipment_checklist               | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_equipment_rentals                 | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_feedback                          | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| event_floor_plans                       | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_guest_dietary_items               | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_guest_rsvp_audit                  | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_guests                            | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_join_requests                     | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_leftover_details                  | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_live_status                       | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_photos                            | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_prep_blocks                       | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_prep_steps                        | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_readiness_gates                   | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_safety_checklists                 | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_sales_tax                         | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_series                            | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_service_sessions                  | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_share_invite_events               | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_share_invites                     | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_shares                            | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_site_assessments                  | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_staff_assignments                 | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_state_transitions                 | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_station_assignments               | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_stubs                             | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_surveys                           | event-closeout                  | Event Closeout                      | chef_standard   | visible    | complete |
| event_temp_logs                         | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_templates                         | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_themes                            | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_tips                              | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_travel_legs                       | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_vendor_deliveries                 | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| event_waste_logs                        | event-run-of-show               | Event Run Of Show                   | chef_standard   | visible    | complete |
| events                                  | event-workspace                 | Event Workspace                     | chef_standard   | visible    | complete |
| expense_tax_categories                  | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| expenses                                | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| experience_packages                     | rate-card                       | Rate Card                           | chef_privileged | visible    | complete |
| external_review_sources                 | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| external_reviews                        | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| favorite_chefs                          | favorite-chef-curation          | Favorite Chef Curation              | chef_standard   | visible    | complete |
| feature_requests                        | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| feature_votes                           | public-beta-program             | Public Beta Program                 | chef_standard   | visible    | complete |
| feedback_requests                       | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| feedback_responses                      | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| fermentation_logs                       | culinary-home                   | Culinary Home                       | chef_standard   | visible    | complete |
| fine_tuning_examples                    | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| follow_up_timers                        | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| followup_rules                          | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| front_of_house_menus                    | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| gift_card_purchase_intents              | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| gift_card_transactions                  | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| gift_cards                              | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| gift_certificates                       | gift-cards-vouchers             | Gift Cards And Vouchers             | chef_standard   | visible    | complete |
| gmail_historical_findings               | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| gmail_sync_log                          | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| goal_check_ins                          | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| goal_client_suggestions                 | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| goal_snapshots                          | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| google_connections                      | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| google_mailboxes                        | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| grocery_price_entries                   | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| grocery_price_quote_items               | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| grocery_price_quotes                    | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| grocery_spend_entries                   | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| grocery_trip_items                      | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| grocery_trip_splits                     | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| grocery_trips                           | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| guest_communication_logs                | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guest_comps                             | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guest_event_profile                     | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guest_leads                             | guest-lead-pipeline             | Guest Lead Pipeline                 | chef_standard   | visible    | complete |
| guest_messages                          | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guest_photos                            | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guest_reservations                      | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guest_tags                              | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guest_testimonials                      | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guest_visits                            | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| guests                                  | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| haccp_plans                             | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| health_insurance_premiums               | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| household_members                       | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| households                              | guest-crm                       | Guest CRM                           | chef_standard   | hidden     | complete |
| hub_availability                        | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_availability_responses              | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_chef_recommendations                | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_group_events                        | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_group_members                       | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_groups                              | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_guest_event_history                 | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_guest_friends                       | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_guest_profiles                      | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_media                               | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_message_reactions                   | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_messages                            | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_pinned_notes                        | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_poll_options                        | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_poll_votes                          | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| hub_polls                               | dinner-circles-social-hub       | Dinner Circles Social Hub           | chef_standard   | visible    | complete |
| incentive_deliveries                    | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| incentive_redemptions                   | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| ingredient_price_history                | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| ingredient_shelf_life_defaults          | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| ingredients                             | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| inquiries                               | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| inquiry_notes                           | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| inquiry_recipe_links                    | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| inquiry_state_transitions               | inquiry-pipeline                | Inquiry Pipeline                    | chef_standard   | visible    | complete |
| insurance_claims                        | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| insurance_policies                      | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| integration_connections                 | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| integration_entity_links                | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| integration_events                      | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| integration_field_mappings              | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| integration_sync_jobs                   | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| inventory_audit_items                   | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| inventory_audits                        | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| inventory_batches                       | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| inventory_counts                        | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| inventory_lots                          | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| inventory_transactions                  | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| job_retry_log                           | background-job-orchestrator     | Background Job Orchestrator         | internal_only   | internal   | complete |
| kds_tickets                             | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| kitchen_rentals                         | operations-equipment            | Operations And Equipment            | chef_standard   | visible    | complete |
| learning_goals                          | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| ledger_entries                          | ledger-accounting               | Ledger And Accounting               | chef_privileged | visible    | complete |
| loyalty_config                          | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| loyalty_reward_redemptions              | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| loyalty_rewards                         | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| loyalty_transactions                    | loyalty-rewards                 | Loyalty Rewards                     | chef_privileged | visible    | complete |
| marketing_campaigns                     | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| marketing_spend_log                     | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| marketplace_client_links                | marketplace-command-center      | Marketplace Command Center          | chef_privileged | visible    | complete |
| marketplace_profiles                    | marketplace-command-center      | Marketplace Command Center          | chef_privileged | visible    | complete |
| meal_prep_batch_log                     | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| meal_prep_deliveries                    | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| meal_prep_items                         | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| meal_prep_orders                        | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| meal_prep_programs                      | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| meal_prep_windows                       | meal-prep-operations            | Meal Prep Operations                | chef_privileged | visible    | complete |
| mentorship_connections                  | mentorship-exchange             | Mentorship Exchange                 | chef_standard   | hidden     | partial  |
| mentorship_profiles                     | mentorship-exchange             | Mentorship Exchange                 | chef_standard   | hidden     | partial  |
| menu_approval_requests                  | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| menu_beverage_pairings                  | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| menu_modifications                      | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| menu_preferences                        | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| menu_service_history                    | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| menu_state_transitions                  | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| menu_templates                          | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| menu_upload_jobs                        | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| menus                                   | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| messages                                | inbox-and-chat                  | Inbox And Chat                      | chef_standard   | visible    | complete |
| mileage_logs                            | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| mutation_idempotency                    | api-service-layer               | API Service Layer                   | internal_only   | internal   | complete |
| newsletter_subscribers                  | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| notification_delivery_log               | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| notification_preferences                | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| notifications                           | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| onboarding_progress                     | auth-and-onboarding             | Auth And Onboarding                 | chef_standard   | visible    | complete |
| ops_log                                 | daily-ops-planner               | Daily Ops Planner                   | chef_standard   | visible    | complete |
| order_queue                             | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| order_requests                          | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| outreach_campaigns                      | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| packing_checklist_items                 | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| packing_checklists                      | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| packing_confirmations                   | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| packing_templates                       | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| pantry_items                            | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| pantry_locations                        | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| partner_images                          | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| partner_locations                       | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| payment_disputes                        | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| payment_plan_installments               | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| payroll_941_summaries                   | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| payroll_records                         | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| payroll_w2_summaries                    | payroll-contractors             | Payroll And Contractors             | chef_privileged | visible    | complete |
| permits                                 | safety-protection               | Safety And Protection               | chef_privileged | visible    | complete |
| platform_action_log                     | founder-command-hub             | Founder Command Hub                 | developer_tool  | gated      | complete |
| platform_fee_ledger                     | payouts-reconciliation          | Payouts And Reconciliation          | chef_privileged | visible    | complete |
| platform_payouts                        | payouts-reconciliation          | Payouts And Reconciliation          | chef_privileged | visible    | complete |
| platform_records                        | founder-command-hub             | Founder Command Hub                 | developer_tool  | gated      | complete |
| platform_settings                       | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| platform_snapshots                      | founder-command-hub             | Founder Command Hub                 | developer_tool  | gated      | complete |
| plating_guides                          | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| portfolio_items                         | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| pos_alert_events                        | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| pos_metric_snapshots                    | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| product_modifier_assignments            | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| product_modifier_groups                 | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| product_modifiers                       | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| product_projections                     | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| product_public_media_links              | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| professional_achievements               | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| profile_highlights                      | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| proposal_addon_selections               | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| proposal_addons                         | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| proposal_sections                       | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| proposal_templates                      | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| proposal_tokens                         | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| proposal_views                          | proposals-addons                | Proposals And Add Ons               | chef_privileged | visible    | complete |
| prospect_call_scripts                   | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| prospect_notes                          | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| prospect_outreach_log                   | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| prospect_scrub_sessions                 | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| prospect_stage_history                  | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| prospects                               | prospecting-engine              | Prospecting Engine                  | chef_privileged | visible    | complete |
| public_data_source_logs                 | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| public_food_recall_snapshots            | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| public_ingredient_references            | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| public_location_references              | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| public_media_assets                     | portfolio-public-assets         | Portfolio And Public Assets         | chef_privileged | visible    | complete |
| public_product_references               | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| public_weather_risk_snapshots           | public-food-discovery-directory | Public Food Discovery Directory     | chef_standard   | visible    | complete |
| purchase_order_items                    | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| purchase_orders                         | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| push_subscriptions                      | realtime-push-fabric            | Realtime Push Fabric                | internal_only   | internal   | complete |
| qol_metric_events                       | platform-health-monitoring      | Platform Health Monitoring          | internal_only   | internal   | complete |
| qr_codes                                | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| qr_scans                                | kiosk-device-fleet              | Kiosk Device Fleet                  | chef_privileged | visible    | complete |
| quote_addons                            | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| quote_line_items                        | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| quote_selected_addons                   | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| quote_state_transitions                 | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| quotes                                  | quote-workbench                 | Quote Workbench                     | chef_standard   | visible    | complete |
| raffle_entries                          | monthly-raffle                  | Monthly Raffle                      | chef_privileged | gated      | complete |
| raffle_rounds                           | monthly-raffle                  | Monthly Raffle                      | chef_privileged | gated      | complete |
| rebook_tokens                           | marketplace-command-center      | Marketplace Command Center          | chef_privileged | visible    | complete |
| receipt_extractions                     | document-intelligence           | Document Intelligence               | internal_only   | internal   | partial  |
| receipt_line_items                      | expense-management              | Expense Management                  | chef_standard   | visible    | complete |
| receipt_photos                          | document-intelligence           | Document Intelligence               | internal_only   | internal   | partial  |
| recipe_ingredients                      | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| recipe_nutrition                        | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| recipe_production_log                   | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| recipe_shares                           | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| recipe_step_photos                      | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| recipe_sub_recipes                      | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| recipes                                 | recipe-library                  | Recipe Library                      | chef_standard   | visible    | complete |
| recurring_invoice_history               | recurring-service-programs      | Recurring Service Programs          | chef_privileged | visible    | complete |
| recurring_invoices                      | recurring-service-programs      | Recurring Service Programs          | chef_privileged | visible    | complete |
| recurring_menu_recommendations          | recurring-service-programs      | Recurring Service Programs          | chef_privileged | visible    | complete |
| recurring_schedules                     | recurring-service-programs      | Recurring Service Programs          | chef_privileged | visible    | complete |
| recurring_services                      | recurring-service-programs      | Recurring Service Programs          | chef_privileged | visible    | complete |
| referral_partners                       | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| referral_request_log                    | referral-partner-management     | Referral Partner Management         | chef_standard   | visible    | complete |
| register_sessions                       | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| remy_abuse_log                          | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_action_audit_log                   | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_approval_policies                  | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_artifacts                          | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_conversations                      | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_feedback                           | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_memories                           | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_messages                           | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_support_shares                     | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| remy_usage_metrics                      | remy-ai-platform                | Remy AI Platform                    | chef_privileged | visible    | complete |
| reorder_settings                        | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| response_templates                      | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| retainer_periods                        | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| retainers                               | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| retirement_contributions                | goals-planning                  | Goals And Planning                  | chef_privileged | visible    | complete |
| rsvp_reminder_log                       | tokenized-service-pages         | Tokenized Service Pages             | chef_standard   | gated      | complete |
| sale_applied_promotions                 | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| sale_items                              | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| sales                                   | commerce-reporting-settlements  | Commerce Reporting And Settlements  | chef_privileged | visible    | complete |
| sales_tax_remittances                   | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| sales_tax_settings                      | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| scheduled_calls                         | calls-consultations             | Calls And Consultations             | chef_standard   | visible    | complete |
| scheduled_shifts                        | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| seasonal_availability_periods           | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| seasonal_palettes                       | culinary-ideation-board         | Culinary Ideation Board             | chef_standard   | visible    | complete |
| sequence_enrollments                    | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| sequence_steps                          | marketing-campaigns             | Marketing Campaigns                 | chef_privileged | visible    | complete |
| served_dish_history                     | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| service_courses                         | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| settlement_records                      | payouts-reconciliation          | Payouts And Reconciliation          | chef_privileged | visible    | complete |
| shift_logs                              | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| shift_swap_requests                     | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| shift_templates                         | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| shopping_lists                          | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| shopping_substitutions                  | prep-planning                   | Prep Planning                       | chef_standard   | visible    | complete |
| simulation_results                      | developer-simulation-lab        | Developer Simulation Lab            | developer_tool  | gated      | complete |
| simulation_runs                         | developer-simulation-lab        | Developer Simulation Lab            | developer_tool  | gated      | complete |
| smart_field_values                      | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| smart_grocery_items                     | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| smart_grocery_lists                     | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| sms_messages                            | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| sms_send_log                            | notifications-center            | Notifications Center                | chef_standard   | visible    | complete |
| social_connected_accounts               | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_hashtag_sets                     | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_media_assets                     | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_oauth_states                     | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_platform_credentials             | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_post_assets                      | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_posts                            | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_queue_settings                   | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_stats_snapshots                  | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| social_templates                        | social-publishing               | Social Publishing                   | chef_privileged | visible    | complete |
| sop_completions                         | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| sops                                    | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| sourcing_entries                        | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| staff_availability                      | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| staff_clock_entries                     | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| staff_meal_items                        | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| staff_meals                             | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| staff_members                           | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| staff_onboarding_items                  | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| staff_performance_scores                | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| staff_schedules                         | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| station_components                      | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| station_menu_items                      | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| stations                                | kitchen-stations-kds            | Kitchen Stations And KDS            | chef_standard   | visible    | complete |
| stocktake_items                         | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| stocktakes                              | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| storage_locations                       | inventory-procurement           | Inventory And Procurement           | chef_privileged | visible    | complete |
| store_item_assignments                  | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| stripe_transfers                        | payouts-reconciliation          | Payouts And Reconciliation          | chef_privileged | visible    | complete |
| subcontract_agreements                  | contracts-approvals             | Contracts And Approvals             | chef_privileged | visible    | complete |
| suggested_links                         | client-communications           | Client Communications               | chef_standard   | visible    | complete |
| system_ingredients                      | ingredient-catalog              | Ingredient Catalog                  | chef_standard   | visible    | complete |
| task_completion_log                     | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| task_templates                          | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| tasks                                   | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| tasting_menu_courses                    | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| tasting_menus                           | menu-management                 | Menu Management                     | chef_standard   | visible    | complete |
| tax_collected                           | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| tax_filings                             | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| tax_jurisdictions                       | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| tax_quarterly_estimates                 | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| tax_settings                            | tax-compliance                  | Tax Compliance                      | chef_privileged | visible    | complete |
| tenant_settings                         | settings-control-plane          | Settings Control Plane              | chef_privileged | visible    | complete |
| testimonials                            | reviews-testimonials-reputation | Reviews Testimonials And Reputation | chef_standard   | visible    | complete |
| time_blocks                             | calendar-schedule               | Calendar And Schedule               | chef_standard   | visible    | complete |
| tip_distributions                       | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| tip_entries                             | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| tip_pool_configs                        | staff-management                | Staff Management                    | chef_standard   | visible    | complete |
| tip_requests                            | payments-collections            | Payments And Collections            | chef_standard   | visible    | complete |
| travel_leg_ingredients                  | travel-production               | Travel And Production               | chef_standard   | visible    | complete |
| truck_locations                         | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| truck_preorders                         | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| truck_schedule                          | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| unused_ingredients                      | food-cost-operations            | Food Cost Operations                | chef_privileged | visible    | complete |
| user_feedback                           | feedback-surveys                | Feedback And Surveys                | chef_standard   | visible    | complete |
| user_roles                              | feature-flag-and-tier-system    | Feature Flag And Tier System        | internal_only   | internal   | complete |
| va_tasks                                | tasks-stations                  | Tasks And Stations                  | chef_standard   | visible    | complete |
| vehicle_maintenance                     | travel-production               | Travel And Production               | chef_standard   | visible    | complete |
| vendor_catalog_import_rows              | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| vendor_document_uploads                 | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| vendor_invoice_items                    | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| vendor_invoice_line_items               | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| vendor_invoices                         | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| vendor_items                            | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| vendor_preferred_ingredients            | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| vendor_price_alert_settings             | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| vendor_price_entries                    | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| vendor_price_points                     | ingredient-price-engine         | Ingredient Price Engine             | chef_privileged | visible    | partial  |
| vendors                                 | vendor-management               | Vendor Management                   | chef_standard   | visible    | complete |
| waitlist_entries                        | waitlist-management             | Waitlist Management                 | chef_standard   | hidden     | complete |
| waste_log                               | food-cost-operations            | Food Cost Operations                | chef_privileged | visible    | complete |
| waste_logs                              | food-cost-operations            | Food Cost Operations                | chef_privileged | visible    | complete |
| webhook_deliveries                      | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| webhook_endpoints                       | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| webhook_events                          | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| website_stats_snapshots                 | analytics-hub                   | Analytics Hub                       | chef_privileged | visible    | complete |
| wholesale_accounts                      | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| wholesale_orders                        | food-operator-retail-ops        | Food Operator Retail Ops            | chef_privileged | hidden     | stub     |
| wix_connections                         | integrations-webhooks           | Integrations And Webhooks           | chef_privileged | visible    | complete |
| wix_submissions                         | wix-processing                  | Wix Processing                      | internal_only   | internal   | complete |
| workflow_execution_log                  | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| workflow_executions                     | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| workflow_steps                          | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| workflow_templates                      | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| zapier_webhook_deliveries               | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |
| zapier_webhook_subscriptions            | automations-touchpoints         | Automations And Touchpoints         | chef_privileged | visible    | complete |

## Unmatched Tables

No unmatched tables.
