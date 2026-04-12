// Public Secondary Entry Config
// Truthful alternate next-step links for public-facing surfaces.
// Only real routes. No fictional support or invented surfaces.

export type SecondaryEntryLink = {
  label: string
  href: string
  description: string
}

export type SecondaryEntrySurface =
  | 'open_booking'
  | 'single_chef_inquiry'
  | 'chef_profile'
  | 'trust'
  | 'contact'
  | 'gift_cards'
  | 'gift_cards_success'

export const PUBLIC_SECONDARY_ENTRY_CONFIG: Record<SecondaryEntrySurface, SecondaryEntryLink[]> = {
  open_booking: [
    {
      label: 'How it works',
      href: '/how-it-works',
      description: 'See what to expect step by step',
    },
    { label: 'Trust and safety', href: '/trust', description: 'How we protect clients and chefs' },
    { label: 'Contact us', href: '/contact', description: 'Questions before you book' },
  ],
  single_chef_inquiry: [
    { label: 'How it works', href: '/how-it-works', description: "We'll handle the details" },
    {
      label: 'Trust and safety',
      href: '/trust',
      description: 'Your data and payment are protected',
    },
    { label: 'Contact us', href: '/contact', description: 'Need help before submitting?' },
  ],
  chef_profile: [
    { label: 'How it works', href: '/how-it-works', description: 'From inquiry to table' },
    { label: 'Trust and safety', href: '/trust', description: 'Protected payments, vetted chefs' },
    { label: 'Browse all chefs', href: '/chefs', description: 'Explore other private chefs' },
  ],
  trust: [
    { label: 'Book a chef', href: '/book', description: 'Request your private dining experience' },
    { label: 'Contact us', href: '/contact', description: 'Talk to a real person' },
    { label: 'How it works', href: '/how-it-works', description: 'The full process explained' },
  ],
  contact: [
    { label: 'Book a chef', href: '/book', description: 'Start your event request' },
    { label: 'Browse chefs', href: '/chefs', description: 'Find the right chef for your event' },
    {
      label: 'How it works',
      href: '/how-it-works',
      description: 'What happens after you reach out',
    },
  ],
  gift_cards: [
    {
      label: 'How it works',
      href: '/how-it-works',
      description: 'What the gift experience looks like',
    },
    { label: 'Trust and safety', href: '/trust', description: 'Secure purchase and delivery' },
    { label: 'Contact us', href: '/contact', description: 'Questions about gift cards' },
  ],
  gift_cards_success: [
    { label: 'Book an event', href: '/book', description: 'Ready to plan your own dinner?' },
    { label: 'Browse chefs', href: '/chefs', description: 'Find your perfect private chef' },
    { label: 'How it works', href: '/how-it-works', description: 'Learn what to expect' },
  ],
}
