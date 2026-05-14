'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, FileText, Package, User } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/vendor/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/vendor/orders', label: 'Orders', icon: ClipboardList },
  { href: '/vendor/invoices', label: 'Invoices', icon: FileText },
  { href: '/vendor/catalog', label: 'Catalog', icon: Package },
  { href: '/vendor/profile', label: 'Profile', icon: User },
]

export function VendorMobileNav() {
  const rawPathname = usePathname()
  const pathname = rawPathname ?? ''

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-700 z-mobile-header flex pb-safe">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-xxs font-medium transition-colors',
              isActive ? 'text-stone-100' : 'text-stone-400'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
