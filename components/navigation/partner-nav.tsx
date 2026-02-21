'use client'

// Partner Portal Navigation — minimal sidebar for the showcase portal.
// Partners are a small, proud group. This nav is intentionally simple.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MapPin, CalendarDays, User, Eye, LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth/actions'

const NAV_ITEMS = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/locations', label: 'My Locations', icon: MapPin },
  { href: '/partner/events', label: 'Events', icon: CalendarDays },
  { href: '/partner/profile', label: 'My Profile', icon: User },
  { href: '/partner/preview', label: 'Preview Page', icon: Eye },
]

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
}) {
  const rawPathname = usePathname()
  const pathname = rawPathname ?? ''
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-stone-900 text-white'
          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      {label}
    </Link>
  )
}

export function PartnerSidebar({ partnerName }: { partnerName: string }) {
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-stone-200 bg-white min-h-screen">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-stone-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-0.5">
          Partner Portal
        </p>
        <p className="text-sm font-semibold text-stone-900 truncate">{partnerName}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-stone-100">
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export function PartnerMobileNav() {
  const rawPathname = usePathname()
  const pathname = rawPathname ?? ''

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 flex">
      {NAV_ITEMS.slice(0, 4).map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-stone-900' : 'text-stone-400'
            }`}
          >
            <Icon size={18} />
            {label.split(' ')[0]}
          </Link>
        )
      })}
    </nav>
  )
}
