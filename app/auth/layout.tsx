// Auth Layout - Provides metadata template for auth pages

import type { Metadata } from 'next'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export const metadata: Metadata = {
  title: {
    template: '%s - ChefFlow',
    default: 'Authentication - ChefFlow',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-stone-950 text-stone-100">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle className="h-10 w-10 min-h-0 rounded-full border border-stone-700 bg-stone-900/80 p-0 shadow-sm backdrop-blur-sm" />
      </div>
      <main id="main-content">{children}</main>
    </div>
  )
}
