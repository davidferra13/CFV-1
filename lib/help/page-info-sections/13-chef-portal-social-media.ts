import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_SOCIAL_MEDIA_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/social': {
    title: 'Social Hub',
    description: 'Social media management — plan, create, and schedule posts.',
    features: ['Post calendar', 'Content creation', 'Platform connections', 'Analytics'],
  },

  '/social/planner': {
    title: 'Social Planner',
    description: 'Monthly social media calendar — plan and schedule posts.',
    features: ['Monthly calendar view', 'Post scheduling', 'Content ideas'],
  },

  '/social/planner/[month]': {
    title: 'Monthly Planner',
    description: 'Social media plan for a specific month.',
    features: ['Day-by-day post plan', 'Content status', 'Platform targeting'],
  },

  '/social/posts/[id]': {
    title: 'Post Detail',
    description: 'View and edit a specific social media post.',
    features: ['Post content', 'Platform targeting', 'Schedule and status'],
  },

  '/social/vault': {
    title: 'Content Vault',
    description: 'Pre-made post templates and content library.',
    features: ['Template library', 'Quick customize', 'Seasonal content'],
  },

  '/social/connections': {
    title: 'Social Connections',
    description: 'Connect your Instagram, Facebook, TikTok, and other social accounts.',
    features: ['Account connections', 'Platform status', 'Auth management'],
  },

  '/social/settings': {
    title: 'Social Settings',
    description: 'Social media configuration and preferences.',
    features: ['Posting preferences', 'Platform defaults', 'Content guidelines'],
  },
}
