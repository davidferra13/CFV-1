// Public Layout - No authentication required

import nextDynamic from 'next/dynamic'
export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'
const DiscoveryOutcomeTracker = nextDynamic(
  () =>
    import('@/components/discovery/discovery-outcome-tracker').then(
      (m) => m.DiscoveryOutcomeTracker
    ),
  { ssr: false }
)

const PresenceBeacon = nextDynamic(
  () => import('@/components/admin/presence-beacon').then((m) => m.PresenceBeacon),
  { ssr: false }
)
const GlobalReportButton = nextDynamic(
  () => import('@/components/feedback/global-report-button').then((m) => m.GlobalReportButton),
  { ssr: false }
)
const MetaPixel = nextDynamic(
  () => import('@/components/tracking/meta-pixel').then((m) => m.MetaPixel),
  { ssr: false }
)

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user?.role ?? null
  const authUser = role
    ? {
        role,
        portalHref:
          role === 'client'
            ? '/my-events'
            : role === 'staff'
              ? '/staff-dashboard'
              : role === 'partner'
                ? '/partner/dashboard'
                : '/dashboard',
        label:
          role === 'client'
            ? 'My Events'
            : role === 'staff'
              ? 'My Portal'
              : role === 'partner'
                ? 'My Portal'
                : 'My Dashboard',
        name: null,
        email: session?.user?.email ?? null,
      }
    : null

  return (
    <div
      data-cf-portal="public"
      data-cf-surface="browsing"
      className="relative flex min-h-screen flex-col overflow-x-clip"
      style={{ background: 'var(--page-bg-gradient)' }}
    >
      {/* Skip link removed - root layout.tsx already provides one */}

      <PresenceBeacon role="anonymous" />
      <PublicHeader user={authUser} />
      <main id="main-content" className="flex-1 animate-fade-slide-up">
        {children}
      </main>
      <PublicFooter />
      <GlobalReportButton />
      <DiscoveryOutcomeTracker />
      <MetaPixel />
    </div>
  )
}
