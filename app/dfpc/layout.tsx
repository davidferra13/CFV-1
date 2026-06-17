export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'DF Private Chef | Private Chef Services in New England',
    template: '%s | DF Private Chef',
  },
  description:
    'Personal chef experiences for private dinners, events, and vacation dining across New England.',
}

export default function DfpcLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800/60 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-semibold tracking-wide text-amber-200/90">
            DF Private Chef
          </span>
          <nav className="flex gap-6 text-sm text-stone-400">
            <span>Services</span>
            <span>About</span>
            <span>Contact</span>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-stone-800/60 px-6 py-8 text-center text-sm text-stone-500">
        <p>&copy; {new Date().getFullYear()} DF Private Chef. All rights reserved.</p>
      </footer>
    </div>
  )
}
