import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_NETWORK_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/network': {
    title: 'Chef Network',
    description: 'Discover other chefs — connect, collaborate, and share.',
    features: ['Chef directory', 'Profile browsing', 'Connection requests', 'Network features'],
  },

  '/network/[chefId]': {
    title: 'Chef Profile',
    description: "View another chef's profile — specialties, portfolio, and shared connections.",
    features: ['Chef bio', 'Specialty areas', 'Portfolio', 'Connection options'],
  },

  '/network/channels/[slug]': {
    title: 'Network Channel',
    description: 'Group discussions and topic-based channels within the chef network.',
    features: ['Channel messages', 'Topic discussions', 'Member list'],
  },

  '/network/notifications': {
    title: 'Network Notifications',
    description: 'Activity notifications from your chef network.',
    features: ['Connection requests', 'Channel activity', 'Mentions'],
  },

  '/network/saved': {
    title: 'Saved Chefs',
    description: "Chefs you've bookmarked for future reference.",
    features: ['Saved chef list', 'Quick access', 'Notes'],
  },
}
