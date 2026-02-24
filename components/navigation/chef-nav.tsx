// Chef Portal Navigation — Collapsible sidebar with grouped nav + rail mode
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import { navGroups, standaloneBottom, mobileTabItems, resolveStandaloneTop } from './nav-config'
import type { NavGroup, NavCollapsibleItem, NavSubItem } from './nav-config'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { GlobalSearch } from '@/components/search/global-search'
import { OfflineNavIndicator } from '@/components/offline/offline-nav-indicator'
import { OllamaStatusBadge } from '@/components/dashboard/ollama-status-badge'
import { ActivityDot } from '@/components/activity/activity-dot'
import { AppLogo } from '@/components/branding/app-logo'

import { LogOut, Menu, X, ChevronLeft, ChevronRight, ChevronDown, Leaf, Bot } from 'lucide-react'
// Navigation items are centrally defined in `components/navigation/nav-config.tsx`

// ─── Sidebar Context ────────────────────────────────
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

// ─── Helper: check if a pathname matches a nav item ─
function isItemActive(pathname: string, href: string) {
  const normalizedHref = href.split('?')[0]
  if (normalizedHref === '/dashboard') return pathname === '/dashboard'
  return pathname === normalizedHref || pathname.startsWith(normalizedHref + '/')
}

function isGroupActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => {
    if (isItemActive(pathname, item.href)) return true
    return item.children?.some((child) => isItemActive(pathname, child.href)) ?? false
  })
}

function isCollapsibleItemActive(pathname: string, item: NavCollapsibleItem) {
  if (isItemActive(pathname, item.href)) return true
  return item.children?.some((child) => isItemActive(pathname, child.href)) ?? false
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

// ─── Flyout for rail mode ───────────────────────────
function RailFlyout({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false)
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const GroupIcon = group.icon
  const active = isGroupActive(pathname, group)

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => {
    for (const item of group.items) {
      if (item.children?.length && isCollapsibleItemActive(pathname, item)) {
        setOpenItems((prev) => {
          if (prev.has(item.href)) return prev
          const next = new Set(prev)
          next.add(item.href)
          return next
        })
      }
    }
  }, [group.items, pathname])

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
            const itemActive = isCollapsibleItemActive(pathname, item)
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
                        const childActive = isItemActive(pathname, child.href)
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
                              const childActive = isItemActive(pathname, child.href)
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
  isOpen,
  onToggle,
  openItems,
  onToggleItem,
}: {
  group: NavGroup
  pathname: string
  isOpen: boolean
  onToggle: () => void
  openItems: Set<string>
  onToggleItem: (href: string) => void
}) {
  const GroupIcon = group.icon
  const active = isGroupActive(pathname, group)

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
            const itemActive = isCollapsibleItemActive(pathname, item)

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
                        const childActive = isItemActive(pathname, child.href)
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
                              const childActive = isItemActive(pathname, child.href)
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
}

// ─── Desktop Sidebar ────────────────────────────────
export function ChefSidebar({
  primaryNavHrefs,
  hasCannabisTier,
  enabledModules,
  isAdmin,
}: {
  primaryNavHrefs?: string[]
  hasCannabisTier?: boolean
  enabledModules?: string[]
  isAdmin?: boolean
}) {
  const pathname = usePathname() ?? ''
  const { collapsed, setCollapsed } = useSidebar()
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const primaryItems = resolveStandaloneTop(primaryNavHrefs)

  // Filter nav groups by enabled modules (progressive disclosure)
  // Admins always see every group — they're the developer, not a gated user
  const enabledSet = enabledModules ? new Set(enabledModules) : null
  const visibleGroups = isAdmin
    ? navGroups
    : enabledSet
      ? navGroups.filter((g) => !g.module || enabledSet.has(g.module))
      : navGroups

  // Auto-expand group containing active route
  useEffect(() => {
    for (const group of visibleGroups) {
      if (isGroupActive(pathname, group)) {
        setOpenGroups((prev) => {
          if (prev.has(group.id)) return prev
          const next = new Set(prev)
          next.add(group.id)
          return next
        })
      }
    }
  }, [pathname, visibleGroups])

  useEffect(() => {
    for (const group of visibleGroups) {
      for (const item of group.items) {
        if (item.children?.length && isCollapsibleItemActive(pathname, item)) {
          setOpenItems((prev) => {
            if (prev.has(item.href)) return prev
            const next = new Set(prev)
            next.add(item.href)
            return next
          })
        }
      }
    }
  }, [pathname, visibleGroups])

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
            <GlobalSearch />
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
      <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
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
            <GlobalSearch />
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
              const active = isItemActive(pathname, item.href)
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
            {visibleGroups.map((group) => (
              <RailFlyout key={group.id} group={group} pathname={pathname} />
            ))}

            <div className="w-6 border-t border-stone-800 my-1.5" />

            {/* Settings */}
            {standaloneBottom.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href)
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
          </div>
        ) : (
          /* ── EXPANDED MODE ── */
          <div className="px-3 space-y-1">
            {/* Dashboard */}
            {primaryItems.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href)
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

            <div className="border-t border-stone-800 my-2" />

            {/* Grouped nav */}
            {visibleGroups.map((group) => (
              <NavGroupSection
                key={group.id}
                group={group}
                pathname={pathname}
                isOpen={openGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
                openItems={openItems}
                onToggleItem={toggleItem}
              />
            ))}

            <div className="border-t border-stone-800 my-2" />

            {/* Cannabis Tier — hidden unless chef has cannabis access */}
            {hasCannabisTier && (
              <>
                <div className="flex items-center gap-2 px-3 py-1">
                  <div className="flex-1 border-t border-green-800/30" />
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-green-700">
                    Cannabis
                  </span>
                  <div className="flex-1 border-t border-green-800/30" />
                </div>
                {[
                  { href: '/cannabis', label: 'Cannabis Hub' },
                  { href: '/cannabis/events', label: 'Cannabis Events' },
                  { href: '/cannabis/ledger', label: 'Cannabis Ledger' },
                  { href: '/cannabis/invite', label: 'Invite' },
                  { href: '/cannabis/compliance', label: 'Compliance ⚠️' },
                  { href: '/cannabis/about', label: 'About' },
                ].map((item) => {
                  const active = isItemActive(pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active ? 'text-emerald-700' : 'text-stone-500 hover:text-stone-300'
                      }`}
                      style={active ? { background: 'rgba(74, 124, 78, 0.08)' } : undefined}
                    >
                      <Leaf
                        className="w-[18px] h-[18px] flex-shrink-0"
                        style={{ color: active ? '#4a7c4e' : 'rgba(74, 124, 78, 0.5)' }}
                      />
                      {item.label}
                    </Link>
                  )
                })}
                <div className="border-t border-stone-800 my-2" />
              </>
            )}

            {/* Settings */}
            {standaloneBottom.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href)
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
        )}
      </nav>

      {/* Bottom — AI status + Sign Out */}
      <div className={`border-t border-stone-800 ${collapsed ? 'p-1.5' : 'p-3'}`}>
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
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex items-center rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors ${
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 w-full px-3 py-2'
          }`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}

// Mobile tab items provided by central nav config

// ─── Mobile group section (for slide-out) ───────────
function MobileGroupSection({
  group,
  pathname,
  isOpen,
  onToggle,
  openItems,
  onToggleItem,
  onNavigate,
}: {
  group: NavGroup
  pathname: string
  isOpen: boolean
  onToggle: () => void
  openItems: Set<string>
  onToggleItem: (href: string) => void
  onNavigate: () => void
}) {
  const GroupIcon = group.icon
  const active = isGroupActive(pathname, group)

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
            const itemActive = isCollapsibleItemActive(pathname, item)

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
                        const childActive = isItemActive(pathname, child.href)
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
                              const childActive = isItemActive(pathname, child.href)
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
}: {
  primaryNavHrefs?: string[]
  hasCannabisTier?: boolean
  enabledModules?: string[]
  isAdmin?: boolean
}) {
  const pathname = usePathname() ?? ''
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const primaryItems = resolveStandaloneTop(primaryNavHrefs)

  // Filter nav groups by enabled modules (progressive disclosure)
  // Admins always see every group — they're the developer, not a gated user
  const enabledSet = enabledModules ? new Set(enabledModules) : null
  const visibleGroups = isAdmin
    ? navGroups
    : enabledSet
      ? navGroups.filter((g) => !g.module || enabledSet.has(g.module))
      : navGroups

  // Auto-expand group containing active route in mobile menu
  useEffect(() => {
    if (!menuOpen) return
    for (const group of visibleGroups) {
      if (isGroupActive(pathname, group)) {
        setOpenGroups((prev) => {
          if (prev.has(group.id)) return prev
          const next = new Set(prev)
          next.add(group.id)
          return next
        })
      }
    }
  }, [pathname, menuOpen, visibleGroups])

  useEffect(() => {
    if (!menuOpen) return
    for (const group of visibleGroups) {
      for (const item of group.items) {
        if (item.children?.length && isCollapsibleItemActive(pathname, item)) {
          setOpenItems((prev) => {
            if (prev.has(item.href)) return prev
            const next = new Set(prev)
            next.add(item.href)
            return next
          })
        }
      }
    }
  }, [pathname, menuOpen, visibleGroups])

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
            <GlobalSearch />
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
              {/* Dashboard */}
              {primaryItems.map((item) => {
                const Icon = item.icon
                const active = isItemActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-brand-950 text-brand-400' : 'text-stone-400 hover:bg-stone-800'
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : 'text-stone-400'}`}
                    />
                    {item.label}
                  </Link>
                )
              })}

              <div className="border-t border-stone-800 my-2" />

              {/* Grouped nav */}
              <div className="space-y-0.5">
                {visibleGroups.map((group) => (
                  <MobileGroupSection
                    key={group.id}
                    group={group}
                    pathname={pathname}
                    isOpen={openGroups.has(group.id)}
                    onToggle={() => toggleGroup(group.id)}
                    openItems={openItems}
                    onToggleItem={toggleItem}
                    onNavigate={closeMenu}
                  />
                ))}
              </div>

              <div className="border-t border-stone-800 my-2" />

              {/* Cannabis Tier — mobile */}
              {hasCannabisTier && (
                <>
                  <div className="flex items-center gap-2 px-3 py-1">
                    <div className="flex-1 border-t border-green-800/30" />
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-green-700">
                      Cannabis
                    </span>
                    <div className="flex-1 border-t border-green-800/30" />
                  </div>
                  {[
                    { href: '/cannabis', label: 'Cannabis Hub' },
                    { href: '/cannabis/events', label: 'Events' },
                    { href: '/cannabis/ledger', label: 'Ledger' },
                    { href: '/cannabis/invite', label: 'Invite' },
                    { href: '/cannabis/compliance', label: 'Compliance ⚠️' },
                    { href: '/cannabis/about', label: 'About' },
                  ].map((item) => {
                    const active = isItemActive(pathname, item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'text-green-700 bg-green-950/50'
                            : 'text-stone-500 hover:bg-stone-800'
                        }`}
                      >
                        <Leaf
                          className={`w-[18px] h-[18px] ${active ? 'text-green-600' : 'text-green-700/40'}`}
                        />
                        {item.label}
                      </Link>
                    )
                  })}
                  <div className="border-t border-stone-800 my-2" />
                </>
              )}

              {/* Settings */}
              {standaloneBottom.map((item) => {
                const Icon = item.icon
                const active = isItemActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-brand-950 text-brand-400' : 'text-stone-400 hover:bg-stone-800'
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : 'text-stone-400'}`}
                    />
                    {item.label}
                  </Link>
                )
              })}

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
