import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_CLIENTS_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/clients': {
    title: 'Clients',
    description:
      'Your complete client roster - manage relationships, send invitations, and track engagement.',
    features: [
      'Client list with health scores',
      'Send portal invitations via email',
      'Export client data to CSV',
      'View pending invitations',
      'Filter by VIP, active, or inactive status',
    ],
    annotations: [
      { selector: 'h1', label: 'Clients', description: 'Your full client list' },
      {
        selector: '#invite',
        label: 'Client Invitation',
        description: 'Send an email invitation so clients can access their own portal',
      },
      {
        selector: '[data-info="client-table"]',
        label: 'Client Table',
        description: 'All your clients with event count, total revenue, and health scores',
      },
    ],
  },

  '/clients/recurring': {
    title: 'Recurring Planning Board',
    description:
      'Cross-client weekly planning board for recurring services, menu collaboration, and request load.',
    features: [
      'Week-by-week recurring session view',
      'Projected sessions and revenue by week',
      'Open request pressure and high-priority flags',
      'Recommendation response status tracking',
      'Direct links to each client recurring workspace',
    ],
  },

  '/clients/new': {
    title: 'Add Client',
    description: 'Create a new client profile - name, contact info, and dietary preferences.',
    features: [
      'Client info form',
      'Dietary restrictions',
      'Contact details',
      'Optional portal invitation',
    ],
  },

  '/clients/[id]': {
    title: 'Client Detail',
    description:
      'Full client profile - event history, communication log, preferences, and financial relationship.',
    features: [
      'Client profile and contact info',
      'Event history timeline',
      'Communication log and notes',
      'Dietary restrictions and preferences',
      'Lifetime value and spending history',
      'Loyalty points and tier status',
    ],
  },

  '/clients/[id]/recurring': {
    title: 'Recurring Events',
    description:
      'Set up recurring event subscriptions for this client - weekly, monthly, or custom.',
    features: ['Recurring schedule setup', 'Auto-event creation', 'Frequency options'],
  },

  '/clients/active': {
    title: 'Active Clients',
    description: 'Clients with recent events or active engagement.',
    features: ['Active client list', 'Recent activity indicators', 'Quick actions'],
  },

  '/clients/inactive': {
    title: 'Inactive Clients',
    description: 'Clients without recent activity - potential re-engagement opportunities.',
    features: ['Inactive client list', 'Last activity date', 'Re-engagement prompts'],
  },

  '/clients/duplicates': {
    title: 'Duplicate Detection',
    description: 'Find and merge duplicate client records to keep your data clean.',
    features: ['Duplicate pair detection', 'Side-by-side comparison', 'Merge functionality'],
  },

  '/clients/gift-cards': {
    title: 'Gift Cards',
    description: 'Manage gift card purchases and redemptions for your clients.',
    features: [
      'Gift card inventory',
      'Purchase tracking',
      'Redemption history',
      'Balance management',
    ],
  },

  '/clients/presence': {
    title: 'Client Presence',
    description: 'See which clients are currently active in their portal.',
    features: ['Live online status', 'Last seen timestamps', 'Activity indicators'],
  },

  '/clients/vip': {
    title: 'VIP Clients',
    description: 'Your highest-value clients - special tier management and priority treatment.',
    features: ['VIP tier assignment', 'Lifetime value ranking', 'Special perks tracking'],
  },

  '/clients/segments': {
    title: 'Client Segments',
    description: 'Group clients by behavior, value, or preferences for targeted engagement.',
    features: ['Custom segment creation', 'Behavioral grouping', 'Targeted outreach lists'],
  },

  '/clients/communication': {
    title: 'Communication Hub',
    description: 'Unified view of all client communication - notes, follow-ups, and touchpoints.',
    features: ['Communication log', 'Notes by client', 'Follow-up tasks', 'Upcoming touchpoints'],
  },

  '/clients/communication/notes': {
    title: 'Client Notes',
    description:
      'Notes and observations organized by client - personal details, preferences, and context.',
    features: ['Per-client notes', 'Searchable history', 'Tagged notes'],
  },

  '/clients/communication/follow-ups': {
    title: 'Follow-Up Tasks',
    description: 'Scheduled follow-ups and action items for your clients.',
    features: ['Follow-up list', 'Due date tracking', 'Completion status'],
  },

  '/clients/communication/upcoming-touchpoints': {
    title: 'Upcoming Touchpoints',
    description: 'Birthdays, anniversaries, and other milestones coming up for your clients.',
    features: ['Milestone calendar', 'Automated reminders', 'Outreach suggestions'],
  },

  '/clients/history': {
    title: 'Client History Hub',
    description: 'Complete historical view of client relationships - events, menus, and spending.',
    features: ['Event history', 'Past menus served', 'Spending trends'],
  },

  '/clients/history/event-history': {
    title: 'Event History',
    description: 'All events for each client - past, present, and future.',
    features: ['Chronological event list', 'Status and outcome tracking', 'Revenue per event'],
  },

  '/clients/history/past-menus': {
    title: 'Past Menus',
    description: "Menus you've served to each client - avoid repeats, track favorites.",
    features: ['Menu history by client', 'Dish frequency', 'Favorite dish indicators'],
  },

  '/clients/history/spending-history': {
    title: 'Spending History',
    description: 'Revenue history per client - track lifetime value and spending patterns.',
    features: ['Revenue timeline', 'Average event value', 'Spending trends'],
  },

  '/clients/insights': {
    title: 'Client Insights',
    description: 'Analytics about your client base - top spenders, most frequent, and at-risk.',
    features: [
      'Top clients by revenue',
      'Most frequent bookers',
      'At-risk churn alerts',
      'Client acquisition trends',
    ],
  },

  '/clients/insights/top-clients': {
    title: 'Top Clients',
    description: 'Your highest-value clients ranked by lifetime revenue.',
    features: ['Revenue ranking', 'Event count', 'Average event value'],
  },

  '/clients/insights/most-frequent': {
    title: 'Most Frequent',
    description: 'Clients who book most often - your loyal regulars.',
    features: ['Booking frequency ranking', 'Average time between bookings', 'Retention rate'],
  },

  '/clients/insights/at-risk': {
    title: 'At-Risk Clients',
    description:
      'Clients showing signs of churning - long gaps between bookings or declining engagement.',
    features: ['Churn risk indicators', 'Days since last booking', 'Re-engagement suggestions'],
  },

  '/clients/preferences': {
    title: 'Client Preferences Hub',
    description: 'All dietary and food preferences across your client base.',
    features: ['Allergies overview', 'Dietary restrictions', 'Food dislikes', 'Favorite dishes'],
  },

  '/clients/preferences/allergies': {
    title: 'Allergy Tracking',
    description: 'Client allergies - critical safety information for event planning.',
    features: ['Allergy list by client', 'Severity indicators', 'Cross-reference with menus'],
  },

  '/clients/preferences/dietary-restrictions': {
    title: 'Dietary Restrictions',
    description: 'Dietary requirements across your client base - vegan, kosher, gluten-free, etc.',
    features: [
      'Restriction categories',
      'Client count per restriction',
      'Menu compatibility check',
    ],
  },

  '/clients/preferences/dislikes': {
    title: 'Food Dislikes',
    description: "Foods your clients don't enjoy - helps avoid menu missteps.",
    features: ['Dislike list by client', 'Ingredient-level tracking'],
  },

  '/clients/preferences/favorite-dishes': {
    title: 'Favorite Dishes',
    description: 'Dishes your clients love - great for repeat bookings and personalization.',
    features: ['Favorite tracking', 'Recipe cross-reference', 'Personalization suggestions'],
  },

  '/clients/loyalty': {
    title: 'Loyalty Program',
    description: 'Manage your client loyalty program - points, rewards, and referrals.',
    features: ['Points system overview', 'Reward tiers', 'Referral tracking', 'Redemption history'],
  },

  '/clients/loyalty/points': {
    title: 'Loyalty Points',
    description: 'Points earned and redeemed by each client.',
    features: ['Points balance by client', 'Earning history', 'Redemption log'],
  },

  '/clients/loyalty/rewards': {
    title: 'Loyalty Rewards',
    description: 'Available rewards and their point costs.',
    features: ['Reward catalog', 'Point thresholds', 'Active promotions'],
  },

  '/clients/loyalty/referrals': {
    title: 'Referral Tracking',
    description: 'Track client referrals - who referred whom and the resulting bookings.',
    features: ['Referral chain tracking', 'Conversion rates', 'Referral rewards issued'],
  },
}
