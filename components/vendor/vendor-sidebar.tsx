'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Package,
  User,
  LogOut,
} from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth/actions'

const NAV_ITEMS = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/orders', label: 'Purchase Orders', icon: ClipboardList },
  { href: '/vendor/invoices', label: 'Invoices', icon: FileText },
  { href: '/vendor/catalog', label: 'Catalog', icon: Package },
  { href: '/vendor/profile', label: 'Profile', icon: User },
]

export function VendorSidebar({ vendorName }: { vendorName: string }) {
  const rawPathname = usePathname()
  const pathname = rawPathname ?? ''

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('[sign-out]', error)
    }
    window.location.href = '/auth/signin?portal=vendor'
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-stone-700 bg-stone-900 min-h-screen">
      <div className="px-4 py-5 border-b border-stone-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-0.5">
          Vendor Portal
        </p>
        <p className="text-sm font-semibold text-stone-100 truncate">{vendorName}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-stone-950 text-white'
                  : 'text-stone-400 hover:bg-stone-700 hover:text-stone-100'
              )}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-stone-800">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-700 hover:text-stone-100 transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
