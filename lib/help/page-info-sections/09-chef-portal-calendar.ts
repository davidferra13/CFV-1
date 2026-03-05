import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_CALENDAR_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/calendar': {
    title: 'Calendar',
    description: 'Your master calendar — events, prep blocks, and availability in one view.',
    features: [
      'Month, week, day, and year views',
      'Event and prep block display',
      'Shared calendar link',
    ],
  },

  '/calendar/day': {
    title: 'Day View',
    description: 'Detailed view of a single day — events, prep, and tasks.',
    features: ['Hourly schedule', 'Event and prep blocks', 'Task list'],
  },

  '/calendar/week': {
    title: 'Week View',
    description: 'Seven-day overview — see your full week at a glance.',
    features: ['7-day grid', 'Event placement', 'Availability gaps'],
  },

  '/calendar/year': {
    title: 'Year View',
    description: 'Annual overview — see busy and quiet months across the year.',
    features: ['12-month grid', 'Event density indicators', 'Seasonal patterns'],
  },

  '/calendar/share': {
    title: 'Shared Calendar',
    description: 'Shareable calendar link — let clients and partners see your availability.',
    features: ['Public availability link', 'Privacy controls', 'Booking integration'],
  },
}
