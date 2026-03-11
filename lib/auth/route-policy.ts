// Centralized route access policy used by middleware and unit tests.
// This is the single source of truth for public/protected route matching.

export const CHEF_PROTECTED_PATHS = [
  '/aar',
  '/activity',
  '/analytics',
  '/bakery',
  '/briefing',
  '/calendar',
  '/calls',
  '/cannabis',
  '/charity',
  '/chat',
  '/chef',
  '/circles',
  '/client-requests',
  '/clients',
  '/commands',
  '/commerce',
  '/communications',
  '/community',
  '/compliance',
  '/consulting',
  '/contracts',
  '/culinary',
  '/culinary-board',
  '/daily',
  '/dashboard',
  '/dev',
  '/documents',
  '/events',
  '/expenses',
  '/feedback',
  '/finance',
  '/financials',
  '/food-cost',
  '/food-truck',
  '/games',
  '/goals',
  '/guest-analytics',
  '/guest-leads',
  '/guests',
  '/help',
  '/import',
  '/inbox',
  '/inquiries',
  '/insights',
  '/intelligence',
  '/inventory',
  '/leads',
  '/loyalty',
  '/marketing',
  '/marketplace',
  '/meal-prep',
  '/messages',
  '/menus',
  '/network',
  '/notifications',
  '/nutrition',
  '/onboarding',
  '/open-tables',
  '/operations',
  '/packing-templates',
  '/partners',
  '/payments',
  '/photos',
  '/portfolio',
  '/production',
  '/proposals',
  '/prospecting',
  '/queue',
  '/quotes',
  '/rate-card',
  '/receipts',
  '/recipes',
  '/remy',
  '/reports',
  '/reputation',
  '/reviews',
  '/safety',
  '/schedule',
  '/scheduling',
  '/settings',
  '/shopping',
  '/social',
  '/staff',
  '/stations',
  '/surveys',
  '/tasks',
  '/team',
  '/templates',
  '/testimonials',
  '/training',
  '/travel',
  '/vendors',
  '/waitlist',
  '/wix-submissions',
] as const

export const CLIENT_PROTECTED_PATHS = [
  '/my-events',
  '/my-inquiries',
  '/my-quotes',
  '/my-chat',
  '/my-meals',
  '/my-hub',
  '/discover',
  '/my-spending',
  '/my-feedback',
  '/my-loyalty',
  '/my-profile',
  '/my-rewards',
  '/book-now',
] as const

export const STAFF_PROTECTED_PATHS = [
  '/staff-dashboard',
  '/staff-station',
  '/staff-recipes',
  '/staff-schedule',
  '/staff-tasks',
] as const

export const PARTNER_PROTECTED_PATHS = ['/partner'] as const

// Public website and tokenized pages that must remain reachable unauthenticated.
export const PUBLIC_UNAUTHENTICATED_PATHS = [
  '/pricing',
  '/about',
  '/customers',
  '/faq',
  '/blog',
  '/contact',
  '/privacy',
  '/terms',
  '/trust',
  '/unsubscribe',
  '/unauthorized',
  '/share',
  '/experience',
  '/view',
  '/event',
  '/proposal',
  '/worksheet',
  '/guest-feedback',
  '/staff-portal',
  '/cannabis/public',
  '/cannabis-invite',
  '/partner-signup',
  '/partner-report',
  '/chefs',
  '/network/connect',
  '/rebook',
  '/refer',
  '/survey',
  '/book',
  '/order',
  '/embed',
  '/demo',
  '/staff-login',
  '/reactivate-account',
  '/kiosk',
  '/beta',
  '/beta-survey',
  '/hub',
  '/g',
  '/availability',
  '/client',
] as const

// Overlapping roots need exact dynamic-shape matching so protected chef routes under the
// same namespace do not get misclassified as public.
const PUBLIC_DYNAMIC_PATH_PATTERNS = [
  /^\/chef\/[^/]+(?:\/(?:gift-cards(?:\/success)?|inquire|partner-signup))?\/?$/,
  /^\/open-tables\/[^/]+\/?$/,
  /^\/photos\/[^/]+\/?$/,
] as const

export const ADMIN_PATHS = ['/admin'] as const

// Prefix-based (not exact) because these are technical namespaces.
export const API_SKIP_AUTH_PREFIXES = [
  '/auth',
  '/api/webhooks',
  '/api/auth',
  '/api/gmail',
  '/api/scheduled',
  '/api/e2e',
  '/api/remy/client',
  '/api/remy/stream',
  '/api/remy/public',
  '/api/remy/landing',
  '/api/ollama-status',
  '/api/health',
  '/api/ai/health',
  '/api/ai/monitor',
  '/api/documents',
  '/api/embed',
  '/api/demo',
  '/api/monitoring',
  '/api/inngest',
  '/api/kiosk',
  '/api/feeds',
] as const

function matchesPathOrChild(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export function matchesAnyPathOrChild(pathname: string, paths: readonly string[]): boolean {
  return paths.some((path) => matchesPathOrChild(pathname, path))
}

export function matchesAnyPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix))
}

function matchesAnyPattern(pathname: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(pathname))
}

export function isChefRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, CHEF_PROTECTED_PATHS)
}

export function isClientRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, CLIENT_PROTECTED_PATHS)
}

export function isStaffRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, STAFF_PROTECTED_PATHS)
}

export function isPartnerRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, PARTNER_PROTECTED_PATHS)
}

export function isPublicUnauthenticatedPath(pathname: string): boolean {
  return (
    matchesAnyPathOrChild(pathname, PUBLIC_UNAUTHENTICATED_PATHS) ||
    matchesAnyPattern(pathname, PUBLIC_DYNAMIC_PATH_PATTERNS)
  )
}

export function isAdminRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, ADMIN_PATHS)
}

export function isApiSkipAuthPath(pathname: string): boolean {
  return matchesAnyPrefix(pathname, API_SKIP_AUTH_PREFIXES)
}
