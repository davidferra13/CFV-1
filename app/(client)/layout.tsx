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
import { RemyClientChat } from '@/components/ai/remy-client-chat'
import { PageInfoButton } from '@/components/ui/page-info'
import { Suspense } from 'react'
import { BetaSurveyBannerWrapper } from '@/components/beta-survey/beta-survey-banner-wrapper'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireClient()
  } catch {
    redirect('/auth/signin?portal=client')
  }

  return (
    <ClientSidebarProvider>
      <NotificationProvider userId={user.id}>
        <ToastProvider />
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
          <ClientMainContent>{children}</ClientMainContent>
          <RemyClientChat />
          <PageInfoButton />
        </div>
      </NotificationProvider>
    </ClientSidebarProvider>
  )
}
