import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_EXPENSES_TOP_LEVEL_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/expenses': {
    title: 'Expenses',
    description: 'All business expenses with category filters and export.',
    features: [
      'Monthly summary cards',
      'Category filters (food, labor, rental, travel, marketing, software, misc)',
      'Event-grouped display',
      'CSV export',
    ],
  },

  '/expenses/[id]': {
    title: 'Expense Detail',
    description: 'View or edit a specific expense - amount, category, receipt, and event linkage.',
    features: ['Full expense data', 'Receipt image', 'Category and vendor', 'Event linkage'],
  },

  '/expenses/new': {
    title: 'New Expense',
    description: 'Log a new business expense.',
    features: [
      'Date picker',
      'Category selector',
      'Vendor input',
      'Event linkage',
      'Business/personal flag',
    ],
  },
}
