// Public layout for online ordering pages. No auth, no nav.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Online Ordering - ChefFlow',
  robots: { index: true, follow: true },
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-50">{children}</div>
}
