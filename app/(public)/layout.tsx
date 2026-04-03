// Public Layout - No authentication required

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PublicMarketResearchEntry } from '@/components/beta-survey/public-market-research-entry'
import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'

const PresenceBeacon = dynamic(
  () => import('@/components/admin/presence-beacon').then((m) => m.PresenceBeacon),
  { ssr: false }
)

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-clip"
      style={{ background: 'var(--page-bg-gradient)' }}
    >
      {/* Skip link removed - root layout.tsx already provides one */}
      {/* Ambient glow - warm brand radiance behind the page */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-brand-800/30 blur-[80px]" />
        <div className="absolute top-[50%] -left-20 h-[300px] w-[300px] rounded-full bg-brand-900/35 blur-[60px]" />
        <div className="absolute top-[75%] -right-20 h-[250px] w-[250px] rounded-full bg-brand-800/20 blur-[60px]" />
      </div>
      <PresenceBeacon role="anonymous" />
      <PublicHeader />
      <main id="main-content" className="flex-1 animate-fade-slide-up">
        {children}
      </main>
      <Suspense fallback={null}>
        <PublicMarketResearchEntry />
      </Suspense>
      <PublicFooter />
    </div>
  )
}
