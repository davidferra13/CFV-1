import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_SAFETY_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/safety': {
    title: 'Safety Hub',
    description: 'Food safety, incident documentation, and backup planning.',
    features: ['Incident log', 'Backup chef assignment', 'Safety protocols'],
  },

  '/safety/backup-chef': {
    title: 'Backup Chef',
    description: "Designate an emergency backup chef in case you can't make an event.",
    features: ['Backup assignment', 'Contact details', 'Event contingency'],
  },

  '/safety/incidents': {
    title: 'Safety Incidents',
    description:
      'Document safety incidents — food safety, injuries, equipment failures, near-misses.',
    features: [
      'Incident list with dates',
      'Category (food safety, injury, equipment, near-miss)',
      'Legal documentation',
    ],
  },

  '/safety/incidents/new': {
    title: 'Report Incident',
    description: 'File a new safety incident report.',
    features: ['Incident type selection', 'Date and details', 'Resolution tracking'],
  },

  '/safety/incidents/[id]': {
    title: 'Incident Detail',
    description: 'Full incident report — details, resolution, and follow-up actions.',
    features: ['Incident details', 'Resolution status', 'Follow-up actions'],
  },
}
