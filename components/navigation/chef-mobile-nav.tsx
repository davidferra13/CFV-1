// Chef Portal Mobile Navigation - bottom tab bar, slide-out menu, mobile groups.
// Extracted from chef-nav.tsx for maintainability.
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import type { LucideIcon } from '@/components/ui/icons'
import { navGroups, standaloneBottom, resolveStandaloneTop, resolveMobileTabs } from './nav-config'
import type { NavGroup, NavCollapsibleItem, NavItem } from './nav-config'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { GlobalSearch } from '@/components/search/global-search'
import { OfflineNavIndicator } from '@/components/offline/offline-nav-indicator'
import { OllamaStatusBadge } from '@/components/dashboard/ollama-status-badge'
import { ActivityDot } from '@/components/activity/activity-dot'
import { AppLogo } from '@/components/branding/app-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  getStrictFocusGroupRank,
  isStrictFocusGroupVisible,
  STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS,
} from '@/lib/navigation/focus-mode-nav'
import {
  LogOut,
  Menu,
  X,
  ChevronDown,
  Leaf,
  Bot,
  Rss,
  Plus,
  Lock,
  Sparkles,
  Search,
} from '@/components/ui/icons'
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

// ---- NavFilterInput (shared with desktop, duplicated here to avoid circular imports) ----
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

// ---- SectionAccordion (shared with desktop, duplicated to avoid circular imports) ----
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

// ---- MobileGroupSection ----
const MobileGroupSection = memo(function MobileGroupSection({
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
      </div>
    </div>
  )
})

// ---- MobileBottomTabBar ----
// CRITICAL: This component uses native <a> tags with an onClick fallback
// to window.location.href. If React hydration fails (stale SW, JS error,
// hydration mismatch), Next.js <Link> swallows the click (preventDefault)
// but router.push silently fails - nothing happens. Native <a> tags with
// hard-navigation fallback guarantee the bottom nav ALWAYS works.
const MobileBottomTabBar = memo(function MobileBottomTabBar({
  pathname,
  onMoreClick,
  tabItems,
}: {
  pathname: string
  onMoreClick: () => void
  tabItems: NavItem[]
}) {
  // Ref for the "More" button - attaches a native onclick as backup
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
    <nav
      className="lg:hidden fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-0 right-0 z-40 border-b border-white/[0.06]"
      style={{
        background: 'rgba(28, 25, 23, 0.85)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        backdropFilter: 'blur(16px) saturate(1.2)',
      }}
    >
      <div className="flex items-center justify-around h-11">
        {tabItems.map((item) => {
          const active = isItemActive(pathname, item.href)
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                // Hard navigate - bypasses Next.js client router entirely.
                // This is intentional: the nav must NEVER silently fail.
                e.preventDefault()
                window.location.href = item.href
              }}
              className={`group flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xxs font-medium transition-colors no-underline ${
                active
                  ? 'text-brand-600 drop-shadow-[0_0_6px_rgba(232,143,71,0.4)]'
                  : 'text-stone-400'
              }`}
            >
              <Icon className="w-4 h-4 group-active:scale-110 transition-transform duration-100" />
              {item.label}
            </a>
          )
        })}
        <button
          ref={moreRef}
          type="button"
          onClick={() => onMoreClick()}
          className="group flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xxs font-medium text-stone-400"
        >
          <Menu className="w-4 h-4 group-active:scale-110 transition-transform duration-100" />
          More
        </button>
      </div>
    </nav>
  )
})

// ---- ChefMobileNav (main export) ----
export function ChefMobileNav({
  primaryNavHrefs,
  mobileTabHrefs,
  enabledModules,
  isAdmin,
  focusMode,
  userId,
  tenantId,
}: {
  primaryNavHrefs?: string[]
  mobileTabHrefs?: string[]
  enabledModules?: string[]
  isAdmin?: boolean
  focusMode?: boolean
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
  const primaryItems = useMemo(
    () =>
      resolveStandaloneTop(focusMode ? [...STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS] : primaryNavHrefs),
    [focusMode, primaryNavHrefs]
  )
  const visiblePrimaryItems = useMemo(() => {
    const items = isAdmin ? primaryItems : primaryItems.filter((item) => !item.adminOnly)
    return items.filter((item) => !item.hidden)
  }, [isAdmin, primaryItems])
  const tabItems = useMemo(
    () =>
      focusMode
        ? resolveStandaloneTop([...STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS]).map((item) => ({
            ...item,
            label: item.href === '/dashboard' ? 'Home' : item.label,
          }))
        : resolveMobileTabs(mobileTabHrefs),
    [focusMode, mobileTabHrefs]
  )

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
    setMobileShortcutsOpen(true)
    setMobileQuickCreateOpen(true)
    setMobileSettingsOpen(true)
    if (isAdmin) setCannabisSectionOpen(true)
    setCommunitySectionOpen(true)
  }, [isAdmin, navFilter])

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
  const cannabisSectionActive = isAdmin
    ? isSectionActive(pathname, cannabisSectionItems, searchParams)
    : false
  const communitySectionActive = isSectionActive(pathname, communitySectionItems, searchParams)

  return (
    <>
      {/* Mobile top bar */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-white/[0.06] pt-safe"
        style={{
          background: 'rgba(28, 25, 23, 0.85)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
          backdropFilter: 'blur(16px) saturate(1.2)',
        }}
      >
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
            {isAdmin && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-remy'))}
                className="flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg text-stone-400 hover:bg-brand-950 hover:text-brand-600 transition-colors"
                aria-label="Open Remy"
                title="Open Remy"
              >
                <Bot className="w-[18px] h-[18px]" />
              </button>
            )}
            <ThemeToggle className="h-10 w-10 min-h-0 rounded-lg border border-stone-700 bg-stone-900/80 p-0 text-stone-400 hover:bg-stone-800 hover:text-stone-100" />
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
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeMenu}
          />
          <div
            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 border-r border-white/[0.06] shadow-2xl"
            style={{
              background: 'rgba(28, 25, 23, 0.92)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
              backdropFilter: 'blur(20px) saturate(1.3)',
            }}
          >
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
                  <span className="flex-1 text-left">New</span>
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
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs-tight font-semibold text-brand-300 bg-brand-950/40"
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

              {/* Cannabis section hidden - feature disabled */}

              {!focusMode && (
                <SectionAccordion
                  title="Community"
                  items={filteredCommunityItems}
                  icon={Rss}
                  isOpen={communitySectionOpen}
                  onToggle={() => setCommunitySectionOpen((prev) => !prev)}
                  pathname={pathname}
                  searchParams={searchParams}
                  headerActiveClass={communitySectionActive ? 'text-brand-400' : 'text-brand-400'}
                  headerInactiveClass="text-brand-400 hover:bg-brand-950/20 hover:text-brand-300"
                  dividerClass="border-brand-800/30"
                  itemActiveClass="text-brand-400 bg-brand-950/50"
                  itemInactiveClass="text-stone-500 hover:bg-stone-800"
                  iconActiveColor="#818cf8"
                  iconInactiveColor="rgba(99, 102, 241, 0.5)"
                  onNavigate={closeMenu}
                />
              )}
              <div className="border-t border-stone-800 my-2" />

              {/* Settings */}
              <button
                type="button"
                onClick={() => setMobileSettingsOpen((prev) => !prev)}
                aria-expanded={mobileSettingsOpen}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
              >
                <span className="flex-1 text-left">Settings</span>
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

      {/* Mobile bottom tab bar - uses native <a> tags so navigation works
          even when React hydration fails. This is the MOST CRITICAL nav on mobile;
          it must never depend on React's event system being functional. */}
      <MobileBottomTabBar
        pathname={pathname}
        onMoreClick={() => setMenuOpen(true)}
        tabItems={tabItems}
      />
    </>
  )
}
