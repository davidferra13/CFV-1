// Public Layout - No authentication required

import dynamic from 'next/dynamic'
import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'
import { ToastProvider } from '@/components/notifications/toast-provider'

const PresenceBeacon = dynamic(
  () => import('@/components/admin/presence-beacon').then((m) => m.PresenceBeacon),
  { ssr: false }
)

const RemyConciergeWidget = dynamic(
  () => import('@/components/public/remy-concierge-widget').then((m) => m.RemyConciergeWidget),
  { ssr: false }
)

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-cf-portal="public"
      data-cf-surface="browsing"
      className="relative flex min-h-screen flex-col overflow-x-clip"
      style={{ background: 'var(--page-bg-gradient)' }}
    >
      {/* Skip link removed - root layout.tsx already provides one */}
      {/* Ambient glow - soft warm radiance, barely perceptible */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-800/15 blur-[120px]" />
        <div className="absolute top-[55%] -left-32 h-[350px] w-[350px] rounded-full bg-brand-900/20 blur-[100px]" />
        <div className="absolute top-[80%] -right-32 h-[300px] w-[300px] rounded-full bg-brand-800/10 blur-[100px]" />
      </div>
      <PresenceBeacon role="anonymous" />
      <PublicHeader />
      <main id="main-content" className="flex-1 animate-fade-slide-up">
        {children}
      </main>
      <PublicFooter />
      <RemyConciergeWidget />
      <ToastProvider />
    </div>
  )
}
