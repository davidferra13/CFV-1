// Client Portal Navigation - Chef-style vertical sidebar formatting.
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import {
  Calendar,
  CalendarPlus,
  ClipboardList,
  DollarSign,
  FileText,
  Gift,
  LogOut,
  Menu,
  MessageCircle,
  User,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
} from '@/components/ui/icons'
import { AppLogo } from '@/components/branding/app-logo'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { ClientHubUnreadBadge } from '@/components/hub/client-hub-unread-badge'

interface ClientNavProps {
  userEmail: string
}

const BOOK_NOW_HREF = '/book-now'

const navItems = [
  { href: '/my-events', label: 'My Events', icon: Calendar },
  { href: '/my-inquiries', label: 'My Inquiries', icon: ClipboardList },
  { href: '/my-quotes', label: 'My Quotes', icon: FileText },
  { href: '/my-chat', label: 'Messages', icon: MessageCircle },
  { href: '/my-hub', label: 'My Hub', icon: Users },
  { href: '/my-rewards', label: 'Rewards', icon: Gift },
  { href: '/my-spending', label: 'Spending', icon: DollarSign },
  { href: '/my-profile', label: 'Profile', icon: User },
]

type ClientSidebarContextType = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const ClientSidebarContext = createContext<ClientSidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
})

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function useClientSidebar() {
  return useContext(ClientSidebarContext)
}

export function ClientSidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('client-sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  const handleSetCollapsed = useCallback((v: boolean) => {
    setCollapsed(v)
    localStorage.setItem('client-sidebar-collapsed', String(v))
  }, [])

  if (!mounted) {
    return (
      <ClientSidebarContext.Provider value={{ collapsed: false, setCollapsed: handleSetCollapsed }}>
        {children}
      </ClientSidebarContext.Provider>
    )
  }

  return (
    <ClientSidebarContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed }}>
      {children}
    </ClientSidebarContext.Provider>
  )
}

export function ClientSidebar({ userEmail }: ClientNavProps) {
  const pathname = usePathname() ?? ''
  const { collapsed, setCollapsed } = useClientSidebar()

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-stone-900 border-r border-stone-700 transition-all duration-200 z-30 ${
        collapsed ? 'lg:w-16' : 'lg:w-60'
      }`}
    >
      <div
        className={`flex items-center h-16 border-b border-stone-800 ${collapsed ? 'px-3 justify-center' : 'px-4 justify-between'}`}
      >
        <Link href="/my-events" className="flex items-center gap-2">
          <AppLogo />
          {!collapsed && <span className="text-lg font-display text-stone-100">ChefFlow</span>}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex items-center justify-center w-11 h-11 rounded-lg text-stone-400 hover:bg-stone-700 hover:text-stone-400 transition-colors touch-manipulation"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 px-1">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-stone-400 hover:bg-stone-700 hover:text-stone-400 transition-colors mb-1"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Link
              href={BOOK_NOW_HREF}
              title="Book Now"
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                isItemActive(pathname, BOOK_NOW_HREF)
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-950 text-brand-400 hover:bg-brand-900'
              }`}
            >
              <CalendarPlus className="w-[18px] h-[18px]" />
            </Link>
            <div className="w-6 border-t border-stone-800 my-1.5" />
            {navItems.map((item) => {
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
          <div className="px-3 space-y-1">
            <Link
              href={BOOK_NOW_HREF}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isItemActive(pathname, BOOK_NOW_HREF)
                  ? 'bg-brand-700 text-white'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              <CalendarPlus className="w-[18px] h-[18px] flex-shrink-0" />
              Book Now
            </Link>
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isItemActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-950 text-brand-400'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-brand-600' : 'text-stone-400'}`}
                  />
                  {item.label}
                  {item.href === '/my-hub' && <ClientHubUnreadBadge />}
                </Link>
              )
            })}

            {/* Cannabis Tier - admin-only feature, hidden from client portal */}
          </div>
        )}
      </nav>

      <div className={`border-t border-stone-800 ${collapsed ? 'p-1.5' : 'p-3'}`}>
        {/* Notification bell */}
        <div className={`mb-1 ${collapsed ? 'flex justify-center' : 'px-2 py-1'}`}>
          <NotificationBell collapsed={collapsed} />
        </div>
        {!collapsed ? (
          <p className="px-3 pb-1 text-xs text-stone-400 truncate">{userEmail}</p>
        ) : null}
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

export function ClientMobileNav({ userEmail }: ClientNavProps) {
  const pathname = usePathname() ?? ''
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-stone-900 border-b border-stone-700 pt-safe">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/my-events" className="flex items-center gap-2">
            <AppLogo size={28} className="rounded-md" />
            <span className="font-display text-stone-100">ChefFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={BOOK_NOW_HREF}
              className="inline-flex items-center min-h-[44px] rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 touch-manipulation"
            >
              Book Now
            </Link>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-11 h-11 rounded-lg text-stone-500 hover:bg-stone-700 touch-manipulation"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

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
                className="flex items-center justify-center w-11 h-11 rounded-lg text-stone-400 hover:bg-stone-700 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
              <Link
                href={BOOK_NOW_HREF}
                onClick={closeMenu}
                className={`mb-3 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isItemActive(pathname, BOOK_NOW_HREF)
                    ? 'bg-brand-700 text-white'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                <CalendarPlus className="w-[18px] h-[18px]" />
                Book Now
              </Link>
              {navItems.map((item) => {
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
                    {item.href === '/my-hub' && <ClientHubUnreadBadge />}
                  </Link>
                )
              })}
              {/* Cannabis Tier - admin-only feature, hidden from client portal */}

              <div className="pt-4 mt-4 border-t border-stone-800">
                <p className="px-3 pb-2 text-xs text-stone-400 truncate">{userEmail}</p>
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

      <nav className="lg:hidden fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-0 right-0 z-40 bg-stone-900 border-b border-stone-700">
        <div className="flex items-center justify-around h-11">
          {navItems.slice(0, 5).map((item) => {
            const active = isItemActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] text-xxs font-medium transition-colors touch-manipulation ${
                  active ? 'text-brand-600' : 'text-stone-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {item.href === '/my-hub' && (
                  <span className="absolute top-0.5 right-1/4">
                    <ClientHubUnreadBadge />
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export function ClientMainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useClientSidebar()

  return (
    <main
      id="main-content"
      className={`pt-mobile-header pb-mobile-nav lg:pt-0 lg:pb-0 transition-all duration-200 ${
        collapsed ? 'lg:pl-16' : 'lg:pl-60'
      }`}
    >
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
    </main>
  )
}
