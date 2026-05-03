// Takeout Category Registry
// Defines what data categories are available for export, which tables they query,
// and how to format the output. Pure type definitions + config, no server actions.

export type TakeoutCategoryId =
  | 'recipes'
  | 'clients'
  | 'events'
  | 'financials'
  | 'commerce'
  | 'menus'
  | 'documents'
  | 'conversations'
  | 'photos'
  | 'ingredients'
  | 'profile'

export type TakeoutCategory = {
  id: TakeoutCategoryId
  label: string
  description: string
  /** Tables to query (tenant_id or chef_id scoped) */
  tables: { name: string; fkColumn?: string }[]
  /** Output formats included in ZIP */
  formats: ('json' | 'csv' | 'ics' | 'pdf' | 'files')[]
  /** Folder name inside ZIP */
  folder: string
  /** True if this category can be very large (photos, documents) */
  heavyCategory?: boolean
}

export const TAKEOUT_CATEGORIES: TakeoutCategory[] = [
  {
    id: 'recipes',
    label: 'Recipes',
    description: 'All recipes with ingredients, instructions, tags, and timing',
    tables: [
      { name: 'recipes', fkColumn: 'chef_id' },
      { name: 'recipe_ingredients' },
      { name: 'components' },
      { name: 'recipe_tags' },
    ],
    formats: ['json', 'csv'],
    folder: 'recipes',
  },
  {
    id: 'clients',
    label: 'Clients',
    description: 'Client contact info, preferences, allergies, and taste profiles',
    tables: [
      { name: 'clients', fkColumn: 'chef_id' },
      { name: 'client_preferences' },
      { name: 'client_allergy_records' },
      { name: 'client_notes' },
      { name: 'client_tags' },
    ],
    formats: ['json', 'csv'],
    folder: 'clients',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Event history with guests, staff assignments, and state transitions',
    tables: [
      { name: 'events' },
      { name: 'event_guests' },
      { name: 'event_staff_assignments' },
      { name: 'event_state_transitions' },
    ],
    formats: ['json', 'csv', 'ics'],
    folder: 'events',
  },
  {
    id: 'financials',
    label: 'Financials',
    description: 'Ledger entries, expenses, quotes, and payment records',
    tables: [
      { name: 'ledger_entries' },
      { name: 'expenses' },
      { name: 'quotes' },
      { name: 'commerce_payments' },
    ],
    formats: ['json', 'csv'],
    folder: 'financials',
  },
  {
    id: 'menus',
    label: 'Menus',
    description: 'Menu layouts, sections, and item assignments',
    tables: [
      { name: 'menus' },
      { name: 'menu_sections' },
      { name: 'menu_items' },
      { name: 'dishes' },
    ],
    formats: ['json'],
    folder: 'menus',
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Contracts, invoices, and generated documents',
    tables: [{ name: 'chef_documents' }, { name: 'event_contracts' }],
    formats: ['json', 'files'],
    folder: 'documents',
    heavyCategory: true,
  },
  {
    id: 'commerce',
    label: 'Commerce & POS',
    description: 'Sales, refunds, register sessions, orders, and dining checks',
    tables: [
      { name: 'sales' },
      { name: 'commerce_refunds' },
      { name: 'register_sessions' },
      { name: 'order_queue' },
      { name: 'commerce_promotions' },
      { name: 'commerce_dining_checks' },
      { name: 'sales_tax_remittances' },
    ],
    formats: ['json', 'csv'],
    folder: 'commerce',
  },
  {
    id: 'conversations',
    label: 'Conversations',
    description: 'Client conversation threads, messages, and AI chat history',
    tables: [
      { name: 'conversations' },
      { name: 'chat_messages' },
      { name: 'remy_conversations' },
      { name: 'remy_messages' },
    ],
    formats: ['json'],
    folder: 'conversations',
  },
  {
    id: 'photos',
    label: 'Photos',
    description: 'Event photos, portfolio images, and profile pictures',
    tables: [{ name: 'entity_photos' }],
    formats: ['json', 'files'],
    folder: 'photos',
    heavyCategory: true,
  },
  {
    id: 'ingredients',
    label: 'Ingredients',
    description: 'Ingredient catalog with price history and categories',
    tables: [{ name: 'ingredients' }, { name: 'ingredient_prices' }],
    formats: ['json', 'csv'],
    folder: 'ingredients',
  },
  {
    id: 'profile',
    label: 'Profile & Settings',
    description: 'Business profile, preferences, service config, and pricing rules',
    tables: [
      { name: 'chefs', fkColumn: 'id' },
      { name: 'chef_preferences', fkColumn: 'chef_id' },
      { name: 'chef_service_config', fkColumn: 'chef_id' },
      { name: 'chef_pricing_config', fkColumn: 'chef_id' },
    ],
    formats: ['json'],
    folder: 'profile',
  },
]

export const TAKEOUT_CATEGORY_MAP = new Map(TAKEOUT_CATEGORIES.map((c) => [c.id, c]))
