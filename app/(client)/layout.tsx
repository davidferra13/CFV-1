// Client Portal Layout - Layer 2 of Defense in Depth

import { requireClient } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import {
  ClientSidebarProvider,
  ClientSidebar,
  ClientMobileNav,
  ClientMainContent,
} from '@/components/navigation/client-nav'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { PageInfoButton } from '@/components/ui/page-info'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
import { Suspense } from 'react'
import { BetaSurveyBannerWrapper } from '@/components/beta-survey/beta-survey-banner-wrapper'
import { ClientTourWrapper } from '@/components/onboarding/client-tour-wrapper'
import { getImpersonatedClientId } from '@/lib/auth/client-impersonation'
import { getAdminEmails } from '@/lib/platform/owner-account'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getImpersonatedClientInfo } from '@/lib/auth/client-impersonation-actions'
import { ClientImpersonationBanner } from '@/components/admin/client-impersonation-banner'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireClient()
  } catch {
    redirect('/auth/signin?portal=client')
  }

  // Check if admin is impersonating a client
  let impersonationInfo: {
    clientName: string | null
    clientEmail: string | null
    chefName: string | null
  } | null = null

  const impersonatedClientId = getImpersonatedClientId()
  if (impersonatedClientId) {
    const realUser = await getCurrentUser()
    if (realUser && realUser.role === 'chef') {
      const adminEmails = getAdminEmails()
      if (adminEmails.includes(realUser.email.toLowerCase())) {
        const info = await getImpersonatedClientInfo()
        if (info) {
          impersonationInfo = {
            clientName: info.fullName,
            clientEmail: info.email,
            chefName: info.chefBusinessName,
          }
        }
      }
    }
  }

  return (
    <ClientSidebarProvider>
      <NotificationProvider userId={user.id}>
        <ToastProvider />
        <TestAccountBanner />
        {impersonationInfo && (
          <>
            <ClientImpersonationBanner
              clientName={impersonationInfo.clientName}
              clientEmail={impersonationInfo.clientEmail}
              chefName={impersonationInfo.chefName}
            />
            <div className="h-10" />
          </>
        )}
        <div className="min-h-screen bg-stone-800">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to main content
          </a>
          {/* Beta survey banner — non-blocking, shows when an active survey hasn't been submitted */}
          <Suspense fallback={null}>
            <BetaSurveyBannerWrapper href="/beta-survey" />
          </Suspense>
          <ClientSidebar userEmail={user.email} />
          <ClientMobileNav userEmail={user.email} />
          <ActivityTracker eventType="portal_login" />
          <ClientMainContent>
            <ClientTourWrapper>{children}</ClientTourWrapper>
          </ClientMainContent>
          <PresenceBeacon />
          <PageInfoButton />
        </div>
      </NotificationProvider>
    </ClientSidebarProvider>
  )
}
