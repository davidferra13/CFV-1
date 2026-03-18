import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_PARTNERS_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/partners': {
    title: 'Referral Partners',
    description:
      'Manage referral partners - venues, planners, and other businesses that send you clients.',
    features: [
      'Partner list with type, contact, and location count',
      'Inquiry and event counts per partner',
      'Revenue attribution',
      'Filter by active/inactive',
    ],
  },

  '/partners/new': {
    title: 'Add Partner',
    description: 'Create a new referral partner profile.',
    features: ['Partner info form', 'Partner type selection', 'Location setup'],
  },

  '/partners/[id]': {
    title: 'Partner Detail',
    description: 'Full partner profile - locations, events generated, and performance metrics.',
    features: ['Partner info', 'Location list', 'Event attribution', 'Revenue tracking'],
  },

  '/partners/[id]/edit': {
    title: 'Edit Partner',
    description: 'Update partner details - contact info, locations, and relationship notes.',
    features: ['Edit partner form', 'Location management', 'Notes'],
  },

  '/partners/[id]/report': {
    title: 'Partner Report',
    description: 'Performance report for this partner - events, revenue, and ROI.',
    features: ['Event count', 'Revenue generated', 'Conversion rate', 'ROI metrics'],
  },

  '/partners/active': {
    title: 'Active Partners',
    description: 'Currently active referral partners.',
    features: ['Active partner list', 'Recent activity', 'Event generation'],
  },

  '/partners/inactive': {
    title: 'Inactive Partners',
    description: 'Partners no longer actively generating referrals.',
    features: ['Inactive list', 'Reactivation options', 'Historical data'],
  },

  '/partners/events-generated': {
    title: 'Events from Partners',
    description: 'All events attributed to referral partners.',
    features: ['Event list by partner', 'Revenue attribution', 'Source tracking'],
  },

  '/partners/referral-performance': {
    title: 'Referral Performance',
    description: 'Partner ROI analytics - which partners generate the most value.',
    features: ['Partner ranking', 'Revenue per partner', 'Conversion rates'],
  },
}
