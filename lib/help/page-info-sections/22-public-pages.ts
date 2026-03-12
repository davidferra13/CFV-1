import type { PageInfoEntry } from '../page-info-types'

export const PUBLIC_PAGES_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/': {
    title: 'ChefFlow Home',
    description: 'Welcome to ChefFlow - the chef-built back office for private chefs.',
    features: ['Founder-led story', 'Workflow overview', 'Get started or get in touch'],
  },

  '/about': {
    title: 'About ChefFlow',
    description: 'The story behind ChefFlow and who built it.',
    features: ['Founder story', 'What ChefFlow is and is not', 'Get started or get in touch'],
  },

  '/chefs': {
    title: 'Chef Directory',
    description: 'Browse available chefs for your next event.',
    features: ['Chef profiles', 'Specialties and portfolios', 'Direct booking links'],
  },

  '/contact': {
    title: 'Contact Us',
    description: 'Get in touch with the ChefFlow team.',
    features: ['Contact form', 'Support email', 'General inquiries'],
  },

  '/pricing': {
    title: 'Pricing',
    description: 'ChefFlow plan options for private chefs.',
    features: ['Plan comparison', 'Workflow details', 'Upgrade options'],
  },

  '/privacy': {
    title: 'Privacy Policy',
    description: 'How ChefFlow handles your data and protects your privacy.',
    features: ['Data collection practices', 'Privacy rights', 'Contact information'],
  },

  '/terms': {
    title: 'Terms of Service',
    description: 'ChefFlow terms of service and usage agreement.',
    features: ['Service terms', 'User responsibilities', 'Legal provisions'],
  },

  '/chef/[slug]': {
    title: 'Chef Profile',
    description: "A chef's public profile - portfolio, specialties, and booking information.",
    features: ['Chef bio and portfolio', 'Specialty areas', 'Inquiry form', 'Gift card purchase'],
  },

  '/chef/[slug]/inquire': {
    title: 'Make an Inquiry',
    description: 'Submit a catering inquiry to this chef.',
    features: ['Inquiry form', 'Event details', 'Dietary requirements'],
  },

  '/chef/[slug]/gift-cards': {
    title: 'Gift Cards',
    description: "Purchase a gift card for this chef's services.",
    features: ['Gift card amounts', 'Custom messages', 'Secure purchase'],
  },

  '/chef/[slug]/gift-cards/success': {
    title: 'Gift Card Purchased',
    description: 'Your gift card purchase was successful.',
    features: ['Confirmation details', 'Gift card code', 'Delivery information'],
  },

  '/chef/[slug]/partner-signup': {
    title: 'Become a Partner',
    description: 'Apply as a referral partner for this chef.',
    features: ['Partner application form', 'Partnership benefits', 'Location setup'],
  },

  '/share/[token]': {
    title: 'Event Recap',
    description: 'Shared event recap - photos, menu, and highlights from a recent event.',
    features: ['Event photos', 'Menu served', 'Event highlights'],
  },

  '/share/[token]/recap': {
    title: 'Recap Detail',
    description: 'Detailed event recap for sharing.',
    features: ['Full event story', 'Photo gallery', 'Menu and highlights'],
  },

  '/g/[code]': {
    title: 'Promo Code',
    description: 'Redeem a promotional code.',
    features: ['Code validation', 'Redirect to booking'],
  },

  '/availability/[token]': {
    title: 'Booking Availability',
    description: "View a chef's available dates and book a time.",
    features: ['Calendar picker', 'Available date slots', 'Booking submission'],
  },

  '/cannabis-invite/[token]': {
    title: 'Cannabis Event Invite',
    description: 'Invitation to a private cannabis dining event.',
    features: ['Event details', 'RSVP options', 'Compliance notice'],
  },

  '/partner-report/[token]': {
    title: 'Partner Report',
    description: 'Referral partner performance metrics.',
    features: ['Events generated', 'Revenue attributed', 'Performance summary'],
  },

  '/partner-signup': {
    title: 'Partner Signup',
    description: 'Apply as a referral partner for ChefFlow.',
    features: ['Application form', 'Partnership details', 'Location setup'],
  },

  '/unsubscribe': {
    title: 'Unsubscribe',
    description: 'Unsubscribe from ChefFlow marketing emails.',
    features: ['Email preference management', 'Unsubscribe confirmation'],
  },
}
