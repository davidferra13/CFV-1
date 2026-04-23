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
  | 'directory'
  | 'nearby'
  | 'nearby_detail'
  | 'how_it_works'
  | 'ingredients'
  | 'services'
  | 'faq'
  | 'about'
  | 'for_operators'
  | 'hub'
  | 'hub_circles'

export const PUBLIC_SECONDARY_ENTRY_CONFIG: Record<SecondaryEntrySurface, SecondaryEntryLink[]> = {
  open_booking: [
    {
      label: 'Browse Chefs',
      href: '/chefs',
      description: 'Start from the live directory instead',
    },
    {
      label: 'How it works',
      href: '/how-it-works',
      description: 'See matching, reply, and payment steps',
    },
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
    { label: 'Book a Chef', href: '/book', description: 'Request your private dining experience' },
    { label: 'Food near you', href: '/nearby', description: 'Restaurants, caterers, food trucks' },
    { label: 'How it works', href: '/how-it-works', description: 'The full process explained' },
  ],
  contact: [
    { label: 'Book a Chef', href: '/book', description: 'Start your event request' },
    { label: 'Food near you', href: '/nearby', description: 'Find food operators near you' },
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
    { label: 'Browse Chefs', href: '/chefs', description: 'Find your perfect private chef' },
    { label: 'How it works', href: '/how-it-works', description: 'Learn what to expect' },
  ],
  directory: [
    {
      label: 'Book a Chef',
      href: '/book',
      description: 'Describe your event once and let matched chefs review it',
    },
    {
      label: 'How it works',
      href: '/how-it-works',
      description: 'See matching, quote, and payment expectations',
    },
    {
      label: 'Trust Center',
      href: '/trust',
      description: 'See what ChefFlow verifies and what it does not',
    },
  ],
  nearby: [
    { label: 'Book a Chef', href: '/book', description: 'Request a private dining experience' },
    { label: 'Browse Chefs', href: '/chefs', description: 'Find reviewed private chefs' },
    {
      label: 'Dinner Circles',
      href: '/hub/circles',
      description: 'Join food community conversations',
    },
  ],
  nearby_detail: [
    { label: 'Browse nearby', href: '/nearby', description: 'Find more food operators' },
    { label: 'Book a Chef', href: '/book', description: 'Hire a private chef instead' },
    {
      label: 'Dinner Circles',
      href: '/hub/circles',
      description: 'Join food community conversations',
    },
  ],
  how_it_works: [
    { label: 'Book a Chef', href: '/book', description: 'Start your event request' },
    { label: 'Food near you', href: '/nearby', description: 'Restaurants, caterers, food trucks' },
    { label: 'Dinner Circles', href: '/hub/circles', description: 'Coordinate group meals' },
  ],
  ingredients: [
    { label: 'Book a Chef', href: '/book', description: 'Hire a private chef for your next event' },
    { label: 'Food near you', href: '/nearby', description: 'Restaurants, caterers, food trucks' },
    { label: 'Services', href: '/services', description: 'Private dinners, catering, meal prep' },
  ],
  services: [
    { label: 'Book a Chef', href: '/book', description: 'Start your event request' },
    { label: 'Food near you', href: '/nearby', description: 'Restaurants, caterers, food trucks' },
    {
      label: 'Dinner Circles',
      href: '/hub/circles',
      description: 'Join food community conversations',
    },
  ],
  faq: [
    { label: 'Book a Chef', href: '/book', description: 'Start your event request' },
    { label: 'Food near you', href: '/nearby', description: 'Find food operators near you' },
    { label: 'For operators', href: '/for-operators', description: 'List your business free' },
  ],
  about: [
    { label: 'Book a Chef', href: '/book', description: 'Start your event request' },
    { label: 'Browse Chefs', href: '/chefs', description: 'Find reviewed private chefs' },
    { label: 'For operators', href: '/for-operators', description: 'Run your food business here' },
  ],
  for_operators: [
    {
      label: 'Request walkthrough',
      href: '/for-operators/walkthrough',
      description: 'Get the workflow mapped to your current process',
    },
    {
      label: 'Compare ChefFlow',
      href: '/compare',
      description: 'Judge migration friction against your current stack',
    },
    {
      label: 'Marketplace chef path',
      href: '/marketplace-chefs',
      description: 'For operators whose leads start elsewhere',
    },
  ],
  hub: [
    { label: 'Book a Chef', href: '/book', description: 'Plan your own private dining event' },
    { label: 'Browse Chefs', href: '/chefs', description: 'Find a chef for your group' },
    { label: 'Community Circles', href: '/hub/circles', description: 'Join food conversations' },
  ],
  hub_circles: [
    { label: 'Book a Chef', href: '/book', description: 'Hire a chef for your group' },
    { label: 'Browse Chefs', href: '/chefs', description: 'Find reviewed private chefs' },
    { label: 'Dinner Circles', href: '/hub', description: 'Learn about Dinner Circles' },
  ],
}
