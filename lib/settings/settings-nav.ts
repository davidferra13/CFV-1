export type SettingsNavItem = {
  label: string
  href: string
  icon: string
  description: string
}

export type SettingsNavGroup = {
  label: string
  items: SettingsNavItem[]
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    label: 'Your Business',
    items: [
      {
        label: 'Business',
        href: '/settings/business',
        icon: 'Building2',
        description: 'Business defaults, services, event types, menus, and store preferences',
      },
      {
        label: 'Scheduling',
        href: '/settings/scheduling',
        icon: 'CalendarDays',
        description: 'Availability rules, booking page, and schedule blocks',
      },
      {
        label: 'Payments',
        href: '/settings/payments',
        icon: 'CreditCard',
        description: 'Stripe, pricing, invoicing, fees, and billing',
      },
    ],
  },
  {
    label: 'Identity',
    items: [
      {
        label: 'Profile & Branding',
        href: '/settings/profile-branding',
        icon: 'Palette',
        description: 'Your brand, public profile, portfolio, and client preview',
      },
      {
        label: 'My Craft',
        href: '/settings/my-craft',
        icon: 'ChefHat',
        description: 'Culinary profile, skills, credentials, journal, and repertoire',
      },
    ],
  },
  {
    label: 'Communication',
    items: [
      {
        label: 'Communications',
        href: '/settings/communications',
        icon: 'MessageSquare',
        description: 'Messages, notifications, automations, and touchpoints',
      },
    ],
  },
  {
    label: 'Connections & AI',
    items: [
      {
        label: 'Integrations',
        href: '/settings/connections',
        icon: 'Link2',
        description: 'Google, calendars, Yelp, platforms, and webhooks',
      },
      {
        label: 'AI & Privacy',
        href: '/settings/ai',
        icon: 'Brain',
        description: 'AI trust center, Remy control, and menu intelligence',
      },
    ],
  },
  {
    label: 'Compliance',
    items: [
      {
        label: 'Legal & Protection',
        href: '/settings/legal-protection',
        icon: 'Shield',
        description: 'Contracts, insurance, certifications, safety, and compliance',
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        label: 'System & Account',
        href: '/settings/system',
        icon: 'Settings2',
        description: 'Security, devices, data, modules, and account controls',
      },
      {
        label: 'Developer',
        href: '/settings/developer',
        icon: 'Code2',
        description: 'API keys, webhooks, and developer tools',
      },
    ],
  },
]

/**
 * Returns the matching nav href for a given pathname,
 * used for sidebar active state highlighting.
 * Matches `/settings/business` for paths like `/settings/business` or `/settings/business/anything`.
 */
export function getActiveSettingsPath(pathname: string): string | null {
  // Check all nav items for a match (longest prefix wins)
  let bestMatch: string | null = null
  let bestLength = 0

  for (const group of SETTINGS_NAV) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        if (item.href.length > bestLength) {
          bestMatch = item.href
          bestLength = item.href.length
        }
      }
    }
  }

  // If no specific match, check if we're on the settings overview
  if (!bestMatch && pathname === '/settings') {
    return '/settings'
  }

  return bestMatch
}
