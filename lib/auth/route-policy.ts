// Centralized route access policy used by middleware and unit tests.
// This is the single source of truth for public/protected route matching.

export const CHEF_PROTECTED_PATHS = [
  '/aar',
  '/activity',
  '/analytics',
  '/autopilot',
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
  '/commerce',
  '/community',
  '/consulting',
  '/quotes/calculator',
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
  '/food-cost',
  '/goals',
  '/guest-analytics',
  '/guest-leads',
  '/marketing',
  '/clients/insights/retention',
  '/guests',
  '/help',
  '/import',
  '/imports',
  '/inbox',
  '/inquiries',
  '/insights',
  '/intelligence',
  '/inventory',
  '/kitchen',
  '/leads',
  '/locations',
  '/locations/compliance',
  '/locations/purchasing',
  '/loyalty',
  '/marketing',
  '/marketplace',
  '/meal-prep',
  '/menus',
  '/network',
  '/notifications',
  '/nutrition',
  '/onboarding',
  '/ops',
  '/partners',
  '/payments',
  '/pipeline',
  '/pie-cart',
  '/portfolio',
  '/prep/consolidation',
  '/prices',
  '/production',
  '/proposals',
  '/prospecting',
  '/pulse',
  '/queue',
  '/quick-log',
  '/quotes',
  '/rate-card',
  '/receipts',
  '/recipes',
  '/remy',
  '/remy/operating',
  '/reminders',
  '/reports',
  '/reputation',
  '/reviews',
  '/safety',
  '/settings',
  '/shopping/bulk',
  '/social',
  '/social/calendar',
  '/social/connections',
  '/social/hub-overview',
  '/social/planner',
  '/social/settings',
  '/social/templates',
  '/social/vault',
  '/marketing/social',
  '/staff',
  '/stations',
  '/surveys',
  '/tasks',
  '/team',
  // '/testimonials', -- merged into /reviews
  '/travel',
  '/vendors',
  '/waitlist',
  '/welcome',
  '/wix-submissions',
] as const

export const CLIENT_PROTECTED_PATHS = [
  '/book-now',
  '/browse-dates',
  '/my-calendar',
  '/my-bookings',
  '/my-cannabis',
  '/my-chat',
  '/my-dietary',
  '/my-documents',
  '/my-events',
  '/my-gift-cards',
  '/my-help',
  '/my-household',
  '/my-hub',
  '/my-inquiries',
  '/my-meals',
  '/my-notifications',
  '/my-passport',
  '/my-preferences',
  '/my-preferences/discovery',
  '/my-profile',
  '/my-quotes',
  '/my-receipts',
  '/my-recipes',
  '/my-recurring',
  '/my-referrals',
  '/my-rewards',
  '/my-reviews',
  '/my-spending',
  '/my-timeline',
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

export const VENDOR_PROTECTED_PATHS = ['/vendor'] as const

// Public website and tokenized pages that must remain reachable unauthenticated.
export const PUBLIC_UNAUTHENTICATED_PATHS = [
  '/account-security',
  '/about',
  '/acceptable-use',
  '/auth',
  '/chef-agreement',
  '/client-terms',
  '/cookie-policy',
  '/data-request',
  '/dmca',
  '/faq',
  '/contact',
  '/guest-terms',
  '/pricing',
  '/privacy',
  '/privacy-policy',
  '/refund-cancellation',
  '/staff-terms',
  '/terms',
  '/trust',
  '/vendor-agreement',
  '/web-research-health',
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
  '/compare',
  '/customers',
  '/embed',
  '/eat',
  '/nearby',
  '/demo',
  '/staff-login',
  '/staff-portal',
  '/vendor-signup',
  '/partner-terms',
  '/reactivate-account',
  '/kiosk',
  '/marketplace-chefs',
  '/beta',
  '/beta-survey',
  '/hub',
  '/g',
  '/availability',
  '/cannabis-invite',
  '/cannabis/public',
  '/client',
  '/e',
  '/for-operators',
  '/gift-cards',
  '/how-it-works',
  '/ingredient',
  '/ingredients',
  '/intake',
  '/onboarding',
  '/services',
] as const

export const PUBLIC_ASSET_PATHS = [
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/sw.js',
  '/inbox-sw.js',
] as const

const PUBLIC_ASSET_PATH_PREFIXES = ['/_next/static', '/_next/image', '/images'] as const
const PUBLIC_ASSET_EXTENSION_PATTERN = /\.(?:svg|png|jpg|jpeg|gif|webp|html)$/i

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
  '/api/pie',
  '/api/web-research/health',
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
  '/api/discovery',
  '/api/sentinel',
  '/api/openclaw/webhook',
  '/api/sms-bridge',
] as const

export type RouteSessionRole = 'chef' | 'client' | 'staff' | 'partner' | 'admin' | string

export type RouteAccountMode =
  | 'public'
  | 'guest'
  | 'chef_workspace'
  | 'team_workspace'
  | 'partner_workspace'
  | 'vendor_workspace'
  | 'admin_console'

export type RoutePolicyDecision = {
  allowed: boolean
  mode: RouteAccountMode
  reason: 'public' | 'allowed' | 'wrong_context' | 'admin_runtime_gate'
  recoveryPath: string | null
}

const ROLE_HOME_PATHS: Record<string, string> = {
  client: '/my-events',
  chef: '/dashboard',
  staff: '/staff-dashboard',
  partner: '/partner/dashboard',
  vendor: '/vendor/dashboard',
  admin: '/admin',
}

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

export function isVendorRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, VENDOR_PROTECTED_PATHS)
}

export function isPublicUnauthenticatedPath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, PUBLIC_UNAUTHENTICATED_PATHS)
}

export function isPublicAssetPath(pathname: string): boolean {
  return (
    PUBLIC_ASSET_PATHS.includes(pathname as (typeof PUBLIC_ASSET_PATHS)[number]) ||
    PUBLIC_ASSET_PATH_PREFIXES.some((path) => matchesPathOrChild(pathname, path)) ||
    PUBLIC_ASSET_EXTENSION_PATTERN.test(pathname)
  )
}

export function isAdminRoutePath(pathname: string): boolean {
  return matchesAnyPathOrChild(pathname, ADMIN_PATHS)
}

export function isApiSkipAuthPath(pathname: string): boolean {
  return matchesAnyPrefix(pathname, API_SKIP_AUTH_PREFIXES)
}

export function getHomePathForRole(role: string | null | undefined): string {
  if (!role) return '/dashboard'
  return ROLE_HOME_PATHS[role] ?? '/dashboard'
}

export function getRouteAccountMode(pathname: string): RouteAccountMode {
  if (isAdminRoutePath(pathname)) return 'admin_console'
  if (isStaffRoutePath(pathname)) return 'team_workspace'
  if (isPartnerRoutePath(pathname)) return 'partner_workspace'
  if (isVendorRoutePath(pathname)) return 'vendor_workspace'
  if (isClientRoutePath(pathname)) return 'guest'
  if (isChefRoutePath(pathname)) return 'chef_workspace'
  return 'public'
}

export function getRoutePolicyDecisionForRole(
  pathname: string,
  role: RouteSessionRole | null | undefined,
  _options?: { isAdmin?: boolean }
): RoutePolicyDecision {
  const mode = getRouteAccountMode(pathname)

  if (mode === 'public') {
    return {
      allowed: true,
      mode,
      reason: 'public',
      recoveryPath: null,
    }
  }

  if (mode === 'admin_console') {
    // Middleware only requires authentication for admin routes.
    // Page-level requireAdmin() is the privileged runtime gate.
    return {
      allowed: true,
      mode,
      reason: 'admin_runtime_gate',
      recoveryPath: null,
    }
  }

  const allowed =
    (mode === 'chef_workspace' && role === 'chef') ||
    (mode === 'guest' && role === 'client') ||
    (mode === 'team_workspace' && role === 'staff') ||
    (mode === 'partner_workspace' && role === 'partner') ||
    (mode === 'vendor_workspace' && role === 'vendor')

  return {
    allowed,
    mode,
    reason: allowed ? 'allowed' : 'wrong_context',
    recoveryPath: allowed ? null : getHomePathForRole(role),
  }
}
