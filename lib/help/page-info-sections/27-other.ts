import type { PageInfoEntry } from '../page-info-types'

export const OTHER_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/unauthorized': {
    title: 'Unauthorized',
    description: "You don't have access to this page.",
    features: ['Access denied message', 'Sign in link', 'Contact support'],
  },

  '/client/[token]': {
    title: 'Client Portal',
    description: 'Token-based client portal access.',
    features: ['Direct access via link', 'No password required', 'Event details'],
  },
}
