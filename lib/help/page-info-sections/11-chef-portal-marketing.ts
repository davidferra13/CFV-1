import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_MARKETING_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/marketing': {
    title: 'Marketing Hub',
    description: 'Email campaigns, sequences, and templates — reach your clients and prospects.',
    features: [
      'Campaign list with status (draft, scheduled, sending, sent, cancelled)',
      'Recipient count and send date',
      'New campaign builder',
      'Testimonial request panel',
    ],
  },

  '/marketing/[id]': {
    title: 'Campaign Detail',
    description: 'View and edit a specific marketing campaign.',
    features: ['Campaign content', 'Recipient list', 'Send status', 'Performance metrics'],
  },

  '/marketing/push-dinners': {
    title: 'Push Dinners',
    description: 'Direct outreach campaigns for open-date dinners.',
    features: ['Push dinner campaigns', 'Target audience', 'Booking conversion'],
  },

  '/marketing/push-dinners/new': {
    title: 'New Push Dinner',
    description: 'Create a new push dinner campaign.',
    features: ['Date and menu selection', 'Guest capacity', 'Pricing', 'Outreach targeting'],
  },

  '/marketing/push-dinners/[id]': {
    title: 'Push Dinner Detail',
    description: 'View and manage a specific push dinner campaign.',
    features: ['Campaign status', 'RSVPs and bookings', 'Outreach history'],
  },

  '/marketing/sequences': {
    title: 'Email Sequences',
    description: 'Automated multi-step email sequences for nurturing leads.',
    features: ['Sequence builder', 'Trigger conditions', 'Step timing', 'Performance tracking'],
  },

  '/marketing/templates': {
    title: 'Campaign Templates',
    description: 'Reusable email templates for campaigns.',
    features: ['Template library', 'Quick customize', 'Preview'],
  },
}
