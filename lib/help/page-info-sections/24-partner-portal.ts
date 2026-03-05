import type { PageInfoEntry } from '../page-info-types'

export const PARTNER_PORTAL_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/partner/dashboard': {
    title: 'Partner Dashboard',
    description: 'Your partner home base — stats, locations, and recent events.',
    features: [
      'Stats cards (locations, events, guests)',
      'Location grid',
      'Recent events table',
      'Partnership story badge',
    ],
  },

  '/partner/events': {
    title: 'Partner Events',
    description: 'Full event history across all your partner locations.',
    features: [
      'Events table with status',
      'Date, occasion, and guest count',
      'Location attribution',
    ],
  },

  '/partner/preview': {
    title: 'Public Page Preview',
    description: "See how your partner page appears on the chef's public showcase.",
    features: ['Showcase card preview', 'Locations grid', 'Photo gallery', 'Live page link'],
  },

  '/partner/profile': {
    title: 'Partner Profile',
    description: 'Edit your partner profile — name, description, contact info, and website.',
    features: ['Editable form fields', 'Cover image upload', 'Visibility status'],
  },

  '/partner/locations': {
    title: 'Partner Locations',
    description: 'Overview of all your managed locations.',
    features: ['Active locations list', 'Event counts', 'Capacity details'],
  },

  '/partner/locations/[id]': {
    title: 'Location Detail',
    description: 'Full detail for a specific location — photos, stats, and event history.',
    features: ['Location stats', 'Photo gallery', 'Event history', 'Capacity info'],
  },
}
