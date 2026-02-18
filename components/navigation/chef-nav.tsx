// Chef Portal Navigation — Collapsible sidebar with grouped nav + rail mode
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import {
  LayoutDashboard,
  Inbox,
  FileText,
  UtensilsCrossed,
  Users,
  BookOpen,
  CookingPot,
  DollarSign,
  Receipt,
  Upload,
  ClipboardCheck,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gift,
  ListChecks,
  MessageCircle,
  Handshake,
  Home,
  Globe,
  Building2,
  BarChart3,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────
type NavItem = { href: string; label: string; icon: LucideIcon }
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] }

// ─── Navigation Config ──────────────────────────────
const standaloneTop: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/schedule', label: 'Calendar', icon: CalendarDays },
  { href: '/queue', label: 'Queue', icon: ListChecks },
  { href: '/network', label: 'Network', icon: Handshake },
]

const navGroups: NavGroup[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: Inbox,
    items: [
      { href: '/leads', label: 'Leads', icon: Globe },
      { href: '/partners', label: 'Partners', icon: Building2 },
      { href: '/inquiries', label: 'Inquiries', icon: Inbox },
      { href: '/quotes', label: 'Quotes', icon: FileText },
      { href: '/events', label: 'Events', icon: UtensilsCrossed },
    ],
  },
  {
    id: 'culinary',
    label: 'Culinary',
    icon: CookingPot,
    items: [
      { href: '/menus', label: 'Menus', icon: BookOpen },
      { href: '/recipes', label: 'Recipes', icon: CookingPot },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    items: [
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/loyalty', label: 'Loyalty', icon: Gift },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    items: [
      { href: '/financials', label: 'Financials', icon: DollarSign },
      { href: '/expenses', label: 'Expenses', icon: Receipt },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: ClipboardCheck,
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/aar', label: 'Reviews', icon: ClipboardCheck },
      { href: '/import', label: 'Import', icon: Upload },
    ],
  },
]

const standaloneBottom: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

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
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

function isGroupActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => isItemActive(pathname, item.href))
}

// ─── Flyout for rail mode ───────────────────────────
function RailFlyout({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false)
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
            ? 'bg-brand-50 text-brand-600'
            : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
        }`}
      >
        <GroupIcon className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 z-50 min-w-[180px] bg-white rounded-lg shadow-lg border border-stone-200 py-1.5">
          <p className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon
            const itemActive = isItemActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors ${
                  itemActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`} />
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
}: {
  group: NavGroup
  pathname: string
  isOpen: boolean
  onToggle: () => void
}) {
  const GroupIcon = group.icon
  const active = isGroupActive(pathname, group)

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active && !isOpen
            ? 'text-brand-700'
            : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
        }`}
      >
        <GroupIcon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="ml-3 pl-3 border-l border-stone-100 mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon
            const itemActive = isItemActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  itemActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`} />
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
export function ChefSidebar() {
  const pathname = usePathname()
  const { collapsed, setCollapsed } = useSidebar()
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  // Auto-expand group containing active route
  useEffect(() => {
    for (const group of navGroups) {
      if (isGroupActive(pathname, group)) {
        setOpenGroups((prev) => {
          if (prev.has(group.id)) return prev
          const next = new Set(prev)
          next.add(group.id)
          return next
        })
      }
    }
  }, [pathname])

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-stone-200 transition-all duration-200 z-30 ${
        collapsed ? 'lg:w-16' : 'lg:w-60'
      }`}
    >
      {/* Logo + notification bell + collapse toggle */}
      <div className={`flex items-center h-16 border-b border-stone-100 ${collapsed ? 'px-3 justify-center' : 'px-4 justify-between'}`}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">CF</span>
          </div>
          {!collapsed && <span className="text-lg font-semibold text-stone-900">ChefFlow</span>}
        </Link>
        {!collapsed ? (
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
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
              className="flex items-center justify-center w-10 h-10 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors mb-1"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Notification bell */}
            <NotificationBell collapsed />

            {/* Dashboard */}
            {standaloneTop.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </Link>
              )
            })}

            <div className="w-6 border-t border-stone-100 my-1.5" />

            {/* Groups as flyouts */}
            {navGroups.map((group) => (
              <RailFlyout key={group.id} group={group} pathname={pathname} />
            ))}

            <div className="w-6 border-t border-stone-100 my-1.5" />

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
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
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
            {standaloneTop.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`} />
                  {item.label}
                </Link>
              )
            })}

            <div className="border-t border-stone-100 my-2" />

            {/* Grouped nav */}
            {navGroups.map((group) => (
              <NavGroupSection
                key={group.id}
                group={group}
                pathname={pathname}
                isOpen={openGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}

            <div className="border-t border-stone-100 my-2" />

            {/* Settings */}
            {standaloneBottom.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom — Sign Out */}
      <div className={`border-t border-stone-100 ${collapsed ? 'p-1.5' : 'p-3'}`}>
        <button
          type="button"
          onClick={() => signOut()}
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex items-center rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors ${
            collapsed
              ? 'justify-center w-10 h-10 mx-auto'
              : 'gap-3 w-full px-3 py-2'
          }`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}

// ─── Mobile nav items (bottom tab bar) ──────────────
const mobileTabItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/events', label: 'Events', icon: UtensilsCrossed },
  { href: '/clients', label: 'Clients', icon: Users },
]

// ─── Mobile group section (for slide-out) ───────────
function MobileGroupSection({
  group,
  pathname,
  isOpen,
  onToggle,
  onNavigate,
}: {
  group: NavGroup
  pathname: string
  isOpen: boolean
  onToggle: () => void
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
            ? 'text-brand-700'
            : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
        }`}
      >
        <GroupIcon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="ml-3 pl-3 border-l border-stone-100 mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon
            const itemActive = isItemActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  itemActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${itemActive ? 'text-brand-600' : 'text-stone-400'}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Navigation ──────────────────────────────
export function ChefMobileNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  // Auto-expand group containing active route in mobile menu
  useEffect(() => {
    if (!menuOpen) return
    for (const group of navGroups) {
      if (isGroupActive(pathname, group)) {
        setOpenGroups((prev) => {
          if (prev.has(group.id)) return prev
          const next = new Set(prev)
          next.add(group.id)
          return next
        })
      }
    }
  }, [pathname, menuOpen])

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-stone-200 h-14">
        <div className="flex items-center justify-between h-full px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">CF</span>
            </div>
            <span className="font-semibold text-stone-900">ChefFlow</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-stone-500 hover:bg-stone-100"
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
          <div className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white border-r border-stone-200 shadow-xl">
            <div className="flex items-center justify-between h-14 px-4 border-b border-stone-100">
              <span className="font-semibold text-stone-900">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeMenu}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
              {/* Dashboard */}
              {standaloneTop.map((item) => {
                const Icon = item.icon
                const active = isItemActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : 'text-stone-400'}`} />
                    {item.label}
                  </Link>
                )
              })}

              <div className="border-t border-stone-100 my-2" />

              {/* Grouped nav */}
              <div className="space-y-0.5">
                {navGroups.map((group) => (
                  <MobileGroupSection
                    key={group.id}
                    group={group}
                    pathname={pathname}
                    isOpen={openGroups.has(group.id)}
                    onToggle={() => toggleGroup(group.id)}
                    onNavigate={closeMenu}
                  />
                ))}
              </div>

              <div className="border-t border-stone-100 my-2" />

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
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : 'text-stone-400'}`} />
                    {item.label}
                  </Link>
                )
              })}

              {/* Sign Out */}
              <div className="pt-4 mt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200">
        <div className="flex items-center justify-around h-14">
          {mobileTabItems.map((item) => {
            const active = isItemActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
                  active ? 'text-brand-600' : 'text-stone-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium text-stone-400"
          >
            <Menu className="w-5 h-5" />
            More
          </button>
        </div>
      </nav>
    </>
  )
}
