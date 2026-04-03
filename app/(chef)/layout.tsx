// Chef Portal Layout - Layer 2 of Defense in Depth
// Server Component checks role before rendering any child components

import { requireChef } from '@/lib/auth/get-user'
import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { ChefSidebar, ChefMobileNav, SidebarProvider } from '@/components/navigation/chef-nav'
import { ChefMainContent } from '@/components/navigation/chef-main-content'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { getChefLayoutData } from '@/lib/chef/layout-cache'
import { KeyboardShortcutsWrapper } from '@/components/navigation/keyboard-shortcuts-wrapper'
import { getAnnouncement } from '@/lib/admin/platform-actions'
import { PlatformAnnouncementBanner } from '@/components/admin/platform-announcement-banner'
import { TrialBanner } from '@/components/billing/trial-banner'
import { OfflineProvider } from '@/components/offline/offline-provider'
import { EnvironmentBadge } from '@/components/ui/environment-badge'
import { DeletionPendingBanner } from '@/components/settings/deletion-pending-banner'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'
import { differenceInDays } from 'date-fns'
import { AnalyticsIdentify } from '@/components/analytics/analytics-identify'
import { MarketResearchBannerWrapper } from '@/components/beta-survey/market-research-banner-wrapper'
import {
  getCachedCannabisAccess,
  getCachedDeletionStatus,
  getCachedIsAdmin,
} from '@/lib/chef/layout-data-cache'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
import { ChefTourWrapper } from '@/components/onboarding/chef-tour-wrapper'
import { CommandPalette } from '@/components/search/command-palette'
import { NavigationPendingProvider } from '@/components/navigation/navigation-pending-provider'
import { AppContextProvider } from '@/lib/context/app-context'

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
// RouteProgress: regular import (not dynamic) so the bar is available from first render
import { RouteProgress } from '@/components/ui/route-progress'

export default async function ChefLayout({ children }: { children: React.ReactNode }) {
  // Server-side role check - happens BEFORE any client code ships
  let user
  try {
    user = await requireChef()
  } catch {
    redirect('/auth/signin?portal=chef')
  }

  // Parallelized - all calls are independent. All 5 use unstable_cache (60s TTL)
  // so navigating between pages costs ~0ms for these after the first load.
  const [layoutData, announcement, _unusedCannabisTier, userIsAdmin, deletionStatus] =
    await Promise.all([
      // Cached for 60s - slug and nav prefs change rarely, keyed per chef
      getChefLayoutData(user.entityId),
      // Platform announcement (non-fatal - fail open)
      getAnnouncement().catch(() => null),
      // Cannabis tier check - kept in Promise.all to avoid reindexing, but unused (cannabis is admin-only now)
      getCachedCannabisAccess(user.id).catch(() => false),
      // Admin check - cached 60s against persisted platform_admins access
      getCachedIsAdmin(user.id).catch(() => false),
      // Deletion status - cached 60s, non-fatal, fail closed (no banner)
      getCachedDeletionStatus(user.entityId).catch(() => ({
        isPending: false,
        scheduledFor: null,
        daysRemaining: null,
        requestedAt: null,
        reason: null,
      })),
    ])
  const effectiveAdmin = userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true'

  const profile = layoutData
  const primaryNavHrefs = layoutData.primary_nav_hrefs
  const mobileTabHrefs = layoutData.mobile_tab_hrefs
  const enabledModules =
    layoutData.enabled_modules.length > 0 ? layoutData.enabled_modules : DEFAULT_ENABLED_MODULES
  const focusMode = layoutData.focus_mode
  const daysSinceCreation = layoutData.created_at
    ? differenceInDays(new Date(), new Date(layoutData.created_at))
    : 0
  const shouldRenderRemy = true

  return (
    <AppContextProvider timezone={layoutData.timezone}>
      <OfflineProvider>
        <SidebarProvider>
          <NavigationPendingProvider>
            <NotificationProvider userId={user.id}>
              <ToastProvider />
              <RouteProgress />
              <TestAccountBanner email={user.email} />
              <KeyboardShortcutsWrapper>
                <div
                  data-cf-portal="chef"
                  className="min-h-screen text-stone-100"
                  style={{
                    backgroundColor: profile.portal_background_color || 'var(--surface-0)',
                    backgroundImage: profile.portal_background_image_url
                      ? `url(${profile.portal_background_image_url})`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {/* Skip navigation link for keyboard/screen reader users */}
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
                  >
                    Skip to main content
                  </a>
                  {/* Platform announcement banner - shown when admin sets one */}
                  {announcement && (
                    <PlatformAnnouncementBanner text={announcement.text} type={announcement.type} />
                  )}
                  {(userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true') && (
                    <EnvironmentBadge />
                  )}
                  {/* Trial / subscription banner - shown when trial is expiring (≤3 days) or expired */}
                  <TrialBanner chefId={user.entityId} />
                  {/* Account deletion pending banner - shown during 30-day grace period */}
                  {deletionStatus.isPending &&
                    deletionStatus.scheduledFor &&
                    deletionStatus.daysRemaining != null && (
                      <DeletionPendingBanner
                        scheduledFor={deletionStatus.scheduledFor}
                        daysRemaining={deletionStatus.daysRemaining}
                      />
                    )}
                  {/* Desktop sidebar */}
                  <ChefSidebar
                    primaryNavHrefs={primaryNavHrefs}
                    enabledModules={enabledModules}
                    isAdmin={effectiveAdmin}
                    focusMode={focusMode}
                    userId={user.id}
                    tenantId={user.tenantId ?? user.entityId}
                  />
                  {/* Mobile nav (top bar + bottom tabs) */}
                  <ChefMobileNav
                    primaryNavHrefs={primaryNavHrefs}
                    mobileTabHrefs={mobileTabHrefs}
                    enabledModules={enabledModules}
                    isAdmin={effectiveAdmin}
                    focusMode={focusMode}
                    userId={user.id}
                    tenantId={user.tenantId ?? user.entityId}
                  />

                  {/* Main content - offset adjusts dynamically based on sidebar state */}
                  <ChefMainContent>
                    <MarketResearchBannerWrapper
                      surveyType="market_research_operator"
                      channel="chef_portal"
                    />
                    <ChefTourWrapper>{children}</ChefTourWrapper>
                  </ChefMainContent>

                  {/* Feedback nudge - slide-in card, idle-detected, queued behind onboarding */}
                  <FeedbackNudgeCard daysSinceCreation={daysSinceCreation} />

                  {/* Offline connectivity bar - shows status, queue count, sync progress */}
                  <OfflineStatusBar />

                  {/* Command Palette - Cmd+K universal search and navigation */}
                  <CommandPalette userId={user.id} tenantId={user.tenantId ?? user.entityId} />

                  {/* Remy - AI companion chatbot, available to all chefs */}
                  {shouldRenderRemy && <RemyWrapper />}

                  {/* Mobile quick capture FAB - mobile-only, hidden on desktop */}
                  <QuickCapture />

                  {/* Breadcrumb tracker - silent navigation tracking for retrace mode */}
                  <BreadcrumbTracker />

                  {/* Analytics identity -- associates events with logged-in user */}
                  <AnalyticsIdentify
                    userId={user.id}
                    email={user.email}
                    role={user.role}
                    traits={{ entity_id: user.entityId, tenant_id: user.tenantId ?? user.entityId }}
                  />

                  {/* Presence beacon -- authenticated user presence for live admin visibility */}
                  <PresenceBeacon />

                  {/* Route tracker -- stores last active path for session recovery */}
                  <RouteTracker />
                </div>
              </KeyboardShortcutsWrapper>
            </NotificationProvider>
          </NavigationPendingProvider>
        </SidebarProvider>
      </OfflineProvider>
    </AppContextProvider>
  )
}
