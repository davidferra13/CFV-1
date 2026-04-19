// Auth Layout - Provides metadata template for auth pages

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: {
    template: '%s',
    default: 'Authentication',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-stone-950 text-stone-100">
      <main id="main-content">{children}</main>
    </div>
  )
}
