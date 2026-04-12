'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { actionBarItems } from './nav-config'
import { CreateMenuDropdown } from './create-menu-dropdown'
import { isItemActive } from './chef-nav-helpers'
import { InboxUnreadBadge } from '@/components/communication/inbox-unread-badge'
import { NotificationsUnreadBadge } from '@/components/notifications/notifications-unread-badge'
import { InquiriesUnreadBadge } from '@/components/inquiries/inquiries-unread-badge'
import { useNavigationPending } from '@/components/navigation/navigation-pending-provider'

type ActionBarProps = {
  /** Filter string from nav search input */
  navFilter?: string
  /** Rail/collapsed mode: icon-only rendering */
  collapsed?: boolean
}

export function ActionBar({ navFilter = '', collapsed = false }: ActionBarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { pendingHref, setPendingHref } = useNavigationPending()

  const query = navFilter.toLowerCase().trim()
  const filtered = query
    ? actionBarItems.filter((item) => item.label.toLowerCase().includes(query))
    : actionBarItems

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
                    ? 'bg-brand-950/50 text-brand-600/70 animate-pulse'
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
              {item.href === '/events' && (
                <span className="absolute -top-1 -right-1">
                  <InquiriesUnreadBadge />
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
                    ? 'bg-brand-950/50 text-brand-400/70 border-brand-500/50 animate-pulse'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100 border-transparent'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 ${active || isPending ? 'text-brand-600' : 'text-stone-400'}`}
              />
              <span className="truncate">{item.label}</span>
              {item.href === '/inbox' && <InboxUnreadBadge />}
              {item.href === '/notifications' && <NotificationsUnreadBadge />}
              {item.href === '/events' && <InquiriesUnreadBadge />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
