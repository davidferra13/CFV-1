'use client'

// Dynamic Portal Navigation
// Only shows sections the client has data for.
// Receives overview data from server component and renders accordingly.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { PortalOverview } from '@/lib/client-portal/portal-actions'
import {
  Calendar,
  FileText,
  UtensilsCrossed,
  Star,
  Trophy,
  MessageSquare,
} from '@/components/ui/icons'

type PortalNavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  overviewKey: keyof PortalOverview | null // null = always show
}

const ALL_PORTAL_SECTIONS: PortalNavItem[] = [
  { href: '/my-events', label: 'My Events', icon: Calendar, overviewKey: 'hasEvents' },
  { href: '/my-quotes', label: 'My Quotes', icon: FileText, overviewKey: 'hasQuotes' },
  { href: '/my-meals', label: 'My Meals', icon: UtensilsCrossed, overviewKey: 'hasMealPrep' },
  {
    href: '/my-reservations',
    label: 'Reservations',
    icon: Calendar,
    overviewKey: 'hasReservations',
  },
  { href: '/my-loyalty', label: 'Loyalty', icon: Trophy, overviewKey: 'hasLoyalty' },
  { href: '/my-feedback', label: 'Feedback', icon: Star, overviewKey: 'hasFeedback' },
]

export function PortalSectionNav({ overview }: { overview: PortalOverview }) {
  const pathname = usePathname() ?? ''

  // Filter to only sections with data
  const visibleSections = ALL_PORTAL_SECTIONS.filter(
    (s) => s.overviewKey === null || overview[s.overviewKey]
  )

  if (visibleSections.length <= 1) return null

  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {visibleSections.map((section) => {
        const Icon = section.icon
        const active = pathname === section.href || pathname.startsWith(section.href + '/')
        return (
          <Link
            key={section.href}
            href={section.href}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
