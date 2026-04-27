'use client'

// Admin Portal Sidebar - standalone nav separate from the chef sidebar
// Renders from admin-nav-config.ts (the single source of truth for admin nav).
// Dark theme to distinguish from chef portal.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, LogOut } from '@/components/ui/icons'
import { signOut } from '@/lib/auth/actions'
import {
  adminPrimaryLinks,
  adminNavGroups,
  adminBottomLinks,
} from '@/components/navigation/admin-nav-config'
import type { AdminNavItem } from '@/components/navigation/admin-nav-config'

function NavLink({ item }: { item: AdminNavItem }) {
  const pathname = usePathname()
  const isActive =
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-stone-900/15 text-white'
          : 'text-slate-300 hover:bg-stone-800/10 hover:text-white'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  return (
    <div className="fixed inset-y-0 left-0 w-52 bg-slate-900 border-r border-slate-700 flex flex-col z-40">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-orange-400" />
          <span className="text-white font-semibold text-sm">Admin Panel</span>
        </div>
        <p className="text-slate-400 text-xs truncate">{adminEmail}</p>
      </div>

      {/* Primary links */}
      <div className="px-3 pt-4 pb-2 space-y-1">
        {adminPrimaryLinks.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* Grouped nav sections */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
        {adminNavGroups.map((group) => (
          <div key={group.id}>
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="px-3 py-2 border-t border-slate-700 space-y-0.5">
        {adminBottomLinks.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-slate-700">
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
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-stone-800/10 hover:text-white transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
