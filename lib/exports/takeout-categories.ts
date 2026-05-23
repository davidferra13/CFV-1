// Takeout Category Registry
// Defines what data categories are available for export, which tables they query,
// and how to format the output. Pure type definitions + config, no server actions.

export type TakeoutCategoryId =
  | 'recipes'
  | 'clients'
  | 'events'
  | 'financials'
  | 'quotes'
  | 'commerce'
  | 'menus'
  | 'documents'
  | 'conversations'
  | 'photos'
  | 'ingredients'
  | 'vendors'
  | 'staff'
  | 'profile'

export type TakeoutSectionId = 'core' | 'business' | 'other'

export type TakeoutSection = {
  id: TakeoutSectionId
  label: string
  categories: TakeoutCategoryId[]
}

export type TakeoutCategory = {
  id: TakeoutCategoryId
  label: string
  description: string
  /** Tables to query (tenant_id or chef_id scoped) */
  tables: {
    name: string
    fkColumn?: string
    parentTable?: string
    parentFkColumn?: string
    parentIdColumn?: string
  }[]
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
      { name: 'recipe_ingredients', parentTable: 'recipes', parentFkColumn: 'recipe_id' },
      { name: 'components', fkColumn: 'tenant_id' },
      { name: 'recipe_tags', parentTable: 'recipes', parentFkColumn: 'recipe_id' },
    ],
    formats: ['json', 'csv'],
    folder: 'recipes',
  },
  {
    id: 'clients',
    label: 'Clients',
    description: 'Client contact info, preferences, allergies, and taste profiles',
    tables: [
      { name: 'clients', fkColumn: 'tenant_id' },
      { name: 'client_preferences', fkColumn: 'tenant_id' },
      { name: 'client_allergy_records', fkColumn: 'tenant_id' },
      { name: 'client_notes', fkColumn: 'tenant_id' },
      { name: 'client_tags', fkColumn: 'tenant_id' },
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
      { name: 'event_staff_assignments', fkColumn: 'chef_id' },
      { name: 'event_state_transitions' },
    ],
    formats: ['json', 'csv', 'ics'],
    folder: 'events',
  },
  {
    id: 'financials',
    label: 'Financials',
    description: 'Ledger entries, expenses, and payment records',
    tables: [{ name: 'ledger_entries' }, { name: 'expenses' }, { name: 'commerce_payments' }],
    formats: ['json', 'csv'],
    folder: 'financials',
  },
  {
    id: 'quotes',
    label: 'Quotes & Proposals',
    description: 'Quotes with line items, transitions, and client proposals',
    tables: [
      { name: 'quotes' },
      { name: 'quote_line_items', parentTable: 'quotes', parentFkColumn: 'quote_id' },
      { name: 'quote_state_transitions', parentTable: 'quotes', parentFkColumn: 'quote_id' },
      { name: 'quote_addons', parentTable: 'quotes', parentFkColumn: 'quote_id' },
      { name: 'client_proposals' },
      { name: 'proposal_sections', parentTable: 'client_proposals', parentFkColumn: 'proposal_id' },
    ],
    formats: ['json'],
    folder: 'quotes',
  },
  {
    id: 'menus',
    label: 'Menus',
    description: 'Menu layouts, sections, and item assignments',
    tables: [
      { name: 'menus' },
      { name: 'menu_sections', parentTable: 'menus', parentFkColumn: 'menu_id' },
      { name: 'menu_items', parentTable: 'menus', parentFkColumn: 'menu_id' },
      { name: 'dishes', parentTable: 'menus', parentFkColumn: 'menu_id' },
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
      { name: 'chat_messages', parentTable: 'conversations', parentFkColumn: 'conversation_id' },
      { name: 'remy_conversations' },
      {
        name: 'remy_messages',
        parentTable: 'remy_conversations',
        parentFkColumn: 'conversation_id',
      },
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
    id: 'vendors',
    label: 'Vendors',
    description: 'Vendor directory, items, invoices, and purchase orders',
    tables: [
      { name: 'vendors' },
      { name: 'vendor_items', parentTable: 'vendors', parentFkColumn: 'vendor_id' },
      { name: 'vendor_invoices', parentTable: 'vendors', parentFkColumn: 'vendor_id' },
      { name: 'purchase_orders' },
    ],
    formats: ['json', 'csv'],
    folder: 'vendors',
  },
  {
    id: 'staff',
    label: 'Staff',
    description: 'Team roster, availability, time tracking, and payroll',
    tables: [
      { name: 'staff_members' },
      { name: 'employees' },
      { name: 'payroll_records' },
      { name: 'contractor_payments' },
    ],
    formats: ['json', 'csv'],
    folder: 'staff',
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

/** Categories grouped into sections per spec UI layout */
export const TAKEOUT_SECTIONS: TakeoutSection[] = [
  {
    id: 'core',
    label: 'Core Data',
    categories: ['recipes', 'clients', 'events', 'quotes', 'menus', 'ingredients'],
  },
  {
    id: 'business',
    label: 'Business',
    categories: ['financials', 'commerce', 'vendors', 'staff', 'documents'],
  },
  {
    id: 'other',
    label: 'Other',
    categories: ['conversations', 'photos', 'profile'],
  },
]
