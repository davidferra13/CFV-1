// Chef Portal Layout - Layer 2 of Defense in Depth
// Server Component checks role before rendering any child components

import { requireChef } from '@/lib/auth/get-user'
import { auth } from '@/lib/auth'
import dynamic from 'next/dynamic'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
const ChefSidebar = dynamic(() =>
  import('@/components/navigation/chef-nav').then((m) => m.ChefSidebar)
)
const ChefMobileNav = dynamic(() =>
  import('@/components/navigation/chef-mobile-nav').then((m) => m.ChefMobileNav)
)
import { ChefMainContent } from '@/components/navigation/chef-main-content'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { ChefProviders } from '@/components/providers/chef-providers'
import { getChefLayoutData } from '@/lib/chef/layout-cache'
import { getCachedChefPreferences } from '@/lib/chef/layout-data-cache'
import { KeyboardShortcutsWrapper } from '@/components/navigation/keyboard-shortcuts-wrapper'
import { getCachedAnnouncement } from '@/lib/chef/layout-data-cache'
import { PlatformAnnouncementBanner } from '@/components/admin/platform-announcement-banner'
import { EnvironmentBadge } from '@/components/ui/environment-badge'
import { DeletionPendingBanner } from '@/components/settings/deletion-pending-banner'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'
import { differenceInDays } from 'date-fns'
import { AnalyticsIdentify } from '@/components/analytics/analytics-identify'
import { MarketResearchBannerWrapper } from '@/components/beta-survey/market-research-banner-wrapper'
import {
  getCachedChefArchetype,
  getCachedDeletionStatus,
  getCachedIsAdmin,
  getCachedIsPrivileged,
  getCachedUsageRanking,
} from '@/lib/chef/layout-data-cache'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
const CommandPaletteLauncher = dynamic(
  () =>
    import('@/components/search/command-palette-launcher').then((m) => m.CommandPaletteLauncher),
  { ssr: false }
)
// getRegionalSettings removed - timezone comes from cached layoutData, rest are constants
import type { FormatContext } from '@/lib/hooks/use-format-context'
import { resolveCurrentUserPermissions } from '@/lib/auth/permissions'
import { isAiEnabledForTenant } from '@/lib/ai/privacy-internal'
import { PATHNAME_HEADER } from '@/lib/auth/request-auth-context'
import {
  resolveChefShellBudgetWithDensity,
  type WorkspaceDensity,
} from '@/lib/interface/surface-governance'
import { resolveHiddenNavRoutes } from '@/lib/surfaces/resolve-chef-surfaces'
import { getPinnedSurfaces } from '@/lib/surfaces/analytics/usage-tracking'
import { RoleSwitcher } from '@/components/shared/role-switcher'

const FeedbackNudgeCard = dynamic(
  () => import('@/components/feedback/feedback-nudge-card').then((m) => m.FeedbackNudgeCard),
  { ssr: false }
)
const OfflineStatusBar = dynamic(
  () => import('@/components/offline/offline-status-bar').then((m) => m.OfflineStatusBar),
  { ssr: false }
)
const RemyWrapper = dynamic(
  () => import('@/components/ai/remy-wrapper').then((m) => m.RemyWrapper),
  {
    ssr: false,
  }
)
const QuickCapture = dynamic(
  () => import('@/components/mobile/quick-capture').then((m) => m.QuickCapture),
  { ssr: false }
)
const TriageDock = dynamic(
  () => import('@/components/capture/triage-dock').then((m) => m.TriageDock),
  { ssr: false }
)
const BreadcrumbTracker = dynamic(
  () => import('@/components/activity/breadcrumb-tracker').then((m) => m.BreadcrumbTracker),
  { ssr: false }
)
const PresenceBeacon = dynamic(
  () => import('@/components/admin/presence-beacon').then((m) => m.PresenceBeacon),
  { ssr: false }
)
const RouteTracker = dynamic(
  () => import('@/components/session/route-tracker').then((m) => m.RouteTracker),
  { ssr: false }
)
const AiOutageBanner = dynamic(
  () => import('@/components/dashboard/ai-outage-banner').then((m) => m.AiOutageBanner),
  { ssr: false }
)
const ChefLiveAlerts = dynamic(
  () => import('@/components/calling/chef-live-alerts').then((m) => m.ChefLiveAlerts),
  { ssr: false }
)
// RouteProgress: regular import (not dynamic) so the bar is available from first render
import { RouteProgress } from '@/components/ui/route-progress'
import { Suspense } from 'react'
import { RailStripWrapper, RailStripSkeleton } from '@/components/rail/rail-strip-wrapper'
import {
  ContextualRailServer,
  ContextualRailSkeleton,
} from '@/components/rail/contextual-rail-server'
import { UrlCapabilityRail } from '@/components/rail/url-capability-rail'
import {
  getRailGroupPriorities,
  type RailGroupPriority,
} from '@/lib/discovery/universal-rail-actions'
import { getTenantDataPresence } from '@/lib/progressive-disclosure/tenant-data-presence'
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'

// Suspense-wrapped loaders for conditional data that should not block first paint.
// Each fetches its own data and renders nothing when the condition is not met.

async function AnnouncementBannerLoader() {
  const announcement = await getCachedAnnouncement().catch(() => null)
  if (!announcement) return null
  return <PlatformAnnouncementBanner text={announcement.text} type={announcement.type} />
}

async function DeletionBannerLoader({ chefId }: { chefId: string }) {
  const deletionStatus = await getCachedDeletionStatus(chefId).catch(() => ({
    isPending: false,
    scheduledFor: null,
    daysRemaining: null,
    requestedAt: null,
    reason: null,
  }))
  if (
    !deletionStatus.isPending ||
    !deletionStatus.scheduledFor ||
    deletionStatus.daysRemaining == null
  ) {
    return null
  }
  return (
    <DeletionPendingBanner
      scheduledFor={deletionStatus.scheduledFor}
      daysRemaining={deletionStatus.daysRemaining}
    />
  )
}

export default async function ChefLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get(PATHNAME_HEADER) ?? '/dashboard'

  // Server-side role check - happens BEFORE any client code ships
  let user
  try {
    user = await requireChef()
  } catch {
    redirect('/auth/signin?portal=chef')
  }

  const prefData = await getCachedChefPreferences(user.entityId)

  // Onboarding redirect removed (PUBLIC SURFACE #6: Kill Onboarding Redirect).
  // New users now land directly on the dashboard. Onboarding pages remain accessible manually.

  const density = (prefData?.workspace_density as WorkspaceDensity) ?? 'standard'
  const shellBudget = resolveChefShellBudgetWithDensity(pathname, density)

  // All independent calls parallelized, including auth() (was sequential after Promise.all).
  // Conditional-only data (announcement, deletion status, cannabis access) moved to
  // Suspense boundaries below so they stream in without blocking first paint for 704 pages.
  const [
    layoutData,
    userIsAdmin,
    userIsPrivileged,
    permissionSet,
    remyEnabled,
    chefArchetype,
    tenantPresence,
    pinnedSurfaces,
    usageRanking,
    railGroupPriorities,
    session,
  ] = await Promise.all([
    // Cached for 60s - slug and nav prefs change rarely, keyed per chef
    getChefLayoutData(user.entityId),
    // Admin check (admin + owner only, NOT vip) - cached 60s
    getCachedIsAdmin(user.id).catch(() => false),
    // Privileged check (vip + admin + owner) - cached 60s, controls focus mode bypass + all modules
    getCachedIsPrivileged(user.id).catch(() => false),
    // RBAC permissions - resolved from role_permissions + user_permission_overrides
    resolveCurrentUserPermissions(user.id, user.tenantId).catch(() => null),
    // AI/Remy enabled check - controls whether Remy UI renders
    isAiEnabledForTenant(user.entityId).catch(() => false),
    // Archetype for nav label adaptation (cached 60s)
    getCachedChefArchetype(user.entityId).catch(() => null),
    // Tenant data presence for progressive disclosure (short cached)
    getTenantDataPresence(user.tenantId!).catch(() => null as TenantDataPresence | null),
    getPinnedSurfaces().catch(() => []),
    getCachedUsageRanking(user.entityId).catch(() => ({}) as Record<string, number>),
    getRailGroupPriorities().catch(() => [] as RailGroupPriority[]),
    // Auth session (was sequential after Promise.all, now parallel)
    auth(),
  ])
  const availableRoleCount =
    ((session?.user as Record<string, unknown>)?.availableRoles as number) ?? 1

  const effectiveAdmin = userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true'
  const effectivePrivileged = userIsPrivileged || process.env.DEMO_MODE_ENABLED === 'true'

  const formatContextValue: FormatContext = {
    locale: 'en-US',
    currency: 'USD',
    timezone: layoutData.timezone,
    measurementSystem: 'imperial',
  }

  const primaryNavHrefs = layoutData.primary_nav_hrefs
  const mobileTabHrefs = layoutData.mobile_tab_hrefs
  const enabledModules =
    layoutData.enabled_modules.length > 0 ? layoutData.enabled_modules : DEFAULT_ENABLED_MODULES
  const focusMode = layoutData.focus_mode
  const hiddenRoutes = resolveHiddenNavRoutes({
    chefId: user.entityId,
    tenantId: user.tenantId ?? user.entityId,
    dataPresence: tenantPresence,
    enabledModules,
    focusModeEnabled: focusMode,
    workspaceDensity: density,
    archetype: chefArchetype as any,
    isAdmin: effectiveAdmin,
  })
  const daysSinceCreation = layoutData.created_at
    ? differenceInDays(new Date(), new Date(layoutData.created_at))
    : 0
  const shouldRenderRemy = remyEnabled

  return (
    <ChefProviders
      timezone={layoutData.timezone}
      formatContext={formatContextValue}
      permissions={permissionSet?.toJSON() ?? {}}
      userId={user.id}
    >
      <ToastProvider />
      <RouteProgress />
      <TestAccountBanner email={user.email} />
      <KeyboardShortcutsWrapper>
        <div
          data-cf-portal="chef"
          data-cf-surface={shellBudget.mode}
          className="min-h-screen bg-[var(--surface-0)] text-stone-100"
        >
          {/* Skip navigation link for keyboard/screen reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-chrome focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
          >
            Skip to main content
          </a>
          {/* Platform announcement banner - streams in via Suspense, does not block first paint */}
          <Suspense fallback={null}>
            <AnnouncementBannerLoader />
          </Suspense>
          {(userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true') && <EnvironmentBadge />}
          {/* Account deletion banner - streams in via Suspense, does not block first paint */}
          <Suspense fallback={null}>
            <DeletionBannerLoader chefId={user.entityId} />
          </Suspense>
          {/* AI outage banner - shown after 2+ minutes of sustained AI downtime */}
          <AiOutageBanner />
          {/* Role switcher - only visible when user has multiple roles */}
          <div className="fixed top-2 right-4 z-chrome">
            <RoleSwitcher currentRole="chef" availableRoleCount={availableRoleCount} />
          </div>
          {/* Desktop sidebar */}
          {shellBudget.showDesktopSidebar ? (
            <ChefSidebar
              primaryNavHrefs={primaryNavHrefs}
              enabledModules={enabledModules}
              isAdmin={effectiveAdmin}
              isPrivileged={effectivePrivileged}
              focusMode={focusMode}
              userId={user.id}
              tenantId={user.tenantId ?? user.entityId}
              archetype={chefArchetype}
              tenantPresence={tenantPresence}
              hiddenRoutes={hiddenRoutes}
              chefName={layoutData.business_name}
              chefAvatar={layoutData.profile_image_url}
              pinnedSurfaces={pinnedSurfaces}
              usageRanking={usageRanking}
              railGroupPriorities={railGroupPriorities}
            />
          ) : null}
          {/* Mobile nav (top bar + bottom tabs) */}
          {shellBudget.showMobileNav ? (
            <ChefMobileNav
              primaryNavHrefs={primaryNavHrefs}
              mobileTabHrefs={mobileTabHrefs}
              enabledModules={enabledModules}
              isAdmin={effectiveAdmin}
              isPrivileged={effectivePrivileged}
              focusMode={focusMode}
              userId={user.id}
              tenantId={user.tenantId ?? user.entityId}
              chefName={layoutData.business_name}
              chefAvatar={layoutData.profile_image_url}
            />
          ) : null}

          {/* Main content - offset adjusts dynamically based on sidebar state */}
          <ChefMainContent
            showDesktopSidebar={shellBudget.showDesktopSidebar}
            showMobileNav={shellBudget.showMobileNav}
            showBreadcrumbBar={shellBudget.showBreadcrumbBar}
            showQuickExpenseTrigger={shellBudget.showQuickExpenseTrigger}
            contentWidth={shellBudget.contentWidth}
          >
            {shellBudget.showMarketResearchBanner && (
              <MarketResearchBannerWrapper
                surveyType="market_research_operator"
                channel="chef_portal"
              />
            )}
            <Suspense fallback={<RailStripSkeleton />}>
              <RailStripWrapper />
            </Suspense>
            {shellBudget.showContextualRail && (
              <Suspense fallback={<ContextualRailSkeleton />}>
                <ContextualRailServer />
              </Suspense>
            )}
            {shellBudget.showContextualRail && <UrlCapabilityRail />}
            {children}
          </ChefMainContent>

          {/* Feedback nudge - keep ambient prompts on triage surfaces only */}
          {shellBudget.showFeedbackNudge && (
            <FeedbackNudgeCard daysSinceCreation={daysSinceCreation} />
          )}

          {/* Offline connectivity bar - shows status, queue count, sync progress */}
          <OfflineStatusBar />

          {/* Command Palette - Cmd+K universal search and navigation */}
          <CommandPaletteLauncher userId={user.id} tenantId={user.tenantId ?? user.entityId} />

          {/* Remy - AI companion chatbot, available to all chefs */}
          {shouldRenderRemy && shellBudget.showRemy ? <RemyWrapper /> : null}

          {/* Mobile quick capture FAB - mobile-only, hidden on desktop */}
          {shellBudget.showQuickCapture ? <QuickCapture /> : null}

          {/* Breadcrumb tracker - silent navigation tracking for retrace mode */}
          <BreadcrumbTracker />

          {/* Analytics identity -- associates events with logged-in user */}
          <AnalyticsIdentify
            userId={user.id}
            email={user.email}
            role={user.role}
            traits={{
              entity_id: user.entityId,
              tenant_id: user.tenantId ?? user.entityId,
              is_admin: userIsAdmin,
              is_privileged: userIsPrivileged,
            }}
          />

          {/* Presence beacon -- authenticated user presence for live admin visibility */}
          <PresenceBeacon userId={user.id} email={user.email} />

          {/* Route tracker -- stores last active path for session recovery */}
          <RouteTracker />

          {/* Live alerts - inbound calls, new inquiries, call completions, voicemails */}
          {shellBudget.showLiveAlerts ? (
            <ChefLiveAlerts tenantId={user.tenantId ?? user.entityId} />
          ) : null}
        </div>
      </KeyboardShortcutsWrapper>
    </ChefProviders>
  )
}
