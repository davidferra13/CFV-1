import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_OPERATIONS_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/ops': {
    title: 'Operations Hub',
    description: 'Equipment and kitchen rental management.',
    features: [
      'Equipment items count and maintenance alerts',
      'Kitchen rental bookings and spend',
      'Navigation tiles to equipment and kitchen rentals',
    ],
  },

  '/ops/equipment': {
    title: 'Equipment Inventory',
    description: 'Track your owned equipment - maintenance schedules and per-event rental costs.',
    features: ['Equipment list', 'Maintenance due dates', 'Per-event rental costs'],
  },

  '/ops/kitchen-rentals': {
    title: 'Kitchen Rentals',
    description: 'Commercial kitchen booking log - hours, costs, and event linkage.',
    features: ['Kitchen bookings', 'Hours and costs', 'Event linkage'],
  },
}
