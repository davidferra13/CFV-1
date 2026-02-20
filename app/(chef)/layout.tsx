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

export default async function ChefLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
  // Cached for 60s — slug and nav prefs change rarely, and the cache is keyed
  // per chef so one tenant's update never bleeds into another.
  const layoutData = await getChefLayoutData(user.entityId)
  const profile = layoutData
  const primaryNavHrefs = layoutData.primary_nav_hrefs

  return (
    <SidebarProvider>
      <NotificationProvider userId={user.id}>
        <ToastProvider />
        <KeyboardShortcutsWrapper>
          <div
            className="min-h-screen"
            style={{
              backgroundColor: profile.portal_background_color || '#f5f5f4',
              backgroundImage: profile.portal_background_image_url
                ? `url(${profile.portal_background_image_url})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Desktop sidebar */}
            <ChefSidebar primaryNavHrefs={primaryNavHrefs} />
            {/* Mobile nav (top bar + bottom tabs) */}
            <ChefMobileNav primaryNavHrefs={primaryNavHrefs} />

            {/* Main content — offset adjusts dynamically based on sidebar state */}
            <ChefMainContent>
              {children}
            </ChefMainContent>

            {/* Push notification permission prompt — appears after 5s if not subscribed */}
            <PushPermissionPrompt />
          </div>
        </KeyboardShortcutsWrapper>
      </NotificationProvider>
    </SidebarProvider>
  )
}
