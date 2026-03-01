// Chef Portal Layout - Layer 2 of Defense in Depth
// Server Component checks role before rendering any child components

import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { ChefSidebar, ChefMobileNav, SidebarProvider } from '@/components/navigation/chef-nav'
import { ChefMainContent } from '@/components/navigation/chef-main-content'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { PushPermissionPrompt } from '@/components/notifications/push-permission-prompt'
import { getChefLayoutData } from '@/lib/chef/layout-cache'
import { KeyboardShortcutsWrapper } from '@/components/navigation/keyboard-shortcuts-wrapper'
import { getOnboardingStatus } from '@/lib/chef/profile-actions'
import { getAnnouncement } from '@/lib/admin/platform-actions'
import { PlatformAnnouncementBanner } from '@/components/admin/platform-announcement-banner'
import { TrialBanner } from '@/components/billing/trial-banner'
import { RemyWrapper } from '@/components/ai/remy-wrapper'
import { OfflineProvider } from '@/components/offline/offline-provider'
import { OfflineStatusBar } from '@/components/offline/offline-status-bar'
import { MilestoneOverlay } from '@/components/ui/milestone-overlay'
import { BreadcrumbTracker } from '@/components/activity/breadcrumb-tracker'
import { QuickCapture } from '@/components/mobile/quick-capture'
import { FeedbackNudgeModal } from '@/components/feedback/feedback-nudge-modal'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { EnvironmentBadge } from '@/components/ui/environment-badge'
import { DeletionPendingBanner } from '@/components/settings/deletion-pending-banner'
import { getTierForChef } from '@/lib/billing/tier'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'
import { differenceInDays } from 'date-fns'
import { ArchetypeSelector } from '@/components/onboarding/archetype-selector'
import { AnalyticsIdentify } from '@/components/analytics/analytics-identify'
import {
  getCachedCannabisAccess,
  getCachedChefArchetype,
  getCachedDeletionStatus,
  getCachedIsAdmin,
} from '@/lib/chef/layout-data-cache'
import { isAdminPreviewActive } from '@/lib/auth/admin-preview'
import { AdminPreviewToggle } from '@/components/admin/admin-preview-toggle'

export default async function ChefLayout({ children }: { children: React.ReactNode }) {
  // Server-side role check - happens BEFORE any client code ships
  let user
  try {
    user = await requireChef()
  } catch {
    redirect('/auth/signin?portal=chef')
  }

  // Onboarding gate — redirect new chefs to wizard before they can access any page.
  // x-pathname is set by middleware so we can check the current path server-side
  // without an additional round-trip or breaking the App Router server component model.
  const pathname = headers().get('x-pathname') ?? ''
  if (!pathname.startsWith('/onboarding')) {
    const onboardingComplete = await getOnboardingStatus().catch(() => true) // fail open
    if (!onboardingComplete) {
      redirect('/onboarding')
    }
  }
  // Parallelized — all calls are independent. All 7 use unstable_cache (60s TTL)
  // so navigating between pages costs ~0ms for these after the first load.
  const [
    layoutData,
    announcement,
    tierStatus,
    _unusedCannabisTier,
    userIsAdmin,
    chefArchetype,
    deletionStatus,
  ] = await Promise.all([
    // Cached for 60s — slug and nav prefs change rarely, keyed per chef
    getChefLayoutData(user.entityId),
    // Platform announcement (non-fatal — fail open)
    getAnnouncement().catch(() => null),
    // Tier check — non-fatal, defaults to pro (fail open so billing never breaks the portal)
    getTierForChef(user.entityId).catch(() => ({
      tier: 'pro' as const,
      isGrandfathered: true,
      subscriptionStatus: 'grandfathered',
    })),
    // Cannabis tier check — kept in Promise.all to avoid reindexing, but unused (cannabis is admin-only now)
    getCachedCannabisAccess(user.id, user.email ?? '').catch(() => false),
    // Admin check — cached 60s, env-based (no DB call)
    getCachedIsAdmin(user.email ?? '').catch(() => false),
    // Archetype — cached 60s, null means chef hasn't picked one yet (show selector)
    getCachedChefArchetype(user.entityId).catch(() => null),
    // Deletion status — cached 60s, non-fatal, fail closed (no banner)
    getCachedDeletionStatus(user.entityId).catch(() => ({
      isPending: false,
      scheduledFor: null,
      daysRemaining: null,
      requestedAt: null,
      reason: null,
    })),
  ])
  // Archetype gate — new chefs pick their persona before seeing the portal.
  // Admins skip this (they have full access and don't need a preset).
  // Also skip on settings pages so they can manually configure if needed.
  if (
    !chefArchetype &&
    !userIsAdmin &&
    !pathname.startsWith('/settings') &&
    !pathname.startsWith('/onboarding')
  ) {
    return <ArchetypeSelector />
  }

  // Admin preview mode: when active, sidebar/nav treat admin as regular chef
  const previewActive = userIsAdmin && isAdminPreviewActive()
  const effectiveAdmin = (userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true') && !previewActive

  const profile = layoutData
  const primaryNavHrefs = layoutData.primary_nav_hrefs
  const enabledModules =
    layoutData.enabled_modules.length > 0 ? layoutData.enabled_modules : DEFAULT_ENABLED_MODULES
  const focusMode = layoutData.focus_mode
  const daysSinceCreation = layoutData.created_at
    ? differenceInDays(new Date(), new Date(layoutData.created_at))
    : 0
  const showFeedbackNudge = daysSinceCreation >= 7

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <OfflineProvider>
        <SidebarProvider>
          <NotificationProvider userId={user.id}>
            <ToastProvider />
            <KeyboardShortcutsWrapper>
              <div
                className="min-h-screen"
                style={{
                  backgroundColor: profile.portal_background_color || '#0c0a09',
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
                {/* Platform announcement banner — shown when admin sets one */}
                {announcement && (
                  <PlatformAnnouncementBanner text={announcement.text} type={announcement.type} />
                )}
                {(userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true') && <EnvironmentBadge />}
                {/* Admin preview toggle — lets admins see the app as a regular chef */}
                {userIsAdmin && <AdminPreviewToggle initialPreview={previewActive} />}
                {/* Trial / subscription banner — shown when trial is expiring (≤3 days) or expired */}
                <TrialBanner chefId={user.entityId} />
                {/* Account deletion pending banner — shown during 30-day grace period */}
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
                  enabledModules={enabledModules}
                  isAdmin={effectiveAdmin}
                  focusMode={focusMode}
                  userId={user.id}
                  tenantId={user.tenantId ?? user.entityId}
                />

                {/* Main content — offset adjusts dynamically based on sidebar state */}
                <ChefMainContent>{children}</ChefMainContent>

                {/* Push notification permission prompt — appears after 5s if not subscribed */}
                <PushPermissionPrompt />

                {showFeedbackNudge && <FeedbackNudgeModal />}

                {/* Offline connectivity bar — shows status, queue count, sync progress */}
                <OfflineStatusBar />

                {/* Remy — AI companion chatbot, Pro tier + admins */}
                {(tierStatus.tier === 'pro' || userIsAdmin) && <RemyWrapper />}

                {/* Mobile quick capture FAB — mobile-only, hidden on desktop */}
                <QuickCapture />

                {/* Breadcrumb tracker — silent navigation tracking for retrace mode */}
                <BreadcrumbTracker />

                <MilestoneOverlay />

                {/* Analytics identity -- associates events with logged-in user */}
                <AnalyticsIdentify userId={user.id} email={user.email} role={user.role} />
              </div>
            </KeyboardShortcutsWrapper>
          </NotificationProvider>
        </SidebarProvider>
      </OfflineProvider>
    </ThemeProvider>
  )
}
