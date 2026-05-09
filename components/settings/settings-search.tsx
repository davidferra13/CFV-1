'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from '@/components/ui/icons'
import { SETTINGS_NAV } from '@/lib/settings/settings-nav'
import type { SettingsNavItem } from '@/lib/settings/settings-nav'

const SETTINGS_SEARCH_SHORTCUTS: { terms: string[]; label: string; href: string }[] = [
  { terms: ['password', 'change password'], label: 'Change Password', href: '/settings/account' },
  { terms: ['email', 'change email'], label: 'Email Settings', href: '/settings/account' },
  {
    terms: ['delete account', 'remove account'],
    label: 'Delete Account',
    href: '/settings/delete-account',
  },
  {
    terms: ['stripe', 'payouts', 'connect stripe'],
    label: 'Stripe Payouts',
    href: '/settings/stripe-connect',
  },
  {
    terms: ['notifications', 'alerts', 'email alerts'],
    label: 'Notification Preferences',
    href: '/settings/notifications',
  },
  {
    terms: ['google', 'gmail', 'calendar sync'],
    label: 'Google Integrations',
    href: '/settings/connections',
  },
  {
    terms: ['theme', 'dark mode', 'light mode'],
    label: 'Appearance',
    href: '/settings/appearance',
  },
  { terms: ['api key', 'api keys', 'developer'], label: 'API Keys', href: '/settings/api-keys' },
  { terms: ['webhook', 'webhooks'], label: 'Webhooks', href: '/settings/webhooks' },
  { terms: ['remy', 'ai assistant'], label: 'Remy Control Center', href: '/settings/remy' },
  { terms: ['booking', 'booking page'], label: 'Booking Page', href: '/settings/scheduling' },
  { terms: ['branding', 'logo', 'brand'], label: 'Branding', href: '/settings/profile-branding' },
  { terms: ['security', '2fa', 'two factor'], label: 'Security', href: '/settings/security' },
  { terms: ['billing', 'subscription', 'plan'], label: 'Billing', href: '/settings/payments' },
  { terms: ['privacy', 'gdpr', 'data export'], label: 'Privacy & Data', href: '/settings/ai' },
  { terms: ['contract', 'contracts'], label: 'Contract Templates', href: '/settings/contracts' },
  { terms: ['insurance', 'certifications'], label: 'Protection Hub', href: '/settings/protection' },
]

type SearchResult = {
  label: string
  description: string
  href: string
}

function getAllNavItems(): SettingsNavItem[] {
  const items: SettingsNavItem[] = []
  for (const group of SETTINGS_NAV) {
    for (const item of group.items) {
      items.push(item)
    }
  }
  return items
}

function searchSettings(query: string): SearchResult[] {
  if (!query.trim()) return []

  const lower = query.toLowerCase()
  const results: SearchResult[] = []
  const seen = new Set<string>()

  // Search nav items
  const navItems = getAllNavItems()
  for (const item of navItems) {
    const haystack = `${item.label} ${item.description}`.toLowerCase()
    if (haystack.includes(lower)) {
      const key = `${item.label}::${item.href}`
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          label: item.label,
          description: item.description,
          href: item.href,
        })
      }
    }
  }

  // Search shortcuts
  for (const shortcut of SETTINGS_SEARCH_SHORTCUTS) {
    const matched = shortcut.terms.some((term) => term.includes(lower) || lower.includes(term))
    if (matched) {
      const key = `${shortcut.label}::${shortcut.href}`
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          label: shortcut.label,
          description: '',
          href: shortcut.href,
        })
      }
    }
  }

  return results.slice(0, 8)
}

export function SettingsSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    const found = searchSettings(value)
    setResults(found)
    setIsOpen(found.length > 0)
  }, [])

  const handleSelect = useCallback(
    (href: string) => {
      setIsOpen(false)
      setQuery('')
      setResults([])
      router.push(href)
    },
    [router]
  )

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder="Search settings..."
          className="w-full pl-9 pr-3 py-2 bg-stone-800/50 border border-stone-700 rounded-lg text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-stone-900 border border-stone-700 rounded-lg shadow-xl overflow-hidden">
          <ul>
            {results.map((result, index) => (
              <li key={`${result.href}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(result.href)}
                  className="w-full text-left px-3 py-2.5 hover:bg-stone-800/70 transition-colors"
                >
                  <p className="text-sm font-medium text-stone-200">{result.label}</p>
                  {result.description && (
                    <p className="text-xs text-stone-400 mt-0.5">{result.description}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
