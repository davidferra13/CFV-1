// Chef Portal Navigation
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

export function ChefNav() {
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
  }

  const navItems = [
    { href: '/chef/dashboard', label: 'Dashboard' },
    { href: '/chef/events', label: 'Events' },
    { href: '/chef/clients', label: 'Clients' },
    { href: '/chef/menus', label: 'Menus' },
    { href: '/chef/financials', label: 'Financials' }
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/chef/dashboard" className="text-xl font-bold text-gray-900">
                ChefFlow
              </Link>
            </div>
            <div className="ml-6 flex space-x-8">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
