'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PRIMARY_TABS = [
  { label: 'Overview', href: '/culinary' },
  { label: 'Recipes', href: '/culinary/recipes' },
  { label: 'Menus', href: '/culinary/menus' },
  { label: 'Prep', href: '/culinary/prep' },
  { label: 'Ingredients', href: '/culinary/ingredients' },
  { label: 'Sustainability', href: '/culinary/sustainability' },
] as const

/**
 * Horizontal tab navigation for the Culinary hub.
 * Shows on /culinary and its primary sub-sections.
 * Hides on deeply nested detail pages (3+ segments past /culinary).
 */
export function CulinaryHubNav() {
  const pathname = usePathname()

  // Hide on deeply nested routes (e.g. /culinary/recipes/123/edit)
  // /culinary = 0 segments, /culinary/recipes = 1, /culinary/recipes/123 = 2+
  const segments = pathname
    .replace(/^\/culinary\/?/, '')
    .split('/')
    .filter(Boolean)
  if (segments.length > 1) return null

  return (
    <nav className="mb-6">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-0 border-b border-stone-700 min-w-max">
          {PRIMARY_TABS.map((tab) => {
            const isActive =
              tab.href === '/culinary'
                ? pathname === '/culinary' || pathname === '/culinary/'
                : pathname.startsWith(tab.href)

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
