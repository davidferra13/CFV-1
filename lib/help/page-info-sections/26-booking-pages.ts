import type { PageInfoEntry } from '../page-info-types'

export const BOOKING_PAGES_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/book/[chefSlug]': {
    title: 'Book a Chef',
    description: 'Book this chef for your next event.',
    features: ['Chef profile preview', 'Inquiry form', 'Date selection'],
  },

  '/book/[chefSlug]/thank-you': {
    title: 'Booking Confirmed',
    description: 'Your booking request has been submitted - the chef will be in touch.',
    features: ['Confirmation message', 'Next steps', 'Contact info'],
  },

  '/book/campaign/[token]': {
    title: 'Campaign Booking',
    description: 'Book through a special campaign or promotion.',
    features: ['Campaign details', 'Special pricing', 'Booking form'],
  },
}
