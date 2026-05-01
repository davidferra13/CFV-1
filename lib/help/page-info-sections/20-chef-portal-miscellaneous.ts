import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_MISCELLANEOUS_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/aar': {
    title: 'After Action Reviews',
    description: 'All post-event self-assessments - track your quality trends over time.',
    features: [
      'Review list',
      'Calm and prep ratings',
      'Frequently forgotten items',
      'Quality trends',
    ],
  },

  '/activity': {
    title: 'Activity Feed',
    description: 'System activity log - recent changes across your entire ChefFlow account.',
    features: ['Chef activity', 'Client activity', 'Chronological feed'],
  },

  '/calls': {
    title: 'Calls',
    description: 'Call logging and management - track every client and prospect call.',
    features: ['Upcoming calls', 'Past call log', 'Call notes'],
  },

  '/calls/new': {
    title: 'Log Call',
    description: 'Record a new call with a client or prospect.',
    features: ['Contact selection', 'Call notes', 'Follow-up scheduling'],
  },

  '/calls/[id]': {
    title: 'Call Detail',
    description: 'View details and notes from a specific call.',
    features: ['Call notes', 'Duration', 'Follow-up actions'],
  },

  '/calls/[id]/edit': {
    title: 'Edit Call',
    description: 'Update call notes and details.',
    features: ['Edit notes', 'Update follow-ups', 'Change details'],
  },

  '/chat': {
    title: 'Messages',
    description: 'Direct messaging with clients and partners.',
    features: ['Conversation list', 'Real-time messaging', 'Message history'],
  },

  '/chat/[id]': {
    title: 'Chat Thread',
    description: 'Individual conversation with a client or partner.',
    features: ['Message thread', 'File sharing', 'Read receipts'],
  },

  '/culinary-board': {
    title: 'Culinary Board',
    description: 'Culinary inspiration board - save ideas, recipes, and creative concepts.',
    features: ['Inspiration pins', 'Visual board', 'Recipe linking'],
  },

  '/community/templates': {
    title: 'Community Templates',
    description: 'Templates shared by the chef community.',
    features: ['Community template library', 'Import to your account', 'Browse and search'],
  },

  '/dev/simulate': {
    title: 'Dev Simulator',
    description: 'Developer tool - simulate events and data for testing.',
    features: ['Event simulation', 'Data generation', 'Testing scenarios'],
  },

  '/goals': {
    title: 'Goals',
    description: 'Revenue and booking targets - set goals and track progress.',
    features: [
      'Monthly progress tracking',
      'Client outreach recommendations',
      'Revenue path projection',
    ],
  },

  '/goals/setup': {
    title: 'Goal Setup',
    description: 'Set up your revenue and booking goals.',
    features: ['Annual target setting', 'Monthly breakdown', 'Strategy suggestions'],
  },

  '/goals/[id]/history': {
    title: 'Goal History',
    description: 'Historical progress for a specific goal.',
    features: ['Progress timeline', 'Monthly snapshots', 'Achievement markers'],
  },

  '/goals/revenue-path': {
    title: 'Revenue Path',
    description: 'Revenue projection based on your pipeline and historical data.',
    features: ['Projection modeling', 'Scenario planning', 'Gap analysis'],
  },

  '/guest-analytics': {
    title: 'Guest Analytics',
    description:
      'Guest-domain relationship analytics for repeat guests, dinner groups, attendance patterns, and preferences.',
    features: [
      'Repeat guest patterns',
      'Dinner group attendance',
      'Dietary and preference distribution',
    ],
  },

  '/guest-leads': {
    title: 'Guest Leads',
    description: 'Leads generated from event guests - turn guests into clients.',
    features: ['Guest-to-lead pipeline', 'Contact capture', 'Conversion tracking'],
  },

  '/help': {
    title: 'Help Center',
    description: 'Help and support - browse categories or search for answers.',
    features: [
      'Category navigation (events, clients, finance, culinary, settings, onboarding)',
      'Search',
      'Support email',
    ],
  },

  '/help/[slug]': {
    title: 'Help Article',
    description: 'Detailed help article on a specific topic.',
    features: ['Step-by-step instructions', 'Screenshots', 'Related articles'],
  },

  '/inbox': {
    title: 'Inbox',
    description:
      'Unified message management - chat, emails, form submissions, and notifications in one place.',
    features: [
      'Multi-source inbox',
      'Needs attention / snoozed / resolved tabs',
      'Gmail connection status',
      'Calendar peek',
    ],
  },

  '/inbox/triage': {
    title: 'Inbox Triage',
    description: 'Process incoming messages efficiently - action, snooze, or resolve.',
    features: ['Quick action buttons', 'Batch processing', 'Priority indicators'],
  },

  '/inbox/triage/[threadId]': {
    title: 'Email Thread',
    description: 'View and respond to a specific email thread.',
    features: ['Full thread view', 'Reply and forward', 'Thread actions'],
  },

  '/inbox/history-scan': {
    title: 'Gmail History Scan',
    description: 'Scan your Gmail history for past client communications.',
    features: ['Historical email import', 'Client matching', 'Conversation linking'],
  },

  '/import': {
    title: 'Data Import',
    description: 'Bulk import data - clients, recipes, events, and more.',
    features: ['CSV import', 'Data mapping', 'Validation and preview'],
  },

  '/insights/time-analysis': {
    title: 'Time Analysis',
    description: 'How you spend your time - track hours across activities.',
    features: ['Activity breakdown', 'Time allocation', 'Productivity insights'],
  },

  '/inventory': {
    title: 'Inventory Hub',
    description: 'Ingredient and supply tracking - counts, costs, and waste.',
    features: ['Inventory counts', 'Food cost tracking', 'Vendor invoices', 'Waste tracking'],
  },

  '/inventory/counts': {
    title: 'Inventory Counts',
    description: 'Current ingredient and supply counts.',
    features: ['Item counts', 'Low stock alerts', 'Count history'],
  },

  '/inventory/food-cost': {
    title: 'Inventory Food Cost',
    description: 'Track food costs from inventory usage.',
    features: ['Cost tracking', 'Usage patterns', 'Waste impact'],
  },

  '/inventory/vendor-invoices': {
    title: 'Vendor Invoices',
    description: 'Upload and track vendor invoices for inventory purchases.',
    features: ['Invoice upload', 'Vendor tracking', 'Cost reconciliation'],
  },

  '/inventory/waste': {
    title: 'Waste Tracking',
    description: 'Track food waste to reduce costs and improve sustainability.',
    features: ['Waste logging', 'Cost impact', 'Reduction tracking'],
  },

  '/loyalty': {
    title: 'Loyalty Hub',
    description: 'Manage your client loyalty program.',
    features: ['Points system', 'Reward tiers', 'Referral tracking'],
  },

  '/loyalty/rewards/new': {
    title: 'New Reward',
    description: 'Create a new loyalty reward.',
    features: ['Reward definition', 'Point cost', 'Availability settings'],
  },

  '/loyalty/settings': {
    title: 'Loyalty Settings',
    description: 'Configure loyalty program rules and rewards.',
    features: ['Points per dollar', 'Tier thresholds', 'Reward catalog management'],
  },

  '/menus': {
    title: 'Menus',
    description: 'Quick access to all your menus.',
    features: ['Menu list', 'Status filtering', 'Quick edit'],
  },

  '/menus/new': {
    title: 'New Menu',
    description: 'Create a new menu.',
    features: ['Course builder', 'Recipe selection', 'Service style'],
  },

  '/menus/[id]': {
    title: 'Menu Detail',
    description: 'View a specific menu - courses, recipes, and costing.',
    features: ['Course breakdown', 'Recipe details', 'Cost calculation'],
  },

  '/menus/[id]/editor': {
    title: 'Menu Editor',
    description: 'Visual menu editor - drag and drop courses and recipes.',
    features: ['Drag-and-drop editor', 'Course reordering', 'Recipe swap'],
  },

  '/onboarding': {
    title: 'Onboarding',
    description:
      'Get started with ChefFlow - set up your profile, add clients, recipes, and staff.',
    features: ['Guided setup wizard', '5 setup phases', 'Progress tracking'],
  },

  '/onboarding/clients': {
    title: 'Onboarding: Clients',
    description: 'Add your first clients to ChefFlow.',
    features: ['Client import', 'Manual entry', 'Invitation sending'],
  },

  '/onboarding/recipes': {
    title: 'Onboarding: Recipes',
    description: 'Add your first recipes to your library.',
    features: ['Recipe creation', 'Quick-add form', 'Import options'],
  },

  '/onboarding/staff': {
    title: 'Onboarding: Staff',
    description: 'Add your team members.',
    features: ['Staff entry', 'Role assignment', 'Contact details'],
  },

  '/onboarding/loyalty': {
    title: 'Onboarding: Loyalty',
    description: 'Set up your client loyalty program.',
    features: ['Points system setup', 'Reward definition', 'Program activation'],
  },

  '/production': {
    title: 'Production Schedule',
    description: 'Event production planning - prep timeline and execution schedule.',
    features: ['Production timeline', 'Task sequencing', 'Resource allocation'],
  },

  '/proposals': {
    title: 'Proposals',
    description: 'Create and manage client proposals - menus, pricing, and terms bundled together.',
    features: ['Proposal builder', 'Template library', 'Add-on pricing'],
  },

  '/proposals/templates': {
    title: 'Proposal Templates',
    description: 'Reusable proposal templates.',
    features: ['Template library', 'Quick customize', 'Preview'],
  },

  '/proposals/addons': {
    title: 'Add-On Pricing',
    description: 'Manage optional add-ons and upgrades for proposals.',
    features: ['Add-on catalog', 'Pricing tiers', 'Bundle options'],
  },

  '/receipts': {
    title: 'Receipts',
    description: 'All uploaded expense receipts across events.',
    features: ['Receipt gallery', 'Category filtering', 'Event linkage'],
  },

  '/reputation/mentions': {
    title: 'Social Mentions',
    description: 'Track online mentions and social media references to your brand.',
    features: ['Mention tracking', 'Sentiment analysis', 'Platform monitoring'],
  },

  '/reviews': {
    title: 'Reviews',
    description: 'Client reviews from internal surveys and external platforms.',
    features: ['Unified review feed', 'Source links', 'Sync controls'],
  },

  '/schedule': {
    title: 'Master Schedule',
    description: 'Calendar view of all events, prep, and staff schedules.',
    features: ['Unified calendar', 'Event and prep blocks', 'Staff availability overlay'],
  },

  '/surveys': {
    title: 'Surveys',
    description: 'Client satisfaction surveys - create, send, and review responses.',
    features: ['Survey creation', 'Response tracking', 'Satisfaction metrics'],
  },

  '/testimonials': {
    title: 'Testimonials',
    description: 'Collect and showcase client testimonials.',
    features: ['Testimonial collection', 'Display management', 'Public showcase'],
  },

  '/travel': {
    title: 'Travel',
    description: 'Travel inspiration and planning log.',
    features: ['Travel log', 'Destination tracking', 'Culinary inspiration'],
  },

  '/waitlist': {
    title: 'Waitlist',
    description: 'Manage booking waitlists for fully booked dates.',
    features: ['Waitlist entries', 'Priority management', 'Notification when available'],
  },

  '/wix-submissions': {
    title: 'Wix Submissions',
    description: 'Contact form submissions from your Wix website.',
    features: ['Submission list', 'Claim as inquiry', 'Contact details'],
  },

  '/wix-submissions/[id]': {
    title: 'Submission Detail',
    description: 'View details from a specific Wix form submission.',
    features: ['Full submission data', 'Conversion options', 'Contact info'],
  },

  '/cannabis': {
    title: 'Cannabis Events',
    description:
      'Cannabis-specific event management - compliance, events, invitations, and ledger.',
    features: [
      'Cannabis compliance tools',
      'Event list',
      'Invitation management',
      'Separate ledger',
    ],
  },

  '/cannabis/compliance': {
    title: 'Cannabis Compliance',
    description: 'Cannabis event compliance requirements and documentation.',
    features: ['Regulatory requirements', 'Documentation', 'Compliance checklist'],
  },

  '/cannabis/about': {
    title: 'About Cannabis Portal',
    description: 'Why this portal exists - the task force, the legislation, and the roadmap.',
    features: [
      'Task force background',
      'Legislative timeline',
      'Feature roadmap',
      'External sources',
    ],
  },
  '/cannabis/handbook': {
    title: 'Cannabis Dinner Handbook (Draft)',
    description: 'Internal-only draft outline for cannabis dinner service structure.',
    features: [
      'Service philosophy outline',
      'Extract fundamentals outline',
      'Portioning and infusion workflow outline',
      'Draft-only implementation constraints',
    ],
  },
  '/cannabis/events': {
    title: 'Cannabis Event List',
    description: 'All cannabis-specific events.',
    features: ['Event list', 'Status tracking', 'Compliance indicators'],
  },

  '/cannabis/invite': {
    title: 'Cannabis Invitation',
    description: 'Send invitations for cannabis dining events.',
    features: ['Invitation creation', 'Guest list', 'Event details'],
  },

  '/cannabis/ledger': {
    title: 'Cannabis Ledger',
    description: 'Financial ledger for cannabis event transactions.',
    features: ['Transaction log', 'Revenue tracking', 'Compliance-ready records'],
  },
}
