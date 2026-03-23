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

// Cannabis feature is disabled - empty array keeps imports working
export const cannabisSectionItems: { href: string; label: string }[] = []

export const communitySectionItems = [
  { href: '/network', label: 'Community Hub' },
  { href: '/network?tab=feed', label: 'Feed' },
  { href: '/network?tab=channels', label: 'Channels' },
  { href: '/network?tab=discover', label: 'Discover Chefs' },
  { href: '/network?tab=connections', label: 'Connections' },
  { href: '/network/saved', label: 'Saved Posts' },
  { href: '/network/notifications', label: 'Notifications' },
]
