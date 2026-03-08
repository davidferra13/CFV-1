// Centralized navigation configuration (single source of truth)
// IA principle: show only core workflows first; keep advanced pages one click deeper.
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Compass,
  DollarSign,
  FileText,
  Gift,
  GlassWater,
  Handshake,
  Hash,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Rss,
  Settings,
  Target,
  Users,
  UtensilsCrossed,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: LucideIcon }
type NavSubItem = {
  href: string
  label: string
  icon?: LucideIcon
  visibility?: 'secondary' | 'advanced'
}
type NavCollapsibleItem = NavItem & { children?: NavSubItem[] }
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavCollapsibleItem[] }
type PrimaryShortcutOption = NavItem & { context: string }

// Primary always-visible shortcuts
export const standaloneTop: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/inquiries', label: 'Inquiries', icon: Inbox },
  { href: '/chat', label: 'Messaging', icon: MessageCircle },
  { href: '/schedule', label: 'Calendar', icon: CalendarDays },
  { href: '/events', label: 'All Events', icon: CalendarDays },
  { href: '/travel', label: 'Travel', icon: MapPin },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/goals', label: 'Goals', icon: Target },
]

// Main domains
export const navGroups: NavGroup[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: Inbox,
    items: [
      {
        href: '/inquiries/awaiting-response',
        label: 'Inquiry Stages',
        icon: Inbox,
        children: [
          { href: '/inquiries/awaiting-client-reply', label: 'Awaiting Client Reply' },
          { href: '/inquiries/menu-drafting', label: 'Menu Drafting' },
          { href: '/inquiries/sent-to-client', label: 'Sent to Client' },
          { href: '/inquiries/new', label: 'Log New Inquiry', visibility: 'advanced' },
          { href: '/inquiries/declined', label: 'Declined', visibility: 'advanced' },
        ],
      },
      {
        href: '/quotes',
        label: 'Quotes',
        icon: FileText,
        children: [
          { href: '/quotes/sent', label: 'Sent' },
          { href: '/quotes/viewed', label: 'Viewed' },
          { href: '/quotes/accepted', label: 'Accepted' },
          { href: '/quotes/new', label: 'New Quote', visibility: 'advanced' },
          { href: '/quotes/draft', label: 'Draft', visibility: 'advanced' },
          { href: '/quotes/expired', label: 'Expired', visibility: 'advanced' },
          { href: '/quotes/rejected', label: 'Rejected', visibility: 'advanced' },
        ],
      },
      {
        href: '/leads',
        label: 'Leads',
        icon: Target,
        children: [
          { href: '/leads/new', label: 'New', visibility: 'advanced' },
          { href: '/leads/contacted', label: 'Contacted', visibility: 'advanced' },
          { href: '/leads/qualified', label: 'Qualified', visibility: 'advanced' },
          { href: '/leads/converted', label: 'Converted', visibility: 'advanced' },
          { href: '/leads/archived', label: 'Archived', visibility: 'advanced' },
        ],
      },
      {
        href: '/calls',
        label: 'Calls & Meetings',
        icon: Phone,
        children: [
          { href: '/calls?status=scheduled', label: 'Upcoming' },
          { href: '/calls?status=completed', label: 'Completed' },
          { href: '/calls/new', label: 'Schedule Call', visibility: 'advanced' },
        ],
      },
      {
        href: '/partners',
        label: 'Partners',
        icon: Handshake,
        children: [
          { href: '/partners/active', label: 'Active' },
          { href: '/partners/inactive', label: 'Inactive' },
          { href: '/partners/new', label: 'Add Partner' },
          { href: '/partners/referral-performance', label: 'Referral Performance', visibility: 'advanced' },
          { href: '/partners/events-generated', label: 'Events Generated', visibility: 'advanced' },
        ],
      },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    icon: CalendarDays,
    items: [
      {
        href: '/events/upcoming',
        label: 'Event Status',
        icon: CalendarDays,
        children: [
          { href: '/events/new', label: 'Create Event' },
          { href: '/events/awaiting-deposit', label: 'Awaiting Deposit' },
          { href: '/events/confirmed', label: 'Confirmed' },
          { href: '/events/completed', label: 'Completed' },
          { href: '/events/cancelled', label: 'Cancelled' },
        ],
      },
      {
        href: '/calendar',
        label: 'Availability',
        icon: CalendarDays,
        children: [
          { href: '/calendar/day', label: 'Day View' },
          { href: '/calendar/week', label: 'Week Planner' },
          { href: '/calendar/year', label: 'Year View' },
          { href: '/waitlist', label: 'Waitlist', visibility: 'advanced' },
        ],
      },
      {
        href: '/menus',
        label: 'Menus & Recipes',
        icon: UtensilsCrossed,
        children: [
          { href: '/menus/new', label: 'New Menu' },
          { href: '/recipes', label: 'Recipes' },
          { href: '/recipes/ingredients', label: 'Ingredients' },
          { href: '/recipes/new', label: 'New Recipe', visibility: 'advanced' },
          { href: '/culinary/menus', label: 'Culinary Menus', visibility: 'advanced' },
          { href: '/culinary/recipes', label: 'Culinary Recipes', visibility: 'advanced' },
          { href: '/culinary/prep', label: 'Prep Workspace', visibility: 'advanced' },
          { href: '/culinary/components', label: 'Components', visibility: 'advanced' },
          { href: '/culinary/ingredients', label: 'Ingredients Database', visibility: 'advanced' },
          { href: '/culinary/costing', label: 'Costing', visibility: 'advanced' },
          { href: '/culinary/vendors', label: 'Vendor Directory', visibility: 'advanced' },
          { href: '/culinary/beverages', label: 'Beverages', icon: GlassWater, visibility: 'advanced' },
        ],
      },
      {
        href: '/staff',
        label: 'Operations Tools',
        icon: ClipboardCheck,
        children: [
          { href: '/aar', label: 'After Action Reviews' },
          { href: '/reviews', label: 'Reviews' },
          { href: '/import', label: 'Smart Import' },
          { href: '/operations/kitchen-rentals', label: 'Kitchen Rentals', visibility: 'advanced' },
          { href: '/operations/equipment', label: 'Equipment Inventory', visibility: 'advanced' },
        ],
      },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    items: [
      {
        href: '/clients',
        label: 'Client Directory',
        icon: Users,
        children: [
          { href: '/clients/active', label: 'Active' },
          { href: '/clients/inactive', label: 'Inactive' },
          { href: '/clients/vip', label: 'VIP' },
          { href: '/clients/gift-cards', label: 'Gift Cards' },
          { href: '/clients/new', label: 'Add Client', visibility: 'advanced' },
        ],
      },
      {
        href: '/loyalty',
        label: 'Loyalty & Retention',
        icon: Gift,
        children: [
          { href: '/loyalty/settings', label: 'Program Settings' },
          { href: '/loyalty/rewards/new', label: 'Create Reward' },
          { href: '/clients/communication', label: 'Communication', visibility: 'advanced' },
          { href: '/clients/communication/notes', label: 'Client Notes', visibility: 'advanced' },
          { href: '/clients/communication/follow-ups', label: 'Follow-Ups', visibility: 'advanced' },
          { href: '/clients/communication/upcoming-touchpoints', label: 'Upcoming Touchpoints', visibility: 'advanced' },
          { href: '/clients/history', label: 'History', visibility: 'advanced' },
          { href: '/clients/history/event-history', label: 'Event History', visibility: 'advanced' },
          { href: '/clients/history/past-menus', label: 'Past Menus', visibility: 'advanced' },
          { href: '/clients/history/spending-history', label: 'Spending History', visibility: 'advanced' },
          { href: '/clients/preferences', label: 'Preferences', visibility: 'advanced' },
          { href: '/clients/preferences/dietary-restrictions', label: 'Dietary Restrictions', visibility: 'advanced' },
          { href: '/clients/preferences/allergies', label: 'Allergies', visibility: 'advanced' },
          { href: '/clients/preferences/favorite-dishes', label: 'Favorite Dishes', visibility: 'advanced' },
          { href: '/clients/preferences/dislikes', label: 'Dislikes', visibility: 'advanced' },
          { href: '/clients/insights', label: 'Insights', visibility: 'advanced' },
          { href: '/clients/insights/top-clients', label: 'Top Clients', visibility: 'advanced' },
          { href: '/clients/insights/most-frequent', label: 'Most Frequent', visibility: 'advanced' },
          { href: '/clients/insights/at-risk', label: 'At Risk', visibility: 'advanced' },
          { href: '/clients/loyalty', label: 'Loyalty Overview', visibility: 'advanced' },
          { href: '/clients/loyalty/points', label: 'Points', visibility: 'advanced' },
          { href: '/clients/loyalty/rewards', label: 'Rewards', visibility: 'advanced' },
          { href: '/clients/loyalty/referrals', label: 'Referrals', visibility: 'advanced' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    items: [
      {
        href: '/financials',
        label: 'Financial Hub',
        icon: DollarSign,
        children: [
          { href: '/finance', label: 'Finance (Legacy)', visibility: 'advanced' },
          { href: '/expenses', label: 'Expenses' },
          { href: '/expenses/new', label: 'Add Expense' },
          { href: '/finance/expenses', label: 'Expenses by Category', visibility: 'advanced' },
          { href: '/finance/invoices', label: 'Invoices', visibility: 'advanced' },
          { href: '/finance/payments', label: 'Payments', visibility: 'advanced' },
          { href: '/finance/payouts', label: 'Payouts', visibility: 'advanced' },
          { href: '/finance/ledger', label: 'Ledger', visibility: 'advanced' },
          { href: '/finance/reporting', label: 'Reporting', visibility: 'advanced' },
          { href: '/finance/overview', label: 'Overview', visibility: 'advanced' },
          { href: '/finance/reporting/revenue-by-month', label: 'Revenue by Month', visibility: 'advanced' },
          { href: '/finance/reporting/revenue-by-client', label: 'Revenue by Client', visibility: 'advanced' },
          { href: '/finance/reporting/revenue-by-event', label: 'Revenue by Event', visibility: 'advanced' },
          { href: '/finance/reporting/expense-by-category', label: 'Expense by Category', visibility: 'advanced' },
          { href: '/finance/reporting/profit-by-event', label: 'Profit by Event', visibility: 'advanced' },
          { href: '/finance/reporting/year-to-date-summary', label: 'Year-to-Date Summary', visibility: 'advanced' },
          { href: '/finance/reporting/tax-summary', label: 'Tax Summary', visibility: 'advanced' },
          { href: '/finance/invoices/sent', label: 'Sent Invoices', visibility: 'advanced' },
          { href: '/finance/invoices/paid', label: 'Paid Invoices', visibility: 'advanced' },
          { href: '/finance/invoices/overdue', label: 'Overdue Invoices', visibility: 'advanced' },
          { href: '/finance/payments/deposits', label: 'Deposits', visibility: 'advanced' },
          { href: '/finance/payments/installments', label: 'Installments', visibility: 'advanced' },
          { href: '/finance/payments/refunds', label: 'Refunds', visibility: 'advanced' },
          { href: '/finance/payouts/stripe-payouts', label: 'Stripe Payouts', visibility: 'advanced' },
          { href: '/finance/ledger/transaction-log', label: 'Transaction Log', visibility: 'advanced' },
          { href: '/finance/tax', label: 'Tax Center', visibility: 'advanced' },
        ],
      },
    ],
  },
  {
    id: 'more',
    label: 'More',
    icon: ListChecks,
    items: [
      {
        href: '/goals/setup',
        label: 'Goal Setup',
        icon: Target,
      },
      {
        href: '/insights',
        label: 'Intelligence',
        icon: BarChart3,
        children: [
          { href: '/analytics', label: 'Source Analytics' },
          { href: '/insights/time-analysis', label: 'Time Analysis', visibility: 'advanced' },
        ],
      },
      {
        href: '/queue',
        label: 'Priority Queue',
        icon: Activity,
      },
      {
        href: '/network',
        label: 'Community',
        icon: Rss,
        children: [
          { href: '/network?tab=feed',        label: 'Feed',               icon: Rss },
          { href: '/network?tab=channels',    label: 'Channels',           icon: Hash },
          { href: '/network?tab=discover',    label: 'Discover Chefs',     icon: Compass },
          { href: '/network?tab=connections', label: 'Connections',        icon: Handshake },
          { href: '/network/saved',           label: 'Saved Posts',        visibility: 'advanced' },
          { href: '/network/notifications',   label: 'Notifications',      visibility: 'advanced' },
          { href: '/network/channels/pastry',         label: '#pastry',        visibility: 'advanced' },
          { href: '/network/channels/savory',         label: '#savory',        visibility: 'advanced' },
          { href: '/network/channels/business',       label: '#business',      visibility: 'advanced' },
          { href: '/network/channels/technique',      label: '#technique',     visibility: 'advanced' },
          { href: '/network/channels/wins',           label: '#wins',          visibility: 'advanced' },
        ],
      },
      {
        href: '/social/planner',
        label: 'Marketing Agent',
        icon: Mail,
        children: [
          { href: '/social/planner', label: 'Content Planner' },
          { href: '/social/vault', label: 'Media Vault' },
          { href: '/social/connections', label: 'Platform Connections' },
          { href: '/social/settings', label: 'Queue Settings', visibility: 'advanced' },
        ],
      },
      {
        href: '/marketing',
        label: 'Email Campaigns',
        icon: Mail,
      },
      {
        href: '/inbox/history-scan',
        label: 'Inbox Tools',
        icon: MessageCircle,
        children: [
          { href: '/inbox/triage', label: 'Communication Triage', visibility: 'advanced' },
        ],
      },
    ],
  },
]

export const standaloneBottom: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const mobileTabItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
]

const settingsShortcutOptions: PrimaryShortcutOption[] = [
  { href: '/settings/navigation', label: 'Navigation', icon: Settings, context: 'Settings' },
  { href: '/settings/dashboard', label: 'Dashboard Widgets', icon: Settings, context: 'Settings' },
  { href: '/settings/my-profile', label: 'My Profile', icon: Settings, context: 'Settings' },
  { href: '/settings/public-profile', label: 'Public Profile', icon: Settings, context: 'Settings' },
  { href: '/settings/client-preview', label: 'Client Preview', icon: Settings, context: 'Settings' },
  { href: '/settings/integrations', label: 'Integrations', icon: Settings, context: 'Settings' },
  { href: '/settings/templates', label: 'Response Templates', icon: Settings, context: 'Settings' },
  { href: '/settings/automations', label: 'Automations', icon: Settings, context: 'Settings' },
  { href: '/settings/contracts', label: 'Contract Templates', icon: Settings, context: 'Settings' },
  { href: '/settings/repertoire', label: 'Seasonal Palettes', icon: Settings, context: 'Settings' },
  { href: '/settings/journal', label: 'Chef Journal', icon: Settings, context: 'Settings' },
  { href: '/settings/profile', label: 'Network Profile', icon: Settings, context: 'Settings' },
  { href: '/settings/compliance', label: 'Food Safety & Certifications', icon: Settings, context: 'Settings' },
  { href: '/settings/emergency', label: 'Emergency Contacts', icon: Settings, context: 'Settings' },
  { href: '/settings/professional', label: 'Professional Development', icon: Settings, context: 'Settings' },
  { href: '/settings/change-password', label: 'Change Password', icon: Settings, context: 'Settings' },
]

function pushPrimaryShortcut(
  map: Map<string, PrimaryShortcutOption>,
  option: PrimaryShortcutOption
) {
  if (!option.href.startsWith('/')) return
  if (map.has(option.href)) return
  map.set(option.href, option)
}

function buildPrimaryShortcutOptions(): PrimaryShortcutOption[] {
  const map = new Map<string, PrimaryShortcutOption>()

  for (const item of standaloneTop) {
    pushPrimaryShortcut(map, { ...item, context: 'Primary Shortcuts' })
  }

  for (const group of navGroups) {
    for (const item of group.items) {
      pushPrimaryShortcut(map, { ...item, context: group.label })

      for (const child of item.children ?? []) {
        pushPrimaryShortcut(map, {
          href: child.href,
          label: child.label,
          icon: child.icon ?? item.icon,
          context: `${group.label} > ${item.label}`,
        })
      }
    }
  }

  for (const item of standaloneBottom) {
    pushPrimaryShortcut(map, { ...item, context: 'Footer' })
  }

  for (const item of settingsShortcutOptions) {
    pushPrimaryShortcut(map, item)
  }

  return Array.from(map.values())
}

const PRIMARY_SHORTCUT_OPTIONS: PrimaryShortcutOption[] = buildPrimaryShortcutOptions()

export const DEFAULT_PRIMARY_SHORTCUT_HREFS = standaloneTop.map((item) => item.href)

export function resolveStandaloneTop(preferredHrefs?: string[] | null): NavItem[] {
  const byHref = new Map(PRIMARY_SHORTCUT_OPTIONS.map((item) => [item.href, item] as const))
  const seen = new Set<string>()
  const desired = (preferredHrefs ?? []).map((href) => href.trim()).filter(Boolean)
  const resolved: NavItem[] = []

  for (const href of desired) {
    if (seen.has(href)) continue
    const option = byHref.get(href)
    if (!option) continue
    seen.add(href)
    resolved.push({ href: option.href, label: option.label, icon: option.icon })
  }

  if (resolved.length > 0) return resolved
  return standaloneTop
}

export function getPrimaryShortcutOptions() {
  return PRIMARY_SHORTCUT_OPTIONS.map(({ href, label, context }) => ({ href, label, context }))
}

export type { NavItem, NavSubItem, NavCollapsibleItem, NavGroup, PrimaryShortcutOption }
