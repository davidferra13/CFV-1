'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Contact,
  MessageSquareDashed,
  ChartLineUp,
  History as HistoryIcon,
  UserPlus,
} from '@/components/ui/icons'

const tabs = [
  { label: 'Directory', href: '/clients', icon: Contact },
  { label: 'Communication', href: '/clients/communication', icon: MessageSquareDashed },
  { label: 'Insights', href: '/clients/insights', icon: ChartLineUp },
  { label: 'History', href: '/clients/history', icon: HistoryIcon },
] as const

/**
 * Known hub-level path prefixes. Anything under /clients/ that does NOT
 * start with one of these is treated as a detail page (client ID / UUID).
 */
const hubPrefixes = [
  '/clients/communication',
  '/clients/insights',
  '/clients/history',
  '/clients/active',
  '/clients/inactive',
  '/clients/csv-export',
  '/clients/duplicates',
  '/clients/gift-cards',
  '/clients/intake',
  '/clients/loyalty',
  '/clients/new',
  '/clients/preferences',
  '/clients/presence',
  '/clients/recurring',
  '/clients/segments',
  '/clients/vip',
  '/clients/pending-invitations-table',
]

function isDetailPage(pathname: string): boolean {
  if (pathname === '/clients') return false
  // Check if the path starts with any known hub prefix
  for (const prefix of hubPrefixes) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return false
  }
  // Anything else under /clients/ is a detail page (UUID, numeric ID, etc.)
  return true
}

function isTabActive(tabHref: string, pathname: string): boolean {
  if (tabHref === '/clients') {
    // Directory tab is active for exact /clients or status-filter sub-routes
    // that are NOT covered by other tabs
    return (
      pathname === '/clients' ||
      pathname === '/clients/active' ||
      pathname === '/clients/inactive' ||
      pathname === '/clients/vip' ||
      pathname === '/clients/segments' ||
      pathname === '/clients/duplicates' ||
      pathname === '/clients/new'
    )
  }
  return pathname === tabHref || pathname.startsWith(tabHref + '/')
}

export function ClientsHubNav() {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftFade(el.scrollLeft > 4)
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateFades()
    el.addEventListener('scroll', updateFades, { passive: true })
    const ro = new ResizeObserver(updateFades)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateFades)
      ro.disconnect()
    }
  }, [updateFades])

  // Hide nav on detail pages (individual client views)
  if (isDetailPage(pathname)) return null

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Tab bar with scroll */}
        <div className="relative flex-1 min-w-0">
          {showLeftFade && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-stone-900 to-transparent z-10" />
          )}
          {showRightFade && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-stone-900 to-transparent z-10" />
          )}

          <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
            <nav className="flex gap-0 border-b border-stone-700 min-w-max">
              {tabs.map((tab) => {
                const active = isTabActive(tab.href, pathname)
                const Icon = tab.icon
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`group flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-stone-900 ${
                      active
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Add Client button */}
        <Link
          href="/clients/new"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Client</span>
        </Link>
      </div>
    </div>
  )
}
