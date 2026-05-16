'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { actionBarItems } from './nav-config'
import { CreateMenuDropdown } from './create-menu-dropdown'
import { isItemActive } from './chef-nav-helpers'
import { InboxUnreadBadge } from '@/components/communication/inbox-unread-badge'
import { InquiriesUnreadBadge } from '@/components/inquiries/inquiries-unread-badge'
import { NotificationsUnreadBadge } from '@/components/notifications/notifications-unread-badge'
import { CirclesUnreadBadge } from '@/components/hub/circles-unread-badge'
import { useNavigationPending } from '@/components/navigation/navigation-pending-provider'
import { getArchetypeCopy } from '@/lib/archetypes/ui-copy'
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'
import { isActionBarItemVisible } from '@/lib/progressive-disclosure/nav-visibility'

const PINNED_HREFS = new Set(['/inbox', '/notifications', '/inquiries', '/circles'])

type ActionBarProps = {
  navFilter?: string
  collapsed?: boolean
  archetype?: string | null
  tenantPresence?: TenantDataPresence | null
  showAllFeatures?: boolean
  bypassProgressiveDisclosure?: boolean
  usageRanking?: Record<string, number>
}

export function ActionBar({
  navFilter = '',
  collapsed = false,
  archetype,
  tenantPresence,
  showAllFeatures = false,
  bypassProgressiveDisclosure = false,
  usageRanking,
}: ActionBarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { pendingHref, setPendingHref } = useNavigationPending()

  const copy = getArchetypeCopy(archetype)
  const visibleItems = actionBarItems
    .filter(
      (item) =>
        isItemActive(pathname, item.href, searchParams) ||
        isActionBarItemVisible(
          item.href,
          tenantPresence,
          showAllFeatures,
          bypassProgressiveDisclosure
        )
    )
    .map((item) => (item.href === '/events' ? { ...item, label: copy.eventsLabel } : item))

  const items =
    usageRanking && Object.keys(usageRanking).length > 0
      ? sortByUsage(visibleItems, usageRanking)
      : visibleItems

  const query = navFilter.toLowerCase().trim()
  const filtered = query ? items.filter((item) => item.label.toLowerCase().includes(query)) : items

  if (collapsed) {
    return (
      <div className="space-y-1 px-2 py-2">
        {/* + Create in rail mode */}
        <CreateMenuDropdown compact side="right" align="start" />

        {/* Action Bar items as icon-only links */}
        {filtered.map((item) => {
          const Icon = item.icon
          const active = isItemActive(pathname, item.href, searchParams)
          const isPending = pendingHref === item.href && !active
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={() => setPendingHref(item.href)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                active
                  ? 'bg-brand-950 text-brand-600'
                  : isPending
                    ? 'bg-brand-950/50 text-brand-600/70'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.href === '/inbox' && (
                <span className="absolute -top-1 -right-1">
                  <InboxUnreadBadge />
                </span>
              )}
              {item.href === '/notifications' && (
                <span className="absolute -top-1 -right-1">
                  <NotificationsUnreadBadge />
                </span>
              )}
              {item.href === '/inquiries' && (
                <span className="absolute -top-1 -right-1">
                  <InquiriesUnreadBadge />
                </span>
              )}
              {item.href === '/circles' && (
                <span className="absolute -top-1 -right-1">
                  <CirclesUnreadBadge />
                </span>
              )}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-1 px-3 py-2">
      {/* + Create button */}
      <CreateMenuDropdown />

      {/* 12 primary shortcuts */}
      <div className="mt-1 space-y-0.5">
        {filtered.map((item) => {
          const Icon = item.icon
          const active = isItemActive(pathname, item.href, searchParams)
          const isPending = pendingHref === item.href && !active
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setPendingHref(item.href)}
              className={`flex items-center gap-3 pl-2 pr-1 py-2 rounded-lg text-sm font-semibold transition-colors border-l-2 ${
                active
                  ? 'bg-brand-950 text-brand-400 border-brand-500 nav-active-glow'
                  : isPending
                    ? 'bg-brand-950/50 text-brand-400/70 border-brand-500/50'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100 border-transparent'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 ${active || isPending ? 'text-brand-600' : 'text-stone-400'}`}
              />
              <span className="truncate">{item.label}</span>
              {item.href === '/inbox' && <InboxUnreadBadge />}
              {item.href === '/notifications' && <NotificationsUnreadBadge />}
              {item.href === '/inquiries' && <InquiriesUnreadBadge />}
              {item.href === '/circles' && <CirclesUnreadBadge />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function sortByUsage(
  items: typeof actionBarItems,
  ranking: Record<string, number>
): typeof actionBarItems {
  const pinned = items.filter((i) => PINNED_HREFS.has(i.href))
  const sortable = items.filter((i) => !PINNED_HREFS.has(i.href))
  sortable.sort((a, b) => (ranking[b.href] ?? 0) - (ranking[a.href] ?? 0))
  return [...pinned, ...sortable]
}
