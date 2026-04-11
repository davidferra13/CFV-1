/**
 * Centralized navigation configuration for the public landing layer.
 * Single source of truth for all public-facing nav items, footer links,
 * and page metadata. Mirrors the discipline of nav-config.tsx (chef portal).
 *
 * Rule: nothing hidden. If it's built, it's findable within 1-2 clicks.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import {
  PUBLIC_DINNER_CIRCLES_ENTRY,
  PUBLIC_OPERATOR_ENTRY,
  PUBLIC_PRIMARY_CONSUMER_CTA,
  PUBLIC_SECONDARY_CONSUMER_CTA,
  PUBLIC_SUPPORTING_DIRECTORY_ENTRY,
} from '@/lib/public/public-surface-config'

export type PublicNavItem = {
  href: string
  label: string
  /** Analytics identifier (auto-generated from label if omitted) */
  analyticsName?: string
  /** If true, render as accent/CTA button instead of text link */
  cta?: boolean
}

export type PublicNavGroup = {
  label: string
  items: PublicNavItem[]
}

export type PublicNavEntry = PublicNavItem | PublicNavGroup

function isGroup(entry: PublicNavEntry): entry is PublicNavGroup {
  return 'items' in entry
}

export { isGroup }

// ---------------------------------------------------------------------------
// Primary Navigation (header)
// ---------------------------------------------------------------------------

/** Desktop/mobile header nav items. Groups render as dropdown menus. */
export const PUBLIC_NAV: PublicNavEntry[] = [
  {
    label: 'Hire a Chef',
    items: [
      PUBLIC_PRIMARY_CONSUMER_CTA,
      PUBLIC_SECONDARY_CONSUMER_CTA,
      PUBLIC_DINNER_CIRCLES_ENTRY,
      { href: '/services', label: 'Services' },
      { href: '/how-it-works', label: 'How It Works' },
      PUBLIC_SUPPORTING_DIRECTORY_ENTRY,
    ],
  },
  PUBLIC_OPERATOR_ENTRY,
  { href: '/ingredients', label: 'Ingredients' },
]

// ---------------------------------------------------------------------------
// Footer Links
// ---------------------------------------------------------------------------

export const FOOTER_SECTIONS = {
  discover: {
    heading: 'Hire a Chef',
    links: [
      PUBLIC_PRIMARY_CONSUMER_CTA,
      PUBLIC_SECONDARY_CONSUMER_CTA,
      PUBLIC_DINNER_CIRCLES_ENTRY,
      { href: '/services', label: 'Services' },
      { href: '/how-it-works', label: 'How It Works' },
      PUBLIC_SUPPORTING_DIRECTORY_ENTRY,
    ],
  },
  forOperators: {
    heading: 'For Operators',
    links: [
      PUBLIC_OPERATOR_ENTRY,
      { href: '/marketplace-chefs', label: 'Marketplace Chefs' },
      { href: '/partner-signup', label: 'Become a Partner' },
    ],
  },
  resources: {
    heading: 'Resources',
    links: [
      { href: '/ingredients', label: 'Ingredient Guide' },
      { href: '/faq', label: 'FAQ' },
      { href: '/how-it-works', label: 'How It Works' },
    ],
  },
  company: {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/trust', label: 'Trust Center' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  legal: {
    heading: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
} as const

// ---------------------------------------------------------------------------
// Active state helper
// ---------------------------------------------------------------------------

/** Returns true when `pathname` matches `href` or starts with `href/` (for nested routes). */
export function isPublicNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

/** Returns true when any item in a group is active. */
export function isPublicGroupActive(pathname: string, group: PublicNavGroup): boolean {
  return group.items.some((item) => isPublicNavActive(pathname, item.href))
}
