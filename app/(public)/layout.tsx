// Public Layout - No authentication required

import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
