import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_INQUIRIES_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/inquiries': {
    title: 'Inquiries',
    description:
      'Your inquiry pipeline — track every catering request from first contact to conversion.',
    features: [
      'Filter by status (new, awaiting client, awaiting chef, quoted, confirmed, declined, expired)',
      'Inquiry count badges per status',
      'Quick access to respond and convert',
      'Timeline of inquiry progression',
    ],
  },

  '/inquiries/new': {
    title: 'New Inquiry',
    description: 'Log a new catering inquiry — capture the client request and event details.',
    features: [
      'Client info capture',
      'Event details (date, occasion, guest count)',
      'Dietary restrictions and special requests',
      'Source tracking (website, referral, etc.)',
    ],
  },

  '/inquiries/[id]': {
    title: 'Inquiry Detail',
    description:
      'Full inquiry view — client info, event requirements, messaging thread, and conversion options.',
    features: [
      'Client communication thread',
      'Event requirement summary',
      'Convert to quote or event',
      'Status management',
      'Follow-up scheduling',
    ],
  },

  '/inquiries/awaiting-client': {
    title: 'Awaiting Client Response',
    description: "Inquiries where you've responded and are waiting for the client to get back.",
    features: ['Filtered inquiry list', 'Days waiting indicator', 'Follow-up reminder option'],
  },

  '/inquiries/awaiting-response': {
    title: 'Awaiting Your Response',
    description: 'Inquiries that need your attention — the client is waiting for you.',
    features: ['Action-needed list', 'Response time tracking', 'Quick reply options'],
  },

  '/inquiries/menu-drafting': {
    title: 'Menu Drafting',
    description: 'Inquiries in the menu planning phase — creating menus for client review.',
    features: ['Menu draft status', 'Link to menu editor', 'Client preferences summary'],
  },

  '/inquiries/sent-to-client': {
    title: 'Sent to Client',
    description: 'Quotes and proposals that have been sent and are awaiting client decision.',
    features: ['Sent proposals list', 'View/open tracking', 'Follow-up scheduling'],
  },

  '/inquiries/declined': {
    title: 'Declined Inquiries',
    description: "Inquiries that didn't convert — track reasons to improve your pipeline.",
    features: ['Decline reason tracking', 'Historical reference', 'Win-back opportunities'],
  },
}
