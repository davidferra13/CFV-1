// Centralized navigation configuration (single source of truth)
// IA principle: show only core workflows first; keep advanced pages one click deeper.
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  FileText,
  Gift,
  Handshake,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Phone,
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

// Primary always-visible shortcuts
export const standaloneTop: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/chat', label: 'Messaging', icon: MessageCircle },
  { href: '/schedule', label: 'Calendar', icon: CalendarDays },
]

// Main domains
export const navGroups: NavGroup[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: Inbox,
    items: [
      {
        href: '/inquiries',
        label: 'Inquiries',
        icon: Inbox,
        children: [
          { href: '/inquiries/awaiting-response', label: 'Awaiting Response' },
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
        href: '/events',
        label: 'Events',
        icon: CalendarDays,
        children: [
          { href: '/events/new', label: 'Create Event' },
          { href: '/events/upcoming', label: 'Upcoming' },
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
        href: '/goals',
        label: 'Goals',
        icon: Target,
        children: [
          { href: '/goals/setup', label: 'Goal Setup', visibility: 'advanced' },
        ],
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
        href: '/activity',
        label: 'Activity & Queue',
        icon: Activity,
        children: [
          { href: '/queue', label: 'Priority Queue' },
        ],
      },
      {
        href: '/network',
        label: 'Network & Social',
        icon: Handshake,
        children: [
          { href: '/social', label: 'Social Queue' },
        ],
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

export type { NavItem, NavSubItem, NavCollapsibleItem, NavGroup }
