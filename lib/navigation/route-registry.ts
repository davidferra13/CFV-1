// Route Registry - Single source of truth for all navigable routes
// Used by: Remy intent parser, Remy route maps, navigation config
// Update this when adding new pages. nav-config.tsx is the visual config;
// this is the text-only version for AI and tools.

import { collectNavRouteEntries } from '@/components/navigation/nav-config'

export interface RouteEntry {
  path: string
  label: string
  /** Short description for Remy's system prompt */
  description: string
  /** Admin-only routes are excluded from non-admin contexts */
  adminOnly?: boolean
}

/**
 * All navigable routes in ChefFlow.
 * When you add a new page, add it here too.
 */
const CURATED_ROUTE_REGISTRY: RouteEntry[] = [
  // Core
  { path: '/dashboard', label: 'Dashboard', description: 'Dashboard overview' },
  { path: '/briefing', label: 'Briefing', description: 'Morning briefing and daily prep' },
  { path: '/commands', label: 'Remy', description: 'Remy AI assistant', adminOnly: true },
  { path: '/daily', label: 'Daily Ops', description: 'Daily operations and task list' },
  {
    path: '/inbox',
    label: 'Inbox',
    description: 'Unified inbox (emails, messages, notifications)',
  },

  // Clients
  { path: '/clients', label: 'Clients', description: 'Client directory' },
  { path: '/clients/new', label: 'New Client', description: 'Add a new client' },
  {
    path: '/communications',
    label: 'Communications',
    description: 'Client communication workspace',
  },
  { path: '/feedback', label: 'Feedback', description: 'Customer feedback and testimonial intake' },
  { path: '/surveys', label: 'Surveys', description: 'Survey inbox and response tracking' },
  { path: '/circles', label: 'Circles', description: 'Client circles and community hub' },

  // Sales
  { path: '/inquiries', label: 'Inquiries', description: 'Inquiry pipeline' },
  { path: '/inquiries/new', label: 'New Inquiry', description: 'Log a new inquiry' },
  {
    path: '/inquiries/awaiting-response',
    label: 'Awaiting Response',
    description: 'Inquiries awaiting your response',
  },
  {
    path: '/inquiries/awaiting-client-reply',
    label: 'Awaiting Client Reply',
    description: 'Inquiries awaiting client reply',
  },
  {
    path: '/inquiries/menu-drafting',
    label: 'Menu Drafting',
    description: 'Inquiries in menu drafting stage',
  },
  {
    path: '/inquiries/sent-to-client',
    label: 'Sent to Client',
    description: 'Inquiries sent to client',
  },
  { path: '/inquiries/declined', label: 'Declined', description: 'Declined inquiries' },
  { path: '/quotes', label: 'Quotes', description: 'Quote management' },
  { path: '/quotes/new', label: 'New Quote', description: 'Create a new quote' },
  { path: '/proposals', label: 'Proposals', description: 'Proposal templates' },
  {
    path: '/wix-submissions',
    label: 'Wix Submissions',
    description: 'Inbound Wix lead submissions',
  },

  // Events
  { path: '/events', label: 'All Events', description: 'All events list' },
  { path: '/events/new', label: 'New Event', description: 'Create a new event' },
  { path: '/events/upcoming', label: 'Upcoming Events', description: 'Upcoming events' },
  { path: '/events/board', label: 'Event Board', description: 'Event kanban board' },
  {
    path: '/events/awaiting-deposit',
    label: 'Awaiting Deposit',
    description: 'Events awaiting deposit',
  },
  { path: '/events/confirmed', label: 'Confirmed Events', description: 'Confirmed events' },
  { path: '/events/completed', label: 'Completed Events', description: 'Completed events' },
  { path: '/events/cancelled', label: 'Cancelled Events', description: 'Cancelled events' },

  // Communication
  { path: '/chat', label: 'Messaging', description: 'Client messaging' },

  // Calendar
  { path: '/schedule', label: 'Calendar', description: 'Calendar and availability' },
  { path: '/calendar', label: 'Calendar Views', description: 'Calendar views' },
  {
    path: '/production',
    label: 'Production Calendar',
    description: 'Production planning calendar',
  },
  { path: '/scheduling', label: 'Scheduling', description: 'Scheduling dashboard' },

  // Culinary
  {
    path: '/culinary',
    label: 'Culinary Hub',
    description: 'Culinary workspace and kitchen systems',
  },
  { path: '/recipes', label: 'Recipes', description: 'Recipe library' },
  { path: '/recipes/new', label: 'New Recipe', description: 'Create a new recipe' },
  { path: '/recipes/ingredients', label: 'Ingredients', description: 'Ingredient database' },
  { path: '/menus', label: 'Menus', description: 'Menu library' },
  { path: '/menus/new', label: 'New Menu', description: 'Create a new menu' },
  { path: '/bakery/production', label: 'Bakery', description: 'Bakery production workflow' },
  { path: '/rate-card', label: 'Rate Card', description: 'Service rate card and pricing' },

  // Operations
  { path: '/operations', label: 'Operations Hub', description: 'Kitchen operations hub' },
  { path: '/staff', label: 'Staff', description: 'Staff management' },
  { path: '/team', label: 'Team', description: 'Team access and roster management' },
  { path: '/tasks', label: 'Tasks', description: 'Task board' },
  { path: '/stations', label: 'Stations', description: 'Kitchen stations and prep tracking' },
  { path: '/training', label: 'Training', description: 'Training and SOP library' },
  { path: '/travel', label: 'Travel', description: 'Travel planning and mileage' },
  { path: '/documents', label: 'Documents', description: 'Document management' },
  { path: '/vendors', label: 'Vendors', description: 'Vendor and purveyor management' },
  {
    path: '/inventory',
    label: 'Inventory',
    description: 'Inventory counts, audits, and waste tracking',
  },
  {
    path: '/food-truck/loadout',
    label: 'Food Truck',
    description: 'Food truck operations workspace',
  },

  // Finance
  { path: '/financials', label: 'Financial Hub', description: 'Financial overview and reports' },
  { path: '/finance', label: 'Finance Home', description: 'Finance home and operational ledger' },
  { path: '/finance/overview', label: 'Finance Overview', description: 'Financial dashboard' },
  { path: '/finance/invoices', label: 'Invoices', description: 'Invoice management' },
  { path: '/finance/payments', label: 'Payments', description: 'Payment tracking' },
  { path: '/finance/reporting', label: 'Reports', description: 'Financial reports' },
  { path: '/reports', label: 'Reports Hub', description: 'Cross-functional reporting hub' },
  { path: '/finance/tax', label: 'Tax', description: 'Tax summary and documents' },
  { path: '/expenses', label: 'Expenses', description: 'Expense tracker' },
  { path: '/expenses/new', label: 'New Expense', description: 'Add an expense' },

  // Commerce
  { path: '/commerce', label: 'Commerce', description: 'Commerce hub' },
  { path: '/commerce/register', label: 'POS Register', description: 'Point of sale register' },
  {
    path: '/commerce/virtual-terminal',
    label: 'Virtual Terminal',
    description: 'Virtual payment terminal',
  },
  {
    path: '/commerce/table-service',
    label: 'Table Service',
    description: 'Table service and ordering',
  },
  { path: '/commerce/promotions', label: 'Promotions', description: 'Promotions and discounts' },

  // Marketing
  { path: '/prospecting', label: 'Prospecting', description: 'Lead prospecting', adminOnly: true },
  { path: '/testimonials', label: 'Testimonials', description: 'Client testimonials' },
  { path: '/portfolio', label: 'Portfolio', description: 'Portfolio and gallery' },
  { path: '/social', label: 'Social', description: 'Social content planner and publishing queue' },
  { path: '/social/planner', label: 'Social Planner', description: 'Social content planner' },
  { path: '/photos', label: 'Photos', description: 'Photo gallery and media vault' },

  // Analytics
  { path: '/analytics', label: 'Analytics', description: 'Analytics and reports' },
  { path: '/activity', label: 'Activity', description: 'Activity feed' },
  { path: '/goals', label: 'Goals', description: 'Business goals' },
  { path: '/aar', label: 'After-Action Reviews', description: 'After-action reviews' },
  { path: '/reviews', label: 'Reviews', description: 'Client reviews' },
  { path: '/loyalty', label: 'Loyalty', description: 'Loyalty program management' },

  // Protection
  { path: '/consulting', label: 'Consulting', description: 'Consulting sessions' },
  { path: '/charity', label: 'Charity Hub', description: 'Charity and community', adminOnly: true },
  { path: '/partners', label: 'Partners', description: 'Partner network' },
  { path: '/waitlist', label: 'Waitlist', description: 'Availability waitlist' },
  { path: '/network', label: 'Community', description: 'Chef community hub' },
  {
    path: '/community/templates',
    label: 'Community Templates',
    description: 'Shared community templates',
  },
  { path: '/notifications', label: 'Notifications', description: 'Notification center' },
  { path: '/templates', label: 'Template Library', description: 'Template library' },
  { path: '/onboarding', label: 'Onboarding', description: 'Onboarding hub and imports' },

  // Settings
  { path: '/settings', label: 'Settings', description: 'Account settings' },
  { path: '/settings/my-profile', label: 'Edit Profile', description: 'Edit your profile' },
  {
    path: '/settings/public-profile',
    label: 'Public Profile',
    description: 'Public-facing profile',
  },
  {
    path: '/settings/integrations',
    label: 'Integrations',
    description: 'Third-party integrations',
  },
  { path: '/settings/automations', label: 'Automations', description: 'Automation settings' },
  {
    path: '/settings/culinary-profile',
    label: 'Culinary Profile',
    description: 'Culinary identity for Remy',
  },
  { path: '/settings/favorite-chefs', label: 'Favorite Chefs', description: 'Culinary heroes' },
  {
    path: '/settings/ai-privacy',
    label: 'AI Privacy',
    description: 'Remy settings, personality, privacy controls',
  },
  { path: '/settings/modules', label: 'Modules', description: 'Feature module toggles' },
  {
    path: '/settings/navigation',
    label: 'Navigation',
    description: 'Sidebar navigation customization',
  },
  {
    path: '/settings/dashboard',
    label: 'Dashboard Settings',
    description: 'Dashboard widget customization',
  },
  {
    path: '/settings/embed',
    label: 'Embed Widget',
    description: 'Embeddable inquiry widget settings',
  },

  // Remy
  { path: '/remy', label: 'Remy History', description: 'Everything Remy has saved' },
  { path: '/queue', label: 'AI Queue', description: 'AI processing queue' },
]

function buildNavFallbackDescription(label: string, path: string): string {
  if (path.startsWith('/settings/')) return `${label} settings page`
  if (path.startsWith('/admin/')) return `${label} admin page`
  return `${label} page`
}

function buildNavFallbackRegistry(): RouteEntry[] {
  return collectNavRouteEntries().map((route) => ({
    path: route.href,
    label: route.label,
    description: buildNavFallbackDescription(route.label, route.href),
    adminOnly: route.adminOnly,
  }))
}

function dedupeRouteRegistry(entries: RouteEntry[]): RouteEntry[] {
  const byPath = new Map<string, RouteEntry>()

  for (const entry of entries) {
    if (byPath.has(entry.path)) continue
    byPath.set(entry.path, entry)
  }

  return Array.from(byPath.values())
}

export const ROUTE_REGISTRY: RouteEntry[] = dedupeRouteRegistry([
  ...CURATED_ROUTE_REGISTRY,
  ...buildNavFallbackRegistry(),
])

/**
 * Build a formatted route map string for Remy's system prompt.
 * Excludes admin-only routes when isAdmin is false.
 */
export function buildRouteMapForPrompt(isAdmin = false): string {
  const lines = ['AVAILABLE PAGES (suggest these when relevant):']
  for (const route of ROUTE_REGISTRY) {
    if (route.adminOnly && !isAdmin) continue
    lines.push(`${route.path} - ${route.description}`)
  }
  return lines.join('\n')
}

/**
 * Build a route lookup map for the intent parser (path matching by keyword).
 * Returns Record<keyword, path>.
 */
export function buildRouteLookupMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const route of ROUTE_REGISTRY) {
    // Use the label lowercased as the primary key
    const key = route.label.toLowerCase()
    map[key] = route.path

    // Also add the last path segment as a key
    const segment = route.path.split('/').filter(Boolean).pop()
    if (segment && !map[segment]) {
      map[segment] = route.path
    }
  }
  return map
}
