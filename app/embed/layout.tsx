// Minimal layout for embed pages - no header, no footer, no nav
// Designed to be loaded inside an iframe on external websites

export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book a Private Chef',
  robots: { index: false, follow: false }, // Don't index embed pages
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-transparent">{children}</div>
}
