export type PublicRouteRole =
  | 'consumer_booking'
  | 'consumer_browse'
  | 'consumer_directory'
  | 'consumer_support'
  | 'operator_software'

export type PublicCta = {
  href: string
  label: string
}

export type PublicFooterSection = {
  heading: string
  links: readonly PublicCta[]
}

export const PUBLIC_PRIMARY_CONSUMER_CTA: PublicCta = {
  href: '/book',
  label: 'Book a Chef',
}

export const PUBLIC_SECONDARY_CONSUMER_CTA: PublicCta = {
  href: '/chefs',
  label: 'Browse Chefs',
}

export const PUBLIC_CONSUMER_DISCOVERY_ENTRY: PublicCta = {
  href: '/eat',
  label: 'Find Food',
}

export const PUBLIC_SUPPORTING_DIRECTORY_ENTRY: PublicCta = {
  href: '/nearby',
  label: 'Food Directory',
}

export const PUBLIC_DINNER_CIRCLES_ENTRY: PublicCta = {
  href: '/hub',
  label: 'Dinner Circles',
}

export const PUBLIC_OPERATOR_ENTRY: PublicCta = {
  href: '/for-operators',
  label: 'For Operators',
}

export const PUBLIC_ROUTE_ROLE: Record<string, PublicRouteRole> = {
  '/book': 'consumer_booking',
  '/chefs': 'consumer_browse',
  '/eat': 'consumer_browse',
  '/nearby': 'consumer_directory',
  '/discover': 'consumer_directory',
  '/hub': 'consumer_support',
  '/gift-cards': 'consumer_support',
  '/how-it-works': 'consumer_support',
  '/trust': 'consumer_support',
  '/contact': 'consumer_support',
  '/pricing': 'operator_software',
  '/for-operators': 'operator_software',
  '/for-operators/walkthrough': 'operator_software',
  '/marketplace-chefs': 'operator_software',
}

export const PUBLIC_ROUTE_LABELS: Record<string, string> = {
  [PUBLIC_PRIMARY_CONSUMER_CTA.href]: PUBLIC_PRIMARY_CONSUMER_CTA.label,
  [PUBLIC_SECONDARY_CONSUMER_CTA.href]: PUBLIC_SECONDARY_CONSUMER_CTA.label,
  [PUBLIC_CONSUMER_DISCOVERY_ENTRY.href]: PUBLIC_CONSUMER_DISCOVERY_ENTRY.label,
  [PUBLIC_SUPPORTING_DIRECTORY_ENTRY.href]: PUBLIC_SUPPORTING_DIRECTORY_ENTRY.label,
  [PUBLIC_DINNER_CIRCLES_ENTRY.href]: PUBLIC_DINNER_CIRCLES_ENTRY.label,
  [PUBLIC_OPERATOR_ENTRY.href]: PUBLIC_OPERATOR_ENTRY.label,
  '/discover': PUBLIC_SUPPORTING_DIRECTORY_ENTRY.label,
  '/trust': 'Trust Center',
  '/contact': 'Contact',
}

export const PUBLIC_FOOTER_BRAND_COPY =
  'ChefFlow helps guests find real private chefs, browse food options, and move into a clear booking path. Chef-led operators can still reach the workspace from the operator section.'

export const PUBLIC_FOOTER_SECTIONS = {
  consumer: {
    heading: 'Book a Chef',
    links: [
      PUBLIC_PRIMARY_CONSUMER_CTA,
      PUBLIC_SECONDARY_CONSUMER_CTA,
      PUBLIC_SUPPORTING_DIRECTORY_ENTRY,
      { href: '/trust', label: 'Trust Center' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  planning: {
    heading: 'Plan',
    links: [
      PUBLIC_CONSUMER_DISCOVERY_ENTRY,
      PUBLIC_DINNER_CIRCLES_ENTRY,
      { href: '/gift-cards', label: 'Gift Cards' },
      { href: '/how-it-works', label: 'How It Works' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  operators: {
    heading: 'For Operators',
    links: [PUBLIC_OPERATOR_ENTRY, { href: '/marketplace-chefs', label: 'Marketplace Chefs' }],
  },
  company: {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/data-request', label: 'Data Request' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
} as const satisfies Record<string, PublicFooterSection>

export function getPublicRouteLabel(href: string, fallback: string): string {
  return PUBLIC_ROUTE_LABELS[href] ?? fallback
}
