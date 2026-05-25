'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw } from '@/components/ui/icons'
import {
  extractDomain,
  getStack,
  pushSnapBack,
  popSnapBack,
  clearDomainFromStack,
} from '@/lib/navigation/snap-back-stack'
import type { SnapBackEntry } from '@/lib/navigation/snap-back-stack'

/**
 * Route label mapping for known paths.
 * Keys are the segment value (what appears in the URL after the slash).
 * Values are the human-readable labels displayed in the breadcrumb.
 */
const SEGMENT_LABELS: Record<string, string> = {
  // Top-level sections
  events: 'Events',
  clients: 'Clients',
  inquiries: 'Inquiries',
  quotes: 'Quotes',
  calendar: 'Calendar',
  finance: 'Finance',
  financials: 'Financials',
  recipes: 'Recipes',
  menus: 'Menus',
  staff: 'Staff',
  settings: 'Settings',
  documents: 'Documents',
  campaigns: 'Campaigns',
  reports: 'Reports',

  onboarding: 'Setup',
  culinary: 'Culinary',
  'price-catalog': 'Food Catalog',

  // Sub-paths
  new: 'New',
  edit: 'Edit',
  day: 'Day View',
  week: 'Week View',
  month: 'Month View',
  profile: 'Profile',
  billing: 'Billing',
  notifications: 'Notifications',
  modules: 'Modules',
  embed: 'Embed',
  integrations: 'Integrations',
  team: 'Team',
  payroll: 'Payroll',
  employees: 'Employees',
  'sales-tax': 'Sales Tax',
  'bank-feed': 'Bank Feed',
  expenses: 'Expenses',
  invoices: 'Invoices',
  ledger: 'Money',
  overview: 'Overview',
  analytics: 'Analytics',
  equipment: 'Equipment',

  // Grocery / event sub-paths
  'grocery-quote': 'Grocery Quote',
  procurement: 'Purchasing',
  'prep-plan': 'Prep Flow',
  execution: 'Service',
  'prep-timeline': 'Prep Timeline',
  'staff-briefing': 'Staff Briefing',
}

/**
 * Entity type labels for dynamic [id] segments.
 * When a UUID segment is encountered, the preceding segment determines the label.
 */
const ENTITY_LABELS: Record<string, string> = {
  events: 'Event',
  clients: 'Client',
  inquiries: 'Inquiry',
  quotes: 'Quote',
  recipes: 'Recipe',
  menus: 'Menu',
  staff: 'Staff Member',
  documents: 'Document',
  campaigns: 'Campaign',
  invoices: 'Invoice',
}

/** Check if a string looks like a UUID (standard 36-char format with dashes). */
function isUUID(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
}

interface Crumb {
  label: string
  href: string
}

function buildCrumbs(pathname: string): Crumb[] {
  // Strip the leading slash and split into segments
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean)

  // Don't show breadcrumbs on dashboard (it's the root)
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return []
  }

  const crumbs: Crumb[] = [{ label: 'Dashboard', href: '/dashboard' }]

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const href = '/' + segments.slice(0, i + 1).join('/')

    // Skip "dashboard" if it appears as the first segment (already added as root)
    if (i === 0 && segment === 'dashboard') continue

    if (isUUID(segment)) {
      // Use the preceding segment to determine entity type
      const parentSegment = i > 0 ? segments[i - 1] : ''
      const label = ENTITY_LABELS[parentSegment] || 'Detail'
      crumbs.push({ label, href })
    } else {
      // Look up the known label, or title-case the segment as fallback
      const label =
        SEGMENT_LABELS[segment] ||
        segment
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      crumbs.push({ label, href })
    }
  }

  return crumbs
}

export function BreadcrumbBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [snapBack, setSnapBack] = useState<SnapBackEntry | null>(null)
  const prevDomainRef = useRef<string | null>(null)
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    const currentDomain = extractDomain(pathname)
    const prevDomain = prevDomainRef.current
    const prevPath = prevPathRef.current

    if (prevDomain && currentDomain && prevDomain !== currentDomain && prevPath) {
      const crumbsForLabel = buildCrumbs(prevPath)
      const entityLabel = crumbsForLabel[crumbsForLabel.length - 1]?.label || prevDomain
      pushSnapBack({ path: prevPath, label: entityLabel, domain: prevDomain })
    }

    if (currentDomain) {
      clearDomainFromStack(currentDomain)
    }

    prevDomainRef.current = currentDomain
    prevPathRef.current = pathname

    const stack = getStack()
    setSnapBack(stack.length > 0 ? stack[stack.length - 1] : null)
  }, [pathname])

  const handleSnapBack = useCallback(() => {
    const entry = popSnapBack()
    if (entry) router.push(entry.path)
    setSnapBack(null)
  }, [router])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1200)
  }, [router])

  if (!pathname) return null
  const crumbs = buildCrumbs(pathname)

  // Nothing to show on dashboard or empty state
  if (crumbs.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="py-2 px-4 sm:px-6 lg:px-8 flex items-center justify-between"
    >
      {/* Snap-back + Crumbs */}
      <div className="min-w-0 flex-1 flex items-center">
        {snapBack && (
          <button
            type="button"
            onClick={handleSnapBack}
            className="flex items-center gap-1 px-2 py-1 mr-2 text-xs bg-stone-800 border border-stone-700 rounded hover:bg-stone-700 text-stone-300 hover:text-stone-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="truncate max-w-[140px]">Back to {snapBack.label}</span>
          </button>
        )}
        <div className="min-w-0 flex-1">
          {/* Desktop: show all crumbs */}
          <ol className="hidden sm:flex items-center gap-1.5 text-sm">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1
              return (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <svg
                      className="w-3 h-3 text-stone-600 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {isLast ? (
                    <span className="text-stone-100 font-medium" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-stone-400 hover:text-stone-200 transition-colors duration-150"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>

          {/* Mobile: show ellipsis + last 2 segments */}
          <ol className="flex sm:hidden items-center gap-1 text-sm min-h-[44px]">
            {crumbs.length > 2 && (
              <li className="text-stone-500 select-none" aria-hidden="true">
                ...
              </li>
            )}
            {crumbs.slice(-2).map((crumb, i, arr) => {
              const isLast = i === arr.length - 1
              return (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  {(i > 0 || crumbs.length > 2) && (
                    <svg
                      className="w-3 h-3 text-stone-600 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {isLast ? (
                    <span className="text-stone-100 font-medium" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-stone-400 hover:text-stone-200 transition-colors duration-150 inline-flex items-center min-h-[44px] touch-manipulation"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {/* Right side: Cmd+K hint + refresh */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="kbd-badge hidden sm:inline-flex" aria-hidden="true">
          <span>&#8984;</span>
          <span>K</span>
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh page data"
          aria-label="Refresh"
          className="flex items-center justify-center w-7 h-7 rounded-md text-stone-500 hover:text-stone-300 hover:bg-stone-800/60 transition-colors duration-150 disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </nav>
  )
}
