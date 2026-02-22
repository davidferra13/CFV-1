// Centralized navigation configuration (single source of truth)
// IA principle: show only core workflows first; keep advanced pages one click deeper.
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarDays,
  ChefHat,
  ClipboardCheck,
  Clock,
  Compass,
  Crosshair,
  DollarSign,
  FileText,
  Gift,
  Handshake,
  Hash,
  Image,
  Inbox,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  PieChart,
  Presentation,
  RefreshCw,
  Rss,
  Settings,
  ShieldAlert,
  Star,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Palette,
  Warehouse,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: LucideIcon }
type NavSubItem = {
  href: string
  label: string
  icon?: LucideIcon
  visibility?: 'secondary' | 'advanced'
}
type NavCollapsibleItem = NavItem & {
  children?: NavSubItem[]
  visibility?: 'secondary' | 'advanced'
}
type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  items: NavCollapsibleItem[]
  module?: string
}
type PrimaryShortcutOption = NavItem & { context: string }

// Primary always-visible shortcuts
export const standaloneTop: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/daily', label: 'Daily Ops', icon: ListChecks },
  { href: '/commands', label: 'Ask Remy', icon: Bot },
  { href: '/remy', label: 'Remy History', icon: Bot },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/inquiries', label: 'Inquiries', icon: Inbox },
  { href: '/chat', label: 'Messaging', icon: MessageCircle },
  { href: '/schedule', label: 'Calendar', icon: CalendarDays },
  { href: '/events', label: 'All Events', icon: CalendarDays },
  { href: '/travel', label: 'Travel', icon: MapPin },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/prospecting', label: 'Prospecting', icon: Crosshair },
]

// Main domains
export const navGroups: NavGroup[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: Inbox,
    module: 'pipeline',
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
        href: '/prospecting',
        label: 'Prospecting',
        icon: Target,
        children: [
          { href: '/prospecting/scrub', label: 'AI Scrub' },
          { href: '/prospecting/queue', label: 'Call Queue' },
          { href: '/prospecting/scripts', label: 'Call Scripts' },
        ],
        visibility: 'advanced' as const,
      },
      {
        href: '/guest-leads',
        label: 'Guest Pipeline',
        icon: Users,
      },
      {
        href: '/guest-analytics',
        label: 'Guest Insights',
        icon: BarChart3,
        visibility: 'advanced' as const,
      },
      {
        href: '/testimonials',
        label: 'Testimonials',
        icon: Star,
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
          {
            href: '/partners/referral-performance',
            label: 'Referral Performance',
            visibility: 'advanced',
          },
          { href: '/partners/events-generated', label: 'Events Generated', visibility: 'advanced' },
        ],
      },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    icon: CalendarDays,
    module: 'events',
    items: [
      {
        href: '/events/upcoming',
        label: 'Event Status',
        icon: CalendarDays,
        children: [
          { href: '/events/new', label: 'Create Event' },
          { href: '/events/board', label: 'Kanban Board' },
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
        href: '/staff',
        label: 'Operations Tools',
        icon: ClipboardCheck,
        children: [
          { href: '/aar', label: 'Event Reviews' },
          { href: '/reviews', label: 'Reviews' },
          { href: '/import', label: 'Smart Import' },
          {
            href: '/staff/schedule',
            label: 'Staff Schedule',
            icon: CalendarDays,
            visibility: 'advanced',
          },
          {
            href: '/staff/availability',
            label: 'Staff Availability',
            icon: Users,
            visibility: 'advanced',
          },
          { href: '/staff/clock', label: 'Clock In/Out', icon: Clock, visibility: 'advanced' },
          {
            href: '/staff/performance',
            label: 'Staff Performance',
            icon: BarChart3,
            visibility: 'advanced',
          },
          {
            href: '/staff/labor',
            label: 'Labor Dashboard',
            icon: DollarSign,
            visibility: 'advanced',
          },
        ],
      },
    ],
  },
  {
    id: 'culinary',
    label: 'Culinary',
    icon: ChefHat,
    module: 'culinary',
    items: [
      {
        href: '/menus',
        label: 'Menus',
        icon: UtensilsCrossed,
        children: [
          { href: '/menus/new', label: 'New Menu' },
          { href: '/culinary/menus', label: 'Menu Library', visibility: 'secondary' },
        ],
      },
      {
        href: '/recipes',
        label: 'Recipes',
        icon: UtensilsCrossed,
        children: [
          { href: '/recipes/new', label: 'New Recipe' },
          { href: '/culinary/recipes', label: 'Recipe Library', visibility: 'secondary' },
          { href: '/culinary/components', label: 'Components', visibility: 'advanced' },
        ],
      },
      {
        href: '/recipes/ingredients',
        label: 'Ingredients',
        icon: Package,
        children: [
          { href: '/culinary/ingredients', label: 'Ingredients Database', visibility: 'secondary' },
        ],
      },
      {
        href: '/culinary/prep',
        label: 'Prep Workspace',
        icon: ClipboardCheck,
      },
      {
        href: '/culinary/costing',
        label: 'Costing',
        icon: DollarSign,
        children: [
          { href: '/inventory/food-cost', label: 'Food Cost Analysis', visibility: 'secondary' },
        ],
      },
      {
        href: '/culinary/vendors',
        label: 'Vendor Directory',
        icon: Warehouse,
        children: [
          { href: '/inventory/vendor-invoices', label: 'Vendor Invoices', visibility: 'advanced' },
        ],
      },
      {
        href: '/culinary/my-kitchen',
        label: 'My Kitchen',
        icon: Warehouse,
        children: [
          { href: '/inventory', label: 'Inventory', icon: Warehouse, visibility: 'secondary' },
          {
            href: '/inventory/waste',
            label: 'Waste Tracking',
            icon: Package,
            visibility: 'advanced',
          },
          { href: '/operations/kitchen-rentals', label: 'Kitchen Rentals', visibility: 'advanced' },
          { href: '/operations/equipment', label: 'Equipment Inventory', visibility: 'advanced' },
        ],
      },
      {
        href: '/culinary-board',
        label: 'Culinary Board',
        icon: Palette,
      },
      {
        href: '/settings/repertoire',
        label: 'Seasonal Palettes',
        icon: Palette,
        visibility: 'advanced' as const,
      },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    module: 'clients',
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
          { href: '/clients/segments', label: 'Segments', visibility: 'advanced' },
          { href: '/clients/duplicates', label: 'Duplicates', visibility: 'advanced' },
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
          {
            href: '/clients/communication/follow-ups',
            label: 'Follow-Ups',
            visibility: 'advanced',
          },
          {
            href: '/clients/communication/upcoming-touchpoints',
            label: 'Upcoming Touchpoints',
            visibility: 'advanced',
          },
          { href: '/clients/history', label: 'History', visibility: 'advanced' },
          {
            href: '/clients/history/event-history',
            label: 'Event History',
            visibility: 'advanced',
          },
          { href: '/clients/history/past-menus', label: 'Past Menus', visibility: 'advanced' },
          {
            href: '/clients/history/spending-history',
            label: 'Spending History',
            visibility: 'advanced',
          },
          { href: '/clients/preferences', label: 'Preferences', visibility: 'advanced' },
          {
            href: '/clients/preferences/dietary-restrictions',
            label: 'Dietary Restrictions',
            visibility: 'advanced',
          },
          { href: '/clients/preferences/allergies', label: 'Allergies', visibility: 'advanced' },
          {
            href: '/clients/preferences/favorite-dishes',
            label: 'Favorite Dishes',
            visibility: 'advanced',
          },
          { href: '/clients/preferences/dislikes', label: 'Dislikes', visibility: 'advanced' },
          { href: '/clients/insights', label: 'Insights', visibility: 'advanced' },
          { href: '/clients/insights/top-clients', label: 'Top Clients', visibility: 'advanced' },
          {
            href: '/clients/insights/most-frequent',
            label: 'Most Frequent',
            visibility: 'advanced',
          },
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
    module: 'finance',
    items: [
      {
        href: '/financials',
        label: 'Financial Hub',
        icon: DollarSign,
        children: [
          { href: '/finance', label: 'Finance (Legacy)', visibility: 'advanced' },
          { href: '/expenses', label: 'Expenses' },
          { href: '/expenses/new', label: 'Add Expense' },
          { href: '/receipts', label: 'Receipt Library' },
          { href: '/finance/expenses', label: 'Expenses by Category', visibility: 'advanced' },
          { href: '/finance/invoices', label: 'Invoices', visibility: 'advanced' },
          { href: '/finance/payments', label: 'Payments', visibility: 'advanced' },
          { href: '/finance/payouts', label: 'Payouts', visibility: 'advanced' },
          { href: '/finance/ledger', label: 'Ledger', visibility: 'advanced' },
          { href: '/finance/reporting', label: 'Reporting', visibility: 'advanced' },
          { href: '/finance/overview', label: 'Overview', visibility: 'advanced' },
          {
            href: '/finance/reporting/revenue-by-month',
            label: 'Revenue by Month',
            visibility: 'advanced',
          },
          {
            href: '/finance/reporting/revenue-by-client',
            label: 'Revenue by Client',
            visibility: 'advanced',
          },
          {
            href: '/finance/reporting/revenue-by-event',
            label: 'Revenue by Event',
            visibility: 'advanced',
          },
          {
            href: '/finance/reporting/expense-by-category',
            label: 'Expense by Category',
            visibility: 'advanced',
          },
          {
            href: '/finance/reporting/profit-by-event',
            label: 'Profit by Event',
            visibility: 'advanced',
          },
          {
            href: '/finance/reporting/year-to-date-summary',
            label: 'Year-to-Date Summary',
            visibility: 'advanced',
          },
          { href: '/finance/reporting/tax-summary', label: 'Tax Summary', visibility: 'advanced' },
          { href: '/finance/invoices/sent', label: 'Sent Invoices', visibility: 'advanced' },
          { href: '/finance/invoices/paid', label: 'Paid Invoices', visibility: 'advanced' },
          { href: '/finance/invoices/overdue', label: 'Overdue Invoices', visibility: 'advanced' },
          { href: '/finance/payments/deposits', label: 'Deposits', visibility: 'advanced' },
          { href: '/finance/payments/installments', label: 'Installments', visibility: 'advanced' },
          { href: '/finance/payments/refunds', label: 'Refunds', visibility: 'advanced' },
          {
            href: '/finance/payouts/stripe-payouts',
            label: 'Stripe Payouts',
            visibility: 'advanced',
          },
          {
            href: '/finance/ledger/transaction-log',
            label: 'Transaction Log',
            visibility: 'advanced',
          },
          { href: '/finance/tax', label: 'Tax Center', visibility: 'advanced' },
          { href: '/finance/forecast', label: 'Revenue Forecast', visibility: 'advanced' },
          { href: '/finance/tax/year-end', label: 'Year-End Tax Package', visibility: 'advanced' },
          {
            href: '/finance/bank-feed',
            label: 'Bank Feed',
            icon: Landmark,
            visibility: 'advanced',
          },
          {
            href: '/finance/cash-flow',
            label: 'Cash Flow Forecast',
            icon: TrendingUp,
            visibility: 'advanced',
          },
          {
            href: '/finance/recurring',
            label: 'Recurring Invoices',
            icon: RefreshCw,
            visibility: 'advanced',
          },
          {
            href: '/finance/disputes',
            label: 'Payment Disputes',
            icon: ShieldAlert,
            visibility: 'advanced',
          },
          {
            href: '/finance/contractors',
            label: '1099 Contractors',
            icon: Users,
            visibility: 'advanced',
          },
          {
            href: '/finance/tax/quarterly',
            label: 'Quarterly Estimates',
            icon: PieChart,
            visibility: 'advanced',
          },
          {
            href: '/finance/retainers',
            label: 'Retainers',
            icon: RefreshCw,
            visibility: 'advanced',
          },
        ],
      },
    ],
  },
  {
    id: 'protection',
    label: 'Protection',
    icon: ShieldCheck,
    module: 'protection',
    items: [
      {
        href: '/settings/protection',
        label: 'Business Health',
        icon: ShieldCheck,
        children: [
          { href: '/settings/protection/insurance', label: 'Insurance' },
          { href: '/settings/protection/certifications', label: 'Certifications' },
          { href: '/settings/protection/nda', label: 'NDA & Permissions' },
          { href: '/settings/protection/continuity', label: 'Business Continuity' },
          { href: '/settings/protection/crisis', label: 'Crisis Response' },
        ],
      },
      {
        href: '/safety/incidents',
        label: 'Incidents',
        icon: AlertTriangle,
        children: [
          { href: '/safety/incidents/new', label: 'Report Incident', visibility: 'advanced' },
        ],
      },
      {
        href: '/safety/backup-chef',
        label: 'Backup Chef',
        icon: Users,
      },
      {
        href: '/reputation/mentions',
        label: 'Brand Mentions',
        icon: ShieldAlert,
      },
    ],
  },
  {
    id: 'more',
    label: 'More',
    icon: ListChecks,
    module: 'more',
    items: [
      {
        href: '/goals/setup',
        label: 'Goal Setup',
        icon: Target,
      },
      {
        href: '/insights',
        label: 'Insights',
        icon: BarChart3,
        children: [
          { href: '/analytics', label: 'Source Analytics' },
          { href: '/analytics/reports', label: 'Custom Reports', visibility: 'advanced' },
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
          { href: '/network?tab=feed', label: 'Feed', icon: Rss },
          { href: '/network?tab=channels', label: 'Channels', icon: Hash },
          { href: '/network?tab=discover', label: 'Discover Chefs', icon: Compass },
          { href: '/network?tab=connections', label: 'Connections', icon: Handshake },
          { href: '/network/saved', label: 'Saved Posts', visibility: 'advanced' },
          { href: '/network/notifications', label: 'Notifications', visibility: 'advanced' },
          { href: '/network/channels/pastry', label: '#pastry', visibility: 'advanced' },
          { href: '/network/channels/savory', label: '#savory', visibility: 'advanced' },
          { href: '/network/channels/business', label: '#business', visibility: 'advanced' },
          { href: '/network/channels/technique', label: '#technique', visibility: 'advanced' },
          { href: '/network/channels/wins', label: '#wins', visibility: 'advanced' },
        ],
      },
      {
        href: '/social/planner',
        label: 'Content Planner',
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
        children: [
          { href: '/marketing/push-dinners', label: 'Push Dinners' },
          { href: '/marketing/sequences', label: 'Sequences', visibility: 'advanced' },
          { href: '/marketing/templates', label: 'Templates', visibility: 'advanced' },
        ],
      },
      {
        href: '/inbox/history-scan',
        label: 'Inbox Tools',
        icon: MessageCircle,
        children: [{ href: '/inbox/triage', label: 'Sort Messages', visibility: 'advanced' }],
      },
      {
        href: '/proposals',
        label: 'Proposals',
        icon: Presentation,
        children: [
          { href: '/proposals/templates', label: 'Templates' },
          { href: '/proposals/addons', label: 'Add-Ons' },
        ],
      },
      {
        href: '/analytics/benchmarks',
        label: 'Business Analytics',
        icon: TrendingUp,
        children: [
          { href: '/analytics/benchmarks', label: 'Benchmarks' },
          { href: '/analytics/pipeline', label: 'Pipeline Forecast' },
          { href: '/analytics/demand', label: 'Demand Heatmap' },
          { href: '/analytics/client-ltv', label: 'Client Value' },
          {
            href: '/analytics/referral-sources',
            label: 'Referral Sources',
            visibility: 'advanced' as const,
          },
        ],
      },
      {
        href: '/community/templates',
        label: 'Community Templates',
        icon: FileText,
      },
      {
        href: '/help',
        label: 'Help Center',
        icon: MessageCircle,
      },
    ],
  },
]

export const standaloneBottom: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const mobileTabItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/daily', label: 'Daily Ops', icon: ListChecks },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
]

const settingsShortcutOptions: PrimaryShortcutOption[] = [
  { href: '/settings/modules', label: 'Modules', icon: Settings, context: 'Settings' },
  { href: '/settings/navigation', label: 'Navigation', icon: Settings, context: 'Settings' },
  { href: '/settings/dashboard', label: 'Dashboard Widgets', icon: Settings, context: 'Settings' },
  { href: '/settings/my-profile', label: 'My Profile', icon: Settings, context: 'Settings' },
  {
    href: '/settings/public-profile',
    label: 'Public Profile',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/client-preview',
    label: 'Client Preview',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/integrations', label: 'Integrations', icon: Settings, context: 'Settings' },
  { href: '/settings/templates', label: 'Response Templates', icon: Settings, context: 'Settings' },
  { href: '/settings/automations', label: 'Automations', icon: Settings, context: 'Settings' },
  { href: '/settings/contracts', label: 'Contract Templates', icon: Settings, context: 'Settings' },
  { href: '/settings/repertoire', label: 'Seasonal Palettes', icon: Settings, context: 'Settings' },
  { href: '/settings/journal', label: 'Chef Journal', icon: Settings, context: 'Settings' },
  { href: '/settings/favorite-chefs', label: 'Favorite Chefs', icon: Star, context: 'Settings' },
  { href: '/settings/profile', label: 'Network Profile', icon: Settings, context: 'Settings' },
  {
    href: '/settings/compliance',
    label: 'Food Safety & Certifications',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/emergency', label: 'Emergency Contacts', icon: Settings, context: 'Settings' },
  {
    href: '/settings/professional',
    label: 'Professional Development',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/change-password',
    label: 'Change Password',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/appearance',
    label: 'Appearance & Dark Mode',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/ai-privacy', label: 'AI & Privacy', icon: ShieldCheck, context: 'Settings' },
  { href: '/settings/api-keys', label: 'API Keys', icon: Settings, context: 'Settings' },
  { href: '/settings/webhooks', label: 'Webhooks', icon: Settings, context: 'Settings' },
  {
    href: '/settings/compliance/gdpr',
    label: 'GDPR & Data Privacy',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/custom-fields', label: 'Custom Fields', icon: Settings, context: 'Settings' },
  {
    href: '/settings/event-types',
    label: 'Event Type Labels',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/portfolio', label: 'Portfolio', icon: Image, context: 'Settings' },
  { href: '/settings/highlights', label: 'Profile Highlights', icon: Image, context: 'Settings' },
  {
    href: '/settings/billing',
    label: 'Subscription & Billing',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/protection',
    label: 'Business Protection Hub',
    icon: ShieldCheck,
    context: 'Settings',
  },
  {
    href: '/settings/protection/insurance',
    label: 'Insurance Policies',
    icon: ShieldCheck,
    context: 'Settings',
  },
  {
    href: '/settings/protection/certifications',
    label: 'Certifications',
    icon: ShieldCheck,
    context: 'Settings',
  },
  {
    href: '/settings/protection/nda',
    label: 'NDA & Photo Permissions',
    icon: ShieldCheck,
    context: 'Settings',
  },
  {
    href: '/settings/protection/continuity',
    label: 'Business Continuity Plan',
    icon: ShieldCheck,
    context: 'Settings',
  },
  {
    href: '/settings/protection/crisis',
    label: 'Crisis Response',
    icon: ShieldCheck,
    context: 'Settings',
  },
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
