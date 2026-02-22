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
import { OfflineBanner } from '@/components/ui/offline-banner'
import { MilestoneOverlay } from '@/components/ui/milestone-overlay'
import { BreadcrumbTracker } from '@/components/activity/breadcrumb-tracker'
import { QuickCapture } from '@/components/mobile/quick-capture'
import { FeedbackNudgeModal } from '@/components/feedback/feedback-nudge-modal'
import { PageInfoButton } from '@/components/ui/page-info'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { getTierForChef } from '@/lib/billing/tier'
import { isAdmin } from '@/lib/auth/admin'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'
import { differenceInDays } from 'date-fns'

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
  // Parallelized — all four calls are independent of each other and of layoutData.
  // Running them concurrently saves ~3 sequential DB round-trips on every page load.
  const [layoutData, announcement, tierStatus, hasCannabisTier, userIsAdmin] = await Promise.all([
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
    // Cannabis tier check — non-fatal, fails closed
    hasCannabisAccess(user.id).catch(() => false),
    // Admin check — admins bypass all tier restrictions
    isAdmin().catch(() => false),
  ])
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
      <SidebarProvider>
        <NotificationProvider userId={user.id}>
          <ToastProvider />
          <KeyboardShortcutsWrapper>
            <div
              className="min-h-screen"
              style={{
                backgroundColor: profile.portal_background_color || '#ede9e4',
                backgroundImage: profile.portal_background_image_url
                  ? `url(${profile.portal_background_image_url})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Platform announcement banner — shown when admin sets one */}
              {announcement && (
                <PlatformAnnouncementBanner text={announcement.text} type={announcement.type} />
              )}
              {/* Trial / subscription banner — shown when trial is expiring (≤3 days) or expired */}
              <TrialBanner chefId={user.entityId} />
              {/* Desktop sidebar */}
              <ChefSidebar
                primaryNavHrefs={primaryNavHrefs}
                hasCannabisTier={hasCannabisTier}
                enabledModules={enabledModules}
              />
              {/* Mobile nav (top bar + bottom tabs) */}
              <ChefMobileNav
                primaryNavHrefs={primaryNavHrefs}
                hasCannabisTier={hasCannabisTier}
                enabledModules={enabledModules}
              />

              {/* Main content — offset adjusts dynamically based on sidebar state */}
              <ChefMainContent>{children}</ChefMainContent>

              {/* Push notification permission prompt — appears after 5s if not subscribed */}
              <PushPermissionPrompt />

              {/* Feedback nudge — shown once, 7 days after account creation */}
              {showFeedbackNudge && <FeedbackNudgeModal />}

              {/* Offline connectivity banner — renders nothing when online */}
              <OfflineBanner />

              {/* Remy — AI companion chatbot, Pro tier + admins */}
              {(tierStatus.tier === 'pro' || userIsAdmin) && <RemyDrawer />}

              {/* Mobile quick capture FAB — mobile-only, hidden on desktop */}
              <QuickCapture />

              {/* Breadcrumb tracker — silent navigation tracking for retrace mode */}
              <BreadcrumbTracker />

              {/* Business milestone celebrations — fires once per threshold, replayable */}
              <MilestoneOverlay />

              {/* Page info — contextual help overlay */}
              <PageInfoButton />
            </div>
          </KeyboardShortcutsWrapper>
        </NotificationProvider>
      </SidebarProvider>
    </ThemeProvider>
  )
}
