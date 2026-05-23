// Public Layout - No authentication required

import dynamic from 'next/dynamic'
import { auth } from '@/lib/auth'
import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'
const DiscoveryOutcomeTracker = dynamic(
  () =>
    import('@/components/discovery/discovery-outcome-tracker').then(
      (m) => m.DiscoveryOutcomeTracker
    ),
  { ssr: false }
)

const PresenceBeacon = dynamic(
  () => import('@/components/admin/presence-beacon').then((m) => m.PresenceBeacon),
  { ssr: false }
)
const GlobalReportButton = dynamic(
  () => import('@/components/feedback/global-report-button').then((m) => m.GlobalReportButton),
  { ssr: false }
)
const RemyConciergeWidget = dynamic(
  () => import('@/components/public/remy-concierge-widget').then((m) => m.RemyConciergeWidget),
  { ssr: false }
)
const MetaPixel = dynamic(
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
      {/* Ambient glow - warm brand radiance behind the page */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,_rgba(142,74,36,0.25),_transparent_70%)] blur-[60px]" />
        <div className="absolute top-[40%] -left-32 h-[500px] w-[500px] rounded-full bg-[radial-gradient(ellipse,_rgba(116,64,33,0.2),_transparent_70%)] blur-[50px]" />
        <div className="absolute top-[70%] -right-32 h-[400px] w-[400px] rounded-full bg-[radial-gradient(ellipse,_rgba(142,74,36,0.15),_transparent_70%)] blur-[50px]" />
      </div>
      <PresenceBeacon role="anonymous" />
      <PublicHeader user={authUser} />
      <main id="main-content" className="flex-1 animate-fade-slide-up">
        {children}
      </main>
      <PublicFooter />
      <GlobalReportButton />
      <RemyConciergeWidget />
      <DiscoveryOutcomeTracker />
      <MetaPixel />
    </div>
  )
}
