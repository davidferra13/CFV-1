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
import { ClientTourWrapper } from '@/components/onboarding/client-tour-wrapper'
import { AnalyticsIdentify } from '@/components/analytics/analytics-identify'

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
        <TestAccountBanner email={user.email} />
        <div className="min-h-screen bg-stone-900 text-stone-100" data-cf-portal="client">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to main content
          </a>
          <ClientSidebar userEmail={user.email} />
          <ClientMobileNav userEmail={user.email} />
          <ActivityTracker eventType="portal_login" />
          <ClientMainContent>
            <ClientTourWrapper>{children}</ClientTourWrapper>
          </ClientMainContent>
          <AnalyticsIdentify
            userId={user.id}
            email={user.email}
            role={user.role}
            traits={{ entity_id: user.entityId, tenant_id: user.tenantId || '' }}
          />
          <PresenceBeacon />
          <PageInfoButton />
        </div>
      </NotificationProvider>
    </ClientSidebarProvider>
  )
}
