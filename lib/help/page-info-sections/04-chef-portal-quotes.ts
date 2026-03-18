import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_QUOTES_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/quotes': {
    title: 'Quotes',
    description: 'Your quote pipeline - draft, send, and track pricing proposals.',
    features: [
      'Filter by status (draft, sent, accepted, rejected, expired, viewed)',
      'Quote value totals',
      'Expiring soon alerts',
      'Quick insights panel',
    ],
  },

  '/quotes/new': {
    title: 'New Quote',
    description: 'Build a new pricing quote for a client - line items, pricing, and terms.',
    features: [
      'Line-item builder',
      'Per-person pricing calculator',
      'Deposit and payment term configuration',
      'Expiration date setting',
    ],
  },

  '/quotes/[id]': {
    title: 'Quote Detail',
    description: 'View and manage a specific quote - pricing, status, and client response.',
    features: [
      'Full pricing breakdown',
      'Status tracking (draft → sent → accepted/rejected)',
      'Client response history',
      'Convert accepted quotes to events',
      'PDF export',
    ],
  },

  '/quotes/[id]/edit': {
    title: 'Edit Quote',
    description: 'Modify quote pricing, line items, terms, and expiration.',
    features: [
      'Edit line items and pricing',
      'Update payment terms',
      'Adjust expiration date',
      'Add notes and special conditions',
    ],
  },

  '/quotes/draft': {
    title: 'Draft Quotes',
    description: 'Quotes still being prepared - not yet sent to clients.',
    features: ['Draft list', 'Potential revenue value', 'Quick edit and send'],
  },

  '/quotes/sent': {
    title: 'Sent Quotes',
    description: 'Quotes that have been sent and are awaiting client response.',
    features: ['Pending quotes list', 'Days since sent', 'Follow-up reminders'],
  },

  '/quotes/accepted': {
    title: 'Accepted Quotes',
    description: 'Quotes the client has accepted - ready to convert to events.',
    features: ['Accepted quotes list', 'Convert to event action', 'Revenue confirmed'],
  },

  '/quotes/rejected': {
    title: 'Rejected Quotes',
    description: 'Quotes that were declined by clients - learn and improve.',
    features: ['Rejection history', 'Feedback notes', 'Price comparison insights'],
  },

  '/quotes/expired': {
    title: 'Expired Quotes',
    description: 'Quotes that passed their expiration date without client action.',
    features: ['Expired quotes list', 'Re-send or archive options', 'Lost revenue tracking'],
  },

  '/quotes/viewed': {
    title: 'Viewed Quotes',
    description: 'Quotes the client has opened but not yet responded to.',
    features: ['View tracking', 'Time since viewed', 'Follow-up prompts'],
  },
}
