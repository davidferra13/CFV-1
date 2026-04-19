// Chef Portal Mobile Navigation - bottom tab bar, slide-out menu, mobile groups.
// Extracted from chef-nav.tsx for maintainability.
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import type { LucideIcon } from '@/components/ui/icons'
import {
  navGroups,
  resolveStandaloneTop,
  resolveMobileTabs,
  actionBarItems,
  createDropdownItems,
} from './nav-config'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'

const DEFAULT_MODULE_SLUGS = new Set(DEFAULT_ENABLED_MODULES)
import type { NavGroup, NavCollapsibleItem, NavItem } from './nav-config'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { GlobalSearch } from '@/components/search/global-search'
import { OfflineNavIndicator } from '@/components/offline/offline-nav-indicator'
import { OllamaStatusBadge } from '@/components/dashboard/ollama-status-badge'
import { AiStatusDot } from '@/components/dashboard/ai-status-dot'
import { ActivityDot } from '@/components/activity/activity-dot'
import { AppLogo } from '@/components/branding/app-logo'

import { usePermissions } from '@/lib/context/permission-context'
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
  Settings,
} from '@/components/ui/icons'
import { useNavigationPending } from './navigation-pending-provider'
import type { SearchParamsLike } from './chef-nav-helpers'
import {
  isItemActive,
  isGroupActive,
  isCollapsibleItemActive,
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

// ---- MobileActionBarLinks (with pending nav feedback) ----
const MobileActionBarLinks = memo(function MobileActionBarLinks({
  pathname,
  searchParams,
  navFilter,
  onNavigate,
}: {
  pathname: string
  searchParams?: SearchParamsLike | null
  navFilter: string
  onNavigate: () => void
}) {
  const { pendingHref, setPendingHref } = useNavigationPending()

  return (
    <div className="space-y-0.5">
      {actionBarItems
        .filter((item) => !navFilter || item.label.toLowerCase().includes(navFilter.toLowerCase()))
        .map((item) => {
          const Icon = item.icon
          const active = isItemActive(pathname, item.href, searchParams)
          const isPending = pendingHref === item.href && !active
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                setPendingHref(item.href)
                onNavigate()
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors border-l-2 ${
                active
                  ? 'bg-brand-950 text-brand-400 border-brand-500'
                  : isPending
                    ? 'bg-brand-950/50 text-brand-400/70 border-brand-500/50 animate-pulse'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100 border-transparent'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] ${active || isPending ? 'text-brand-600' : 'text-stone-400'}`}
              />
              {item.label}
            </Link>
          )
        })}
    </div>
  )
})

// ---- ChefMobileNav (main export) ----
export function ChefMobileNav({
  primaryNavHrefs,
  mobileTabHrefs,
  enabledModules,
  isAdmin,
  isPrivileged,
  focusMode,
  userId,
  tenantId,
}: {
  primaryNavHrefs?: string[]
  mobileTabHrefs?: string[]
  enabledModules?: string[]
  isAdmin?: boolean
  isPrivileged?: boolean
  focusMode?: boolean
  userId: string
  tenantId: string
}) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const [mobileQuickCreateOpen, setMobileQuickCreateOpen] = useState(true)
  const [navFilter, setNavFilter] = useState('')
  const { has: hasPermission } = usePermissions()
  const tabItems = useMemo(
    () =>
      focusMode && !isPrivileged
        ? resolveStandaloneTop([...STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS]).map((item) => ({
            ...item,
            label: item.href === '/dashboard' ? 'Home' : item.label,
          }))
        : resolveMobileTabs(mobileTabHrefs),
    [focusMode, isPrivileged, mobileTabHrefs]
  )

  // Filter nav groups by role + focus mode.
  // Focus Mode should simplify nav for everyone, including admins.
  const enabledSet = useMemo(
    () => (enabledModules ? new Set(enabledModules) : null),
    [enabledModules]
  )
  const accessibleGroups = useMemo(() => {
    const baseGroups = navGroups
      .filter((group) => {
        if (!group.module) return false
        if (enabledSet) return enabledSet.has(group.module)
        return DEFAULT_MODULE_SLUGS.has(group.module)
      })
      .map((group) => ({
        ...group,
        items: (isAdmin ? group.items : group.items.filter((item) => !item.adminOnly))
          .filter((item) => !item.hidden)
          .filter((item) => {
            if (item.requiredPermission) {
              const [domain, action] = item.requiredPermission.split(':')
              return hasPermission(domain, action as any)
            }
            return true
          })
          .map((item) =>
            item.children
              ? { ...item, children: item.children.filter((child) => !child.hidden) }
              : item
          ),
      }))
      .filter((group) => group.items.length > 0)

    // VIP/Admin/Owner bypass focus mode entirely (see all groups)
    if (!focusMode || isPrivileged) return baseGroups
    const strictGroups = baseGroups.filter((group) =>
      isStrictFocusGroupVisible(group.id, Boolean(isAdmin))
    )
    return strictGroups.sort(
      (a, b) => getStrictFocusGroupRank(a.id) - getStrictFocusGroupRank(b.id)
    )
  }, [isAdmin, isPrivileged, focusMode, enabledSet])
  const groupEntries = useMemo(
    () => accessibleGroups.map((group) => ({ group, isLocked: false })),
    [accessibleGroups]
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
          <div className="flex items-center flex-shrink-0 gap-1">
            <OfflineNavIndicator />
            <GlobalSearch userId={userId} tenantId={tenantId} />
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
              <div className="flex items-center gap-1">
                {isAdmin ? <OllamaStatusBadge /> : <AiStatusDot />}
                <ActivityDot />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-remy'))
                      closeMenu()
                    }}
                    className="flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-lg text-stone-400 hover:bg-brand-950 hover:text-brand-600 transition-colors"
                    aria-label="Open Remy"
                    title="Open Remy"
                  >
                    <Bot className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={closeMenu}
                  className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <nav className="p-3 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
              <div className="sticky top-0 z-10 bg-stone-900/95 backdrop-blur-sm pb-2 space-y-2">
                <NavFilterInput value={navFilter} onChange={setNavFilter} />
                {/* + Create section (unified with desktop) */}
                <button
                  type="button"
                  onClick={() => setMobileQuickCreateOpen((prev) => !prev)}
                  aria-expanded={mobileQuickCreateOpen}
                  className="flex w-full items-center gap-2 rounded-md border border-brand-600/30 bg-brand-950/40 px-3 py-2 text-sm font-medium text-brand-400 hover:bg-brand-950/60 hover:text-brand-300 transition-colors"
                >
                  <Plus className="h-4 w-4" weight="bold" />
                  <span className="flex-1 text-left">Create</span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                      mobileQuickCreateOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    mobileQuickCreateOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="space-y-0.5 mt-1">
                    {createDropdownItems
                      .filter(
                        (item) =>
                          !navFilter || item.label.toLowerCase().includes(navFilter.toLowerCase())
                      )
                      .map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMenu}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-stone-300 hover:bg-stone-800 hover:text-stone-100"
                          >
                            <Icon className="w-4 h-4 shrink-0 text-stone-500" />
                            {item.label}
                          </Link>
                        )
                      })}
                  </div>
                </div>
              </div>

              {/* Action Bar items (unified with desktop) */}
              <MobileActionBarLinks
                pathname={pathname}
                searchParams={searchParams}
                navFilter={navFilter}
                onNavigate={closeMenu}
              />

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

              {/* Settings */}
              {(() => {
                const settingsActive = isItemActive(pathname, '/settings', searchParams)
                return (
                  <Link
                    href="/settings"
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      settingsActive
                        ? 'bg-brand-950 text-brand-400'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <Settings
                      className={`w-[18px] h-[18px] flex-shrink-0 ${settingsActive ? 'text-brand-600' : 'text-stone-400'}`}
                    />
                    Settings
                  </Link>
                )
              })()}

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
