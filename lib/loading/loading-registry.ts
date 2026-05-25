// Loading Animation Registry
// Every named loading context in ChefFlow, with task-specific messages
// and visual configuration. This is the single source of truth for what
// users see while waiting.

export type LoadingCategory =
  | 'navigation' // Route transitions (loading.tsx files)
  | 'ai' // Ollama/Remy operations
  | 'data' // CRUD mutations (save, delete, update)
  | 'upload' // File/image uploads
  | 'search' // Live search, filtering
  | 'sync' // Gmail, calendar, real-time sync
  | 'financial' // Ledger calculations, reports
  | 'generation' // PDF, document, allergy card generation
  | 'import' // Recipe import, data import
  | 'auth' // Sign in, session

export type LoadingVisual = 'skeleton' | 'remy' | 'spinner' | 'progress' | 'dots' | 'pulse'

export interface LoadingContext {
  /** Unique identifier for this loading context */
  id: string
  /** Human-readable name */
  name: string
  /** Category for grouping */
  category: LoadingCategory
  /** Primary visual treatment */
  visual: LoadingVisual
  /** Rotating messages shown during this loading state */
  messages: string[]
  /** Where this loading context is used (file paths, components) */
  usedIn: string[]
  /** Approximate expected duration */
  expectedDuration: 'instant' | 'short' | 'medium' | 'long'
}

// Duration guide:
// instant: < 300ms (optimistic UI, no loader usually needed)
// short: 300ms - 2s (quick DB reads, simple mutations)
// medium: 2s - 10s (AI operations, complex queries, PDF generation)
// long: 10s+ (email sync, bulk imports, full AI analysis)

export const LOADING_REGISTRY: LoadingContext[] = [
  // ─── Navigation (Route-Level Skeletons) ────────────────────────
  {
    id: 'nav-dashboard',
    name: 'Dashboard',
    category: 'navigation',
    visual: 'skeleton',
    messages: [
      'Loading your dashboard...',
      "Loading today's schedule...",
      'Getting your business snapshot...',
    ],
    usedIn: ['app/(chef)/dashboard/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-events',
    name: 'Events List',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your events...', 'Getting your event details...'],
    usedIn: ['app/(chef)/events/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-event-detail',
    name: 'Event Detail',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading event details...', 'Getting financials and timeline...'],
    usedIn: ['app/(chef)/events/[id]/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-clients',
    name: 'Clients List',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your clients...', 'Getting your client list...'],
    usedIn: ['app/(chef)/clients/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-client-detail',
    name: 'Client Profile',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading client profile...', 'Getting event history and preferences...'],
    usedIn: ['app/(chef)/clients/[id]/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-recipes',
    name: 'Recipe Book',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Opening your recipe book...', 'Loading recipes and categories...'],
    usedIn: ['app/(chef)/recipes/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-menus',
    name: 'Menus',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your menus...', 'Getting your menu details...'],
    usedIn: ['app/(chef)/menus/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-finance',
    name: 'Finance Hub',
    category: 'navigation',
    visual: 'skeleton',
    messages: [
      'Crunching your numbers...',
      'Loading financial overview...',
      'Checking your balances...',
    ],
    usedIn: ['app/(chef)/finance/loading.tsx', 'app/(chef)/financials/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-quotes',
    name: 'Quotes',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your quotes...', 'Getting your quote details...'],
    usedIn: ['app/(chef)/quotes/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-inquiries',
    name: 'Inquiries',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your inquiries...', 'Checking for new leads...'],
    usedIn: ['app/(chef)/inquiries/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-calendar',
    name: 'Calendar',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your calendar...', 'Getting your schedule...'],
    usedIn: ['app/(chef)/calendar/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-inbox',
    name: 'Inbox',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your inbox...', 'Getting your conversations...'],
    usedIn: ['app/(chef)/inbox/loading.tsx', 'app/(chef)/chat/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-analytics',
    name: 'Analytics',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your analytics...', 'Analyzing your data...', 'Preparing your reports...'],
    usedIn: ['app/(chef)/analytics/loading.tsx', 'app/(chef)/insights/loading.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'nav-inventory',
    name: 'Inventory',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your inventory...', 'Checking stock levels...'],
    usedIn: ['app/(chef)/inventory/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-staff',
    name: 'Staff',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your team...', 'Getting your staff details...'],
    usedIn: ['app/(chef)/staff/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-settings',
    name: 'Settings',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your settings...'],
    usedIn: ['app/(chef)/settings/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-marketing',
    name: 'Marketing',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading marketing tools...', 'Getting your campaign data...'],
    usedIn: ['app/(chef)/marketing/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-leads',
    name: 'Leads',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your leads...', 'Rating your leads...'],
    usedIn: ['app/(chef)/leads/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-vendors',
    name: 'Vendors',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your vendors...'],
    usedIn: ['app/(chef)/vendors/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-network',
    name: 'Chef Network',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your network...', 'Connecting with chefs...'],
    usedIn: ['app/(chef)/network/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-tasks',
    name: 'Tasks',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your tasks...'],
    usedIn: ['app/(chef)/tasks/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-notifications',
    name: 'Notifications',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your notifications...'],
    usedIn: ['app/(chef)/notifications/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-operations',
    name: 'Operations',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading operations...', 'Getting your prep timelines...'],
    usedIn: ['app/(chef)/operations/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-loyalty',
    name: 'Loyalty',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading loyalty data...', 'Checking client levels...'],
    usedIn: ['app/(chef)/loyalty/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-reviews',
    name: 'Reviews',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your reviews...'],
    usedIn: ['app/(chef)/reviews/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-travel',
    name: 'Travel',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your travel log...', 'Adding up your mileage...'],
    usedIn: ['app/(chef)/travel/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-admin',
    name: 'Admin Panel',
    category: 'navigation',
    visual: 'spinner',
    messages: ['Loading admin panel...'],
    usedIn: ['app/(admin)/admin/*/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-client-portal',
    name: 'Client Portal',
    category: 'navigation',
    visual: 'skeleton',
    messages: ['Loading your portal...', 'Getting your events and details...'],
    usedIn: ['app/(client)/*/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-partner-portal',
    name: 'Partner Portal',
    category: 'navigation',
    visual: 'spinner',
    messages: ['Loading partner portal...', 'Getting your partner tools...'],
    usedIn: ['app/(partner)/partner/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-mobile-portal',
    name: 'Mobile Portal',
    category: 'navigation',
    visual: 'spinner',
    messages: ['Loading mobile workspace...', 'Preparing your compact view...'],
    usedIn: ['app/(mobile)/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-public-booking',
    name: 'Public Booking',
    category: 'navigation',
    visual: 'spinner',
    messages: ['Loading booking form...'],
    usedIn: ['app/book/[chefSlug]/loading.tsx', 'app/(public)/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-recipe-detail',
    name: 'Recipe Detail',
    category: 'navigation',
    visual: 'spinner',
    messages: ['Loading your recipe...'],
    usedIn: ['app/recipes/[id]/loading.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'nav-menu-detail',
    name: 'Menu Detail',
    category: 'navigation',
    visual: 'spinner',
    messages: ['Loading your menu...'],
    usedIn: ['app/menus/[id]/loading.tsx'],
    expectedDuration: 'short',
  },

  // ─── AI Operations ─────────────────────────────────────────────
  {
    id: 'ai-remy-thinking',
    name: 'Remy Thinking',
    category: 'ai',
    visual: 'remy',
    messages: ['Remy is thinking...', 'Working on your request...', 'Working on it...'],
    usedIn: ['components/ai/remy-drawer.tsx', 'components/ai/remy-mascot-chat.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'ai-remy-command',
    name: 'Remy Command Execution',
    category: 'ai',
    visual: 'remy',
    messages: ['Running your command...', 'Working on it...', 'On it...'],
    usedIn: ['components/ai/remy-drawer.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'ai-business-insights',
    name: 'Business Insights Analysis',
    category: 'ai',
    visual: 'remy',
    messages: [
      'Analyzing your business data...',
      'Crunching the numbers...',
      'Looking at your history...',
    ],
    usedIn: ['components/ai/business-insights-panel.tsx'],
    expectedDuration: 'long',
  },
  {
    id: 'ai-aar-generation',
    name: 'After-Action Review',
    category: 'ai',
    visual: 'remy',
    messages: [
      'Reviewing event performance...',
      'Analyzing what went well...',
      'Drafting your after-action review...',
    ],
    usedIn: ['components/ai/aar-generator-panel.tsx', 'components/aar/aar-form.tsx'],
    expectedDuration: 'long',
  },
  {
    id: 'ai-allergen-check',
    name: 'Allergen Risk Analysis',
    category: 'ai',
    visual: 'remy',
    messages: [
      'Scanning for allergen risks...',
      'Checking dietary needs...',
      'Checking ingredient safety...',
    ],
    usedIn: ['components/ai/allergen-risk-panel.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'ai-contingency',
    name: 'Contingency Planning',
    category: 'ai',
    visual: 'remy',
    messages: ['Building contingency plans...', 'Looking at backup options...'],
    usedIn: ['components/ai/contingency-panel.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'ai-grocery-consolidation',
    name: 'Grocery List Consolidation',
    category: 'ai',
    visual: 'remy',
    messages: [
      'Consolidating your grocery list...',
      'Combining ingredients across menus...',
      'Optimizing your shopping trip...',
    ],
    usedIn: ['components/ai/grocery-consolidation-panel.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'ai-chef-bio',
    name: 'Bio Generation',
    category: 'ai',
    visual: 'remy',
    messages: ['Crafting your bio...', 'Writing your story...'],
    usedIn: ['components/ai/chef-bio-panel.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'ai-lead-scoring',
    name: 'Lead Scoring',
    category: 'ai',
    visual: 'dots',
    messages: ['Rating this lead...', 'Checking your leads...'],
    usedIn: ['lib/inquiries/goldmine-lead-score.ts'],
    expectedDuration: 'instant',
  },
  {
    id: 'ai-campaign-draft',
    name: 'Campaign Draft',
    category: 'ai',
    visual: 'remy',
    messages: ['Drafting campaign concept...', 'Writing your outreach copy...'],
    usedIn: ['components/ai/campaign-outreach-panel.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'ai-depreciation',
    name: 'Depreciation Explanation',
    category: 'ai',
    visual: 'remy',
    messages: ['Calculating depreciation...', 'Explaining the math...'],
    usedIn: ['components/ai/equipment-depreciation-panel.tsx'],
    expectedDuration: 'medium',
  },

  // ─── Data Mutations ────────────────────────────────────────────
  {
    id: 'data-save-event',
    name: 'Save Event',
    category: 'data',
    visual: 'spinner',
    messages: ['Saving event...'],
    usedIn: ['components/events/event-form.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'data-save-client',
    name: 'Save Client',
    category: 'data',
    visual: 'spinner',
    messages: ['Saving client...'],
    usedIn: ['components/clients/client-form.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'data-save-recipe',
    name: 'Save Recipe',
    category: 'data',
    visual: 'spinner',
    messages: ['Saving recipe...'],
    usedIn: ['components/recipes/recipe-form.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'data-save-menu',
    name: 'Save Menu',
    category: 'data',
    visual: 'spinner',
    messages: ['Saving menu...'],
    usedIn: ['components/menus/menu-form.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'data-save-quote',
    name: 'Save Quote',
    category: 'data',
    visual: 'spinner',
    messages: ['Saving quote...'],
    usedIn: ['components/quotes/quote-form.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'data-transition-event',
    name: 'Event State Transition',
    category: 'data',
    visual: 'spinner',
    messages: ['Updating event status...', 'Updating status...'],
    usedIn: ['components/events/event-transitions.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'data-record-payment',
    name: 'Record Payment',
    category: 'data',
    visual: 'spinner',
    messages: ['Recording payment...', 'Recording the change...'],
    usedIn: ['components/finance/payment-form.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'data-send-invoice',
    name: 'Send Invoice',
    category: 'data',
    visual: 'spinner',
    messages: ['Sending invoice...', 'Preparing email...'],
    usedIn: ['components/finance/invoice-actions.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'data-delete',
    name: 'Delete Record',
    category: 'data',
    visual: 'spinner',
    messages: ['Deleting...'],
    usedIn: ['(various delete confirmations)'],
    expectedDuration: 'short',
  },
  {
    id: 'data-save-settings',
    name: 'Save Settings',
    category: 'data',
    visual: 'spinner',
    messages: ['Saving settings...'],
    usedIn: ['app/(chef)/settings/*/page.tsx'],
    expectedDuration: 'short',
  },

  // ─── File Uploads ──────────────────────────────────────────────
  {
    id: 'upload-photo',
    name: 'Photo Upload',
    category: 'upload',
    visual: 'progress',
    messages: ['Uploading photo...', 'Saving your image...'],
    usedIn: ['components/dishes/dish-photo-upload.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'upload-receipt',
    name: 'Receipt Upload',
    category: 'upload',
    visual: 'progress',
    messages: ['Uploading receipt...', 'Scanning receipt data...'],
    usedIn: ['components/receipts/standalone-upload.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'upload-menu-file',
    name: 'Menu File Upload',
    category: 'upload',
    visual: 'progress',
    messages: ['Uploading menu file...', 'Reading your document...'],
    usedIn: ['components/menus/menu-upload-zone.tsx'],
    expectedDuration: 'medium',
  },

  // ─── Search ────────────────────────────────────────────────────
  {
    id: 'search-global',
    name: 'Global Search',
    category: 'search',
    visual: 'dots',
    messages: ['Searching...'],
    usedIn: ['components/search/global-search.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'search-recipes',
    name: 'Recipe Search',
    category: 'search',
    visual: 'dots',
    messages: ['Searching recipes...'],
    usedIn: ['components/recipes/recipe-search.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'search-clients',
    name: 'Client Search',
    category: 'search',
    visual: 'dots',
    messages: ['Searching clients...'],
    usedIn: ['components/clients/client-search.tsx'],
    expectedDuration: 'short',
  },

  // ─── Sync Operations ──────────────────────────────────────────
  {
    id: 'sync-gmail',
    name: 'Gmail Sync',
    category: 'sync',
    visual: 'progress',
    messages: ['Syncing your inbox...', 'Checking your inbox...', 'Checking for new inquiries...'],
    usedIn: ['components/gmail/historical-scan-section.tsx'],
    expectedDuration: 'long',
  },
  {
    id: 'sync-calendar',
    name: 'Calendar Sync',
    category: 'sync',
    visual: 'spinner',
    messages: ['Syncing calendar...', 'Updating schedule...'],
    usedIn: ['components/scheduling/capacity-calendar.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'sync-realtime',
    name: 'Real-time Connection',
    category: 'sync',
    visual: 'pulse',
    messages: ['Connecting...'],
    usedIn: [
      'components/realtime/live-indicator.tsx',
      'components/activity/live-presence-panel.tsx',
    ],
    expectedDuration: 'short',
  },

  // ─── Financial Operations ──────────────────────────────────────
  {
    id: 'finance-ledger-compute',
    name: 'Ledger Computation',
    category: 'financial',
    visual: 'spinner',
    messages: ['Checking your balances...', 'Checking your books...'],
    usedIn: ['lib/ledger/compute.ts'],
    expectedDuration: 'short',
  },
  {
    id: 'finance-report',
    name: 'Financial Report',
    category: 'financial',
    visual: 'spinner',
    messages: [
      'Building your financial report...',
      'Adding up your transactions...',
      'Figuring out your profit...',
    ],
    usedIn: ['components/finance/financial-report.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'finance-break-even',
    name: 'Break-Even Analysis',
    category: 'financial',
    visual: 'spinner',
    messages: ['Running break-even analysis...', 'Breaking down your costs...'],
    usedIn: ['components/finance/break-even-calculator.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'finance-menu-engineering',
    name: 'Menu Engineering Analysis',
    category: 'financial',
    visual: 'spinner',
    messages: ['Running menu engineering analysis...', 'Analyzing your menu performance...'],
    usedIn: ['components/menus/menu-engineering-panel.tsx'],
    expectedDuration: 'medium',
  },
  {
    id: 'finance-mileage',
    name: 'Mileage Calculation',
    category: 'financial',
    visual: 'spinner',
    messages: ['Adding up your mileage deductions...', 'Totaling travel expenses...'],
    usedIn: ['components/finance/mileage-log-panel.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'finance-tip-request',
    name: 'Tip Request',
    category: 'financial',
    visual: 'spinner',
    messages: ['Sending tip request...', 'Creating your tip link...'],
    usedIn: ['components/finance/tip-request-panel.tsx'],
    expectedDuration: 'short',
  },

  // ─── Document Generation ───────────────────────────────────────
  {
    id: 'gen-pdf-menu',
    name: 'Menu PDF',
    category: 'generation',
    visual: 'remy',
    messages: [
      'Creating your menu PDF...',
      'Laying out courses and dishes...',
      'Formatting for print...',
    ],
    usedIn: ['lib/documents/generate-menu-pdf.ts'],
    expectedDuration: 'medium',
  },
  {
    id: 'gen-pdf-invoice',
    name: 'Invoice PDF',
    category: 'generation',
    visual: 'spinner',
    messages: ['Creating your invoice...', 'Putting your quote together...'],
    usedIn: ['lib/documents/generate-invoice-pdf.ts'],
    expectedDuration: 'medium',
  },
  {
    id: 'gen-allergy-card',
    name: 'Allergy Card',
    category: 'generation',
    visual: 'remy',
    messages: [
      'Creating allergy card...',
      'Listing dietary restrictions...',
      'Preparing safety reference...',
    ],
    usedIn: ['lib/documents/generate-allergy-card.ts'],
    expectedDuration: 'medium',
  },
  {
    id: 'gen-contract',
    name: 'Contract Generation',
    category: 'generation',
    visual: 'remy',
    messages: ['Drafting your contract...', 'Writing up terms and conditions...'],
    usedIn: ['lib/ai/contract-generator.ts'],
    expectedDuration: 'long',
  },
  {
    id: 'gen-packing-list',
    name: 'Packing List',
    category: 'generation',
    visual: 'spinner',
    messages: ['Creating your packing list...', 'Organizing by station...'],
    usedIn: ['components/events/packing-list-client.tsx'],
    expectedDuration: 'short',
  },

  // ─── Import Operations ─────────────────────────────────────────
  {
    id: 'import-recipe',
    name: 'Recipe Import',
    category: 'import',
    visual: 'remy',
    messages: [
      'Reading your recipe...',
      'Picking out ingredients and steps...',
      'Organizing your recipe...',
    ],
    usedIn: ['lib/recipes/import-actions.ts', 'lib/ai/parse-recipe.ts'],
    expectedDuration: 'long',
  },
  {
    id: 'import-brain-dump',
    name: 'Brain Dump Processing',
    category: 'import',
    visual: 'remy',
    messages: [
      'Going through your brain dump...',
      'Finding clients, events, and notes...',
      'Organizing your thoughts...',
    ],
    usedIn: ['lib/ai/parse-brain-dump.ts'],
    expectedDuration: 'long',
  },

  // ─── Auth ──────────────────────────────────────────────────────
  {
    id: 'auth-sign-in',
    name: 'Sign In',
    category: 'auth',
    visual: 'spinner',
    messages: ['Signing you in...', 'Checking your credentials...'],
    usedIn: ['app/(auth)/sign-in/page.tsx'],
    expectedDuration: 'short',
  },
  {
    id: 'auth-sign-up',
    name: 'Sign Up',
    category: 'auth',
    visual: 'spinner',
    messages: ['Creating your account...', 'Setting up your workspace...'],
    usedIn: ['app/(auth)/sign-up/page.tsx'],
    expectedDuration: 'medium',
  },
]

// ─── Error Messages ──────────────────────────────────────────────
// Paired with loading contexts so errors are equally specific.
// Keys are context IDs. If a context has no entry here, a
// category-level fallback is used.

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  // Navigation
  'nav-dashboard': {
    title: 'Could not load dashboard',
    description: "Couldn't load your schedule and business snapshot. Try refreshing.",
  },
  'nav-events': {
    title: 'Could not load events',
    description: "Couldn't load your events. Try refreshing the page.",
  },
  'nav-event-detail': {
    title: 'Could not load event',
    description: "Couldn't load your event details. Try refreshing.",
  },
  'nav-clients': {
    title: 'Could not load clients',
    description: "Couldn't load your clients. Try refreshing.",
  },
  'nav-client-detail': {
    title: 'Could not load client profile',
    description: "Couldn't load this client's details. Try refreshing.",
  },
  'nav-recipes': {
    title: 'Could not load recipes',
    description: "Couldn't load your recipe book. Try refreshing.",
  },
  'nav-menus': {
    title: 'Could not load menus',
    description: "Couldn't load your menus. Try refreshing.",
  },
  'nav-finance': {
    title: 'Could not load financials',
    description: "Couldn't load your financial data. Try refreshing.",
  },
  'nav-quotes': {
    title: 'Could not load quotes',
    description: "Couldn't load your quotes. Try refreshing.",
  },
  'nav-inquiries': {
    title: 'Could not load inquiries',
    description: "Couldn't load your inquiries. Try refreshing.",
  },
  'nav-calendar': {
    title: 'Could not load calendar',
    description: "Couldn't load your schedule. Try refreshing.",
  },
  'nav-inbox': {
    title: 'Could not load inbox',
    description: "Couldn't load your conversations. Try refreshing.",
  },
  'nav-analytics': {
    title: 'Could not load analytics',
    description: "Couldn't load your analytics. Try refreshing.",
  },
  'nav-inventory': {
    title: 'Could not load inventory',
    description: "Couldn't load your inventory. Try refreshing.",
  },
  'nav-staff': {
    title: 'Could not load staff',
    description: "Couldn't load your team info. Try refreshing.",
  },

  // AI
  'ai-remy-thinking': {
    title: 'Remy could not respond',
    description: 'Remy ran into an issue. Please try again.',
  },
  'ai-remy-command': {
    title: 'Command failed',
    description: 'Remy could not complete that. Please try again.',
  },
  'ai-business-insights': {
    title: 'Could not generate insights',
    description: 'Business analysis is temporarily unavailable. Please try again.',
  },
  'ai-aar-generation': {
    title: 'Could not generate review',
    description: "Couldn't create your after-action review. Please try again.",
  },
  'ai-allergen-check': {
    title: 'Allergen check failed',
    description: "Couldn't complete the allergen check. Please verify manually.",
  },
  'ai-grocery-consolidation': {
    title: 'Could not consolidate groceries',
    description: "Couldn't combine your grocery list. Please try again.",
  },
  'ai-chef-bio': {
    title: 'Could not generate bio',
    description: 'Bio writing is temporarily unavailable. Please try again.',
  },
  'ai-campaign-draft': {
    title: 'Could not draft campaign',
    description: "Couldn't create your campaign draft. Please try again.",
  },

  // Data mutations
  'data-save-event': {
    title: 'Could not save event',
    description: 'Your changes were not saved. Please try again.',
  },
  'data-save-client': {
    title: 'Could not save client',
    description: 'Client changes were not saved.',
  },
  'data-save-recipe': {
    title: 'Could not save recipe',
    description: 'Recipe changes were not saved.',
  },
  'data-save-menu': { title: 'Could not save menu', description: 'Menu changes were not saved.' },
  'data-save-quote': {
    title: 'Could not save quote',
    description: 'Quote changes were not saved.',
  },
  'data-transition-event': {
    title: 'Status update failed',
    description: 'The event status could not be changed.',
  },
  'data-record-payment': {
    title: 'Payment not recorded',
    description: 'The payment could not be saved. Please try again.',
  },
  'data-send-invoice': {
    title: 'Invoice not sent',
    description: 'The invoice email could not be sent.',
  },

  // Uploads
  'upload-photo': {
    title: 'Photo upload failed',
    description: 'The image could not be uploaded. Check file size and format.',
  },
  'upload-receipt': {
    title: 'Receipt upload failed',
    description: 'The receipt could not be uploaded or scanned.',
  },
  'upload-menu-file': {
    title: 'File upload failed',
    description: 'The menu file could not be uploaded.',
  },

  // Sync
  'sync-gmail': {
    title: 'Gmail sync failed',
    description: 'Could not sync your inbox. Check your Gmail connection in settings.',
  },
  'sync-calendar': {
    title: 'Calendar sync failed',
    description: 'Could not sync your schedule. Please try again.',
  },

  // Financial
  'finance-ledger-compute': {
    title: "Couldn't check your books",
    description: "Couldn't load your balances. Try refreshing.",
  },
  'finance-report': {
    title: 'Report failed',
    description: "Couldn't build your financial report. Try refreshing.",
  },
  'finance-break-even': {
    title: 'Analysis failed',
    description: "Couldn't complete your break-even analysis. Try refreshing.",
  },
  'finance-menu-engineering': {
    title: 'Analysis failed',
    description: "Couldn't complete your menu analysis. Try refreshing.",
  },

  // Generation
  'gen-pdf-menu': {
    title: 'Menu PDF failed',
    description: 'The menu document could not be created. Please try again.',
  },
  'gen-pdf-invoice': {
    title: 'Invoice PDF failed',
    description: 'The invoice document could not be created. Please try again.',
  },
  'gen-allergy-card': {
    title: 'Allergy card failed',
    description: 'The allergy reference card could not be created.',
  },
  'gen-contract': {
    title: 'Contract draft failed',
    description: 'Contract writing is temporarily unavailable. Please try again.',
  },

  // Import
  'import-recipe': {
    title: 'Recipe import failed',
    description: "Couldn't read your recipe. Try a simpler format or paste ingredients separately.",
  },
  'import-brain-dump': {
    title: 'Brain dump failed',
    description: "Couldn't sort through your notes. Please try again.",
  },

  // Auth
  'auth-sign-in': {
    title: 'Sign-in failed',
    description: "Couldn't sign you in. Please try again.",
  },
  'auth-sign-up': {
    title: 'Account creation failed',
    description: "Couldn't create your account. Please try again.",
  },
}

// Category-level fallbacks when a specific context ID has no error entry
const CATEGORY_ERROR_FALLBACKS: Record<LoadingCategory, { title: string; description: string }> = {
  navigation: {
    title: 'Page failed to load',
    description: "Couldn't load this page. Try refreshing.",
  },
  ai: {
    title: 'Something went wrong',
    description: 'This feature is temporarily unavailable. Please try again in a moment.',
  },
  data: { title: 'Save failed', description: 'Your changes could not be saved. Please try again.' },
  upload: { title: 'Upload failed', description: 'The file could not be uploaded.' },
  search: { title: 'Search failed', description: 'Could not complete the search.' },
  sync: { title: 'Sync failed', description: 'Could not sync your data. Please try again.' },
  financial: {
    title: 'Something went wrong',
    description: "Couldn't crunch your numbers. Try refreshing.",
  },
  generation: {
    title: 'Could not create document',
    description: 'The document could not be created. Please try again.',
  },
  import: { title: 'Import failed', description: 'Could not import your data. Please try again.' },
  auth: {
    title: 'Sign-in trouble',
    description: "Couldn't sign you in. Please try again.",
  },
}

/**
 * Get a loading context by its ID.
 */
export function getLoadingContext(id: string): LoadingContext | undefined {
  return LOADING_REGISTRY.find((ctx) => ctx.id === id)
}

/**
 * Get all loading contexts for a category.
 */
export function getLoadingsByCategory(category: LoadingCategory): LoadingContext[] {
  return LOADING_REGISTRY.filter((ctx) => ctx.category === category)
}

/**
 * Pick a random message from a loading context's message pool.
 */
export function pickLoadingMessage(id: string): string {
  const ctx = getLoadingContext(id)
  if (!ctx) return 'Loading...'
  return ctx.messages[Math.floor(Math.random() * ctx.messages.length)]
}

/**
 * Get the error message for a loading context.
 * Falls back to category-level message if no specific one exists.
 */
export function getErrorForContext(id: string): { title: string; description: string } {
  if (ERROR_MESSAGES[id]) return ERROR_MESSAGES[id]
  const ctx = getLoadingContext(id)
  if (ctx) return CATEGORY_ERROR_FALLBACKS[ctx.category]
  return {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
  }
}
