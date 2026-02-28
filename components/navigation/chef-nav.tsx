// Chef Portal Navigation — Collapsible sidebar with grouped nav + rail mode
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { navGroups, standaloneBottom, mobileTabItems, resolveStandaloneTop } from './nav-config'
import type { NavGroup, NavCollapsibleItem, NavSubItem } from './nav-config'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { GlobalSearch } from '@/components/search/global-search'
import { OfflineNavIndicator } from '@/components/offline/offline-nav-indicator'
import { OllamaStatusBadge } from '@/components/dashboard/ollama-status-badge'
import { ActivityDot } from '@/components/activity/activity-dot'
import { AppLogo } from '@/components/branding/app-logo'

import {
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Leaf,
  Bot,
  Rss,
  Search,
  Plus,
  Lock,
  Sparkles,
} from 'lucide-react'
// Navigation items are centrally defined in `components/navigation/nav-config.tsx`

type SidebarContextType = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('chef-sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  const handleSetCollapsed = useCallback((v: boolean) => {
    setCollapsed(v)
    localStorage.setItem('chef-sidebar-collapsed', String(v))
  }, [])

  // Prevent flash of wrong width before hydration
  if (!mounted) {
    return (
      <SidebarContext.Provider value={{ collapsed: false, setCollapsed: handleSetCollapsed }}>
        {children}
      </SidebarContext.Provider>
    )
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

type SearchParamsLike = Pick<URLSearchParams, 'entries' | 'get'>
type NavQuickItem = { href: string; label: string; icon: LucideIcon }

const QUICK_CREATE_ITEMS: NavQuickItem[] = [
  { href: '/events/new', label: 'Event', icon: Plus },
  { href: '/quotes/new', label: 'Quote', icon: Plus },
  { href: '/inquiries/new', label: 'Inquiry', icon: Plus },
  { href: '/clients/new', label: 'Client', icon: Plus },
]

const CORE_GROUP_ORDER = ['remy', 'sales', 'clients', 'events', 'culinary', 'operations', 'finance']

const cannabisSectionItems = [
  { href: '/cannabis', label: 'Cannabis Hub' },
  { href: '/cannabis/events', label: 'Cannabis Events' },
  { href: '/cannabis/rsvps', label: 'RSVPs' },
  { href: '/cannabis/ledger', label: 'Cannabis Ledger' },
  { href: '/cannabis/invite', label: 'Invite' },
  { href: '/cannabis/handbook', label: 'Handbook (Draft)' },
  { href: '/cannabis/compliance', label: 'Compliance' },
  { href: '/cannabis/about', label: 'About' },
]

const communitySectionItems = [
  { href: '/network', label: 'Community Hub' },
  { href: '/network?tab=feed', label: 'Feed' },
  { href: '/network?tab=channels', label: 'Channels' },
  { href: '/network?tab=discover', label: 'Discover Chefs' },
  { href: '/network?tab=connections', label: 'Connections' },
  { href: '/network/saved', label: 'Saved Posts' },
  { href: '/network/notifications', label: 'Notifications' },
]

function splitHref(href: string) {
  const [path, query = ''] = href.split('?')
  return { path, query }
}

function queryMatches(searchParams: SearchParamsLike | null | undefined, query: string) {
  if (!query) return true
  if (!searchParams) return false

  const target = new URLSearchParams(query)
  for (const [key, value] of target.entries()) {
    if (searchParams.get(key) !== value) return false
  }
  return true
}

// ─── Helper: check if current route matches a nav item (path + query-aware) ─
function isItemActive(pathname: string, href: string, searchParams?: SearchParamsLike | null) {
  const { path, query } = splitHref(href)
  if (query) {
    return pathname === path && queryMatches(searchParams, query)
  }
  if (path === '/dashboard') return pathname === '/dashboard'
  return pathname === path || pathname.startsWith(path + '/')
}

function isGroupActive(pathname: string, group: NavGroup, searchParams?: SearchParamsLike | null) {
  return group.items.some((item) => {
    if (isItemActive(pathname, item.href, searchParams)) return true
    return item.children?.some((child) => isItemActive(pathname, child.href, searchParams)) ?? false
  })
}

function isCollapsibleItemActive(
  pathname: string,
  item: NavCollapsibleItem,
  searchParams?: SearchParamsLike | null
) {
  if (isItemActive(pathname, item.href, searchParams)) return true
  return item.children?.some((child) => isItemActive(pathname, child.href, searchParams)) ?? false
}

function partitionChildren(children: NavSubItem[] = []) {
  const secondary: NavSubItem[] = []
  const advanced: NavSubItem[] = []

  for (const child of children) {
    if (child.visibility === 'advanced') advanced.push(child)
    else secondary.push(child)
  }

  return { secondary, advanced }
}

function isSectionActive(
  pathname: string,
  items: Array<{ href: string }>,
  searchParams?: SearchParamsLike | null
) {
  return items.some((item) => isItemActive(pathname, item.href, searchParams))
}

function filterNavGroup(group: NavGroup, filter: string): NavGroup | null {
  const q = filter.trim().toLowerCase()
  if (!q) return group

  const groupMatch = group.label.toLowerCase().includes(q)
  const items = group.items
    .map((item) => {
      const itemMatch = item.label.toLowerCase().includes(q)
      const children = (item.children ?? []).filter((child) =>
        child.label.toLowerCase().includes(q)
      )

      if (groupMatch || itemMatch || children.length > 0) {
        return {
          ...item,
          children: item.children ? children : undefined,
        }
      }
      return null
    })
    .filter((item) => Boolean(item)) as NavCollapsibleItem[]

  if (!groupMatch && items.length === 0) return null
  return { ...group, items }
}

// ─── Flyout for rail mode ───────────────────────────
function RailFlyout({
  group,
  pathname,
  searchParams,
}: {
  group: NavGroup
  pathname: string
  searchParams?: SearchParamsLike | null
}) {
  const [open, setOpen] = useState(false)
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const GroupIcon = group.icon
  const active = isGroupActive(pathname, group, searchParams)

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => {
    for (const item of group.items) {
      if (item.children?.length && isCollapsibleItemActive(pathname, item, searchParams)) {
        setOpenItems((prev) => {
          if (prev.has(item.href)) return prev
          const next = new Set(prev)
          next.add(item.href)
          return next
        })
      }
    }
  }, [group.items, pathname, searchParams])

  const toggleItem = (href: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={group.label}
        aria-expanded={open}
        className={`flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors ${
          active
            ? 'bg-brand-950 text-brand-600'
            : 'text-stone-400 hover:bg-stone-800 hover:text-stone-400'
        }`}
      >
        <GroupIcon className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 z-50 min-w-[180px] max-h-[80vh] overflow-y-auto custom-scrollbar bg-stone-900 rounded-lg shadow-lg border border-stone-700 py-1.5">
          <p className="px-3 py-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon
            const itemActive = isCollapsibleItemActive(pathname, item, searchParams)
            const itemOpen = openItems.has(item.href)

            if (item.children?.length) {
              const { secondary, advanced } = partitionChildren(item.children)
              return (
                <div key={item.href}>
                  <button
                    type="button"
                    onClick={() => toggleItem(item.href)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium transition-colors ${
                      itemActive
                        ? 'text-brand-400'
                        : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`}
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                        itemOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      itemOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-8 mr-2 mb-1 space-y-0.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {secondary.map((child) => {
                        const childActive = isItemActive(pathname, child.href, searchParams)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={`block px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              childActive
                                ? 'bg-brand-950 text-brand-400'
                                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                            }`}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                      {advanced.length > 0 && (
                        <details className="pt-1">
                          <summary className="cursor-pointer px-2 py-1 text-xs font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-400">
                            Advanced
                          </summary>
                          <div className="space-y-0.5">
                            {advanced.map((child) => {
                              const childActive = isItemActive(pathname, child.href, searchParams)
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setOpen(false)}
                                  className={`block px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    childActive
                                      ? 'bg-brand-950 text-brand-400'
                                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              )
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors ${
                  itemActive
                    ? 'bg-brand-950 text-brand-400'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`}
                />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Collapsible group for expanded sidebar ─────────
function NavGroupSection({
  group,
  pathname,
  searchParams,
  isOpen,
  onToggle,
  openItems,
  onToggleItem,
  badgeCount,
  isLocked = false,
}: {
  group: NavGroup
  pathname: string
  searchParams?: SearchParamsLike | null
  isOpen: boolean
  onToggle: () => void
  openItems: Set<string>
  onToggleItem: (href: string) => void
  badgeCount?: number
  isLocked?: boolean
}) {
  const GroupIcon = group.icon
  const active = isGroupActive(pathname, group, searchParams)

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-base font-semibold transition-colors ${
          active && !isOpen
            ? 'text-brand-400'
            : 'text-stone-300 hover:bg-stone-800 hover:text-brand-400'
        }`}
        style={{ letterSpacing: 0.2 }}
      >
        <GroupIcon
          className={`w-[20px] h-[20px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`}
        />
        <span
          className={`flex-1 text-left tracking-tight transition-opacity ${active ? 'opacity-100' : 'opacity-50'}`}
        >
          {group.label}
        </span>
        {badgeCount && badgeCount > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-brand-950 text-brand-400">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
        {isLocked ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-amber-900/40 text-amber-300">
            <Lock className="w-3 h-3" />
            Pro
          </span>
        ) : null}
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {isLocked ? (
          <div className="ml-3 pl-3 border-l-2 border-stone-800 mt-1 mb-2">
            <Link
              href="/settings/billing"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/60 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade to unlock
            </Link>
          </div>
        ) : null}
        {!isLocked ? (
          <div className="ml-3 pl-3 border-l-2 border-stone-800 mt-0.5 space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon
              const itemActive = isCollapsibleItemActive(pathname, item, searchParams)

              if (item.children?.length) {
                const itemOpen = openItems.has(item.href)
                const { secondary, advanced } = partitionChildren(item.children)
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => onToggleItem(item.href)}
                      aria-expanded={itemOpen}
                      className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        itemActive
                          ? 'text-brand-400'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-brand-400'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                          itemOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        itemOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="ml-6 pl-2 border-l border-stone-800 mt-0.5 space-y-0.5">
                        {secondary.map((child) => {
                          const childActive = isItemActive(pathname, child.href, searchParams)
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-normal transition-colors ${
                                childActive
                                  ? 'bg-brand-950 text-brand-400'
                                  : 'text-stone-400 hover:bg-stone-800 hover:text-brand-400'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                              {child.label}
                            </Link>
                          )
                        })}
                        {advanced.length > 0 && (
                          <details className="pt-1">
                            <summary className="cursor-pointer px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-400">
                              Advanced
                            </summary>
                            <div className="space-y-0.5">
                              {advanced.map((child) => {
                                const childActive = isItemActive(pathname, child.href, searchParams)
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-normal transition-colors ${
                                      childActive
                                        ? 'bg-brand-950 text-brand-400'
                                        : 'text-stone-400 hover:bg-stone-800 hover:text-brand-400'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                                    {child.label}
                                  </Link>
                                )
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                    itemActive
                      ? 'bg-brand-950 text-brand-400 border-brand-500'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-brand-400 border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Desktop Sidebar ────────────────────────────────
export function ChefSidebar({
  primaryNavHrefs,
  hasCannabisTier,
  enabledModules,
  isAdmin,
  userId,
  tenantId,
}: {
  primaryNavHrefs?: string[]
  hasCannabisTier?: boolean
  enabledModules?: string[]
  isAdmin?: boolean
  userId: string
  tenantId: string
}) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const { collapsed, setCollapsed } = useSidebar()
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const [shortcutsOpen, setShortcutsOpen] = useState(true)
  const [quickCreateOpen, setQuickCreateOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [cannabisSectionOpen, setCannabisSectionOpen] = useState(false)
  const [communitySectionOpen, setCommunitySectionOpen] = useState(false)
  const [navFilter, setNavFilter] = useState('')
  const primaryItems = resolveStandaloneTop(primaryNavHrefs)

  // Filter nav groups by enabled modules (progressive disclosure)
  // Admins always see every group — they're the developer, not a gated user
  // Also strip adminOnly items (e.g. prospecting) for non-admin users
  const enabledSet = useMemo(
    () => (enabledModules ? new Set(enabledModules) : null),
    [enabledModules]
  )
  const accessibleGroups = useMemo(
    () =>
      isAdmin
        ? navGroups
        : navGroups.map((group) => ({
            ...group,
            items: group.items.filter((item) => !item.adminOnly),
          })),
    [isAdmin]
  )
  const groupEntries = useMemo(
    () =>
      accessibleGroups.map((group) => ({
        group,
        isLocked: Boolean(!isAdmin && enabledSet && group.module && !enabledSet.has(group.module)),
      })),
    [accessibleGroups, enabledSet, isAdmin]
  )
  const filteredGroupEntries = useMemo(
    () =>
      groupEntries
        .map(({ group, isLocked }) => ({
          group: filterNavGroup(group, navFilter),
          isLocked,
        }))
        .filter((entry): entry is { group: NavGroup; isLocked: boolean } => Boolean(entry.group)),
    [groupEntries, navFilter]
  )
  const filteredPrimaryItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    const items = isAdmin ? primaryItems : primaryItems.filter((item) => !item.adminOnly)
    if (!q) return items
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter, primaryItems, isAdmin])
  const filteredQuickCreateItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return QUICK_CREATE_ITEMS
    return QUICK_CREATE_ITEMS.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])
  const filteredSettingsItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return standaloneBottom
    return standaloneBottom.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])
  const filteredCannabisItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return cannabisSectionItems
    return cannabisSectionItems.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])
  const filteredCommunityItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return communitySectionItems
    return communitySectionItems.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])

  // Auto-expand group containing active route
  useEffect(() => {
    for (const { group } of groupEntries) {
      if (isGroupActive(pathname, group, searchParams)) {
        setOpenGroups((prev) => {
          if (prev.has(group.id)) return prev
          const next = new Set(prev)
          next.add(group.id)
          return next
        })
      }
    }
  }, [pathname, groupEntries, searchParams])

  useEffect(() => {
    if (!hasCannabisTier) {
      setCannabisSectionOpen(false)
      return
    }
    if (isSectionActive(pathname, cannabisSectionItems, searchParams)) {
      setCannabisSectionOpen(true)
    }
  }, [hasCannabisTier, pathname, searchParams])

  useEffect(() => {
    if (isSectionActive(pathname, communitySectionItems, searchParams)) {
      setCommunitySectionOpen(true)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    if (!navFilter.trim()) return
    setShortcutsOpen(true)
    setQuickCreateOpen(true)
    setSettingsOpen(true)
    if (hasCannabisTier) setCannabisSectionOpen(true)
    setCommunitySectionOpen(true)
  }, [hasCannabisTier, navFilter])

  useEffect(() => {
    for (const { group } of groupEntries) {
      for (const item of group.items) {
        if (item.children?.length && isCollapsibleItemActive(pathname, item, searchParams)) {
          setOpenItems((prev) => {
            if (prev.has(item.href)) return prev
            const next = new Set(prev)
            next.add(item.href)
            return next
          })
        }
      }
    }
  }, [pathname, groupEntries, searchParams])

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleItem = (href: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  const cannabisSectionActive = hasCannabisTier
    ? isSectionActive(pathname, cannabisSectionItems, searchParams)
    : false
  const communitySectionActive = isSectionActive(pathname, communitySectionItems, searchParams)

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-stone-900 border-r border-stone-700 transition-all duration-200 z-30 ${
        collapsed ? 'lg:w-16' : 'lg:w-60'
      }`}
    >
      {/* Logo + notification bell + collapse toggle */}
      <div
        className={`flex items-center h-16 border-b border-stone-800 ${collapsed ? 'px-3 justify-center' : 'px-3 justify-between'}`}
      >
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <AppLogo />
          {!collapsed && (
            <span className="text-lg font-display text-stone-100 whitespace-nowrap">ChefFlow</span>
          )}
        </Link>
        {!collapsed ? (
          <div className="flex items-center flex-shrink-0">
            {isAdmin && <OllamaStatusBadge />}
            <OfflineNavIndicator />
            <ActivityDot />
            <GlobalSearch userId={userId} tenantId={tenantId} />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-remy'))}
              className="flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-lg text-stone-400 hover:bg-brand-950 hover:text-brand-600 transition-colors"
              aria-label="Open Remy"
              title="Open Remy"
            >
              <Bot className="w-[18px] h-[18px]" />
            </button>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-lg text-stone-400 hover:bg-stone-700 hover:text-stone-400 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pt-3 pb-6 mb-28 custom-scrollbar">
        {/* ── COLLAPSED / RAIL MODE ── */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 px-1">
            {/* Expand toggle */}
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-stone-400 hover:bg-stone-700 hover:text-stone-400 transition-colors mb-1"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Ollama status (admin only) */}
            {isAdmin && <OllamaStatusBadge />}
            {/* Notification bell */}
            <NotificationBell collapsed />
            <GlobalSearch userId={userId} tenantId={tenantId} />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-remy'))}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-stone-400 hover:bg-brand-950 hover:text-brand-600 transition-colors"
              aria-label="Open Remy"
              title="Open Remy"
            >
              <Bot className="w-[18px] h-[18px]" />
            </button>
            <OfflineNavIndicator />
            <ActivityDot collapsed />

            {/* Dashboard */}
            {primaryItems.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href, searchParams)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                    active
                      ? 'bg-brand-950 text-brand-600'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-400'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </Link>
              )
            })}

            <div className="w-6 border-t border-stone-800 my-1.5" />

            {/* Groups as flyouts */}
            {groupEntries.map(({ group }) => (
              <RailFlyout
                key={group.id}
                group={group}
                pathname={pathname}
                searchParams={searchParams}
              />
            ))}

            <div className="w-6 border-t border-stone-800 my-1.5" />

            {/* Community — rail icon */}
            <Link
              href="/network"
              title="Community"
              aria-label="Community"
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                pathname.startsWith('/network')
                  ? 'text-indigo-400'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-400'
              }`}
              style={
                pathname.startsWith('/network')
                  ? { background: 'rgba(79, 70, 229, 0.08)' }
                  : undefined
              }
            >
              <Rss className="w-[18px] h-[18px]" />
            </Link>

            <div className="w-6 border-t border-stone-800 my-1.5" />

            {/* Settings */}
            {standaloneBottom.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href, searchParams)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                    active
                      ? 'bg-brand-950 text-brand-600'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-400'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </Link>
              )
            })}

            {/* Sign Out — inside nav so it's above the Remy mascot */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut()
                } catch (e) {
                  console.error('[sign-out]', e)
                }
                window.location.href = '/'
              }}
              title="Sign Out"
              aria-label="Sign Out"
              className="flex items-center justify-center w-10 h-10 rounded-lg text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        ) : (
          /* ── EXPANDED MODE ── */
          <div className="px-3 space-y-1">
            <NavFilterInput value={navFilter} onChange={setNavFilter} />

            <button
              type="button"
              onClick={() => setShortcutsOpen((prev) => !prev)}
              aria-expanded={shortcutsOpen}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
            >
              <span className="flex-1 text-left">Shortcuts</span>
              <ChevronDown
                className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                  shortcutsOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                shortcutsOpen ? 'max-h-[1400px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-0.5">
                {filteredPrimaryItems.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(pathname, item.href, searchParams)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 pl-2 pr-3 py-2 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                        active
                          ? 'bg-brand-950 text-brand-400 border-brand-500'
                          : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100 border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`}
                      />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setQuickCreateOpen((prev) => !prev)}
              aria-expanded={quickCreateOpen}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
            >
              <Plus className="w-4 h-4 text-stone-400" />
              <span className="flex-1 text-left">Quick Create</span>
              <ChevronDown
                className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                  quickCreateOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                quickCreateOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-0.5">
                {filteredQuickCreateItems.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(pathname, item.href, searchParams)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-brand-950 text-brand-400'
                          : 'text-brand-400/90 hover:bg-brand-950/50 hover:text-brand-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      New {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-stone-800 my-2" />

            {/* Grouped nav */}
            {filteredGroupEntries.map(({ group, isLocked }) => (
              <NavGroupSection
                key={group.id}
                group={group}
                pathname={pathname}
                searchParams={searchParams}
                isOpen={openGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
                openItems={openItems}
                onToggleItem={toggleItem}
                isLocked={isLocked}
              />
            ))}

            <div className="border-t border-stone-800 my-2" />

            <SectionAccordion
              title="Cannabis"
              items={filteredCannabisItems}
              icon={Leaf}
              isOpen={cannabisSectionOpen}
              onToggle={() => setCannabisSectionOpen((prev) => !prev)}
              pathname={pathname}
              searchParams={searchParams}
              headerActiveClass={cannabisSectionActive ? 'text-green-600' : 'text-green-700'}
              headerInactiveClass="text-green-700 hover:bg-green-950/20 hover:text-green-600"
              dividerClass="border-green-800/30"
              itemActiveClass="text-emerald-700"
              itemInactiveClass="text-stone-500 hover:text-stone-300"
              activeBgStyle={{ background: 'rgba(74, 124, 78, 0.08)' }}
              iconActiveColor="#4a7c4e"
              iconInactiveColor="rgba(74, 124, 78, 0.5)"
              locked={!hasCannabisTier}
            />

            <SectionAccordion
              title="Community"
              items={filteredCommunityItems}
              icon={Rss}
              isOpen={communitySectionOpen}
              onToggle={() => setCommunitySectionOpen((prev) => !prev)}
              pathname={pathname}
              searchParams={searchParams}
              headerActiveClass={communitySectionActive ? 'text-indigo-400' : 'text-indigo-400'}
              headerInactiveClass="text-indigo-400 hover:bg-indigo-950/20 hover:text-indigo-300"
              dividerClass="border-indigo-800/30"
              itemActiveClass="text-indigo-400"
              itemInactiveClass="text-stone-500 hover:text-stone-300"
              activeBgStyle={{ background: 'rgba(79, 70, 229, 0.08)' }}
              iconActiveColor="#818cf8"
              iconInactiveColor="rgba(99, 102, 241, 0.5)"
            />

            <div className="border-t border-stone-800 my-2" />

            {/* Settings */}
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              aria-expanded={settingsOpen}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
            >
              <span className="flex-1 text-left">Settings & Tools</span>
              <ChevronDown
                className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                  settingsOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                settingsOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-0.5">
                {filteredSettingsItems.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(pathname, item.href, searchParams)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 pl-2 pr-3 py-2 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                        active
                          ? 'bg-brand-950 text-brand-400 border-brand-500'
                          : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100 border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`}
                      />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Sign Out — inside nav so it's above the Remy mascot */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut()
                } catch (e) {
                  console.error('[sign-out]', e)
                }
                window.location.href = '/'
              }}
              className="flex items-center gap-3 pl-2 pr-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors border-l-2 border-transparent"
            >
              <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
              Sign Out
            </button>
          </div>
        )}
      </nav>
    </aside>
  )
}

function NavFilterInput({
  value,
  onChange,
  placeholder = 'Filter menu...',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="relative block px-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full h-8 pl-8 pr-3 rounded-lg border border-stone-700 bg-stone-950 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
      />
    </label>
  )
}

function SectionAccordion({
  title,
  items,
  icon: Icon,
  isOpen,
  onToggle,
  pathname,
  searchParams,
  headerActiveClass,
  headerInactiveClass,
  dividerClass,
  itemActiveClass,
  itemInactiveClass,
  activeBgStyle,
  iconActiveColor,
  iconInactiveColor,
  onNavigate,
  locked,
}: {
  title: string
  items: Array<{ href: string; label: string }>
  icon: LucideIcon
  isOpen: boolean
  onToggle: () => void
  pathname: string
  searchParams?: SearchParamsLike | null
  headerActiveClass: string
  headerInactiveClass: string
  dividerClass: string
  itemActiveClass: string
  itemInactiveClass: string
  activeBgStyle?: React.CSSProperties
  iconActiveColor: string
  iconInactiveColor: string
  onNavigate?: () => void
  locked?: boolean
}) {
  const active = isSectionActive(pathname, items, searchParams)

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg transition-colors ${
          active ? headerActiveClass : headerInactiveClass
        }`}
      >
        <div className={`flex-1 border-t ${dividerClass}`} />
        <span className="text-[9px] font-semibold uppercase tracking-widest">{title}</span>
        {locked ? <Lock className="w-3.5 h-3.5" /> : null}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
        <div className={`flex-1 border-t ${dividerClass}`} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {locked ? (
          <div className="px-3 py-1.5">
            <Link
              href="/settings/billing"
              onClick={onNavigate}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/60 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade to unlock
            </Link>
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => {
              const itemActive = isItemActive(pathname, item.href, searchParams)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    itemActive ? itemActiveClass : itemInactiveClass
                  }`}
                  style={itemActive ? activeBgStyle : undefined}
                >
                  <Icon
                    className="w-[18px] h-[18px] flex-shrink-0"
                    style={{ color: itemActive ? iconActiveColor : iconInactiveColor }}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// Mobile tab items provided by central nav config

// ─── Mobile group section (for slide-out) ───────────
function MobileGroupSection({
  group,
  pathname,
  searchParams,
  isOpen,
  onToggle,
  openItems,
  onToggleItem,
  onNavigate,
  badgeCount,
  isLocked = false,
}: {
  group: NavGroup
  pathname: string
  searchParams?: SearchParamsLike | null
  isOpen: boolean
  onToggle: () => void
  openItems: Set<string>
  onToggleItem: (href: string) => void
  onNavigate: () => void
  badgeCount?: number
  isLocked?: boolean
}) {
  const GroupIcon = group.icon
  const active = isGroupActive(pathname, group, searchParams)

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active && !isOpen
            ? 'text-brand-400'
            : 'text-stone-500 hover:bg-stone-800 hover:text-stone-300'
        }`}
      >
        <GroupIcon
          className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`}
        />
        <span className="flex-1 text-left">{group.label}</span>
        {badgeCount && badgeCount > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-brand-950 text-brand-400">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
        {isLocked ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-amber-900/40 text-amber-300">
            <Lock className="w-3 h-3" />
            Pro
          </span>
        ) : null}
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {isLocked ? (
          <div className="ml-3 pl-3 border-l border-stone-800 mt-1 mb-2">
            <Link
              href="/settings/billing"
              onClick={onNavigate}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade to unlock
            </Link>
          </div>
        ) : null}
        {!isLocked ? (
          <div className="ml-3 pl-3 border-l border-stone-800 mt-0.5 space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              const itemActive = isCollapsibleItemActive(pathname, item, searchParams)

              if (item.children?.length) {
                const itemOpen = openItems.has(item.href)
                const { secondary, advanced } = partitionChildren(item.children)
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => onToggleItem(item.href)}
                      aria-expanded={itemOpen}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        itemActive
                          ? 'text-brand-400'
                          : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                          itemOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        itemOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="ml-5 pl-3 border-l border-stone-800 mt-0.5 space-y-0.5">
                        {secondary.map((child) => {
                          const childActive = isItemActive(pathname, child.href, searchParams)
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onNavigate}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                childActive
                                  ? 'bg-brand-950 text-brand-400'
                                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                              {child.label}
                            </Link>
                          )
                        })}
                        {advanced.length > 0 && (
                          <details className="pt-1">
                            <summary className="cursor-pointer px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-400">
                              Advanced
                            </summary>
                            <div className="space-y-0.5">
                              {advanced.map((child) => {
                                const childActive = isItemActive(pathname, child.href, searchParams)
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={onNavigate}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                      childActive
                                        ? 'bg-brand-950 text-brand-400'
                                        : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                                    {child.label}
                                  </Link>
                                )
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    itemActive
                      ? 'bg-brand-950 text-brand-400'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Mobile Bottom Tab Bar (React-independent) ──────
// CRITICAL: This component uses native <a> tags with an onClick fallback
// to window.location.href. If React hydration fails (stale SW, JS error,
// hydration mismatch), Next.js <Link> swallows the click (preventDefault)
// but router.push silently fails → nothing happens. Native <a> tags with
// hard-navigation fallback guarantee the bottom nav ALWAYS works.
function MobileBottomTabBar({
  pathname,
  onMoreClick,
}: {
  pathname: string
  onMoreClick: () => void
}) {
  // Ref for the "More" button — attaches a native onclick as backup
  const moreRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const btn = moreRef.current
    if (!btn) return
    // Attach a native DOM listener as backup in case React's onClick fails
    const handler = () => onMoreClick()
    btn.addEventListener('click', handler)
    return () => btn.removeEventListener('click', handler)
  }, [onMoreClick])

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-900 border-t border-stone-700 pb-safe">
      <div className="flex items-center justify-around h-14">
        {mobileTabItems.map((item) => {
          const active = isItemActive(pathname, item.href)
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                // Hard navigate — bypasses Next.js client router entirely.
                // This is intentional: the bottom nav must NEVER silently fail.
                e.preventDefault()
                window.location.href = item.href
              }}
              className={`group flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium transition-colors no-underline ${
                active ? 'text-brand-600' : 'text-stone-400'
              }`}
            >
              <Icon className="w-5 h-5 group-active:scale-110 transition-transform duration-100" />
              {item.label}
            </a>
          )
        })}
        <button
          ref={moreRef}
          type="button"
          onClick={() => onMoreClick()}
          className="group flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium text-stone-400"
        >
          <Menu className="w-5 h-5 group-active:scale-110 transition-transform duration-100" />
          More
        </button>
      </div>
    </nav>
  )
}

// ─── Mobile Navigation ──────────────────────────────
export function ChefMobileNav({
  primaryNavHrefs,
  hasCannabisTier,
  enabledModules,
  isAdmin,
  userId,
  tenantId,
}: {
  primaryNavHrefs?: string[]
  hasCannabisTier?: boolean
  enabledModules?: string[]
  isAdmin?: boolean
  userId: string
  tenantId: string
}) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const [mobileShortcutsOpen, setMobileShortcutsOpen] = useState(true)
  const [mobileQuickCreateOpen, setMobileQuickCreateOpen] = useState(true)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(true)
  const [cannabisSectionOpen, setCannabisSectionOpen] = useState(false)
  const [communitySectionOpen, setCommunitySectionOpen] = useState(false)
  const [navFilter, setNavFilter] = useState('')
  const primaryItems = resolveStandaloneTop(primaryNavHrefs)

  // Filter nav groups by enabled modules (progressive disclosure)
  // Admins always see every group — they're the developer, not a gated user
  // Also strip adminOnly items (e.g. prospecting) for non-admin users
  const enabledSet = useMemo(
    () => (enabledModules ? new Set(enabledModules) : null),
    [enabledModules]
  )
  const accessibleGroups = useMemo(
    () =>
      isAdmin
        ? navGroups
        : navGroups.map((group) => ({
            ...group,
            items: group.items.filter((item) => !item.adminOnly),
          })),
    [isAdmin]
  )
  const groupEntries = useMemo(
    () =>
      accessibleGroups.map((group) => ({
        group,
        isLocked: Boolean(!isAdmin && enabledSet && group.module && !enabledSet.has(group.module)),
      })),
    [accessibleGroups, enabledSet, isAdmin]
  )
  const filteredGroupEntries = useMemo(
    () =>
      groupEntries
        .map(({ group, isLocked }) => ({
          group: filterNavGroup(group, navFilter),
          isLocked,
        }))
        .filter((entry): entry is { group: NavGroup; isLocked: boolean } => Boolean(entry.group)),
    [groupEntries, navFilter]
  )
  const filteredPrimaryItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    const items = isAdmin ? primaryItems : primaryItems.filter((item) => !item.adminOnly)
    if (!q) return items
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter, primaryItems, isAdmin])
  const filteredQuickCreateItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return QUICK_CREATE_ITEMS
    return QUICK_CREATE_ITEMS.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])
  const filteredSettingsItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return standaloneBottom
    return standaloneBottom.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])
  const filteredCannabisItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return cannabisSectionItems
    return cannabisSectionItems.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])
  const filteredCommunityItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return communitySectionItems
    return communitySectionItems.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])

  // Auto-expand group containing active route in mobile menu
  useEffect(() => {
    if (!menuOpen) return
    for (const { group } of groupEntries) {
      if (isGroupActive(pathname, group, searchParams)) {
        setOpenGroups((prev) => {
          if (prev.has(group.id)) return prev
          const next = new Set(prev)
          next.add(group.id)
          return next
        })
      }
    }
  }, [pathname, menuOpen, groupEntries, searchParams])

  useEffect(() => {
    if (!hasCannabisTier) {
      setCannabisSectionOpen(false)
      return
    }
    if (isSectionActive(pathname, cannabisSectionItems, searchParams)) {
      setCannabisSectionOpen(true)
    }
  }, [hasCannabisTier, pathname, searchParams])

  useEffect(() => {
    if (isSectionActive(pathname, communitySectionItems, searchParams)) {
      setCommunitySectionOpen(true)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    if (!navFilter.trim()) return
    setMobileShortcutsOpen(true)
    setMobileQuickCreateOpen(true)
    setMobileSettingsOpen(true)
    if (hasCannabisTier) setCannabisSectionOpen(true)
    setCommunitySectionOpen(true)
  }, [hasCannabisTier, navFilter])

  useEffect(() => {
    if (!menuOpen) return
    for (const { group } of groupEntries) {
      for (const item of group.items) {
        if (item.children?.length && isCollapsibleItemActive(pathname, item, searchParams)) {
          setOpenItems((prev) => {
            if (prev.has(item.href)) return prev
            const next = new Set(prev)
            next.add(item.href)
            return next
          })
        }
      }
    }
  }, [pathname, menuOpen, groupEntries, searchParams])

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleItem = (href: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  const closeMenu = () => setMenuOpen(false)
  const cannabisSectionActive = hasCannabisTier
    ? isSectionActive(pathname, cannabisSectionItems, searchParams)
    : false
  const communitySectionActive = isSectionActive(pathname, communitySectionItems, searchParams)

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-stone-900 border-b border-stone-700 pt-safe">
        <div className="flex items-center justify-between h-14 px-3">
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <AppLogo size={28} className="rounded-md flex-shrink-0" />
            <span className="font-display text-stone-100 whitespace-nowrap">ChefFlow</span>
          </Link>
          <div className="flex items-center flex-shrink-0 gap-0.5">
            {isAdmin && <OllamaStatusBadge />}
            <OfflineNavIndicator />
            <ActivityDot />
            <GlobalSearch userId={userId} tenantId={tenantId} />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-remy'))}
              className="flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg text-stone-400 hover:bg-brand-950 hover:text-brand-600 transition-colors"
              aria-label="Open Remy"
              title="Open Remy"
            >
              <Bot className="w-[18px] h-[18px]" />
            </button>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg text-stone-500 hover:bg-stone-700"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/20" onClick={closeMenu} />
          <div className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-stone-900 border-r border-stone-700 shadow-xl">
            <div className="flex items-center justify-between h-14 px-4 border-b border-stone-800">
              <span className="font-semibold text-stone-100">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeMenu}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
              <div className="sticky top-0 z-10 bg-stone-900/95 backdrop-blur-sm pb-2 space-y-2">
                <NavFilterInput value={navFilter} onChange={setNavFilter} />
                <button
                  type="button"
                  onClick={() => setMobileQuickCreateOpen((prev) => !prev)}
                  aria-expanded={mobileQuickCreateOpen}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
                >
                  <Plus className="w-4 h-4 text-stone-400" />
                  <span className="flex-1 text-left">Quick Create</span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                      mobileQuickCreateOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    mobileQuickCreateOpen ? 'max-h-[240px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-1">
                    {filteredQuickCreateItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMenu}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-semibold text-brand-300 bg-brand-950/40"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileShortcutsOpen((prev) => !prev)}
                aria-expanded={mobileShortcutsOpen}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
              >
                <span className="flex-1 text-left">Shortcuts</span>
                <ChevronDown
                  className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                    mobileShortcutsOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  mobileShortcutsOpen ? 'max-h-[1400px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="space-y-0.5">
                  {filteredPrimaryItems.map((item) => {
                    const Icon = item.icon
                    const active = isItemActive(pathname, item.href, searchParams)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-brand-950 text-brand-400'
                            : 'text-stone-400 hover:bg-stone-800'
                        }`}
                      >
                        <Icon
                          className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : 'text-stone-400'}`}
                        />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-stone-800 my-2" />

              {/* Grouped nav */}
              <div className="space-y-0.5">
                {filteredGroupEntries.map(({ group, isLocked }) => (
                  <MobileGroupSection
                    key={group.id}
                    group={group}
                    pathname={pathname}
                    searchParams={searchParams}
                    isOpen={openGroups.has(group.id)}
                    onToggle={() => toggleGroup(group.id)}
                    openItems={openItems}
                    onToggleItem={toggleItem}
                    onNavigate={closeMenu}
                    isLocked={isLocked}
                  />
                ))}
              </div>

              <div className="border-t border-stone-800 my-2" />

              <SectionAccordion
                title="Cannabis"
                items={filteredCannabisItems}
                icon={Leaf}
                isOpen={cannabisSectionOpen}
                onToggle={() => setCannabisSectionOpen((prev) => !prev)}
                pathname={pathname}
                searchParams={searchParams}
                headerActiveClass={cannabisSectionActive ? 'text-green-600' : 'text-green-700'}
                headerInactiveClass="text-green-700 hover:bg-green-950/20 hover:text-green-600"
                dividerClass="border-green-800/30"
                itemActiveClass="text-green-700 bg-green-950/50"
                itemInactiveClass="text-stone-500 hover:bg-stone-800"
                iconActiveColor="#16a34a"
                iconInactiveColor="rgba(21, 128, 61, 0.45)"
                onNavigate={closeMenu}
                locked={!hasCannabisTier}
              />

              <SectionAccordion
                title="Community"
                items={filteredCommunityItems}
                icon={Rss}
                isOpen={communitySectionOpen}
                onToggle={() => setCommunitySectionOpen((prev) => !prev)}
                pathname={pathname}
                searchParams={searchParams}
                headerActiveClass={communitySectionActive ? 'text-indigo-400' : 'text-indigo-400'}
                headerInactiveClass="text-indigo-400 hover:bg-indigo-950/20 hover:text-indigo-300"
                dividerClass="border-indigo-800/30"
                itemActiveClass="text-indigo-400 bg-indigo-950/50"
                itemInactiveClass="text-stone-500 hover:bg-stone-800"
                iconActiveColor="#818cf8"
                iconInactiveColor="rgba(99, 102, 241, 0.5)"
                onNavigate={closeMenu}
              />
              <div className="border-t border-stone-800 my-2" />

              {/* Settings */}
              <button
                type="button"
                onClick={() => setMobileSettingsOpen((prev) => !prev)}
                aria-expanded={mobileSettingsOpen}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
              >
                <span className="flex-1 text-left">Settings & Tools</span>
                <ChevronDown
                  className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                    mobileSettingsOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  mobileSettingsOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="space-y-0.5">
                  {filteredSettingsItems.map((item) => {
                    const Icon = item.icon
                    const active = isItemActive(pathname, item.href, searchParams)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-brand-950 text-brand-400'
                            : 'text-stone-400 hover:bg-stone-800'
                        }`}
                      >
                        <Icon
                          className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : 'text-stone-400'}`}
                        />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Sign Out */}
              <div className="pt-4 mt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signOut()
                    } catch (e) {
                      console.error('[sign-out]', e)
                    }
                    window.location.href = '/'
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-800"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Mobile bottom tab bar — uses native <a> tags so navigation works
          even when React hydration fails. This is the MOST CRITICAL nav on mobile;
          it must never depend on React's event system being functional. */}
      <MobileBottomTabBar pathname={pathname} onMoreClick={() => setMenuOpen(true)} />
    </>
  )
}
