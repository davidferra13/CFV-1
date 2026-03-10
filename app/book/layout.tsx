// Public booking page layout - no auth, no nav, minimal wrapper.
// Similar to proposal/embed layouts.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book a Chef - ChefFlow',
  robots: { index: true, follow: true },
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-900">{children}</div>
}
