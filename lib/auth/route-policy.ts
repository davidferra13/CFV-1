// Centralized route access policy used by middleware and unit tests.
// This is the single source of truth for public/protected route matching.

export const CHEF_PROTECTED_PATHS = [
  '/dashboard',
  '/queue',
  '/leads',
  '/clients',
  '/events',
  '/financials',
  '/menus',
  '/inquiries',
  '/quotes',
  '/expenses',
  '/schedule',
  '/settings',
  '/aar',
  '/recipes',
  '/loyalty',
  '/import',
  '/chat',
  '/network',
  '/onboarding',
] as const

export const CLIENT_PROTECTED_PATHS = [
  '/my-events',
  '/my-quotes',
  '/my-chat',
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

// Public website and tokenized pages that must remain reachable unauthenticated.
export const PUBLIC_UNAUTHENTICATED_PATHS = [
  '/pricing',
  '/privacy-policy',
  '/compare',
  '/marketplace-chefs',
  '/customers',
  '/faq',
  '/blog',
  '/contact',
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
  '/tip',
  '/worksheet',
  '/guest-feedback',
  '/chef',
  '/cannabis/public',
  '/cannabis-invite',
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

export function isChefRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, CHEF_PROTECTED_PATHS)
}

export function isClientRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, CLIENT_PROTECTED_PATHS)
}

export function isStaffRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, STAFF_PROTECTED_PATHS)
}

export function isPublicUnauthenticatedPath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, PUBLIC_UNAUTHENTICATED_PATHS)
}

export function isAdminRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, ADMIN_PATHS)
}

export function isApiSkipAuthPath(pathname: string): boolean {
  return matchesAnyPrefix(pathname, API_SKIP_AUTH_PREFIXES)
}
