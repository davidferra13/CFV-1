// Route Metadata - tiered classification of all major routes.
// Tiers represent the chef's journey from sign-up through established business.
// Used by the surface graph to decide visibility at each stage.

export type RouteTier = 'day-one' | 'week-one' | 'established' | 'power' | 'admin'

/**
 * Map of route path to its tier. Routes not listed default to 'established'.
 *
 * day-one:      The ~20 surfaces every new chef needs immediately.
 * week-one:     Surfaces that become relevant after the first events/clients.
 * established:  Full feature set for active businesses.
 * power:        Advanced features for mature operations.
 * admin:        Internal/platform admin surfaces.
 */
export const ROUTE_TIERS: Record<string, RouteTier> = {
  // ── Day-one: core workflows every chef needs from minute one ───────
  '/dashboard': 'day-one',
  '/events': 'day-one',
  '/events/new': 'day-one',
  '/events/board': 'day-one',
  '/clients': 'day-one',
  '/clients/new': 'day-one',
  '/culinary': 'day-one',
  '/recipes': 'day-one',
  '/recipes/new': 'day-one',
  '/menus': 'day-one',
  '/menus/new': 'day-one',
  '/finance': 'day-one',
  '/finance/invoices': 'day-one',
  '/inbox': 'day-one',
  '/calendar': 'day-one',
  '/settings': 'day-one',
  '/culinary/prep': 'day-one',
  '/inquiries': 'day-one',
  '/inquiries/new': 'day-one',
  '/quotes': 'day-one',
  '/quotes/new': 'day-one',
  '/remy': 'day-one',
  '/onboarding': 'day-one',
  '/welcome': 'day-one',
  '/help': 'day-one',

  // ── Week-one: relevant after first events/clients land ─────────────
  '/clients/communication': 'week-one',
  '/clients/insights': 'week-one',
  '/expenses': 'week-one',
  '/finance/expenses': 'week-one',
  '/finance/payments': 'week-one',
  '/culinary/ingredients': 'week-one',
  '/culinary/costing': 'week-one',
  '/vendors': 'week-one',
  '/contracts': 'week-one',
  '/chat': 'week-one',
  '/notifications': 'week-one',
  '/daily': 'week-one',
  '/queue': 'week-one',
  '/activity': 'week-one',
  '/recipes/sprint': 'week-one',
  '/culinary/components': 'week-one',
  '/calls': 'week-one',
  '/rate-card': 'week-one',
  '/proposals': 'week-one',
  '/documents': 'week-one',
  '/staff': 'week-one',
  '/tasks': 'week-one',
  '/circles': 'week-one',
  '/reputation': 'week-one',
  '/reviews': 'week-one',
  '/settings/profile': 'week-one',
  '/settings/pricing': 'week-one',
  '/settings/templates': 'week-one',
  '/import': 'week-one',
  '/briefing': 'week-one',
  '/culinary/prep/shopping': 'week-one',

  // ── Established: full feature set for active businesses ────────────
  '/analytics': 'established',
  '/marketing': 'established',
  '/marketing/social': 'established',
  '/leads': 'established',
  '/guest-leads': 'established',
  '/prospecting': 'established',
  '/partners': 'established',
  '/marketplace': 'established',
  '/inventory': 'established',
  '/food-cost': 'established',
  '/culinary/dish-index': 'established',
  '/kitchen': 'established',
  '/stations': 'established',
  '/meal-prep': 'established',
  '/travel': 'established',
  '/ops': 'established',
  '/availability': 'established',
  '/portfolio': 'established',
  '/content': 'established',
  '/community/templates': 'established',
  '/network': 'established',
  '/clients/recurring': 'established',
  '/clients/gift-cards': 'established',
  '/clients/preferences': 'established',
  '/charity': 'established',
  '/prices': 'established',
  '/loyalty': 'established',
  '/surveys': 'established',
  '/goals': 'established',
  '/finance/reporting': 'established',
  '/finance/payouts': 'established',
  '/commerce': 'established',
  '/commerce/register': 'established',
  '/commerce/products': 'established',
  '/commerce/orders': 'established',
  '/commerce/reports': 'established',
  '/culinary-board': 'established',
  '/cannabis': 'established',
  '/production': 'established',
  '/settings/automations': 'established',
  '/settings/integrations': 'established',
  '/settings/compliance/incidents': 'established',
  '/settings/favorite-chefs': 'established',
  '/reminders': 'established',
  '/waitlist': 'established',
  '/pulse': 'established',
  '/insights': 'established',

  // ── Power: advanced features for mature operations ─────────────────
  '/finance/ledger': 'power',
  '/finance/tax': 'power',
  '/finance/payroll': 'power',
  '/nutrition': 'power',
  '/intelligence': 'power',
  '/reports': 'power',
  '/consulting': 'power',
  '/quotes/calculator': 'power',
  '/kiosk': 'power',
  '/locations': 'power',
  '/team': 'power',
  '/guests': 'power',
  '/guest-analytics': 'power',
  '/loyalty/raffle': 'power',
  '/settings/modules': 'power',
  '/settings/security': 'power',
  '/settings/devices': 'power',
  '/social': 'power',

  // ── Admin: platform-level surfaces ─────────────────────────────────
  '/admin': 'admin',
  '/admin/pulse': 'admin',
  '/admin/users': 'admin',
  '/admin/events': 'admin',
  '/admin/inquiries': 'admin',
  '/admin/conversations': 'admin',
  '/admin/financials': 'admin',
  '/admin/flags': 'admin',
  '/admin/beta': 'admin',
  '/admin/directory': 'admin',
  '/admin/directory-listings': 'admin',
  '/admin/referral-partners': 'admin',
  '/admin/price-catalog': 'admin',
  '/admin/communications': 'admin',
  '/admin/social': 'admin',
  '/admin/feedback': 'admin',
  '/admin/audit': 'admin',
  '/admin/outreach': 'admin',
  '/admin/hub': 'admin',
  '/admin/notifications': 'admin',
  '/admin/openclaw': 'admin',
  '/admin/presence': 'admin',
  '/admin/analytics': 'admin',
  '/admin/silent-failures': 'admin',
  '/admin/command-center': 'admin',
  '/admin/system': 'admin',
  '/dev/simulate': 'admin',
  '/wix-submissions': 'admin',
}

/**
 * Look up a route's tier. Unregistered routes default to 'established'.
 * Strips trailing slashes and normalizes before lookup.
 */
export function getRouteTier(routePath: string): RouteTier {
  const normalized = routePath === '/' ? '/' : routePath.replace(/\/+$/, '')
  return ROUTE_TIERS[normalized] ?? 'established'
}

/**
 * Return all routes at or below the given tier.
 * Order: day-one < week-one < established < power < admin
 */
const TIER_ORDER: RouteTier[] = ['day-one', 'week-one', 'established', 'power', 'admin']

export function getRoutesAtOrBelowTier(tier: RouteTier): string[] {
  const maxIndex = TIER_ORDER.indexOf(tier)
  return Object.entries(ROUTE_TIERS)
    .filter(([, t]) => TIER_ORDER.indexOf(t) <= maxIndex)
    .map(([path]) => path)
}
