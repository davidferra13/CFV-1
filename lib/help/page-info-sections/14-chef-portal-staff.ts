import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_STAFF_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/staff': {
    title: 'Staff Roster',
    description: 'Manage your team — add staff, set roles, and track hourly rates.',
    features: [
      'Active staff list with role and hourly rate',
      'Add new team member form',
      'Inactive staff section',
      'Inline edit for contact and pay details',
    ],
  },

  '/staff/availability': {
    title: 'Staff Availability',
    description: 'See when your team is available for events.',
    features: ['Availability calendar', 'Per-staff schedules', 'Conflict detection'],
  },

  '/staff/schedule': {
    title: 'Staff Schedule',
    description: 'Shift scheduling for upcoming events.',
    features: ['Event-based scheduling', 'Role assignments', 'Shift management'],
  },

  '/staff/labor': {
    title: 'Labor Costs',
    description: 'Labor cost analytics — track staff expenses by event and period.',
    features: ['Labor cost by event', 'Total labor spend', 'Hourly rate tracking'],
  },

  '/staff/performance': {
    title: 'Staff Performance',
    description: 'Track staff performance, reliability, and feedback.',
    features: ['Performance metrics', 'Event feedback', 'Reliability tracking'],
  },

  '/staff/clock': {
    title: 'Time Clock',
    description: 'Staff time tracking — clock in/out for events and prep.',
    features: ['Clock in/out', 'Hours logged', 'Timesheet export'],
  },
}
