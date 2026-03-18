import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_CORE_PAGES_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/dashboard': {
    title: 'Dashboard',
    description:
      'Your command center - see what needs attention right now, upcoming events, and key business metrics at a glance.',
    features: [
      "Today's schedule and prep tasks",
      'Priority action queue sorted by urgency',
      'Week-at-a-glance calendar strip',
      'Revenue, expenses, and profit snapshot',
      'Client follow-up reminders and accountability',
      'Quote acceptance insights and pipeline forecast',
      'Customizable widgets - enable, disable, and reorder from settings',
    ],
    annotations: [
      {
        selector: 'h1',
        label: 'Page Title',
        description: "Shows which section of ChefFlow you're in",
      },
      {
        selector: '[data-info="queue"]',
        label: 'Priority Queue',
        description:
          'Your most urgent tasks sorted by deadline - events, follow-ups, quotes that need action',
      },
      {
        selector: '[data-info="week-strip"]',
        label: 'Week Strip',
        description: 'Quick view of your schedule for the next 7 days - tap any day to see details',
      },
      {
        selector: '[data-info="financials"]',
        label: 'Financial Snapshot',
        description: 'Revenue, expenses, and profit at a glance for the current month',
      },
      {
        selector: '[data-info="next-action"]',
        label: 'Next Action',
        description: 'The single most important thing you should do right now',
      },
    ],
  },

  '/commands': {
    title: 'Remy Command Center',
    description:
      'Your AI assistant hub - talk to Remy, review past conversations, and manage AI settings.',
    features: [
      'Chat with Remy for business advice and drafting',
      'Review conversation history',
      'Manage AI memory and context',
      'Privacy controls for AI features',
    ],
  },

  '/remy': {
    title: 'Remy History',
    description:
      'Browse everything Remy has created - drafts, suggestions, and past conversations.',
    features: [
      'Search past AI-generated content',
      'View conversation history',
      'Re-use previous drafts and suggestions',
    ],
  },

  '/queue': {
    title: 'Priority Queue',
    description:
      'Everything that needs your attention, ranked by urgency across all domains - inquiries, events, quotes, finances, and more.',
    features: [
      'Items sorted by urgency (critical, high, normal, low)',
      'Domain filtering (inquiry, event, quote, financial, client, culinary)',
      'Direct links to take action on each item',
      'Summary bar showing counts by domain and urgency',
    ],
  },

  '/daily': {
    title: 'Daily Operations',
    description:
      'Your daily operational checklist - everything happening today in one focused view.',
    features: [
      'Day-of-party tasks and prep reminders',
      "Today's schedule at a glance",
      'Daily prep checklist',
      'Overdue items from previous days',
    ],
  },
}
