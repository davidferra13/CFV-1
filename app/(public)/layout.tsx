// Public Layout - No authentication required

import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'
import { PageInfoButton } from '@/components/ui/page-info'
import { RemyConciergeWidget } from '@/components/public/remy-concierge-widget'
import { HolidayOverlay } from '@/components/ui/holiday-overlay'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-gradient-to-b from-[#1a1210] via-[#141110] to-stone-950">
      {/* Skip link removed — root layout.tsx already provides one */}
      {/* Ambient glow — warm brand radiance behind the page */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-brand-800/30 blur-[80px]" />
        <div className="absolute top-[50%] -left-20 h-[300px] w-[300px] rounded-full bg-brand-900/35 blur-[60px]" />
        <div className="absolute top-[75%] -right-20 h-[250px] w-[250px] rounded-full bg-brand-800/20 blur-[60px]" />
      </div>
      <PublicHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
      <PageInfoButton />
      <RemyConciergeWidget />
      <HolidayOverlay />
    </div>
  )
}
