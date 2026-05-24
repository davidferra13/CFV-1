'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Pulse', href: '/events' },
  { label: 'List', href: '/events/list' },
  { label: 'Board', href: '/events/board' },
  { label: 'Calendar', href: '/calendar' },
] as const

export function EventsHubNav() {
  const pathname = usePathname()

  // Hide on event detail pages (/events/[uuid]/...)
  if (pathname.match(/^\/events\/[0-9a-f-]{36}/i)) return null

  return (
    <nav className="border-b border-stone-700/60 mb-6">
      <div className="flex gap-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/events'
              ? pathname === '/events' || pathname === '/events/'
              : tab.href === '/events/list'
                ? pathname === '/events/list'
                : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
    </nav>
  )
}
