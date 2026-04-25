'use client'

// Partner Portal Navigation - minimal sidebar for the showcase portal.
// Partners are a small, proud group. This nav is intentionally simple.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  MapPin,
  CalendarDays,
  User,
  Eye,
  LogOut,
  Menu,
  X,
} from '@/components/ui/icons'
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
          : 'text-stone-400 hover:bg-stone-700 hover:text-stone-100'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      {label}
    </Link>
  )
}

export function PartnerSidebar({ partnerName }: { partnerName: string }) {
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('[sign-out]', error)
    }
    window.location.href = '/auth/signin?portal=partner'
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-stone-700 bg-stone-900 min-h-screen">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-stone-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-0.5">
          Partner Portal
        </p>
        <p className="text-sm font-semibold text-stone-100 truncate">{partnerName}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Sign out */}
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

export function PartnerMobileNav() {
  const rawPathname = usePathname()
  const pathname = rawPathname ?? ''
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleSignOut = async () => {
    closeMenu()
    try {
      await signOut()
    } catch (error) {
      console.error('[sign-out]', error)
    }
    window.location.href = '/auth/signin?portal=partner'
  }

  const isMenuActive =
    menuOpen ||
    NAV_ITEMS.slice(4).some(({ href }) => pathname === href || pathname.startsWith(href + '/'))

  return (
    <>
      <nav className="lg:hidden fixed top-0 left-0 right-0 bg-stone-900 border-b border-stone-700 z-40 flex pt-safe">
        {NAV_ITEMS.slice(0, 4).map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xxs font-medium transition-colors ${
                isActive ? 'text-stone-100' : 'text-stone-400'
              }`}
            >
              <Icon size={18} />
              {label.split(' ')[0]}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xxs font-medium transition-colors ${
            isMenuActive ? 'text-stone-100' : 'text-stone-400'
          }`}
          aria-label={menuOpen ? 'Close partner menu' : 'Open partner menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
          Menu
        </button>
      </nav>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-stone-900 border-r border-stone-800 shadow-xl">
            <div className="flex h-14 items-center justify-between px-4 border-b border-stone-800">
              <span className="text-sm font-semibold text-stone-100">Partner Menu</span>
              <button
                type="button"
                onClick={closeMenu}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-100 touch-manipulation"
                aria-label="Close partner menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-stone-950 text-stone-100'
                        : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </nav>

            <div className="px-3 py-4 border-t border-stone-800">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-100"
              >
                <LogOut size={18} className="shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
