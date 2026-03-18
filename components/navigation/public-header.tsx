'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from '@/components/ui/icons'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { AppLogo } from '@/components/branding/app-logo'

const NAV_ITEMS = [
  { href: '/chefs', label: 'Chefs' },
  { href: '/discover', label: 'Discover' },
  { href: '/contact', label: 'Contact' },
]

export function PublicHeader() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all ${
        isScrolled
          ? 'border-stone-700 bg-stone-900/90 shadow-sm backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <AppLogo size={36} className="shadow-sm" />
            <span className="text-base font-display tracking-tight text-stone-100">ChefFlow</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href

              return (
                <TrackedLink
                  key={item.href}
                  href={item.href}
                  analyticsName={`header_nav_${item.label.toLowerCase().replace(/\s+/g, '_')}`}
                  analyticsProps={{ section: 'public_header' }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-950 text-brand-400'
                      : 'text-muted-soft hover:bg-stone-700 hover:text-stone-100'
                  }`}
                >
                  {item.label}
                </TrackedLink>
              )
            })}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <TrackedLink
            href="/auth/signin"
            analyticsName="header_signin"
            analyticsProps={{ section: 'public_header' }}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-transparent px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
          >
            Sign In
          </TrackedLink>
          <TrackedLink
            href="/marketplace-chefs"
            analyticsName="header_for_chefs"
            analyticsProps={{ section: 'public_header' }}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
          >
            For food providers
          </TrackedLink>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <TrackedLink
            href="/chefs"
            analyticsName="header_mobile_explore"
            analyticsProps={{ section: 'public_header_mobile' }}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-brand-700/50 bg-brand-950/50 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-200"
          >
            Explore
          </TrackedLink>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-muted-soft hover:bg-stone-700"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-stone-700 bg-stone-900 md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-3 sm:px-6 lg:px-8">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href

              return (
                <TrackedLink
                  key={item.href}
                  href={item.href}
                  analyticsName={`header_mobile_nav_${item.label.toLowerCase().replace(/\s+/g, '_')}`}
                  analyticsProps={{ section: 'public_header_mobile' }}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-brand-950 text-brand-400' : 'text-stone-300 hover:bg-stone-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </TrackedLink>
              )
            })}
          </div>
          <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-4 sm:px-6 lg:px-8">
            <TrackedLink
              href="/auth/signin"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-700 hover:text-stone-100"
              analyticsName="header_mobile_signin"
              analyticsProps={{ section: 'public_header_mobile' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </TrackedLink>
            <TrackedLink
              href="/marketplace-chefs"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
              analyticsName="header_mobile_for_providers"
              analyticsProps={{ section: 'public_header_mobile' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              For food providers
            </TrackedLink>
          </div>
        </div>
      )}
    </header>
  )
}
