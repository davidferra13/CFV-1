// Public Layout - No authentication required

import dynamic from 'next/dynamic'
import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'

const PresenceBeacon = dynamic(
  () => import('@/components/admin/presence-beacon').then((m) => m.PresenceBeacon),
  { ssr: false }
)
const GlobalReportButton = dynamic(
  () => import('@/components/feedback/global-report-button').then((m) => m.GlobalReportButton),
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
      {/* Ambient glow - warm brand radiance behind the page */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,_rgba(142,74,36,0.25),_transparent_70%)] blur-[60px]" />
        <div className="absolute top-[40%] -left-32 h-[500px] w-[500px] rounded-full bg-[radial-gradient(ellipse,_rgba(116,64,33,0.2),_transparent_70%)] blur-[50px]" />
        <div className="absolute top-[70%] -right-32 h-[400px] w-[400px] rounded-full bg-[radial-gradient(ellipse,_rgba(142,74,36,0.15),_transparent_70%)] blur-[50px]" />
      </div>
      <PresenceBeacon role="anonymous" />
      <PublicHeader />
      <main id="main-content" className="flex-1 animate-fade-slide-up">
        {children}
      </main>
      <PublicFooter />
      <GlobalReportButton />
    </div>
  )
}
