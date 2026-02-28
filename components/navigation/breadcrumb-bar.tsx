'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  ledger: 'Ledger',
  overview: 'Overview',
  analytics: 'Analytics',
  equipment: 'Equipment',

  // Grocery / event sub-paths
  'grocery-quote': 'Grocery Quote',
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
  const crumbs = buildCrumbs(pathname)

  // Nothing to show on dashboard or empty state
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="py-1.5 px-4 sm:px-6 lg:px-8">
      {/* Desktop: show all crumbs */}
      <ol className="hidden sm:flex items-center gap-1 text-xs">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-stone-500 select-none" aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-stone-200 font-medium" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-stone-400 hover:text-stone-200 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {/* Mobile: show ellipsis + last 2 segments */}
      <ol className="flex sm:hidden items-center gap-1 text-xs">
        {crumbs.length > 2 && (
          <li className="text-stone-500 select-none" aria-hidden="true">
            ...
          </li>
        )}
        {crumbs.slice(-2).map((crumb, i, arr) => {
          const isLast = i === arr.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {(i > 0 || crumbs.length > 2) && (
                <span className="text-stone-500 select-none" aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-stone-200 font-medium" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-stone-400 hover:text-stone-200 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
