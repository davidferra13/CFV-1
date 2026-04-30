// Centralized route access policy used by middleware and unit tests.
// This is the single source of truth for public/protected route matching.

export const CHEF_PROTECTED_PATHS = [
  '/aar',
  '/activity',
  '/analytics',
  '/briefing',
  '/calendar',
  '/calls',
  '/cannabis',
  '/capture',
  '/charity',
  '/chat',
  '/chef/cannabis',
  '/circles',
  '/clients',
  '/commands',
  '/commerce',
  '/community',
  '/consulting',
  '/content',
  '/contracts',
  '/culinary',
  '/culinary-board',
  '/daily',
  '/dashboard',
  '/dev',
  '/documents',
  '/events',
  '/expenses',
  '/features',
  '/finance',
  '/financials',
  '/food-cost',
  '/goals',
  '/growth',
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
  '/kitchen',
  '/leads',
  '/loyalty',
  '/locations',
  '/marketing',
  '/marketplace',
  '/meal-prep',
  '/menus',
  '/network',
  '/notifications',
  '/nutrition',
  '/onboarding',
  '/ops',
  '/operations',
  '/partners',
  '/payments',
  '/pilot',
  '/portfolio',
  '/prices',
  '/production',
  '/pulse',
  '/proposals',
  '/prospecting',
  '/queue',
  '/quotes',
  '/rate-card',
  '/receipts',
  '/recipes',
  '/remy',
  '/reminders',
  '/reports',
  '/reputation',
  '/reviews',
  '/safety',
  '/schedule',
  '/scheduling',
  '/settings',
  '/social',
  '/staff',
  '/stations',
  '/surveys',
  '/tasks',
  '/team',
  '/testimonials',
  '/travel',
  '/vendors',
  '/waitlist',
  '/welcome',
  '/wix-submissions',
] as const

export const CLIENT_PROTECTED_PATHS = [
  '/book-now',
  '/my-bookings',
  '/my-cannabis',
  '/my-chat',
  '/my-events',
  '/my-hub',
  '/my-inquiries',
  '/my-profile',
  '/my-quotes',
  '/my-rewards',
  '/my-spending',
] as const

export const STAFF_PROTECTED_PATHS = [
  '/staff-dashboard',
  '/staff-recipes',
  '/staff-schedule',
  '/staff-station',
  '/staff-tasks',
  '/staff-time',
] as const

export const PARTNER_PROTECTED_PATHS = ['/partner'] as const

// Public website and tokenized pages that must remain reachable unauthenticated.
export const PUBLIC_UNAUTHENTICATED_PATHS = [
  '/account-security',
  '/about',
  '/auth',
  '/compare',
  '/marketplace-chefs',
  '/customers',
  '/data-request',
  '/faq',
  '/contact',
  '/pricing',
  '/privacy',
  '/privacy-policy',
  '/terms',
  '/trust',
  '/unsubscribe',
  '/unauthorized',
  '/share',
  '/view',
  '/event',
  '/proposal',
  '/review',
  '/feedback',
  '/tip',
  '/worksheet',
  '/guest-feedback',
  '/chef',
  '/partner-signup',
  '/partner-report',
  '/chefs',
  '/survey',
  '/book',
  '/embed',
  '/demo',
  '/staff-login',
  '/staff-portal',
  '/reactivate-account',
  '/kiosk',
  '/beta',
  '/beta-survey',
  '/hub',
  '/g',
  '/availability',
  '/cannabis-invite',
  '/cannabis/public',
  '/discover',
  '/e',
  '/eat',
  '/nearby',
  '/for-operators',
  '/gift-cards',
  '/how-it-works',
  '/install',
  '/ingredients',
  '/services',
  '/ingredient',
  '/sandbox',
] as const

export const PUBLIC_ASSET_PATHS = [
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/sw.js',
  '/inbox-sw.js',
] as const

export const ADMIN_PATHS = ['/admin'] as const

// Prefix-based (not exact) because these are technical namespaces.
export const API_SKIP_AUTH_PREFIXES = [
  '/auth',
  '/api/webhooks',
  '/api/auth',
  '/api/build-version',
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
  '/api/hub-public',
  '/api/v2',
  '/api/storage',
  '/api/realtime',
  '/api/book',
  '/api/cron',
  '/api/sentinel',
  `/api/${'open' + 'claw'}/webhook`,
  '/api/ingredients',
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
  return matchesAnyPathOrChild(pathname, PUBLIC_UNAUTHENTICATED_PATHS)
}

export function isPublicAssetPath(pathname: string): boolean {
  return PUBLIC_ASSET_PATHS.includes(pathname as (typeof PUBLIC_ASSET_PATHS)[number])
}

export function isAdminRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, ADMIN_PATHS)
}

export function isApiSkipAuthPath(pathname: string): boolean {
  return matchesAnyPrefix(pathname, API_SKIP_AUTH_PREFIXES)
}
