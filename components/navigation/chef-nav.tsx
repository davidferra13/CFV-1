// Chef Portal Navigation - Collapsible sidebar with grouped nav + rail mode
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
  useMemo,
  memo,
} from 'react'
import type { LucideIcon } from '@/components/ui/icons'
import { navGroups, standaloneBottom, resolveStandaloneTop } from './nav-config'
import type { NavGroup } from './nav-config'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { GlobalSearch } from '@/components/search/global-search'
import { OfflineNavIndicator } from '@/components/offline/offline-nav-indicator'
import { OllamaStatusBadge } from '@/components/dashboard/ollama-status-badge'
import { ActivityDot } from '@/components/activity/activity-dot'
import { AppLogo } from '@/components/branding/app-logo'
import { RecentPagesSection } from '@/components/navigation/recent-pages-section'
import { InboxUnreadBadge } from '@/components/communication/inbox-unread-badge'
import { CirclesUnreadBadge } from '@/components/hub/circles-unread-badge'
import {
  getStrictFocusGroupRank,
  isStrictFocusGroupVisible,
  STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS,
} from '@/lib/navigation/focus-mode-nav'

import {
  LogOut,
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
} from '@/components/ui/icons'

// Extracted config and helpers
import { QUICK_CREATE_ITEMS, cannabisSectionItems, communitySectionItems } from './chef-nav-config'
import type { SearchParamsLike } from './chef-nav-helpers'
import {
  isItemActive,
  isGroupActive,
  isCollapsibleItemActive,
  isSectionActive,
  partitionChildren,
  filterNavGroup,
} from './chef-nav-helpers'

// Re-export mobile nav so existing imports from chef-nav keep working
export { ChefMobileNav } from './chef-mobile-nav'

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

// ---- NavFilterInput ----
const NavFilterInput = memo(function NavFilterInput({
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
})

// ---- SectionAccordion ----
const SectionAccordion = memo(function SectionAccordion({
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
        <span className="text-2xs font-semibold uppercase tracking-widest">{title}</span>
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
      </div>
    </>
  )
})

// ---- Flyout for rail mode ----
const RailFlyout = memo(function RailFlyout({
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
            ? 'bg-brand-950 text-brand-600 ring-1 ring-brand-800/40'
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
})

// ---- Collapsible group for expanded sidebar ----
const NavGroupSection = memo(function NavGroupSection({
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
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xxs font-semibold bg-brand-950 text-brand-400">
            {badgeCount > 99 ? '99+' : badgeCount}
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
      </div>
    </div>
  )
})

// ---- Desktop Sidebar ----
export function ChefSidebar({
  primaryNavHrefs,
  enabledModules,
  isAdmin,
  focusMode,
  userId,
  tenantId,
}: {
  primaryNavHrefs?: string[]
  enabledModules?: string[]
  isAdmin?: boolean
  focusMode?: boolean
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
  const primaryItems = useMemo(
    () =>
      resolveStandaloneTop(focusMode ? [...STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS] : primaryNavHrefs),
    [focusMode, primaryNavHrefs]
  )
  const visiblePrimaryItems = useMemo(() => {
    const items = isAdmin ? primaryItems : primaryItems.filter((item) => !item.adminOnly)
    return items.filter((item) => !item.hidden)
  }, [isAdmin, primaryItems])

  // Filter nav groups by role + focus mode.
  // Focus Mode should simplify nav for everyone, including admins.
  const enabledSet = useMemo(
    () => (enabledModules ? new Set(enabledModules) : null),
    [enabledModules]
  )
  const accessibleGroups = useMemo(() => {
    const baseGroups = navGroups
      .map((group) => ({
        ...group,
        items: (isAdmin ? group.items : group.items.filter((item) => !item.adminOnly))
          .filter((item) => !item.hidden)
          .map((item) =>
            item.children
              ? { ...item, children: item.children.filter((child) => !child.hidden) }
              : item
          ),
      }))
      .filter((group) => group.items.length > 0)

    if (!focusMode) return baseGroups
    const strictGroups = baseGroups.filter((group) =>
      isStrictFocusGroupVisible(group.id, Boolean(isAdmin))
    )
    return strictGroups.sort(
      (a, b) => getStrictFocusGroupRank(a.id) - getStrictFocusGroupRank(b.id)
    )
  }, [isAdmin, focusMode])
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
    const items = visiblePrimaryItems
    if (!q) return items
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter, visiblePrimaryItems])
  const filteredQuickCreateItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return QUICK_CREATE_ITEMS
    return QUICK_CREATE_ITEMS.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter])
  const visibleBottomItems = useMemo(
    () => (isAdmin ? standaloneBottom : standaloneBottom.filter((item) => !item.adminOnly)),
    [isAdmin]
  )
  const filteredSettingsItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase()
    if (!q) return visibleBottomItems
    return visibleBottomItems.filter((item) => item.label.toLowerCase().includes(q))
  }, [navFilter, visibleBottomItems])
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
    if (!isAdmin) {
      setCannabisSectionOpen(false)
      return
    }
    if (isSectionActive(pathname, cannabisSectionItems, searchParams)) {
      setCannabisSectionOpen(true)
    }
  }, [isAdmin, pathname, searchParams])

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
    if (isAdmin) setCannabisSectionOpen(true)
    setCommunitySectionOpen(true)
  }, [isAdmin, navFilter])

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

  const cannabisSectionActive = isAdmin
    ? isSectionActive(pathname, cannabisSectionItems, searchParams)
    : false
  const communitySectionActive = isSectionActive(pathname, communitySectionItems, searchParams)

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-[var(--surface-1)] sidebar-gradient border-r border-stone-800/60 transition-all duration-200 z-30 ${
        collapsed ? 'lg:w-16' : 'lg:w-60'
      }`}
    >
      {/* Logo + notification bell + collapse toggle */}
      <div
        className={`flex items-center h-16 border-b border-stone-800/60 shadow-[0_1px_8px_rgba(0,0,0,0.2)] ${collapsed ? 'px-3 justify-center' : 'px-3 justify-between'}`}
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
            {isAdmin && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-remy'))}
                className="flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-lg text-stone-400 hover:bg-brand-950 hover:text-brand-600 transition-colors"
                aria-label="Open Remy"
                title="Open Remy"
              >
                <Bot className="w-[18px] h-[18px]" />
              </button>
            )}
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
        {/* COLLAPSED / RAIL MODE */}
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
            {isAdmin && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-remy'))}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-stone-400 hover:bg-brand-950 hover:text-brand-600 transition-colors"
                aria-label="Open Remy"
                title="Open Remy"
              >
                <Bot className="w-[18px] h-[18px]" />
              </button>
            )}
            <OfflineNavIndicator />
            <ActivityDot collapsed />

            {/* Dashboard */}
            {visiblePrimaryItems.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href, searchParams)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                    active
                      ? 'bg-brand-950 text-brand-600'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-400'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {item.href === '/inbox' && (
                    <span className="absolute -top-1 -right-1">
                      <InboxUnreadBadge />
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

            {/* Community - rail icon */}
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
            {visibleBottomItems.map((item) => {
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

            {/* Sign Out - inside nav so it's above the Remy mascot */}
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
          /* EXPANDED MODE */
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
                      {item.href === '/inbox' && <InboxUnreadBadge />}
                      {item.href === '/circles' && <CirclesUnreadBadge />}
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
              <span className="flex-1 text-left">New</span>
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

            <RecentPagesSection />

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

            {isAdmin && !focusMode && (
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
              />
            )}

            {!focusMode && (
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
            )}

            <div className="border-t border-stone-800 my-2" />

            {/* Settings */}
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              aria-expanded={settingsOpen}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
            >
              <span className="flex-1 text-left">Settings</span>
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

            {/* Sign Out - inside nav so it's above the Remy mascot */}
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
