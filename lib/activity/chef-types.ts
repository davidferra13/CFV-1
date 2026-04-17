// Chef Activity Log - Type Definitions

export type ChefActivityDomain =
  | 'event'
  | 'inquiry'
  | 'quote'
  | 'menu'
  | 'recipe'
  | 'client'
  | 'financial'
  | 'communication'
  | 'operational'
  | 'staff'
  | 'scheduling'
  | 'document'
  | 'marketing'
  | 'ai'
  | 'settings'
  | 'prospecting'
  | 'account'

export type ChefActivityAction =
  // Events
  | 'event_created'
  | 'event_updated'
  | 'event_transitioned'
  | 'event_cancelled'
  | 'event_invoice_sent'
  | 'event_photo_uploaded'
  | 'event_menu_approved'
  | 'event_menu_rejected'
  | 'event_scope_drift_logged'
  | 'event_checklist_completed'
  | 'event_safety_checklist_completed'
  | 'event_alcohol_logged'
  | 'event_equipment_checked'
  | 'event_imported'
  // Inquiries
  | 'inquiry_created'
  | 'inquiry_updated'
  | 'inquiry_transitioned'
  // Quotes
  | 'quote_created'
  | 'quote_sent'
  | 'quote_updated'
  // Menus
  | 'menu_created'
  | 'menu_updated'
  | 'menu_transitioned'
  | 'menu_initialized_for_event'
  | 'dish_added'
  | 'dish_updated'
  | 'component_added'
  | 'component_updated'
  // Recipes
  | 'recipe_created'
  | 'recipe_updated'
  | 'recipe_deleted'
  | 'ingredient_created'
  | 'ingredient_updated'
  | 'ingredient_added_to_recipe'
  | 'ingredient_removed_from_recipe'
  | 'recipe_prices_updated'
  // Clients
  | 'client_created'
  | 'client_updated'
  | 'client_note_added'
  | 'client_note_updated'
  | 'client_tag_added'
  | 'client_tag_removed'
  | 'client_nda_created'
  | 'client_connection_created'
  | 'client_connection_removed'
  | 'client_preference_learned'
  | 'client_portal_token_generated'
  | 'client_imported'
  | 'client_photo_uploaded'
  | 'client_cooled'
  | 'client_rewarmed'
  // Financial
  | 'ledger_entry_created'
  | 'ledger_entry_voided'
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'payment_plan_created'
  | 'installment_paid'
  | 'installment_deleted'
  | 'mileage_logged'
  | 'mileage_deleted'
  | 'tip_added'
  | 'tip_deleted'
  | 'employee_created'
  | 'employee_updated'
  | 'employee_terminated'
  | 'payroll_recorded'
  | 'tax_941_filed'
  | 'recurring_invoice_created'
  | 'recurring_invoice_paused'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'sales_tax_settings_updated'
  | 'sales_tax_remitted'
  | 'contractor_payment_recorded'
  | 'bank_account_connected'
  | 'bank_account_disconnected'
  | 'bank_transaction_confirmed'
  | 'receipt_uploaded'
  | 'receipt_approved'
  | 'kitchen_rental_created'
  | 'kitchen_rental_updated'
  | 'kitchen_rental_deleted'
  | 'admin_time_logged'
  | 'admin_time_deleted'
  | 'tax_settings_updated'
  | 'retirement_contribution_added'
  | 'retirement_contribution_deleted'
  | 'health_premium_added'
  | 'health_premium_deleted'
  | 'home_office_updated'
  // Communication
  | 'message_sent'
  | 'message_drafted'
  | 'chat_message_sent'
  | 'call_logged'
  | 'call_updated'
  | 'survey_created'
  | 'survey_sent'
  | 'collaboration_invite_sent'
  | 'collaboration_responded'
  | 'recipe_shared'
  | 'network_connection_sent'
  | 'network_connection_accepted'
  | 'network_connection_removed'
  | 'network_post_created'
  | 'partner_created'
  | 'partner_updated'
  | 'partner_deleted'
  | 'feedback_submitted'
  // Operational
  | 'aar_filed'
  | 'automation_created'
  | 'journey_created'
  | 'journey_updated'
  | 'journey_deleted'
  | 'journey_entry_added'
  | 'journey_entry_updated'
  | 'journey_idea_added'
  | 'journey_idea_updated'
  | 'journey_idea_adopted'
  | 'journey_media_added'
  | 'journey_media_updated'
  | 'journey_recipe_linked'
  | 'journey_recipe_updated'
  | 'hours_logged'
  | 'charity_hours_logged'
  | 'debrief_completed'
  | 'equipment_created'
  | 'equipment_updated'
  | 'equipment_retired'
  | 'equipment_maintenance_logged'
  | 'equipment_rental_logged'
  | 'equipment_rental_deleted'
  | 'vendor_created'
  | 'vendor_updated'
  | 'vendor_deleted'
  | 'vendor_price_recorded'
  | 'todo_created'
  | 'todo_completed'
  | 'todo_deleted'
  | 'packing_status_updated'
  | 'car_packed'
  | 'waste_logged'
  | 'certification_created'
  | 'certification_updated'
  | 'certification_deleted'
  | 'temp_logged'
  | 'temp_deleted'
  | 'safety_checklist_completed'
  | 'emergency_contact_created'
  | 'emergency_contact_updated'
  | 'emergency_contact_deleted'
  | 'contingency_note_created'
  | 'contingency_note_deleted'
  | 'daily_plan_item_completed'
  | 'daily_plan_item_dismissed'
  | 'checklist_item_toggled'
  | 'incident_reported'
  | 'recall_alert_created'
  | 'goal_created'
  | 'goal_updated'
  | 'goal_archived'
  | 'achievement_created'
  | 'achievement_deleted'
  | 'learning_goal_created'
  | 'learning_goal_completed'
  | 'portfolio_item_added'
  | 'portfolio_item_removed'
  | 'seasonal_palette_created'
  | 'seasonal_palette_updated'
  | 'seasonal_palette_deleted'
  // Retainers
  | 'retainer_activated'
  | 'retainer_paused'
  | 'retainer_resumed'
  | 'retainer_cancelled'
  | 'retainer_completed'
  // Recurring services
  | 'recurring_service_created'
  | 'recurring_service_updated'
  | 'recurring_service_paused'
  | 'recurring_service_ended'
  // Staff
  | 'staff_created'
  | 'staff_updated'
  | 'staff_deactivated'
  | 'staff_assigned'
  | 'staff_unassigned'
  | 'staff_hours_recorded'
  | 'staff_clock_in'
  | 'staff_clock_out'
  | 'staff_onboarding_started'
  | 'staff_performance_review'
  | 'staff_briefing_sent'
  // Scheduling
  | 'date_blocked'
  | 'date_unblocked'
  | 'prep_block_created'
  | 'prep_block_updated'
  | 'prep_block_deleted'
  | 'prep_block_completed'
  | 'calendar_entry_created'
  | 'calendar_entry_updated'
  | 'calendar_entry_deleted'
  | 'calendar_sync_triggered'
  | 'availability_rule_created'
  | 'availability_rule_updated'
  | 'availability_rule_deleted'
  // Document
  | 'contract_template_created'
  | 'contract_template_updated'
  | 'contract_template_deleted'
  | 'contract_generated'
  | 'contract_sent'
  | 'contract_voided'
  | 'document_imported'
  | 'document_uploaded'
  | 'document_shared'
  | 'proposal_created'
  | 'proposal_updated'
  | 'proposal_sent'
  // Marketing
  | 'campaign_created'
  | 'campaign_updated'
  | 'campaign_deleted'
  | 'campaign_sent'
  | 'campaign_template_created'
  | 'campaign_template_deleted'
  | 'sequence_created'
  | 'sequence_toggled'
  | 'sequence_deleted'
  | 'direct_outreach_sent'
  | 'social_post_updated'
  | 'social_post_status_changed'
  | 'social_asset_uploaded'
  | 'social_asset_deleted'
  | 'social_plan_generated'
  | 'testimonial_approved'
  | 'testimonial_featured'
  | 'review_url_updated'
  | 'holiday_campaign_created'
  | 'holiday_outreach_sent'
  | 'mention_tracked'
  // AI
  | 'remy_conversation_created'
  | 'remy_message_sent'
  | 'remy_conversation_deleted'
  | 'remy_memory_added'
  | 'remy_memory_deleted'
  | 'ai_import_client'
  | 'ai_import_recipe'
  | 'ai_import_brain_dump'
  | 'ai_receipt_processed'
  | 'ai_document_processed'
  | 'insight_accepted'
  | 'insight_dismissed'
  // Settings
  | 'profile_updated'
  | 'chef_slug_updated'
  | 'portal_theme_updated'
  | 'booking_settings_updated'
  | 'automation_rule_created'
  | 'automation_rule_updated'
  | 'automation_rule_toggled'
  | 'automation_rule_deleted'
  | 'automation_settings_updated'
  | 'custom_field_created'
  | 'custom_field_deleted'
  | 'event_label_updated'
  | 'loyalty_config_updated'
  | 'reward_created'
  | 'reward_updated'
  | 'reward_deactivated'
  | 'notification_settings_updated'
  | 'activity_tracking_toggled'
  | 'module_toggled'
  | 'onboarding_step_completed'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'webhook_endpoint_created'
  | 'zapier_subscription_created'
  // Prospecting
  | 'prospect_called'
  | 'prospect_converted'
  // Account
  | 'account_deletion_requested'
  | 'account_deletion_cancelled'
  | 'account_data_exported'

export type ChefActivityEntry = {
  id: string
  tenant_id: string
  actor_id: string
  action: ChefActivityAction
  domain: ChefActivityDomain
  entity_type: string
  entity_id: string | null
  summary: string
  context: Record<string, unknown>
  client_id: string | null
  created_at: string
}

export type ChefActivityLogRow = ChefActivityEntry

export type ChefActivityQueryOptions = {
  limit?: number
  domain?: ChefActivityDomain
  clientId?: string
  daysBack?: number
  cursor?: string | null
}

export type ChefActivityQueryResult = {
  items: ChefActivityEntry[]
  nextCursor: string | null
}

export type ResumeItem = {
  id: string
  type: 'event' | 'menu' | 'inquiry' | 'quote' | 'note'
  title: string
  subtitle: string
  status: string
  statusColor: 'amber' | 'brand' | 'green' | 'red' | 'purple' | 'stone'
  lastAction?: string
  lastActionAt?: string
  href: string
  context: Record<string, unknown>
}

// Domain visual config for UI
export const DOMAIN_CONFIG: Record<
  ChefActivityDomain,
  { label: string; color: string; bgColor: string }
> = {
  event: { label: 'Event', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  inquiry: { label: 'Inquiry', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  quote: { label: 'Quote', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  menu: {
    label: 'Menu',
    color: 'text-brand-800 dark:text-brand-400',
    bgColor: 'bg-brand-100 dark:bg-brand-950',
  },
  recipe: { label: 'Recipe', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  client: {
    label: 'Client',
    color: 'text-brand-800 dark:text-brand-400',
    bgColor: 'bg-brand-100 dark:bg-brand-950',
  },
  financial: { label: 'Financial', color: 'text-green-700', bgColor: 'bg-green-100' },
  communication: {
    label: 'Comms',
    color: 'text-brand-800 dark:text-brand-400',
    bgColor: 'bg-brand-100 dark:bg-brand-950',
  },
  operational: { label: 'Ops', color: 'text-stone-400', bgColor: 'bg-stone-800' },
  staff: { label: 'Staff', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  scheduling: {
    label: 'Schedule',
    color: 'text-brand-800 dark:text-brand-400',
    bgColor: 'bg-brand-100 dark:bg-brand-950',
  },
  document: { label: 'Document', color: 'text-rose-700', bgColor: 'bg-rose-100' },
  marketing: { label: 'Marketing', color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-100' },
  ai: { label: 'AI', color: 'text-violet-700', bgColor: 'bg-violet-100' },
  settings: { label: 'Settings', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  prospecting: { label: 'Prospecting', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  account: { label: 'Account', color: 'text-red-700', bgColor: 'bg-red-100' },
}
