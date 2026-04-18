// Feature Classification Map - canonical source of truth for the two-tier product surface.
//
// Two tiers:
//   'free'  - Complete, standalone utility. Solo chef can operate without friction.
//             Manual, capable, no dead ends.
//   'paid'  - Leverage, automation, and scale. Replaces labor, increases accuracy,
//             or scales output. Automated, intelligent, scalable.
//
// Design constraint: no feature in the free tier should feel crippled.
// Design constraint: paid features are never locked buttons - they surface as
//                    contextual upgrade prompts AFTER the free version executes.
//
// Categories:
//   'core'         - Identity, account, basic CRUD (always free)
//   'intelligence' - Data depth, price intel, AI processing, normalization
//   'automation'   - Workflow automation, auto-generation, smart suggestions
//   'ops'          - Operational scale, team, inventory, purchasing
//   'crm'          - Full client relationship system
//   'compliance'   - Cannabis/specialized compliance, audit logs
//
// upgrade_trigger: defines when and how to surface the paid upgrade prompt.
//   moment  - the user action that reveals the limit
//   message - what the platform says after doing the free version
//   cta     - the prompt text
//
// NOT a server action file.

export type FeatureTier = 'free' | 'paid'

export type FeatureCategory = 'core' | 'intelligence' | 'automation' | 'ops' | 'crm' | 'compliance'

export type UpgradeTrigger = {
  /** The user action or context that reveals the upgrade opportunity */
  moment: string
  /** What the platform says after completing the free version of the action */
  message: string
  /** The call-to-action text shown in the prompt */
  cta: string
}

export type FeatureDefinition = {
  slug: string
  label: string
  description: string
  tier: FeatureTier
  category: FeatureCategory
  /** Only present on paid features - defines the contextual upgrade moment */
  upgrade_trigger?: UpgradeTrigger
}

// =============================================================================
// FREE LAYER - "Complete, Standalone Utility"
// =============================================================================
// Everything here allows a chef to operate meaningfully without friction.
// No dead ends. No locked core workflows.

const FREE_FEATURES: FeatureDefinition[] = [
  // --- Account + Identity ---
  {
    slug: 'account-signup',
    label: 'Sign Up / Login',
    description: 'Create account, authenticate, manage credentials',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'profile-basic',
    label: 'Chef Profile',
    description: 'Chef identity, cuisine type, region, bio, public presence',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'chef-page-public',
    label: 'Public Chef Page',
    description: 'Shareable public page showing the chef identity and offerings',
    tier: 'free',
    category: 'core',
  },

  // --- Menu + Recipe System ---
  {
    slug: 'menu-create',
    label: 'Menu Creation',
    description: 'Create and manage menus, courses, and components',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'recipe-create',
    label: 'Recipe Creation',
    description: 'Create and edit recipes manually, ingredient lists, methods',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'menu-export-basic',
    label: 'Menu Export (Basic)',
    description: 'Export menus as PDF or shareable view link',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'menu-share-link',
    label: 'Shareable Menu Links',
    description: 'Generate public-facing links for individual menus',
    tier: 'free',
    category: 'core',
  },

  // --- Ingredient + Price Lookup (Read-Only) ---
  {
    slug: 'ingredient-search',
    label: 'Ingredient Search',
    description: 'Search ingredients and products in the catalog',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'price-view-basic',
    label: 'Price Lookup (Basic)',
    description: 'View estimated pricing and location-aware averages for ingredients',
    tier: 'free',
    category: 'core',
  },

  // --- Client Interaction (Lightweight) ---
  {
    slug: 'inquiry-intake',
    label: 'Inquiry Intake',
    description: 'Receive and view incoming client inquiries via form or embed',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'client-view',
    label: 'Client Directory (View)',
    description: 'View client records, preferences, and basic history',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'quote-create',
    label: 'Quote Creation',
    description: 'Build quotes manually and send to clients',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'messaging-manual',
    label: 'Manual Messaging',
    description: 'Send and receive messages with clients manually',
    tier: 'free',
    category: 'core',
  },

  // --- Event Planning (Non-Advanced) ---
  {
    slug: 'event-create',
    label: 'Event Creation',
    description: 'Create events, attach menus, add basic notes and logistics',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'event-calendar-basic',
    label: 'Calendar (Basic)',
    description: 'View events on a calendar, day/week/month views',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'event-lifecycle',
    label: 'Event Lifecycle Management',
    description: 'Move events through 8-state FSM (draft to completed)',
    tier: 'free',
    category: 'core',
  },

  // --- Document Generation (Baseline) ---
  {
    slug: 'document-menu-pdf',
    label: 'Menu PDF',
    description: 'Generate a simple PDF menu for client presentation',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'invoice-basic',
    label: 'Invoice (Basic)',
    description: 'Generate and send a basic invoice',
    tier: 'free',
    category: 'core',
  },

  // --- Finance (Baseline) ---
  {
    slug: 'finance-ledger',
    label: 'Financial Ledger',
    description: 'Append-only ledger of income and expenses',
    tier: 'free',
    category: 'core',
  },
  {
    slug: 'payment-record',
    label: 'Payment Recording',
    description: 'Record incoming payments against events',
    tier: 'free',
    category: 'core',
  },

  // --- Availability ---
  {
    slug: 'availability-rules',
    label: 'Availability Rules',
    description: 'Set working days, blocked dates, and booking windows',
    tier: 'free',
    category: 'core',
  },
]

// =============================================================================
// PAID LAYER - "Leverage, Automation, and Scale"
// =============================================================================
// Users pay when the system replaces labor, increases accuracy, or scales output.

const PAID_FEATURES: FeatureDefinition[] = [
  // --- A. Intelligence + Data Depth ---
  {
    slug: 'price-intel-advanced',
    label: 'Advanced Price Intelligence',
    description:
      'Historical price trends, supplier-level breakdowns, regional comparisons at scale',
    tier: 'paid',
    category: 'intelligence',
    upgrade_trigger: {
      moment: 'Chef views ingredient price after using basic lookup',
      message: 'You can see exactly where prices have moved over the past 12 months.',
      cta: 'See price history',
    },
  },
  {
    slug: 'price-sync-live',
    label: 'Live Price Sync',
    description: 'Real-time price updates from live sourcing data (OpenClaw-fed)',
    tier: 'paid',
    category: 'intelligence',
    upgrade_trigger: {
      moment: 'Chef views a price that is more than 30 days stale',
      message:
        'This price is from our last manual update. Live sync keeps it current automatically.',
      cta: 'Enable live price sync',
    },
  },
  {
    slug: 'ingredient-normalization',
    label: 'Ingredient Auto-Matching',
    description: 'Automatic normalization and matching of ingredient variations across suppliers',
    tier: 'paid',
    category: 'intelligence',
    upgrade_trigger: {
      moment: 'Chef manually resolves an ambiguous ingredient match',
      message: 'This can be matched automatically across all your menus.',
      cta: 'Enable auto-matching',
    },
  },
  {
    slug: 'ingredient-bulk-resolve',
    label: 'Bulk Ingredient Resolution',
    description: 'Resolve and price large ingredient lists in one operation',
    tier: 'paid',
    category: 'intelligence',
    upgrade_trigger: {
      moment: 'Chef has more than 10 unresolved ingredients in a menu',
      message: 'Resolve all of these at once with one click.',
      cta: 'Bulk resolve ingredients',
    },
  },
  {
    slug: 'price-export',
    label: 'Price Data Export',
    description: 'Export ingredient pricing data to CSV or spreadsheet',
    tier: 'paid',
    category: 'intelligence',
    upgrade_trigger: {
      moment: 'Chef attempts to export price data',
      message: 'Export your full pricing data for use in your own tools.',
      cta: 'Unlock price export',
    },
  },

  // --- B. Costing + Financial Systems ---
  {
    slug: 'menu-costing-live',
    label: 'Live Menu Costing',
    description: 'Real-time cost recalculation as ingredients and prices change',
    tier: 'paid',
    category: 'intelligence',
    upgrade_trigger: {
      moment: 'Chef manually calculates food cost for a menu',
      message: 'This recalculates automatically every time a price changes.',
      cta: 'Enable live costing',
    },
  },
  {
    slug: 'costing-component-breakdown',
    label: 'Component-Level Cost Breakdown',
    description: 'See cost at dish, course, and component level with margin per line',
    tier: 'paid',
    category: 'intelligence',
    upgrade_trigger: {
      moment: 'Chef views total menu cost',
      message: 'See exactly which dish is eating your margin.',
      cta: 'Break down by component',
    },
  },
  {
    slug: 'margin-targeting',
    label: 'Margin Targeting + Profit Simulation',
    description: 'Set a target margin and simulate price adjustments to hit it',
    tier: 'paid',
    category: 'intelligence',
    upgrade_trigger: {
      moment: 'Chef completes food cost calculation',
      message: 'Set your target margin and see what to charge.',
      cta: 'Run profit simulation',
    },
  },
  {
    slug: 'event-profitability',
    label: 'Event Profitability Tracking',
    description: 'Track actual vs projected margins per event with post-event reconciliation',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef marks an event as completed',
      message: 'See how much this event actually made you.',
      cta: 'View profitability report',
    },
  },
  {
    slug: 'expense-ingestion',
    label: 'Expense Ingestion',
    description: 'Receipt scanning, AI parsing, and automatic categorization of expenses',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef manually enters an expense',
      message: 'Snap a photo of a receipt and it enters itself.',
      cta: 'Enable receipt scanning',
    },
  },
  {
    slug: 'finance-advanced',
    label: 'Advanced Finance',
    description: 'Cash flow forecasting, recurring invoices, tax tools, P&L reports',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef views the finance dashboard',
      message: 'Project your cash flow for the next 90 days.',
      cta: 'Unlock financial forecasting',
    },
  },
  {
    slug: 'payroll',
    label: 'Payroll',
    description: 'Staff compensation, contractor management, and 1099 generation',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef records a staff payment manually',
      message: 'Track all staff payments and generate 1099s at year end.',
      cta: 'Set up payroll',
    },
  },

  // --- C. Automation Layer ---
  {
    slug: 'workflow-automation',
    label: 'Workflow Automation',
    description:
      'End-to-end automation: event confirmed auto-triggers menu, costing, and document generation',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef manually kicks off menu-to-document workflow',
      message: 'This sequence runs automatically when an event is confirmed.',
      cta: 'Automate this workflow',
    },
  },
  {
    slug: 'substitution-smart',
    label: 'Smart Substitutions',
    description: 'Availability-aware ingredient substitutions with automatic recipe adjustments',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef looks up a substitution manually',
      message: 'Get availability-aware alternatives that already match your price targets.',
      cta: 'Enable smart substitutions',
    },
  },
  {
    slug: 'sourcing-auto',
    label: 'Auto-Sourcing Suggestions',
    description: 'Automatic sourcing recommendations based on location, price, and availability',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef manually searches for an ingredient source',
      message: 'Get sourcing recommendations tailored to your region and budget automatically.',
      cta: 'Enable auto-sourcing',
    },
  },
  {
    slug: 'ai-insights',
    label: 'AI Business Insights',
    description: 'Automated business intelligence, trend detection, and recommendations',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef views the dashboard',
      message: 'Your data can surface patterns you would never catch manually.',
      cta: 'Enable AI insights',
    },
  },
  {
    slug: 'ai-parsing',
    label: 'AI Document Parsing',
    description: 'Smart parsing of inquiries, receipts, and unstructured documents',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef manually types out an inquiry from a screenshot or email',
      message: 'Paste or upload any document and it fills itself in.',
      cta: 'Enable AI parsing',
    },
  },
  {
    slug: 'intelligence-hub',
    label: 'Intelligence Hub',
    description:
      'Seasonal forecasting, rebooking predictions, cash flow projections, inquiry triage, price anomaly detection',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef views analytics page',
      message: 'See what your next 90 days probably look like.',
      cta: 'Unlock predictive intelligence',
    },
  },

  // --- D. Client System (Full CRM) ---
  {
    slug: 'client-portal-full',
    label: 'Full Client Portal',
    description:
      'Client-facing portal with booking flow, menu viewing, document access, and payment',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef shares a menu or document link manually',
      message: 'Give clients their own portal where they can approve menus, pay, and message you.',
      cta: 'Enable client portal',
    },
  },
  {
    slug: 'booking-flow',
    label: 'Booking Flow',
    description: 'End-to-end client booking with availability, deposit, and confirmation',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef confirms an event after back-and-forth manually',
      message: 'Clients can book directly with your availability and deposit flow.',
      cta: 'Enable booking flow',
    },
  },
  {
    slug: 'payment-integration',
    label: 'Payment Integration',
    description: 'Collect deposits and final payments directly through the platform',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef records a payment received outside the platform',
      message: 'Collect payments directly without chasing checks or Venmo.',
      cta: 'Set up payment collection',
    },
  },
  {
    slug: 'client-history-full',
    label: 'Client History + Preferences',
    description: 'Full dietary preference tracking, event history, LTV, and relationship timeline',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef looks up a returning client',
      message:
        'See everything this client has ever ordered, their preferences, and what they spent.',
      cta: 'Unlock full client history',
    },
  },
  {
    slug: 'automated-followups',
    label: 'Automated Client Follow-Ups',
    description: 'Post-event follow-up sequences, re-engagement campaigns, review requests',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef marks an event completed',
      message: 'A follow-up sequence goes out automatically - you never have to remember.',
      cta: 'Enable follow-ups',
    },
  },
  {
    slug: 'client-intelligence',
    label: 'Client Intelligence',
    description: 'Client segments, health scores, LTV trajectory, churn prediction',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef views client list',
      message: 'See which clients are at risk of lapsing and which ones to prioritize.',
      cta: 'Enable client intelligence',
    },
  },
  {
    slug: 'loyalty',
    label: 'Loyalty Program',
    description: 'Points, rewards, referrals, and automated award rules',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef has a returning client who has booked 3+ times',
      message: 'Reward your most loyal clients automatically.',
      cta: 'Set up loyalty program',
    },
  },
  {
    slug: 'marketing',
    label: 'Marketing Suite',
    description: 'Email campaigns, push dinners, social media publishing',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef has a gap in their calendar',
      message: 'Fill open dates with a targeted campaign to past clients.',
      cta: 'Run a campaign',
    },
  },

  // --- E. Operational Scale Tools ---
  {
    slug: 'multi-event-dashboard',
    label: 'Multi-Event Management',
    description: 'Consolidated dashboard for managing multiple concurrent events',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef has 3+ active events',
      message: 'Manage all your active events from one consolidated view.',
      cta: 'Open multi-event dashboard',
    },
  },
  {
    slug: 'team-collaboration',
    label: 'Team Collaboration',
    description: 'Staff roles, permissions, and multi-user access to shared events',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef adds a staff member',
      message: 'Give staff their own access with role-based permissions.',
      cta: 'Enable team access',
    },
  },
  {
    slug: 'staff-management',
    label: 'Staff Management',
    description: 'Scheduling, clock in/out, performance tracking, and labor costs',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef manually records staff hours',
      message: 'Track hours, performance, and labor costs automatically.',
      cta: 'Enable staff management',
    },
  },
  {
    slug: 'prep-workflows',
    label: 'Prep Task Workflows',
    description: 'Structured prep checklists, station assignments, and timeline management',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef views an event with no prep plan',
      message: 'Build a prep timeline with station assignments in 2 minutes.',
      cta: 'Build prep workflow',
    },
  },
  {
    slug: 'inventory-purchasing',
    label: 'Inventory + Purchasing',
    description:
      'Inventory counts, waste tracking, purchase orders, and vendor invoice reconciliation',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef generates a shopping list manually',
      message: 'Track what you have and generate purchase orders automatically.',
      cta: 'Enable inventory system',
    },
  },
  {
    slug: 'advanced-analytics',
    label: 'Advanced Analytics',
    description: 'Benchmarks, pipeline forecast, demand heatmap, custom reports',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef views the basic analytics page',
      message: 'See how your performance compares to your past trends.',
      cta: 'Unlock advanced analytics',
    },
  },
  {
    slug: 'advanced-calendar',
    label: 'Advanced Calendar',
    description: 'Calendar sharing, year view, protected time blocks, ICS sync',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef tries to share their calendar or export to Google Calendar',
      message: 'Share your availability and sync to any calendar app.',
      cta: 'Enable calendar sync',
    },
  },
  {
    slug: 'nutrition-analysis',
    label: 'Nutritional Analysis',
    description: 'Per-dish macro and calorie breakdown, allergen tracking, chef overrides',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef has a client with specific dietary requirements',
      message: 'Know the exact nutritional profile of every dish you serve.',
      cta: 'Enable nutrition tracking',
    },
  },
  {
    slug: 'meal-prep-ops',
    label: 'Meal Prep Operations',
    description:
      'Rotating menus, container tracking, and delivery scheduling for recurring prep clients',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef creates a recurring weekly event',
      message: 'Manage rotating menus, containers, and delivery in one system.',
      cta: 'Enable meal prep mode',
    },
  },
  {
    slug: 'social-hub',
    label: 'Social Event Hub',
    description: 'Group chat, visual themes, collaborative planning, guest profiles, polls',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef creates an event with multiple guests',
      message: 'Let guests collaborate on themes, menus, and logistics directly.',
      cta: 'Enable Social Event Hub',
    },
  },
  {
    slug: 'integrations',
    label: 'Integrations',
    description: 'Gmail scanning, social OAuth, webhooks, custom fields',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef manually copies information from Gmail into ChefFlow',
      message: 'Connect Gmail to pull in inquiries automatically.',
      cta: 'Connect Gmail',
    },
  },

  // --- F. Cannabis / Compliance Systems ---
  {
    slug: 'cannabis-portal',
    label: 'Cannabis Dining Portal',
    description:
      'Full cannabis dining module: events, control packets, guest intake, host agreements, handbook, and dedicated ledger',
    tier: 'paid',
    category: 'compliance',
    upgrade_trigger: {
      moment: 'Chef enables cannabis_preference on an event',
      message:
        'Access the full cannabis dining toolkit: control packets, guest consent, dosing reconciliation, and compliance documentation.',
      cta: 'Unlock Cannabis Portal',
    },
  },
  {
    slug: 'dose-tracking',
    label: 'Dose Tracking',
    description: 'Per-seat dosing records, limits, and tracking for infused events',
    tier: 'paid',
    category: 'compliance',
    upgrade_trigger: {
      moment: 'Chef creates an event with infused menu items',
      message: 'Track dosing per guest with a full accountability record.',
      cta: 'Enable dose tracking',
    },
  },
  {
    slug: 'compliance-logs',
    label: 'Compliance Logs + Export',
    description: 'Event audit packets, compliance-ready exports, and regulatory documentation',
    tier: 'paid',
    category: 'compliance',
    upgrade_trigger: {
      moment: 'Chef completes an infused event',
      message: 'Export a compliance-ready audit packet for this event.',
      cta: 'Generate compliance packet',
    },
  },

  // --- G. Admin / Infrastructure (Power User Tier) ---
  {
    slug: 'voice-automation',
    label: 'Voice Automation',
    description: 'Automated vendor calls, supplier outreach, and voice workflow integration',
    tier: 'paid',
    category: 'automation',
    upgrade_trigger: {
      moment: 'Chef places a vendor call manually',
      message: 'Let the system handle routine supplier calls automatically.',
      cta: 'Enable voice automation',
    },
  },
  {
    slug: 'sms-workflows',
    label: 'SMS Notification Workflows',
    description: 'Automated SMS reminders, confirmations, and follow-ups to clients',
    tier: 'paid',
    category: 'crm',
    upgrade_trigger: {
      moment: 'Chef sends a manual reminder to a client',
      message: 'Automated reminders go out at the right moment without you thinking about it.',
      cta: 'Enable SMS workflows',
    },
  },
  {
    slug: 'professional-dev',
    label: 'Professional Development',
    description: 'Skills inventory, growth check-ins, education tracking, and work journal',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef views the professional development page',
      message: 'Track your growth as a professional with structured check-ins.',
      cta: 'Enable professional development',
    },
  },
  {
    slug: 'commerce',
    label: 'Commerce Engine',
    description:
      'POS register, counter sales, product catalog, order-ahead, and payment processing',
    tier: 'paid',
    category: 'ops',
    upgrade_trigger: {
      moment: 'Chef tries to process a counter sale',
      message: 'Process walk-up and pre-order sales with a full POS system.',
      cta: 'Enable Commerce Engine',
    },
  },
]

// =============================================================================
// Exports
// =============================================================================

export const FEATURE_CLASSIFICATIONS: FeatureDefinition[] = [...FREE_FEATURES, ...PAID_FEATURES]

/** Set of all paid feature slugs - used for quick tier checks. */
export const PAID_FEATURE_SLUGS = new Set(PAID_FEATURES.map((f) => f.slug))

/** Look up a feature by slug. */
export function getFeature(slug: string): FeatureDefinition | undefined {
  return FEATURE_CLASSIFICATIONS.find((f) => f.slug === slug)
}

/** Check if a feature slug is in the paid tier. */
export function isPaidFeature(slug: string): boolean {
  return PAID_FEATURE_SLUGS.has(slug)
}

/** Get all features in a specific category. */
export function getFeaturesByCategory(category: FeatureCategory): FeatureDefinition[] {
  return FEATURE_CLASSIFICATIONS.filter((f) => f.category === category)
}

/** Get all paid features - used for billing page "what you unlock" list. */
export function getPaidFeatures(): FeatureDefinition[] {
  return PAID_FEATURES
}

/** Get all free features - used for "free tier" summary. */
export function getFreeFeatures(): FeatureDefinition[] {
  return FREE_FEATURES
}

/**
 * Get the upgrade trigger for a paid feature.
 * Returns null for free features or paid features without a trigger defined.
 */
export function getUpgradeTrigger(slug: string): UpgradeTrigger | null {
  const feature = getFeature(slug)
  if (!feature || feature.tier === 'free') return null
  return feature.upgrade_trigger ?? null
}
