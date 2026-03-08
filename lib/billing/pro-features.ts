// Declarative registry of Pro-gated features.
// Used by requirePro() for server-side enforcement and by UpgradeGate for UI prompts.
//
// Each entry maps a feature slug → display metadata.
// Server actions use the slug to identify which feature is being gated.
// The registry is also used on the billing page to show "what you get with Pro."
//
// NOT a server action file — no 'use server'.

export type ProFeature = {
  slug: string
  label: string
  description: string
  category:
    | 'ai'
    | 'analytics'
    | 'finance'
    | 'marketing'
    | 'clients'
    | 'staff'
    | 'operations'
    | 'protection'
    | 'community'
    | 'integrations'
    | 'professional'
    | 'calendar'
    | 'loyalty'
    | 'commerce'
    | 'branding'
}

export const PRO_FEATURES: ProFeature[] = [
  // AI
  {
    slug: 'remy',
    label: 'Remy AI Assistant',
    description: 'Your AI sous chef for business operations',
    category: 'ai',
  },
  {
    slug: 'ai-parsing',
    label: 'AI Document Parsing',
    description: 'Smart parsing of inquiries, receipts, and recipes',
    category: 'ai',
  },
  {
    slug: 'ai-insights',
    label: 'AI Business Insights',
    description: 'Automated business intelligence and recommendations',
    category: 'ai',
  },

  // Analytics
  {
    slug: 'advanced-analytics',
    label: 'Advanced Analytics',
    description: 'Benchmarks, pipeline forecast, demand heatmap, client LTV',
    category: 'analytics',
  },
  {
    slug: 'custom-reports',
    label: 'Custom Reports',
    description: 'Build and save custom analytical reports',
    category: 'analytics',
  },

  // Finance
  {
    slug: 'advanced-finance',
    label: 'Advanced Finance',
    description: 'Cash flow forecasting, bank feed, recurring invoices, tax tools',
    category: 'finance',
  },
  {
    slug: 'payroll',
    label: 'Payroll',
    description: 'Staff compensation, contractor management, and 1099 generation',
    category: 'finance',
  },

  // Marketing
  {
    slug: 'marketing',
    label: 'Marketing Suite',
    description: 'Email campaigns, push dinners, social media publishing',
    category: 'marketing',
  },

  // Clients
  {
    slug: 'client-intelligence',
    label: 'Client Intelligence',
    description: 'Segments, health scores, LTV trajectory, churn prediction',
    category: 'clients',
  },

  // Loyalty
  {
    slug: 'loyalty',
    label: 'Loyalty Program',
    description: 'Points, rewards, referrals, auto-award rules',
    category: 'loyalty',
  },

  // Staff
  {
    slug: 'staff-management',
    label: 'Staff Management',
    description: 'Scheduling, clock in/out, performance, labor costs',
    category: 'staff',
  },

  // Operations
  {
    slug: 'operations',
    label: 'Operations & Inventory',
    description: 'Inventory counts, waste tracking, vendor invoices, food cost analysis',
    category: 'operations',
  },

  // Protection
  {
    slug: 'protection',
    label: 'Business Protection',
    description: 'Insurance, certifications, continuity planning, crisis response',
    category: 'protection',
  },

  // Community
  {
    slug: 'community',
    label: 'Chef Community',
    description: 'Network feed, channels, connections, collaboration',
    category: 'community',
  },

  // Integrations
  {
    slug: 'integrations',
    label: 'Integrations & Automations',
    description: 'Gmail scanning, social OAuth, webhooks, custom fields',
    category: 'integrations',
  },

  // Professional
  {
    slug: 'professional',
    label: 'Professional Development',
    description: 'Skills inventory, growth check-ins, education, journal',
    category: 'professional',
  },

  // Calendar
  {
    slug: 'advanced-calendar',
    label: 'Advanced Calendar',
    description: 'Calendar sharing, year view, protected time, ICS sync',
    category: 'calendar',
  },

  // Raffle
  {
    slug: 'raffle',
    label: 'Monthly Raffle',
    description: 'Monthly prize drawings with game-based entries and anonymous leaderboard',
    category: 'loyalty',
  },

  // Commerce
  {
    slug: 'commerce',
    label: 'Commerce Engine',
    description: 'POS register, counter sales, product catalog, order-ahead, payment processing',
    category: 'commerce',
  },
  // Intelligence
  {
    slug: 'intelligence-hub',
    label: 'Intelligence Hub',
    description:
      'Seasonal forecasting, rebooking predictions, cash flow projections, smart scheduling, inquiry triage, post-event triggers, price anomaly detection, dietary trends, ingredient consolidation, network intelligence',
    category: 'analytics',
  },
  {
    slug: 'social-hub',
    label: 'Social Event Hub',
    description:
      'Group chat, visual themes, collaborative event planning, guest profiles, polls, pinned notes',
    category: 'clients',
  },
  {
    slug: 'social-dining',
    label: 'Open Tables',
    description:
      'Social dining discovery. Clients make their dinner circles discoverable to other foodies in your network.',
    category: 'community',
  },
  {
    slug: 'nutrition-analysis',
    label: 'Nutritional Analysis',
    description:
      'Per-dish macro and calorie breakdown via Spoonacular, allergen tracking, chef overrides',
    category: 'operations',
  },
  {
    slug: 'meal-prep',
    label: 'Meal Prep Operations',
    description:
      'Rotating menus, container tracking, delivery scheduling for weekly meal prep clients',
    category: 'operations',
  },
  // Branding
  {
    slug: 'remove-platform-branding',
    label: 'White-Label Branding',
    description:
      'Remove "Powered by ChefFlow" from all client-facing surfaces: emails, PDFs, portals, and widgets',
    category: 'branding',
  },
]

/** Set of all Pro feature slugs — used for quick lookup. */
export const PRO_FEATURE_SLUGS = new Set(PRO_FEATURES.map((f) => f.slug))

/** Look up a Pro feature by slug. */
export function getProFeature(slug: string): ProFeature | undefined {
  return PRO_FEATURES.find((f) => f.slug === slug)
}
