// Static nav data used by the chef navigation sidebar and mobile nav.
// Extracted from chef-nav.tsx for maintainability.
import type { LucideIcon } from '@/components/ui/icons'
import { Plus } from '@/components/ui/icons'

export type NavQuickItem = { href: string; label: string; icon: LucideIcon }

export const QUICK_CREATE_ITEMS: NavQuickItem[] = [
  { href: '/events/new', label: 'Event', icon: Plus },
  { href: '/quotes/new', label: 'Quote', icon: Plus },
  { href: '/inquiries/new', label: 'Inquiry', icon: Plus },
  { href: '/clients/new', label: 'Client', icon: Plus },
]

export const cannabisSectionItems = [
  { href: '/cannabis', label: 'Cannabis Hub' },
  { href: '/cannabis/events', label: 'Cannabis Events' },
  { href: '/cannabis/rsvps', label: 'RSVPs' },
  { href: '/cannabis/ledger', label: 'Cannabis Ledger' },
  { href: '/cannabis/invite', label: 'Invite' },
  { href: '/cannabis/handbook', label: 'Handbook (Draft)' },
  { href: '/cannabis/compliance', label: 'Compliance' },
  { href: '/cannabis/about', label: 'About' },
]

export const communitySectionItems = [
  { href: '/network', label: 'Community Hub' },
  { href: '/network?tab=feed', label: 'Feed' },
  { href: '/network?tab=channels', label: 'Channels' },
  { href: '/network?tab=discover', label: 'Discover Chefs' },
  { href: '/network?tab=connections', label: 'Connections' },
  { href: '/network/saved', label: 'Saved Posts' },
  { href: '/network/notifications', label: 'Notifications' },
]
