import type { PageInfoEntry } from '../page-info-types'

export const CLIENT_PORTAL_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/my-events': {
    title: 'My Events',
    description: 'Your upcoming and past events - check status, make payments, and leave reviews.',
    features: [
      'Upcoming events with status badges',
      'Past event history',
      'Loyalty status and points',
      'Post-event review prompts',
      'Quick messaging to your chef',
    ],
  },

  '/my-events/[id]': {
    title: 'Event Detail',
    description:
      'Everything about your event - timeline, menu, payments, photos, and action buttons.',
    features: [
      'Event status and journey timeline',
      'Menu preview and approval',
      'Payment summary and history',
      'Photo gallery',
      'Guest sharing and RSVP',
      'Post-event review and feedback',
    ],
  },

  '/my-events/[id]/proposal': {
    title: 'Proposal',
    description: "Your chef's proposal - menu, pricing, and contract all in one view.",
    features: ['Menu preview', 'Pricing breakdown', 'Contract view', 'Accept and pay actions'],
  },

  '/my-events/[id]/pay': {
    title: 'Payment',
    description: 'Make a payment for your event - secure checkout via Stripe.',
    features: [
      'Payment summary',
      'Financial breakdown',
      'Cancellation policy',
      'Secure Stripe checkout',
    ],
  },

  '/my-events/[id]/invoice': {
    title: 'Invoice',
    description: 'View and download your event invoice.',
    features: ['Full invoice view', 'Download option', 'Payment status'],
  },

  '/my-events/[id]/contract': {
    title: 'Contract',
    description: 'Review and sign your service agreement.',
    features: ['Contract terms', 'Digital signature', 'Signing status'],
  },

  '/my-events/[id]/approve-menu': {
    title: 'Menu Approval',
    description: 'Review and approve your event menu, or request revisions.',
    features: ['Menu display', 'Approve button', 'Request revisions option'],
  },

  '/my-events/[id]/payment-plan': {
    title: 'Payment Plan',
    description: 'View installment schedule options for your event payment.',
    features: ['Milestone-based payment schedule', 'Payment calculator', 'Plan options'],
  },

  '/my-events/[id]/countdown': {
    title: 'Event Countdown',
    description: 'Countdown timer to your upcoming event with preparation milestones.',
    features: ['Days remaining display', 'Preparation milestones', 'Excitement builder'],
  },

  '/my-events/[id]/pre-event-checklist': {
    title: 'Pre-Event Checklist',
    description: 'Confirm dietary preferences and kitchen details before your event.',
    features: ['Dietary restriction confirmation', 'Allergy updates', 'Kitchen setup questions'],
  },

  '/my-events/[id]/event-summary': {
    title: 'Event Summary',
    description: 'Post-event recap - menu served, timeline, photos, and highlights.',
    features: ['Menu recap', 'Event timeline', 'Photo summary', 'Highlights'],
  },

  '/my-events/history': {
    title: 'Past Events',
    description: 'Complete history of all your past events.',
    features: ['Event cards with details', 'Leave reviews', 'Pay outstanding balances'],
  },

  '/my-inquiries': {
    title: 'My Inquiries',
    description: 'Track the status of your catering inquiries.',
    features: ['Inquiry list sorted by date', 'Status badges', 'Click to view details'],
  },

  '/my-inquiries/[id]': {
    title: 'Inquiry Detail',
    description: 'View your inquiry summary and its current status.',
    features: ['Inquiry summary', 'Journey status stepper', 'Link to resulting event'],
  },

  '/my-quotes': {
    title: 'My Quotes',
    description: 'Review and respond to pricing quotes from your chef.',
    features: ['Pending quotes needing action', 'Previous quotes', 'Download PDF option'],
  },

  '/my-quotes/[id]': {
    title: 'Quote Detail',
    description: 'View quote pricing, respond with acceptance or questions.',
    features: [
      'Pricing summary',
      'Per-person calculation',
      'Deposit amount',
      'Accept or message chef',
    ],
  },

  '/book-now': {
    title: 'Book Now',
    description: 'Submit a new catering inquiry to your chef.',
    features: ['Inquiry form', 'Event details input', 'Dietary requirements'],
  },

  '/my-profile': {
    title: 'My Profile',
    description:
      'Edit your profile - name, contact, dietary preferences, and notification settings.',
    features: [
      'Profile form',
      'Dietary restrictions',
      'Notification preferences',
      'Feedback section',
    ],
  },

  '/my-chat': {
    title: 'Messages',
    description: 'Conversations with your chef.',
    features: ['Conversation list', 'Real-time messaging'],
  },

  '/my-chat/[id]': {
    title: 'Chat',
    description: 'Direct message thread with your chef.',
    features: ['Message history', 'Real-time updates', 'File sharing'],
  },

  '/my-spending': {
    title: 'My Spending',
    description: 'Your spending history - total spent, average event cost, and trends.',
    features: ['Total spending', 'Average event cost', 'Spending trends'],
  },

  '/my-rewards': {
    title: 'My Rewards',
    description: 'Your loyalty points, tier progress, and available rewards.',
    features: [
      'Points balance',
      'Tier progress bar',
      'Available rewards',
      'Points earning history',
    ],
  },

  '/my-cannabis': {
    title: 'Cannabis Dining',
    description: 'Your private cannabis dining events - upcoming and past.',
    features: ['Cannabis events list', 'Access verification', 'Event details'],
  },

  '/survey/[token]': {
    title: 'Satisfaction Survey',
    description: 'Share your feedback about a recent event - help your chef improve.',
    features: ['Survey form', 'Rating and comments', 'One-time submission'],
  },
}
