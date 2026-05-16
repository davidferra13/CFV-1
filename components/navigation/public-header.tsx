'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, X } from '@/components/ui/icons'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { AppLogo } from '@/components/branding/app-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { signOut } from '@/lib/auth/actions'

import { PUBLIC_PRIMARY_CONSUMER_CTA } from '@/lib/public/public-surface-config'
import {
  PUBLIC_NAV,
  isGroup,
  isPublicNavActive,
  isPublicGroupActive,
  type PublicNavGroup,
  type PublicNavItem,
} from './public-nav-config'

// ---------------------------------------------------------------------------
// Dropdown menu for nav groups
// ---------------------------------------------------------------------------

function NavDropdown({ group, pathname }: { group: PublicNavGroup; pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const groupActive = isPublicGroupActive(pathname, group)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          groupActive
            ? 'bg-brand-950 text-brand-400'
            : 'text-stone-400 hover:bg-[#2a1a10]/60 hover:text-stone-200'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {group.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-float mt-1 min-w-[180px] rounded-xl border border-[#4a3020]/40 bg-[#1a110c]/95 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          {group.items.map((item) => {
            const active = isPublicNavActive(pathname, item.href)
            return (
              <TrackedLink
                key={item.href}
                href={item.href}
                analyticsName={`header_dropdown_${item.label.toLowerCase().replace(/\s+/g, '_')}`}
                analyticsProps={{ section: 'public_header', group: group.label }}
                className={`block px-4 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-brand-950/60 text-brand-400'
                    : 'text-stone-300 hover:bg-[#2a1a10]/60 hover:text-stone-100'
                }`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </TrackedLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Auth user avatar + dropdown
// ---------------------------------------------------------------------------

interface PublicHeaderUser {
  role: string
  portalHref: string
  label: string
  name?: string | null
  email?: string | null
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

function AuthUserDropdown({ user }: { user: PublicHeaderUser }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = getInitials(user.name, user.email)
  const displayName = user.name || user.email || 'My Account'

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <TrackedLink
        href={user.portalHref}
        analyticsName="header_my_portal"
        analyticsProps={{ section: 'public_header', role: user.role }}
        className="inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-semibold text-white glow-hover"
      >
        {user.label}
      </TrackedLink>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800/70 text-xs font-bold text-brand-100 ring-2 ring-brand-600/40 transition-all hover:bg-brand-700 hover:ring-brand-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label="Account menu"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-float mt-2 min-w-[200px] rounded-xl border border-[#4a3020]/40 bg-[#1a110c]/95 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="border-b border-[#4a3020]/30 px-4 py-2.5">
            <p className="text-sm font-medium text-stone-100 truncate">{displayName}</p>
            {user.email && user.name && (
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
            )}
          </div>
          <TrackedLink
            href={user.portalHref}
            analyticsName="header_dropdown_portal"
            analyticsProps={{ section: 'public_header', role: user.role }}
            className="block px-4 py-2 text-sm text-stone-300 transition-colors hover:bg-[#2a1a10]/60 hover:text-stone-100"
            onClick={() => setOpen(false)}
          >
            {user.label}
          </TrackedLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-left text-sm text-stone-400 transition-colors hover:bg-[#2a1a10]/60 hover:text-stone-200"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function PublicHeader({ user }: { user?: PublicHeaderUser | null }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const solidChrome = isScrolled || mobileMenuOpen

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <header
      className={`sticky top-0 z-chrome border-b transition-all duration-300 ${
        solidChrome
          ? 'border-stone-700/70 bg-stone-950/88 shadow-[0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:border-[#4a3020]/40 dark:bg-[#1a110c]/85 dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
          : 'border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <AppLogo size={36} className="shadow-sm" />
            <span
              className={`text-base font-display tracking-tight ${
                solidChrome ? 'text-stone-100' : 'text-white'
              }`}
            >
              ChefFlow
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {PUBLIC_NAV.map((entry) => {
              if (isGroup(entry)) {
                return <NavDropdown key={entry.label} group={entry} pathname={pathname} />
              }
              const item = entry as PublicNavItem
              const active = isPublicNavActive(pathname, item.href)
              return (
                <TrackedLink
                  key={item.href}
                  href={item.href}
                  analyticsName={`header_nav_${item.label.toLowerCase().replace(/\s+/g, '_')}`}
                  analyticsProps={{ section: 'public_header' }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-950 text-brand-400'
                      : 'text-stone-400 hover:bg-[#2a1a10]/60 hover:text-stone-200'
                  }`}
                >
                  {item.label}
                </TrackedLink>
              )
            })}
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle
            className="h-10 w-10 rounded-lg text-stone-300 hover:bg-[#2a1a10]/50 hover:text-stone-100 dark:text-stone-300"
            dataTestId="public-theme-toggle"
          />
          {user ? (
            <AuthUserDropdown user={user} />
          ) : (
            <>
              <TrackedLink
                href="/auth/signin"
                analyticsName="header_signin"
                analyticsProps={{ section: 'public_header' }}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-transparent px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-[#2a1a10]/50 hover:text-stone-100"
              >
                Sign In
              </TrackedLink>
              <TrackedLink
                href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
                analyticsName="header_book_a_chef"
                analyticsProps={{ section: 'public_header' }}
                className="inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-semibold text-white glow-hover"
              >
                {PUBLIC_PRIMARY_CONSUMER_CTA.label}
              </TrackedLink>
            </>
          )}
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle
            className="h-10 w-10 rounded-xl text-stone-300 hover:bg-[#2a1a10]/50 hover:text-stone-100"
            dataTestId="public-mobile-theme-toggle"
          />
          <TrackedLink
            href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
            analyticsName="header_mobile_book_a_chef_quick"
            analyticsProps={{ section: 'public_header_mobile' }}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-brand-700/50 bg-brand-950/50 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-200 touch-manipulation"
          >
            Book
          </TrackedLink>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-300 hover:bg-[#2a1a10]/50 hover:text-stone-100 touch-manipulation"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#4a3020]/30 bg-[#1a110c]/95 backdrop-blur-2xl md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-3 sm:px-6 lg:px-8">
            {PUBLIC_NAV.map((entry) => {
              if (isGroup(entry)) {
                return (
                  <div key={entry.label}>
                    <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                      {entry.label}
                    </p>
                    {entry.items.map((item) => {
                      const active = isPublicNavActive(pathname, item.href)
                      return (
                        <TrackedLink
                          key={item.href}
                          href={item.href}
                          analyticsName={`header_mobile_nav_${item.label.toLowerCase().replace(/\s+/g, '_')}`}
                          analyticsProps={{ section: 'public_header_mobile', group: entry.label }}
                          className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                            active
                              ? 'bg-brand-950 text-brand-400'
                              : 'text-stone-300 hover:bg-[#2a1a10]/60'
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {item.label}
                        </TrackedLink>
                      )
                    })}
                  </div>
                )
              }
              const item = entry as PublicNavItem
              const active = isPublicNavActive(pathname, item.href)
              return (
                <TrackedLink
                  key={item.href}
                  href={item.href}
                  analyticsName={`header_mobile_nav_${item.label.toLowerCase().replace(/\s+/g, '_')}`}
                  analyticsProps={{ section: 'public_header_mobile' }}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? 'bg-brand-950 text-brand-400' : 'text-stone-300 hover:bg-[#2a1a10]/60'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </TrackedLink>
              )
            })}
          </div>
          <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-4 sm:px-6 lg:px-8">
            {user ? (
              <>
                <TrackedLink
                  href={user.portalHref}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg gradient-accent px-3 text-sm font-semibold text-white"
                  analyticsName="header_mobile_my_portal"
                  analyticsProps={{ section: 'public_header_mobile', role: user.role }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {user.label}
                </TrackedLink>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false)
                    try {
                      await signOut()
                    } catch {
                      /* ignore */
                    }
                    window.location.href = '/'
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#4a3020]/40 bg-[#1a110c] px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-[#2a1a10]/60 hover:text-stone-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <TrackedLink
                  href="/auth/signin"
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-[#4a3020]/40 bg-[#1a110c] px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-[#2a1a10]/60 hover:text-stone-100"
                  analyticsName="header_mobile_signin"
                  analyticsProps={{ section: 'public_header_mobile' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </TrackedLink>
                <TrackedLink
                  href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg gradient-accent px-3 text-sm font-semibold text-white"
                  analyticsName="header_mobile_book_a_chef"
                  analyticsProps={{ section: 'public_header_mobile' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {PUBLIC_PRIMARY_CONSUMER_CTA.label}
                </TrackedLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
