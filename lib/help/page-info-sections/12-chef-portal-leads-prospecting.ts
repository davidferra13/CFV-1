import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_LEADS_PROSPECTING_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/leads': {
    title: 'Website Leads',
    description: 'Contact form submissions from your website - claim and convert to inquiries.',
    features: [
      'Lead list',
      'Claim into inquiry pipeline',
      'Manual lead creation',
      'Status tracking',
    ],
  },

  '/leads/new': {
    title: 'New Lead',
    description: 'Manually add a new lead to your pipeline.',
    features: ['Lead info form', 'Source tracking', 'Priority assignment'],
  },

  '/leads/qualified': {
    title: 'Qualified Leads',
    description: 'Leads that have been vetted and are ready for outreach.',
    features: ['Qualified lead list', 'Contact details', 'Conversion readiness'],
  },

  '/leads/contacted': {
    title: 'Contacted Leads',
    description: "Leads you've already reached out to.",
    features: ['Contacted list', 'Response status', 'Follow-up scheduling'],
  },

  '/leads/converted': {
    title: 'Converted Leads',
    description: 'Leads that became inquiries or clients.',
    features: ['Conversion history', 'Source attribution', 'Revenue generated'],
  },

  '/leads/archived': {
    title: 'Archived Leads',
    description: 'Past or inactive leads - kept for reference.',
    features: ['Archive history', 'Reactivation option', 'Reason tracking'],
  },

  '/prospecting': {
    title: 'Prospecting Hub',
    description: 'AI-powered lead database - find and qualify new business opportunities.',
    features: [
      'Prospect count and status',
      'Search and filter',
      'Follow-ups due',
      'Conversion tracking',
    ],
  },

  '/prospecting/[id]': {
    title: 'Prospect Detail',
    description: 'Full view of a specific prospect - contact info, notes, and outreach history.',
    features: ['Prospect profile', 'Outreach history', 'Notes and follow-ups'],
  },

  '/prospecting/queue': {
    title: 'Call Queue',
    description: 'Prospect call queue - outbound dialing and follow-up scheduling.',
    features: ['Call list', 'Priority ordering', 'Call outcomes'],
  },

  '/prospecting/scripts': {
    title: 'Outreach Scripts',
    description: 'Call scripts and talking points for prospect outreach.',
    features: ['Script templates', 'Customizable talking points', 'Outcome tracking'],
  },

  '/prospecting/scrub': {
    title: 'AI Scrub',
    description: 'AI-powered lead list cleaning and validation.',
    features: ['List upload', 'Duplicate detection', 'Data enrichment'],
  },
}
