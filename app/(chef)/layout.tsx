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
import { hasCannabisAccess } from '@/lib/chef/cannabis-actions'
import { getAnnouncement } from '@/lib/admin/platform-actions'
import { PlatformAnnouncementBanner } from '@/components/admin/platform-announcement-banner'
import { TrialBanner } from '@/components/billing/trial-banner'
import { RemyDrawer } from '@/components/ai/remy-drawer'
import { OfflineProvider } from '@/components/offline/offline-provider'
import { OfflineStatusBar } from '@/components/offline/offline-status-bar'
import { MilestoneOverlay } from '@/components/ui/milestone-overlay'
import { BreadcrumbTracker } from '@/components/activity/breadcrumb-tracker'
import { QuickCapture } from '@/components/mobile/quick-capture'
import { FeedbackNudgeModal } from '@/components/feedback/feedback-nudge-modal'
import { PageInfoButton } from '@/components/ui/page-info'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { EnvironmentBadge } from '@/components/ui/environment-badge'
import { DeletionPendingBanner } from '@/components/settings/deletion-pending-banner'
import { getTierForChef } from '@/lib/billing/tier'
import { isAdmin } from '@/lib/auth/admin'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'
import { differenceInDays } from 'date-fns'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { getAccountDeletionStatus } from '@/lib/compliance/account-deletion-actions'
import { ArchetypeSelector } from '@/components/onboarding/archetype-selector'

export default async function ChefLayout({ children }: { children: React.ReactNode }) {
  // Server-side role check - happens BEFORE any client code ships
  let user
  try {
    user = await requireChef()
  } catch {
    redirect('/auth/signin?portal=chef')
  }

  // Onboarding gate â€” redirect new chefs to wizard before they can access any page.
  // x-pathname is set by middleware so we can check the current path server-side
  // without an additional round-trip or breaking the App Router server component model.
  const pathname = headers().get('x-pathname') ?? ''
  if (!pathname.startsWith('/onboarding')) {
    const onboardingComplete = await getOnboardingStatus().catch(() => true) // fail open
    if (!onboardingComplete) {
      redirect('/onboarding')
    }
  }
  // Parallelized â€” all four calls are independent of each other and of layoutData.
  // Running them concurrently saves ~3 sequential DB round-trips on every page load.
  const [
    layoutData,
    announcement,
    tierStatus,
    hasCannabisTier,
    userIsAdmin,
    chefArchetype,
    deletionStatus,
  ] = await Promise.all([
    // Cached for 60s â€” slug and nav prefs change rarely, keyed per chef
    getChefLayoutData(user.entityId),
    // Platform announcement (non-fatal â€” fail open)
    getAnnouncement().catch(() => null),
    // Tier check â€” non-fatal, defaults to pro (fail open so billing never breaks the portal)
    getTierForChef(user.entityId).catch(() => ({
      tier: 'pro' as const,
      isGrandfathered: true,
      subscriptionStatus: 'grandfathered',
    })),
    // Cannabis tier check â€” non-fatal, fails closed
    hasCannabisAccess(user.id).catch(() => false),
    // Admin check â€” admins bypass all tier restrictions
    isAdmin().catch(() => false),
    // Archetype â€” null means chef hasn't picked one yet (show selector)
    getChefArchetype().catch(() => null),
    // Deletion status â€” non-fatal, fail closed (no banner)
    getAccountDeletionStatus().catch(() => ({
      isPending: false,
      scheduledFor: null,
      daysRemaining: null,
      requestedAt: null,
      reason: null,
    })),
  ])
  // Archetype gate â€” new chefs pick their persona before seeing the portal.
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

  const profile = layoutData
  const primaryNavHrefs = layoutData.primary_nav_hrefs
  const enabledModules =
    layoutData.enabled_modules.length > 0 ? layoutData.enabled_modules : DEFAULT_ENABLED_MODULES
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
                {/* Platform announcement banner â€” shown when admin sets one */}
                {announcement && (
                  <PlatformAnnouncementBanner text={announcement.text} type={announcement.type} />
                )}
                {(userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true') && <EnvironmentBadge />}
                {/* Trial / subscription banner â€” shown when trial is expiring (â‰¤3 days) or expired */}
                <TrialBanner chefId={user.entityId} />
                {/* Account deletion pending banner â€” shown during 30-day grace period */}
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
                  hasCannabisTier={hasCannabisTier}
                  enabledModules={enabledModules}
                  isAdmin={userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true'}
                  userId={user.id}
                  tenantId={user.tenantId ?? user.entityId}
                />
                {/* Mobile nav (top bar + bottom tabs) */}
                <ChefMobileNav
                  primaryNavHrefs={primaryNavHrefs}
                  hasCannabisTier={hasCannabisTier}
                  enabledModules={enabledModules}
                  isAdmin={userIsAdmin || process.env.DEMO_MODE_ENABLED === 'true'}
                  userId={user.id}
                  tenantId={user.tenantId ?? user.entityId}
                />

                {/* Main content â€” offset adjusts dynamically based on sidebar state */}
                <ChefMainContent>{children}</ChefMainContent>

                {/* Push notification permission prompt â€” appears after 5s if not subscribed */}
                <PushPermissionPrompt />

                {/* Feedback nudge â€” shown once, 7 days after account creation */}
                {showFeedbackNudge && <FeedbackNudgeModal />}

                {/* Offline connectivity bar â€” shows status, queue count, sync progress */}
                <OfflineStatusBar />

                {/* Remy â€” AI companion chatbot, Pro tier + admins */}
                {(tierStatus.tier === 'pro' || userIsAdmin) && <RemyDrawer />}

                {/* Mobile quick capture FAB â€” mobile-only, hidden on desktop */}
                <QuickCapture />

                {/* Breadcrumb tracker â€” silent navigation tracking for retrace mode */}
                <BreadcrumbTracker />

                {/* Business milestone celebrations â€” fires once per threshold, replayable */}
                <MilestoneOverlay />

                {/* Page info â€” contextual help overlay */}
                <PageInfoButton />
              </div>
            </KeyboardShortcutsWrapper>
          </NotificationProvider>
        </SidebarProvider>
      </OfflineProvider>
    </ThemeProvider>
  )
}
