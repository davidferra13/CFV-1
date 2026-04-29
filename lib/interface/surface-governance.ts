export const MAX_PRIMARY_NAV_ITEMS = 7

export type ProductSurfacePortal = 'public' | 'chef' | 'client' | 'admin' | 'staff' | 'partner'

export type ProductSurfaceMode =
  | 'triage'
  | 'planning'
  | 'editing'
  | 'reviewing'
  | 'monitoring'
  | 'configuring'
  | 'browsing'

export type ChefShellBudget = {
  mode: ProductSurfaceMode
  showMarketResearchBanner: boolean
  showFeedbackNudge: boolean
  showDesktopSidebar: boolean
  showMobileNav: boolean
  showBreadcrumbBar: boolean
  showQuickExpenseTrigger: boolean
  showRemy: boolean
  showQuickCapture: boolean
  showLiveAlerts: boolean
  contentWidth: 'constrained' | 'full'
}

export function normalizePrimaryNavHrefs(input: readonly string[] | null | undefined): string[] {
  if (!input) return []

  const seen = new Set<string>()
  const hrefs: string[] = []

  for (const rawHref of input) {
    const href = rawHref.trim()
    if (!href || !href.startsWith('/')) continue
    if (seen.has(href)) continue
    seen.add(href)
    hrefs.push(href)
    if (hrefs.length >= MAX_PRIMARY_NAV_ITEMS) break
  }

  return hrefs
}

export function resolveChefSurfaceMode(pathname: string): ProductSurfaceMode {
  if (!pathname || pathname === '/dashboard') return 'triage'
  if (pathname.startsWith('/settings')) return 'configuring'
  if (pathname.startsWith('/onboarding')) return 'planning'
  if (
    pathname.endsWith('/editor') ||
    pathname.includes('/editor/') ||
    pathname.endsWith('/edit') ||
    pathname.includes('/edit/') ||
    /^\/clients\/[^/]+\/relationship(?:\/|$)/.test(pathname) ||
    pathname.startsWith('/clients/new') ||
    pathname.startsWith('/events/new') ||
    pathname.startsWith('/menus/new') ||
    pathname.startsWith('/recipes/new') ||
    pathname.startsWith('/quotes/new') ||
    pathname.startsWith('/inquiries/new')
  ) {
    return 'editing'
  }
  if (/^\/events\/[^/]+\/reset(?:\/|$)/.test(pathname)) {
    return 'editing'
  }
  if (
    /^\/events\/[^/]+\/(?:schedule|dop|travel|pack|grocery-quote|procurement|prep-plan)(?:\/|$)/.test(
      pathname
    )
  ) {
    return 'planning'
  }
  if (/^\/events\/[^/]+\/execution(?:\/|$)/.test(pathname)) {
    return 'monitoring'
  }
  if (/^\/events\/[^/]+\/staff(?:\/|$)/.test(pathname)) {
    return 'planning'
  }
  if (
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/schedule') ||
    pathname.startsWith('/menus') ||
    pathname.startsWith('/recipes') ||
    pathname.startsWith('/culinary/prep')
  ) {
    return 'planning'
  }
  if (
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/financials') ||
    pathname.startsWith('/finance/reporting') ||
    pathname.startsWith('/reports')
  ) {
    return 'monitoring'
  }
  if (/^\/events\/[^/]+\/(?:aar|close-out|debrief)(?:\/|$)/.test(pathname)) {
    return 'reviewing'
  }
  if (
    /^\/events\/[^/]+\/(?:menu-approval|safety|billing|financial|receipts)(?:\/|$)/.test(pathname)
  ) {
    return 'reviewing'
  }
  if (
    pathname.startsWith('/reviews') ||
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/aar') ||
    pathname.startsWith('/my-events')
  ) {
    return 'reviewing'
  }
  return 'triage'
}

export function resolvePublicSurfaceMode(pathname: string): ProductSurfaceMode {
  if (!pathname || pathname === '/') return 'browsing'
  if (
    pathname.startsWith('/book') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/data-request') ||
    pathname.startsWith('/reactivate-account') ||
    pathname.startsWith('/partner-signup') ||
    pathname.startsWith('/nearby/submit') ||
    /^\/nearby\/[^/]+\/enhance(?:\/|$)/.test(pathname) ||
    /^\/chef\/[^/]+\/(?:inquire|partner-signup)(?:\/|$)/.test(pathname) ||
    /^\/worksheet\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/guest-feedback\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/cannabis-invite\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/survey\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/review\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/tip\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/feedback\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/hub\/join\/[^/]+(?:\/|$)/.test(pathname)
  ) {
    return 'editing'
  }
  if (
    pathname.startsWith('/trust') ||
    pathname.startsWith('/compare') ||
    /^\/proposal\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/availability\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/view\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/e\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/event\/[^/]+\/guest\/[^/]+(?:\/|$)/.test(pathname) ||
    /^\/share\/[^/]+(?:\/recap)?(?:\/|$)/.test(pathname)
  ) {
    return 'reviewing'
  }
  return 'browsing'
}

export function resolveClientSurfaceMode(pathname: string): ProductSurfaceMode {
  if (!pathname || pathname === '/my-events') return 'planning'
  if (
    pathname.startsWith('/book-now') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/my-profile') ||
    pathname.startsWith('/my-hub/create')
  ) {
    return 'editing'
  }
  if (pathname.startsWith('/my-chat')) {
    return 'triage'
  }
  if (pathname.startsWith('/my-spending')) {
    return 'monitoring'
  }
  if (pathname.startsWith('/my-hub') || pathname.startsWith('/my-rewards')) {
    return 'browsing'
  }
  if (
    pathname.startsWith('/my-quotes') ||
    pathname.startsWith('/my-inquiries') ||
    /^\/my-events\/[^/]+\/(?:approve-menu|proposal|contract|invoice|payment-plan|pay)(?:\/|$)/.test(
      pathname
    )
  ) {
    return 'reviewing'
  }
  if (pathname.startsWith('/my-events') || pathname.startsWith('/my-bookings')) {
    return 'planning'
  }
  return 'reviewing'
}

export function resolveAdminSurfaceMode(pathname: string): ProductSurfaceMode {
  const hasAdminPrefix = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)

  if (
    !pathname ||
    pathname === '/admin' ||
    hasAdminPrefix('/admin/pulse') ||
    hasAdminPrefix(`/admin/${['open', 'claw'].join('')}`) ||
    hasAdminPrefix('/admin/presence') ||
    hasAdminPrefix('/admin/analytics') ||
    hasAdminPrefix('/admin/financials') ||
    hasAdminPrefix('/admin/system/payments') ||
    hasAdminPrefix('/admin/launch-readiness') ||
    hasAdminPrefix('/admin/silent-failures') ||
    hasAdminPrefix('/admin/command-center')
  ) {
    return 'monitoring'
  }
  if (
    hasAdminPrefix('/admin/users') ||
    hasAdminPrefix('/admin/flags') ||
    hasAdminPrefix('/admin/system') ||
    hasAdminPrefix('/admin/directory') ||
    hasAdminPrefix('/admin/directory-listings') ||
    hasAdminPrefix('/admin/referral-partners') ||
    hasAdminPrefix('/admin/price-catalog') ||
    hasAdminPrefix('/admin/beta')
  ) {
    return 'configuring'
  }
  if (
    hasAdminPrefix('/admin/conversations') ||
    hasAdminPrefix('/admin/inquiries') ||
    hasAdminPrefix('/admin/events') ||
    hasAdminPrefix('/admin/feedback') ||
    hasAdminPrefix('/admin/audit') ||
    hasAdminPrefix('/admin/outreach') ||
    hasAdminPrefix('/admin/social') ||
    hasAdminPrefix('/admin/communications') ||
    hasAdminPrefix('/admin/hub') ||
    hasAdminPrefix('/admin/notifications')
  ) {
    return 'reviewing'
  }
  return 'monitoring'
}

export function resolveStaffSurfaceMode(pathname: string): ProductSurfaceMode {
  if (!pathname || pathname === '/staff-dashboard' || pathname.startsWith('/staff-station')) {
    return 'monitoring'
  }
  if (pathname.startsWith('/staff-schedule') || pathname.startsWith('/staff-tasks')) {
    return 'planning'
  }
  if (pathname.startsWith('/staff-recipes')) {
    return 'browsing'
  }
  if (pathname.startsWith('/staff-time')) {
    return 'reviewing'
  }
  return 'monitoring'
}

export function resolvePartnerSurfaceMode(pathname: string): ProductSurfaceMode {
  if (!pathname || pathname === '/partner/dashboard' || pathname.startsWith('/partner/events')) {
    return 'monitoring'
  }
  if (pathname.startsWith('/partner/profile') || pathname.startsWith('/partner/locations')) {
    return 'editing'
  }
  if (pathname.startsWith('/partner/preview')) {
    return 'reviewing'
  }
  return 'monitoring'
}

export function resolveSurfaceModeForPortal(
  portal: ProductSurfacePortal,
  pathname: string
): ProductSurfaceMode {
  switch (portal) {
    case 'public':
      return resolvePublicSurfaceMode(pathname)
    case 'chef':
      return resolveChefSurfaceMode(pathname)
    case 'client':
      return resolveClientSurfaceMode(pathname)
    case 'admin':
      return resolveAdminSurfaceMode(pathname)
    case 'staff':
      return resolveStaffSurfaceMode(pathname)
    case 'partner':
      return resolvePartnerSurfaceMode(pathname)
  }
}

export function resolveChefShellBudget(pathname: string): ChefShellBudget {
  const mode = resolveChefSurfaceMode(pathname)
  const allowAmbientResearchPrompts = mode === 'triage'
  const isImmersiveEditor = /^\/menus\/[^/]+\/editor(?:\/|$)/.test(pathname)
  const isWelcome = pathname === '/welcome'

  if (isImmersiveEditor || isWelcome) {
    return {
      mode,
      showMarketResearchBanner: false,
      showFeedbackNudge: false,
      showDesktopSidebar: false,
      showMobileNav: false,
      showBreadcrumbBar: false,
      showQuickExpenseTrigger: false,
      showRemy: false,
      showQuickCapture: false,
      showLiveAlerts: false,
      contentWidth: 'full',
    }
  }

  return {
    mode,
    showMarketResearchBanner: allowAmbientResearchPrompts,
    showFeedbackNudge: allowAmbientResearchPrompts,
    showDesktopSidebar: true,
    showMobileNav: true,
    showBreadcrumbBar: true,
    showQuickExpenseTrigger: true,
    showRemy: true,
    showQuickCapture: true,
    showLiveAlerts: true,
    contentWidth: 'constrained',
  }
}

export type WorkspaceDensity = 'minimal' | 'standard' | 'power'

export function resolveChefShellBudgetWithDensity(
  pathname: string,
  density: WorkspaceDensity
): ChefShellBudget {
  const base = resolveChefShellBudget(pathname)

  if (density === 'minimal') {
    return {
      ...base,
      showMarketResearchBanner: false,
      showFeedbackNudge: false,
      showRemy: false,
      showLiveAlerts: false,
    }
  }

  // For /welcome page, hide all chrome
  if (pathname === '/welcome') {
    return {
      ...base,
      showDesktopSidebar: false,
      showMobileNav: false,
      showBreadcrumbBar: false,
      showQuickExpenseTrigger: false,
      showRemy: false,
      showQuickCapture: false,
      showLiveAlerts: false,
      showMarketResearchBanner: false,
      showFeedbackNudge: false,
      contentWidth: 'full',
    }
  }

  return base
}
