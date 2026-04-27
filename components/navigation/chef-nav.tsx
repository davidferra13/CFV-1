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
import { navGroups, standaloneBottom } from './nav-config'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'

const DEFAULT_MODULE_SLUGS = new Set(DEFAULT_ENABLED_MODULES)
import type { NavCollapsibleItem, NavGroup, NavSubItem } from './nav-config'
import { ActionBar } from './action-bar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { GlobalSearch } from '@/components/search/global-search'
import { OfflineNavIndicator } from '@/components/offline/offline-nav-indicator'
import { OllamaStatusBadge } from '@/components/dashboard/ollama-status-badge'
import { AiStatusDot } from '@/components/dashboard/ai-status-dot'
import { ActivityDot } from '@/components/activity/activity-dot'
import { SystemHeartbeat } from '@/components/navigation/system-heartbeat'
import { useNavigationPending } from '@/components/navigation/navigation-pending-provider'
import { AppLogo } from '@/components/branding/app-logo'
import { RecentPagesSection } from '@/components/navigation/recent-pages-section'
import { InboxUnreadBadge } from '@/components/communication/inbox-unread-badge'
import { CirclesUnreadBadge } from '@/components/hub/circles-unread-badge'
import { InquiriesUnreadBadge } from '@/components/inquiries/inquiries-unread-badge'
import { ChatNavUnreadBadge } from '@/components/chat/chat-nav-unread-badge'

import { usePermissions } from '@/lib/context/permission-context'
import { getStrictFocusGroupRank, isStrictFocusGroupVisible } from '@/lib/navigation/focus-mode-nav'
import {
  CHEF_SHELL_RESET_EVENT,
  CHEF_SIDEBAR_COLLAPSED_STORAGE_KEY,
  DEFAULT_CHEF_SIDEBAR_COLLAPSED,
  readChefShellPresentationState,
} from '@/lib/chef/shell-state'

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
  Settings,
  Compass,
} from '@/components/ui/icons'

// Extracted config and helpers
import type { SearchParamsLike } from './chef-nav-helpers'
import {
  isItemActive,
  isGroupActive,
  isCollapsibleItemActive,
  partitionChildren,
  filterNavGroup,
} from './chef-nav-helpers'
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'
import {
  STARTER_NAV_GROUP_ORDER,
  STARTER_NAV_GROUPS,
  isNavGroupVisible,
} from '@/lib/progressive-disclosure/nav-visibility'

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
  const [collapsed, setCollapsed] = useState(DEFAULT_CHEF_SIDEBAR_COLLAPSED)
  const [mounted, setMounted] = useState(false)

  const syncCollapsedFromStorage = useCallback(() => {
    setCollapsed(readChefShellPresentationState(window.localStorage).sidebarCollapsed)
    setMounted(true)
  }, [])

  useEffect(() => {
    syncCollapsedFromStorage()
  }, [syncCollapsedFromStorage])

  useEffect(() => {
    window.addEventListener(CHEF_SHELL_RESET_EVENT, syncCollapsedFromStorage)
    return () => window.removeEventListener(CHEF_SHELL_RESET_EVENT, syncCollapsedFromStorage)
  }, [syncCollapsedFromStorage])

  const handleSetCollapsed = useCallback((v: boolean) => {
    setCollapsed(v)
    try {
      localStorage.setItem(CHEF_SIDEBAR_COLLAPSED_STORAGE_KEY, String(v))
    } catch {
      // localStorage unavailable
    }
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
  placeholder = 'Search or \u2318K to jump...',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="relative block px-1" suppressHydrationWarning>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full h-8 pl-8 pr-3 rounded-lg border border-stone-700 bg-stone-950 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
        suppressHydrationWarning
      />
    </label>
  )
})

// ---- PendingNavLink ----
// Wraps Link to show optimistic active state + subtle loading pulse on click
function PendingNavLink({
  href,
  onClick,
  className,
  activeClassName,
  pendingClassName,
  isActive,
  style,
  children,
}: {
  href: string
  onClick?: () => void
  className: string
  activeClassName: string
  pendingClassName: string
  isActive: boolean
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const { pendingHref, setPendingHref } = useNavigationPending()
  const isPending = pendingHref === href && !isActive

  return (
    <Link
      href={href}
      onClick={() => {
        setPendingHref(href)
        onClick?.()
      }}
      className={`${className} ${isActive ? activeClassName : ''} ${isPending ? `${pendingClassName} animate-pulse` : ''}`}
      style={isActive ? style : undefined}
    >
      {children}
    </Link>
  )
}

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
                          <summary className="cursor-pointer px-2 py-1 text-xs font-semibold uppercase tracking-wider text-stone-300 hover:text-stone-200">
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
  tenantId,
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
  tenantId?: string
}) {
  const GroupIcon = group.icon
  const active = isGroupActive(pathname, group, searchParams)

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active && !isOpen
            ? 'text-brand-400'
            : 'text-stone-300 hover:bg-stone-800/40 hover:text-stone-100'
        }`}
      >
        <GroupIcon
          className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-brand-500' : 'text-stone-600'}`}
        />
        <span
          className={`flex-1 text-left tracking-tight transition-opacity ${active ? 'opacity-100' : 'opacity-80'}`}
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
        <div className="ml-3 pl-3 border-l border-stone-800/60 mt-1 space-y-0.5">
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
                                : 'text-stone-300 hover:bg-stone-800 hover:text-brand-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                            {child.label}
                          </Link>
                        )
                      })}
                      {advanced.length > 0 && (
                        <details className="pt-1">
                          <summary className="cursor-pointer px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-300 hover:text-stone-200">
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
                                      : 'text-stone-300 hover:bg-stone-800 hover:text-brand-400'
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
              <PendingNavLink
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                  !itemActive
                    ? 'text-stone-300 hover:bg-stone-800 hover:text-brand-400 border-transparent'
                    : ''
                }`}
                activeClassName="bg-brand-950 text-brand-400 border-brand-500"
                pendingClassName="bg-brand-950/50 text-brand-400/70 border-brand-500/50"
                isActive={itemActive}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`}
                />
                {item.label}
                {item.href === '/inbox' && <InboxUnreadBadge sseChannel={`tenant:${tenantId}`} />}
                {item.href === '/circles' && <CirclesUnreadBadge />}
                {item.href === '/events' && (
                  <InquiriesUnreadBadge sseChannel={`chef-${tenantId}`} />
                )}
                {item.href === '/chat' && <ChatNavUnreadBadge sseChannel={`tenant:${tenantId}`} />}
              </PendingNavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
})

const FIRST_TIME_CHILD_HREFS: Record<string, Set<string>> = {
  '/inquiries': new Set(['/inquiries/new']),
  '/events/upcoming': new Set(['/events/new', '/events/new/from-text', '/events/new/wizard']),
  '/clients': new Set(['/clients/new']),
  '/recipes': new Set(['/recipes/new', '/culinary/recipes']),
}

function isStarterItemVisible(
  groupId: string,
  item: NavCollapsibleItem,
  presence: TenantDataPresence
) {
  switch (groupId) {
    case 'pipeline':
      if (item.href === '/inquiries') return true
      if (item.href === '/quotes') return presence.hasInquiries || presence.hasQuotes
      if (item.href === '/leads') return presence.hasLeads
      if (item.href === '/contracts') return presence.hasContracts
      return presence.hasInquiries || presence.hasQuotes || presence.hasEvents
    case 'events':
      if (item.href === '/events/upcoming') return true
      return presence.hasEvents
    case 'clients':
      if (item.href === '/clients') return true
      return presence.hasClients
    case 'culinary':
      if (item.href === '/culinary' || item.href === '/recipes') return true
      if (item.href === '/menus') return presence.hasMenus || presence.hasRecipes
      return presence.hasRecipes || presence.hasMenus
    default:
      return true
  }
}

function isStarterItemDataUnlocked(
  groupId: string,
  item: NavCollapsibleItem,
  presence: TenantDataPresence
) {
  switch (groupId) {
    case 'pipeline':
      if (item.href === '/inquiries') return presence.hasInquiries
      if (item.href === '/quotes') return presence.hasQuotes
      if (item.href === '/leads') return presence.hasLeads
      if (item.href === '/contracts') return presence.hasContracts
      return presence.hasInquiries || presence.hasQuotes || presence.hasEvents
    case 'events':
      return presence.hasEvents
    case 'clients':
      return presence.hasClients
    case 'culinary':
      if (item.href === '/recipes') return presence.hasRecipes
      if (item.href === '/menus') return presence.hasMenus
      return presence.hasRecipes || presence.hasMenus
    default:
      return true
  }
}

function filterStarterChildren(
  item: NavCollapsibleItem,
  itemUnlocked: boolean
): NavSubItem[] | undefined {
  if (!item.children) return undefined
  if (itemUnlocked) return item.children

  const firstTimeHrefs = FIRST_TIME_CHILD_HREFS[item.href]
  if (!firstTimeHrefs) return undefined
  const children = item.children.filter((child) => firstTimeHrefs.has(child.href))
  return children.length > 0 ? children : undefined
}

function filterGroupForProgressiveDisclosure(
  group: NavGroup,
  presence: TenantDataPresence | null | undefined,
  showAll: boolean,
  pathname: string,
  searchParams?: SearchParamsLike | null
): NavGroup {
  if (!presence || showAll || !STARTER_NAV_GROUPS.has(group.id)) return group

  const items: NavCollapsibleItem[] = []
  for (const item of group.items) {
    const itemActive = isCollapsibleItemActive(pathname, item, searchParams)
    const itemVisible = itemActive || isStarterItemVisible(group.id, item, presence)
    if (!itemVisible) continue

    const itemUnlocked = itemActive || isStarterItemDataUnlocked(group.id, item, presence)
    const children = filterStarterChildren(item, itemUnlocked)
    const nextItem: NavCollapsibleItem = children
      ? { ...item, children }
      : { ...item, children: undefined }
    items.push(nextItem)
  }

  return { ...group, items }
}

function countGroupItems(group: NavGroup) {
  return group.items.reduce((count, item) => count + 1 + (item.children?.length ?? 0), 0)
}

const STARTER_NAV_GROUP_RANK = new Map<string, number>(
  STARTER_NAV_GROUP_ORDER.map((groupId, index): [string, number] => [groupId, index])
)

function sortStarterGroupsFirst(groups: NavGroup[]): NavGroup[] {
  return [...groups].sort((a, b) => {
    const aRank = STARTER_NAV_GROUP_RANK.get(a.id)
    const bRank = STARTER_NAV_GROUP_RANK.get(b.id)
    if (aRank != null && bRank != null) return aRank - bRank
    if (aRank != null) return -1
    if (bRank != null) return 1
    return 0
  })
}

// ---- Desktop Sidebar ----
const SHOW_ALL_NAV_STORAGE_KEY = 'cf:show-all-nav-groups'

export function ChefSidebar({
  primaryNavHrefs,
  enabledModules,
  isAdmin,
  isPrivileged,
  focusMode,
  userId,
  tenantId,
  archetype,
  tenantPresence,
}: {
  primaryNavHrefs?: string[]
  enabledModules?: string[]
  isAdmin?: boolean
  isPrivileged?: boolean
  focusMode?: boolean
  userId: string
  tenantId: string
  archetype?: string | null
  tenantPresence?: TenantDataPresence | null
}) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const { collapsed, setCollapsed } = useSidebar()
  const [isTablet, setIsTablet] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    setIsTablet(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsTablet(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  const effectiveCollapsed = isTablet || collapsed
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const [navFilter, setNavFilter] = useState('')
  const [showAllNav, setShowAllNav] = useState(false)
  const { has: hasPermission } = usePermissions()

  // Load "show all nav" preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHOW_ALL_NAV_STORAGE_KEY)
      if (stored === 'true') setShowAllNav(true)
    } catch {
      /* ignore */
    }
  }, [])

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
  }, [isAdmin, isPrivileged, focusMode, enabledSet, hasPermission])

  // Progressive disclosure filters sidebar chrome only. Direct routes remain accessible.
  const progressiveGroups = useMemo(() => {
    if (!tenantPresence || isPrivileged || isAdmin) return accessibleGroups
    const groups = accessibleGroups
      .filter(
        (group) =>
          isGroupActive(pathname, group, searchParams) ||
          isNavGroupVisible(group.id, tenantPresence, showAllNav)
      )
      .map((group) =>
        filterGroupForProgressiveDisclosure(
          group,
          tenantPresence,
          showAllNav,
          pathname,
          searchParams
        )
      )
    return showAllNav ? groups : sortStarterGroupsFirst(groups)
  }, [accessibleGroups, tenantPresence, showAllNav, isPrivileged, isAdmin, pathname, searchParams])

  const hasHiddenGroups = useMemo(() => {
    if (!tenantPresence || isPrivileged || isAdmin) return false

    const simplifiedGroups = accessibleGroups
      .filter((group) => isNavGroupVisible(group.id, tenantPresence, false))
      .map((group) =>
        filterGroupForProgressiveDisclosure(group, tenantPresence, false, pathname, searchParams)
      )

    if (simplifiedGroups.length < accessibleGroups.length) return true

    return simplifiedGroups.some((group) => {
      const sourceGroup = accessibleGroups.find((candidate) => candidate.id === group.id)
      return sourceGroup ? countGroupItems(group) < countGroupItems(sourceGroup) : false
    })
  }, [accessibleGroups, tenantPresence, isPrivileged, isAdmin, pathname, searchParams])

  const groupEntries = useMemo(
    () => progressiveGroups.map((group) => ({ group, isLocked: false })),
    [progressiveGroups]
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
  const visibleBottomItems = useMemo(
    () => (isAdmin ? standaloneBottom : standaloneBottom.filter((item) => !item.adminOnly)),
    [isAdmin]
  )
  const networkRailActive = pathname.startsWith('/network')
  const showCommunityRailLink =
    isAdmin ||
    isPrivileged ||
    showAllNav ||
    networkRailActive ||
    !tenantPresence ||
    tenantPresence.hasNetwork ||
    tenantPresence.hasCircles
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
      // Accordion: opening a group closes all others for a cleaner view
      if (prev.has(id)) {
        const next = new Set(prev)
        next.delete(id)
        return next
      }
      return new Set([id])
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
  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('[sign-out]', error)
    }
    window.location.href = '/'
  }, [])

  return (
    <aside
      className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 glass-subtle sidebar-gradient border-r border-stone-800/40 transition-all duration-200 z-30 md:w-16 ${
        collapsed ? 'lg:w-16' : 'lg:w-60'
      }`}
    >
      {/* Logo + notification bell + collapse toggle */}
      <div
        className={`flex items-center h-14 border-b border-stone-800/40 ${effectiveCollapsed ? 'px-3 justify-center' : 'px-3 justify-between'}`}
      >
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0 group/logo">
          <span className="transition-transform duration-200 group-hover/logo:scale-110">
            <AppLogo />
          </span>
          {!effectiveCollapsed && (
            <span className="text-lg font-display text-stone-100 whitespace-nowrap transition-colors duration-200 group-hover/logo:text-brand-400">
              ChefFlow
            </span>
          )}
        </Link>
        {!effectiveCollapsed ? (
          <div className="flex items-center flex-shrink-0">
            {isAdmin ? <OllamaStatusBadge /> : <AiStatusDot />}
            <SystemHeartbeat />
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
      <nav className="flex-1 overflow-y-auto pt-3 pb-6 custom-scrollbar">
        {/* COLLAPSED / RAIL MODE */}
        {effectiveCollapsed ? (
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

            {/* AI status indicator */}
            {isAdmin ? <OllamaStatusBadge /> : <AiStatusDot />}
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
            <SystemHeartbeat collapsed />
            <OfflineNavIndicator />
            <ActivityDot collapsed />

            {/* Action Bar - rail mode */}
            <ActionBar
              navFilter={navFilter}
              collapsed
              archetype={archetype}
              tenantPresence={tenantPresence}
              showAllFeatures={showAllNav}
              bypassProgressiveDisclosure={isAdmin || isPrivileged}
              tenantId={tenantId}
              userId={userId}
            />

            <div className="w-6 border-t border-stone-800 my-1.5" />

            {/* Nav Groups - rail flyouts */}
            {filteredGroupEntries.map(({ group }) => (
              <RailFlyout
                key={group.id}
                group={group}
                pathname={pathname}
                searchParams={searchParams}
              />
            ))}

            <div className="w-6 border-t border-stone-800 my-1.5" />

            {/* Community - rail icon */}
            {showCommunityRailLink && (
              <Link
                href="/network"
                title="Community"
                aria-label="Community"
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                  networkRailActive
                    ? 'text-brand-400'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-400'
                }`}
                style={networkRailActive ? { background: 'rgba(79, 70, 229, 0.08)' } : undefined}
              >
                <Rss className="w-[18px] h-[18px]" />
              </Link>
            )}

            <div className="w-6 border-t border-stone-800 my-1.5" />

            {/* All Features */}
            <Link
              href="/features"
              title="All Features"
              aria-label="All Features"
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                pathname.startsWith('/features')
                  ? 'bg-brand-950 text-brand-600'
                  : 'text-stone-500 hover:bg-stone-800 hover:text-stone-300'
              }`}
            >
              <Compass className="w-[18px] h-[18px]" />
            </Link>

            {/* Settings (filter /features - rendered separately above) */}
            {visibleBottomItems
              .filter((item) => item.href !== '/features')
              .map((item) => {
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
          </div>
        ) : (
          /* EXPANDED MODE */
          <div className="px-3 space-y-1">
            <NavFilterInput value={navFilter} onChange={setNavFilter} />

            {/* ─── Action Bar (daily-driver shortcuts + Create) ─── */}
            <ActionBar
              navFilter={navFilter}
              archetype={archetype}
              tenantPresence={tenantPresence}
              showAllFeatures={showAllNav}
              bypassProgressiveDisclosure={isAdmin || isPrivileged}
              tenantId={tenantId}
              userId={userId}
            />

            {/* ─── Nav Groups (always visible, collapse individually) ─── */}
            {filteredGroupEntries.length > 0 && (
              <>
                <div className="mx-0 my-1 border-t border-stone-700/40" />
                <div className="space-y-0.5">
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
                      tenantId={tenantId}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Show/hide advanced nav groups toggle */}
            {hasHiddenGroups && (
              <button
                type="button"
                aria-pressed={showAllNav}
                onClick={() => {
                  setShowAllNav((prev) => {
                    const next = !prev
                    try {
                      localStorage.setItem(SHOW_ALL_NAV_STORAGE_KEY, String(next))
                    } catch {
                      /* ignore */
                    }
                    return next
                  })
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-300 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                {showAllNav ? 'Simplify menu' : 'Show all features'}
              </button>
            )}

            <RecentPagesSection />

            <div className="divider-brand h-px my-2 mx-3 opacity-40" />

            {/* Settings */}
            {(() => {
              const featuresActive = isItemActive(pathname, '/features', searchParams)
              return (
                <Link
                  href="/features"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    featuresActive
                      ? 'bg-brand-950 text-brand-400 nav-active-glow'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
                  }`}
                >
                  <Compass
                    className={`w-[18px] h-[18px] flex-shrink-0 ${featuresActive ? 'text-brand-600' : 'text-stone-500'}`}
                  />
                  All Features
                </Link>
              )
            })()}

            {(() => {
              const settingsActive = isItemActive(pathname, '/settings', searchParams)
              return (
                <Link
                  href="/settings"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    settingsActive
                      ? 'bg-brand-950 text-brand-400 nav-active-glow'
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
          </div>
        )}
      </nav>

      <div className={`border-t border-stone-800/50 ${effectiveCollapsed ? 'p-1.5' : 'p-3'}`}>
        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          aria-label={collapsed ? 'Sign Out' : undefined}
          className={`flex items-center rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors ${
            effectiveCollapsed ? 'mx-auto h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2'
          }`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!effectiveCollapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}
