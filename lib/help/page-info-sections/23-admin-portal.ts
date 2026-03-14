import type { PageInfoEntry } from '../page-info-types'

export const ADMIN_PORTAL_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/admin': {
    title: 'Platform Overview',
    description: 'Admin command center — KPIs, live sessions, and quick-action tiles.',
    features: [
      '8 stat cards (chefs, clients, events, GMV)',
      'Quick access tiles to all admin sections',
    ],
  },

  '/admin/analytics': {
    title: 'Platform Analytics',
    description: 'Growth trends, revenue by month, and signup charts.',
    features: [
      'KPI summary cards',
      '12-month GMV chart',
      'New signups (chefs vs clients)',
      'Growth metrics',
    ],
  },

  '/admin/audit': {
    title: 'Audit Log',
    description: 'Immutable record of sensitive platform actions.',
    features: [
      'Audit table (timestamp, actor, action, target)',
      '200-entry view',
      'Full detail per action',
    ],
  },

  '/admin/cannabis': {
    title: 'Cannabis Tier Admin',
    description: 'Control cannabis portal access — approve, grant, and manage tiers.',
    features: ['User tier list', 'Pending invite approvals', 'Direct grant functionality'],
  },

  '/admin/clients': {
    title: 'All Clients',
    description: 'Every client across all chef tenants.',
    features: ['Total count and LTV', 'Sortable table', 'Chef assignment'],
  },

  '/admin/communications': {
    title: 'Communications',
    description: 'Platform announcements and direct messaging to chefs.',
    features: ['Announcement banner form', 'Direct email', 'Broadcast email'],
  },

  '/admin/events': {
    title: 'All Events',
    description: 'Every event across all chefs — platform-wide view.',
    features: ['Status distribution', 'Events table', 'Chef and status filters'],
  },

  '/admin/feedback': {
    title: 'User Feedback',
    description: 'All user-submitted feedback — sentiment analysis and trends.',
    features: ['Sentiment chips', 'Feedback table', 'Page context tracking'],
  },

  '/admin/financials': {
    title: 'Platform Financials',
    description: 'Platform-wide GMV, ledger entries, and payment health.',
    features: ['GMV all-time and this month', 'Expenses', 'Ledger table'],
  },

  '/admin/flags': {
    title: 'Feature Flags',
    description: 'Per-chef feature flag management.',
    features: ['Flag reference legend', 'Toggle per chef', 'Flag status overview'],
  },

  '/admin/presence': {
    title: 'Live Presence',
    description: "Real-time visitor tracking — who's online right now.",
    features: ['Live indicator', 'Anonymous visitors', 'Logged-in users'],
  },

  '/admin/reconciliation': {
    title: 'Platform Reconciliation',
    description: 'Cross-tenant GMV, transfers, fees, and deferred amounts.',
    features: ['GMV summary', 'Per-chef reconciliation', 'Stripe Connect status'],
  },

  '/admin/referral-partners': {
    title: 'All Partners',
    description: 'Referral partners across every chef tenant.',
    features: ['Partner stats', 'Type breakdown', 'Partners table'],
  },

  '/admin/system': {
    title: 'System Health',
    description: 'Database row counts and data integrity signals.',
    features: [
      'Row count grid',
      'Integrity signals',
      'External dashboard links (Supabase, Vercel, Stripe)',
    ],
  },

  '/admin/users': {
    title: 'All Chefs',
    description: 'Every chef account on the platform.',
    features: ['Chef table', 'Health score', 'GMV', 'Tier status'],
  },

  '/admin/users/[chefId]': {
    title: 'Chef Detail',
    description: "Full view of a single chef's account — financials, health, events, and clients.",
    features: [
      'Health score breakdown',
      'Financial summary',
      'Event and client lists',
      'Credit form',
      'Danger zone',
    ],
  },

  '/admin/animations': {
    title: 'Animation Lab',
    description: 'Test and preview holiday and milestone animations.',
    features: ['Holiday animation buttons', 'Milestone triggers', 'Playback controls'],
  },
}
