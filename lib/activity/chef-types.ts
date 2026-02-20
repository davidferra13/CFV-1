// Chef Activity Log — Type Definitions

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

export type ChefActivityAction =
  // Events
  | 'event_created'
  | 'event_updated'
  | 'event_transitioned'
  | 'event_cancelled'
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
  | 'dish_added'
  | 'dish_updated'
  | 'component_added'
  | 'component_updated'
  // Recipes
  | 'recipe_created'
  | 'recipe_updated'
  // Clients
  | 'client_created'
  | 'client_updated'
  | 'client_note_added'
  // Financial
  | 'ledger_entry_created'
  | 'expense_created'
  | 'expense_updated'
  // Communication
  | 'message_sent'
  | 'message_drafted'
  | 'chat_message_sent'
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
  statusColor: 'amber' | 'blue' | 'green' | 'red' | 'purple' | 'stone'
  lastAction?: string
  lastActionAt?: string
  href: string
  context: Record<string, unknown>
}

// Domain visual config for UI
export const DOMAIN_CONFIG: Record<ChefActivityDomain, { label: string; color: string; bgColor: string }> = {
  event: { label: 'Event', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  inquiry: { label: 'Inquiry', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  quote: { label: 'Quote', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  menu: { label: 'Menu', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  recipe: { label: 'Recipe', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  client: { label: 'Client', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  financial: { label: 'Financial', color: 'text-green-700', bgColor: 'bg-green-100' },
  communication: { label: 'Comms', color: 'text-sky-700', bgColor: 'bg-sky-100' },
  operational: { label: 'Ops', color: 'text-stone-600', bgColor: 'bg-stone-100' },
}
