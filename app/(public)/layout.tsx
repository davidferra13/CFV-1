// Public Layout - No authentication required

import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'
import { PageInfoButton } from '@/components/ui/page-info'
import { RemyConciergeWidget } from '@/components/public/remy-concierge-widget'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <PageInfoButton />
      <RemyConciergeWidget />
    </div>
  )
}
