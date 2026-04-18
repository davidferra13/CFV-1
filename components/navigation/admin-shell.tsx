// Admin Shell - admin-owned sidebar, mobile nav, and main content
// Renders admin routes through admin navigation, NOT chef navigation.
// Visual structure mirrors the chef shell for consistency,
// but ownership and navigation config are admin-specific.
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, createContext, useContext, useCallback, memo } from 'react'
import { signOut } from '@/lib/auth/actions'
import { adminPrimaryLinks, adminNavGroups, adminBottomLinks } from './admin-nav-config'
import type { AdminNavItem, AdminNavGroup } from './admin-nav-config'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { OllamaStatusBadge } from '@/components/dashboard/ollama-status-badge'
import { AppLogo } from '@/components/branding/app-logo'
import { BreadcrumbBar } from '@/components/navigation/breadcrumb-bar'
import { LogOut, ChevronLeft, ChevronRight, ChevronDown, Menu, X } from '@/components/ui/icons'

// ── Admin Sidebar Context ─────────────────────────────────────────────────

type AdminSidebarContextType = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const AdminSidebarContext = createContext<AdminSidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
})

export function useAdminSidebar() {
  return useContext(AdminSidebarContext)
}

export function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <AdminSidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </AdminSidebarContext.Provider>
  )
}

// ── Admin Sidebar ─────────────────────────────────────────────────────────

function AdminNavLink({
  item,
  collapsed,
  isActive,
}: {
  item: AdminNavItem
  collapsed: boolean
  isActive: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-white/10 text-white font-medium'
          : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'
      }`}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

const AdminNavGroupSection = memo(function AdminNavGroupSection({
  group,
  collapsed,
  pathname,
  isOpen,
  onToggle,
}: {
  group: AdminNavGroup
  collapsed: boolean
  pathname: string
  isOpen: boolean
  onToggle: () => void
}) {
  const hasActiveItem = group.items.some((item) => pathname.startsWith(item.href))

  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
          hasActiveItem ? 'text-stone-200' : 'text-stone-500 hover:text-stone-300'
        }`}
      >
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{group.label}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          </>
        )}
        type="button"
        {collapsed && <span className="mx-auto h-px w-4 bg-stone-700" />}
      </button>
      {(isOpen || collapsed) && (
        <div className={collapsed ? 'space-y-1' : 'ml-1 space-y-0.5'}>
          {group.items.map((item) => (
            <AdminNavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export function AdminSidebar({ userId }: { userId: string }) {
  const pathname = usePathname() ?? ''
  const { collapsed, setCollapsed } = useAdminSidebar()
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(['platform', 'operations', 'finance-compliance', 'system'])
  )

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col border-r border-stone-800 bg-stone-900 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-stone-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <AppLogo className="h-6 w-6" />
            <span className="text-sm font-semibold text-amber-400">Admin</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-stone-500 hover:bg-white/5 hover:text-stone-300"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-800">
        <OllamaStatusBadge />
        <NotificationBell />
      </div>

      {/* Primary links */}
      <div className="px-2 py-2 space-y-0.5">
        {adminPrimaryLinks.map((item) => (
          <AdminNavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            }
          />
        ))}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-stone-800" />

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {adminNavGroups.map((group) => (
          <AdminNavGroupSection
            key={group.id}
            group={group}
            collapsed={collapsed}
            pathname={pathname}
            isOpen={openGroups.has(group.id)}
            onToggle={() => toggleGroup(group.id)}
          />
        ))}
      </nav>

      {/* Bottom links */}
      <div className="border-t border-stone-800 px-2 py-2 space-y-0.5">
        {adminBottomLinks.map((item) => (
          <AdminNavLink key={item.href} item={item} collapsed={collapsed} isActive={false} />
        ))}
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-400 hover:bg-white/5 hover:text-stone-200 transition-colors"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}

// ── Admin Mobile Nav ──────────────────────────────────────────────────────

export function AdminMobileNav({ userId }: { userId: string }) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-stone-800 bg-stone-900 px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <AppLogo className="h-6 w-6" />
          <span className="text-sm font-semibold text-amber-400">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="rounded-md p-1.5 text-stone-400 hover:text-stone-200"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Slide-out menu */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-stone-900 border-r border-stone-800 overflow-y-auto">
            <div className="flex h-14 items-center justify-between px-4 border-b border-stone-800">
              <span className="text-sm font-semibold text-amber-400">Admin Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-stone-400 hover:text-stone-200"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-2 py-3 space-y-1">
              {adminPrimaryLinks.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      isActive
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              <div className="mx-2 my-2 border-t border-stone-800" />
              {adminNavGroups.map((group) => (
                <div key={group.id} className="space-y-0.5">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          isActive
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))}
              <div className="mx-2 my-2 border-t border-stone-800" />
              {adminBottomLinks.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-400 hover:bg-white/5 hover:text-stone-200"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

// ── Admin Main Content ────────────────────────────────────────────────────

export function AdminMainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useAdminSidebar()
  const pathname = usePathname()

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`pt-14 lg:pt-0 transition-all duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}`}
    >
      <BreadcrumbBar />
      <div
        key={pathname}
        className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-slide-up"
      >
        {children}
      </div>
    </main>
  )
}
