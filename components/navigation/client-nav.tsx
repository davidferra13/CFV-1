// Client Portal Navigation — Clean top nav
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import { useState } from 'react'
import { Calendar, FileText, LogOut, Menu, X } from 'lucide-react'

interface ClientNavProps {
  userEmail: string
}

const navItems = [
  { href: '/my-events', label: 'My Events', icon: Calendar },
  { href: '/my-quotes', label: 'My Quotes', icon: FileText },
]

export function ClientNav({ userEmail }: ClientNavProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Nav */}
          <div className="flex items-center">
            <Link href="/my-events" className="flex items-center gap-2 mr-8">
              <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">CF</span>
              </div>
              <span className="text-lg font-semibold text-stone-900">ChefFlow</span>
            </Link>
            <div className="hidden md:flex md:space-x-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-stone-400'}`} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Desktop User Info and Sign Out */}
          <div className="hidden md:flex md:items-center md:gap-3">
            <span className="text-sm text-stone-500">{userEmail}</span>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-400 hover:bg-stone-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-100">
          <div className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-brand-600' : 'text-stone-400'}`} />
                  {item.label}
                </Link>
              )
            })}
          </div>
          <div className="px-3 pb-3 pt-2 border-t border-stone-100">
            <div className="px-3 py-1 text-sm text-stone-400">{userEmail}</div>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
