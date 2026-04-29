// Client Portal Layout - Layer 2 of Defense in Depth

import { requireClient } from '@/lib/auth/get-user'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  ClientSidebarProvider,
  ClientSidebar,
  ClientMobileNav,
  ClientMainContent,
} from '@/components/navigation/client-nav'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { ClientActivityDisclosure } from '@/components/activity/client-activity-disclosure'
import { ClientPortalPresenceBeacon } from '@/components/activity/client-portal-presence-beacon'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { PageInfoButton } from '@/components/ui/page-info'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
import { ClientTourWrapper } from '@/components/onboarding/client-tour-wrapper'
import { AnalyticsIdentify } from '@/components/analytics/analytics-identify'
import { MarketResearchBannerWrapper } from '@/components/beta-survey/market-research-banner-wrapper'
import { PATHNAME_HEADER } from '@/lib/auth/request-auth-context'
import { resolveClientSurfaceMode } from '@/lib/interface/surface-governance'
import dynamic from 'next/dynamic'

const LiveSystemSync = dynamic(
  () => import('@/components/realtime/live-system-sync').then((m) => m.LiveSystemSync),
  { ssr: false }
)

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get(PATHNAME_HEADER) ?? '/my-events'
  const surfaceMode = resolveClientSurfaceMode(pathname)

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
        <LiveSystemSync tenantId={user.tenantId} userId={user.id} role="client" />
        <TestAccountBanner email={user.email} />
        <div
          className="min-h-screen bg-stone-900 text-stone-100"
          data-cf-portal="client"
          data-cf-surface={surfaceMode}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to main content
          </a>
          <ClientSidebar userEmail={user.email} userId={user.id} />
          <ClientMobileNav userEmail={user.email} userId={user.id} />
          <ActivityTracker eventType="portal_login" />
          <ClientMainContent>
            <MarketResearchBannerWrapper
              surveyType="market_research_client"
              channel="client_portal"
            />
            <ClientActivityDisclosure />
            <ClientTourWrapper>{children}</ClientTourWrapper>
          </ClientMainContent>
          <AnalyticsIdentify
            userId={user.id}
            email={user.email}
            role={user.role}
            traits={{ entity_id: user.entityId, tenant_id: user.tenantId || '' }}
          />
          <PresenceBeacon userId={user.id} email={user.email} />
          <ClientPortalPresenceBeacon
            tenantId={user.tenantId}
            userId={user.id}
            clientId={user.entityId}
            email={user.email}
          />
          <PageInfoButton />
        </div>
      </NotificationProvider>
    </ClientSidebarProvider>
  )
}
