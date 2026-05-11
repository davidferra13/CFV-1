'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PRIMARY_TABS = [
  { label: 'Overview', href: '/finance' },
  { label: 'Invoices', href: '/finance/invoices' },
  { label: 'Expenses', href: '/finance/expenses' },
  { label: 'Ledger', href: '/finance/ledger' },
] as const

/**
 * Horizontal tab navigation for the Finance hub.
 * Shows on /finance and its primary sub-sections.
 * Hides on deeply nested detail pages (3+ segments past /finance).
 */
export function FinanceHubNav() {
  const pathname = usePathname()

  // Hide on deeply nested routes (e.g. /finance/invoices/123/edit)
  // /finance = 1 segment, /finance/invoices = 2, /finance/invoices/123 = 3+
  const segments = pathname
    .replace(/^\/finance\/?/, '')
    .split('/')
    .filter(Boolean)
  if (segments.length > 1) return null

  return (
    <nav className="mb-6">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-0 border-b border-stone-700 min-w-max">
          {PRIMARY_TABS.map((tab) => {
            const isActive =
              tab.href === '/finance'
                ? pathname === '/finance' || pathname === '/finance/'
                : pathname.startsWith(tab.href)

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
