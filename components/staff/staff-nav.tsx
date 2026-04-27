// Staff Portal Navigation - Top bar with links to staff pages
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { StaffNotificationBell } from '@/components/staff/staff-notification-bell'

type Props = {
  staffName: string
  staffEmail: string
  notificationCount: number
}

const navLinks = [
  { href: '/staff-dashboard', label: 'Dashboard' },
  { href: '/staff-tasks', label: 'Tasks' },
  { href: '/staff-time', label: 'Time' },
  { href: '/staff-station', label: 'Station' },
  { href: '/staff-recipes', label: 'Recipes' },
  { href: '/staff-schedule', label: 'Schedule' },
  { href: '/staff-profile', label: 'My Profile' },
]

export function StaffNav({ staffName, staffEmail, notificationCount }: Props) {
  const pathname = usePathname() ?? ''
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      window.location.href = '/staff-login'
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <nav className="bg-stone-900 border-b border-stone-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Brand + Links */}
          <div className="flex items-center gap-6">
            <Link href="/staff-dashboard" className="text-brand-500 font-bold text-lg">
              ChefFlow
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-stone-700 text-stone-100'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right side: bell + name + sign out */}
          <div className="hidden sm:flex items-center gap-4">
            <StaffNotificationBell totalCount={notificationCount} />
            <div className="text-right">
              <div className="text-sm font-medium text-stone-200">{staffName}</div>
              <div className="text-xs text-stone-500">{staffEmail}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} loading={signingOut}>
              Sign Out
            </Button>
          </div>

          {/* Mobile: bell + hamburger */}
          <div className="flex items-center gap-1 sm:hidden">
            <StaffNotificationBell totalCount={notificationCount} />
            <button
              className="text-stone-400 hover:text-stone-200 p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-stone-700 py-2 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-stone-700 text-stone-100'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <Link
              href="/staff-notifications"
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 text-sm font-medium rounded-md ${
                pathname === '/staff-notifications'
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              Notifications
            </Link>
            <div className="border-t border-stone-700 pt-2 mt-2 px-3">
              <div className="text-sm text-stone-300">{staffName}</div>
              <div className="text-xs text-stone-500 mb-2">{staffEmail}</div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} loading={signingOut}>
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
