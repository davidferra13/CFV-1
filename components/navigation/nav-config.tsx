// Centralized navigation configuration (single source of truth)
// Organized by chef workflow with granular sub-categories (3-5 items per group).
// Rule: primary shells stay within the attention budget. Secondary routes stay discoverable
// through context, All Features, settings, or command/search instead of always being visible.
// Items within each group and children within each item are sorted alphabetically.
import { normalizePrimaryNavHrefs } from '@/lib/interface/surface-governance'
import type { LucideIcon } from '@/components/ui/icons'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  Bot,
  Broadcast,
  Calculator,
  CalendarCheck,
  CalendarDays,
  Chalkboard,
  ChatDots,
  ChatTeardropText,
  ChefHat,
  ChartLineUp,
  ClipboardCheck,
  Clock,
  Coins,
  Compass,
  Contact,
  CreditCard,
  Crosshair,
  CurrencyCircleDollar,
  DollarSign,
  Download,
  Exam,
  FileText,
  Flame,
  FlagBanner,
  Flower,
  Funnel,
  Gift,
  HandArrowDown,
  Handshake,
  HeartHandshake,
  IdentificationBadge,
  Image,
  Inbox,
  Invoice,
  Kanban,
  Landmark,
  LayoutDashboard,
  List,
  ListChecks,
  MagnifyingGlassPlus,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  NotebookIcon,
  Notepad,
  Package,
  PenNib,
  Percent,
  Phone,
  PieChart,
  Presentation,
  Receipt,
  RefreshCw,
  Scales,
  ScrollText,
  SealCheck,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Star,
  Store,
  Target,
  Timer,
  Toolbox,
  TreeStructure,
  TrendingUp,
  Truck,
  Upload,
  Users,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  WifiHigh,
  Wrench,
  Calendar,
  Camera,
  Plus,
  Zap,
} from '@/components/ui/icons'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
  coreFeature?: boolean
  hidden?: boolean
  tier?: 'primary' | 'secondary'
  subMenu?: Array<{ href: string; label: string }>
  /** RBAC permission required to see this nav item. Format: 'domain:action' */
  requiredPermission?: `${string}:${string}`
}
type NavSubItem = {
  href: string
  label: string
  icon?: LucideIcon
  visibility?: 'secondary' | 'advanced'
  hidden?: boolean
}
type NavCollapsibleItem = NavItem & {
  children?: NavSubItem[]
  visibility?: 'secondary' | 'advanced'
  adminOnly?: boolean
}
type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  items: NavCollapsibleItem[]
  module?: string
}
type PrimaryShortcutOption = NavItem & { context: string }

// Primary hub links shown in the sidebar.
// Default hub set is capped to the philosophy budget for top-level navigation.
// tier: 'primary' = top section (core daily workflow), 'secondary' = below divider (specialty hubs)
// subMenu: curated quick-access links shown in a collapsible drawer under the hub link
// coreFeature: true = shown in Focus Mode
// adminOnly items are hidden for non-admins
export const standaloneTop: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Today',
    icon: LayoutDashboard,
    coreFeature: true,
    tier: 'primary',
  },
  { href: '/inbox', label: 'Inbox', icon: Inbox, coreFeature: true, tier: 'primary' },
  {
    href: '/events',
    label: 'Events',
    icon: CalendarDays,
    coreFeature: true,
    tier: 'primary',
    subMenu: [
      { href: '/events/new', label: 'New Event' },
      { href: '/calendar', label: 'Calendar' },
    ],
  },
  {
    href: '/culinary',
    label: 'Culinary',
    icon: ChefHat,
    coreFeature: true,
    tier: 'primary',
    subMenu: [
      { href: '/culinary/recipes', label: 'Recipes' },
      { href: '/menus', label: 'Menus' },
      { href: '/culinary/price-catalog', label: 'Food Catalog' },
      { href: '/culinary/costing', label: 'Costing' },
      { href: '/culinary/prep', label: 'Prep' },
      { href: '/culinary/prep/shopping', label: 'Shopping Lists' },
    ],
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: Users,
    coreFeature: true,
    tier: 'primary',
    subMenu: [
      { href: '/clients/new', label: 'Add Client' },
      { href: '/clients/communication/follow-ups', label: 'Follow-Ups' },
      { href: '/clients/insights/top-clients', label: 'Top Clients' },
      { href: '/clients/loyalty', label: 'Loyalty' },
    ],
  },
  {
    href: '/circles',
    label: 'Circles',
    icon: MessagesSquare,
    coreFeature: true,
    tier: 'primary',
    subMenu: [
      { href: '/circles', label: 'All Circles' },
      { href: '/hub/circles', label: 'Browse Community' },
    ],
  },
  {
    href: '/finance',
    label: 'Finance',
    icon: DollarSign,
    coreFeature: true,
    tier: 'primary',
    subMenu: [
      { href: '/finance/invoices', label: 'Invoices' },
      { href: '/expenses', label: 'Expenses' },
      { href: '/finance/reporting/profit-loss', label: 'Profit and Loss' },
    ],
  },
]

// ─── NAV GROUPS ─────────────────────────────────────────────────
// Groups are sorted alphabetically at runtime (see sort block after array).
// Items and children within each group are also sorted A-Z at runtime.
// Admin nav group moved to components/navigation/admin-nav-config.ts (admin-owned).
export const navGroups: NavGroup[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    module: 'more',
    items: [
      {
        href: '/analytics/benchmarks',
        label: 'Business Analytics',
        icon: TrendingUp,
        children: [
          { href: '/analytics/client-ltv', label: 'Client Value' },
          { href: '/analytics/demand', label: 'Demand Heatmap' },
          { href: '/analytics/pipeline', label: 'Pipeline Forecast' },
          { href: '/analytics/referral-sources', label: 'Referral Sources' },
        ],
      },
      {
        href: '/analytics/funnel',
        label: 'Conversion Funnel',
        icon: Funnel,
      },
      {
        href: '/goals',
        label: 'Goals',
        icon: Target,
        children: [
          { href: '/goals/setup', label: 'Goal Setup' },
          { href: '/goals/revenue-path', label: 'Revenue Path' },
        ],
      },
      {
        href: '/insights',
        label: 'Insights',
        icon: BarChart3,
        children: [
          { href: '/analytics/reports', label: 'Custom Reports' },
          { href: '/analytics/daily-report', label: 'Daily Report' },
          { href: '/analytics', label: 'Source Analytics' },
          { href: '/insights/time-analysis', label: 'Time Analysis' },
        ],
      },
      {
        href: '/intelligence',
        label: 'Intelligence Hub',
        icon: Compass,
        children: [{ href: '/intelligence', label: 'Full Dashboard' }],
      },
      {
        href: '/reports',
        label: 'Reports',
        icon: FileText,
      },
      {
        href: '/surveys',
        label: 'Surveys',
        icon: ClipboardCheck,
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
          { href: '/clients/new', label: 'Add Client' },
          { href: '/clients/duplicates', label: 'Duplicates' },
          { href: '/clients/gift-cards', label: 'Gift Cards' },
          { href: '/clients/inactive', label: 'Inactive' },
          { href: '/clients/segments', label: 'Segments' },
          { href: '/clients/vip', label: 'VIP' },
        ],
      },
      {
        href: '/clients/history',
        label: 'Client History',
        icon: Clock,
        children: [
          { href: '/clients/history/event-history', label: 'Event History' },
          { href: '/clients/history/past-menus', label: 'Past Menus' },
          { href: '/clients/history/spending-history', label: 'Payment History' },
        ],
      },
      {
        href: '/clients/insights',
        label: 'Client Insights',
        icon: ChartLineUp,
        children: [
          { href: '/clients/insights/at-risk', label: 'At Risk' },
          { href: '/clients/insights/most-frequent', label: 'Most Frequent' },
          { href: '/clients/insights/top-clients', label: 'Top Clients' },
        ],
      },
      {
        href: '/clients/intake',
        label: 'Client Intake',
        icon: ClipboardCheck,
      },
      {
        href: '/clients/presence',
        label: 'Client Presence',
        icon: WifiHigh,
      },
      {
        href: '/pulse',
        label: "Who's Waiting",
        icon: Activity,
      },
      {
        href: '/clients/communication',
        label: 'Communication',
        icon: ChatDots,
        children: [
          { href: '/clients/communication/notes', label: 'Client Notes' },
          { href: '/clients/communication/follow-ups', label: 'Follow-Ups' },
          { href: '/clients/communication/upcoming-touchpoints', label: 'Upcoming Touchpoints' },
        ],
      },
      {
        href: '/guests',
        label: 'Guest Directory',
        icon: Contact,
        children: [
          { href: '/guest-analytics', label: 'Guest Insights' },
          { href: '/guest-leads', label: 'Guest Pipeline' },
          { href: '/guests/reservations', label: 'Reservations' },
        ],
      },
      {
        href: '/loyalty',
        label: 'Loyalty & Rewards',
        icon: Gift,
        children: [
          { href: '/loyalty/rewards/new', label: 'Create Reward' },
          { href: '/loyalty/learn', label: 'Learn About Loyalty' },
          { href: '/clients/loyalty', label: 'Loyalty Overview' },
          { href: '/clients/loyalty/points', label: 'Points' },
          { href: '/loyalty/settings', label: 'Program Settings' },
          { href: '/loyalty/raffle', label: 'Raffle' },
          { href: '/clients/loyalty/referrals', label: 'Referrals' },
          { href: '/clients/loyalty/rewards', label: 'Rewards' },
        ],
      },
      {
        href: '/partners',
        label: 'Partners & Referrals',
        icon: Handshake,
        children: [
          { href: '/partners/active', label: 'Active' },
          { href: '/partners/new', label: 'Add Partner' },
          { href: '/partners/events-generated', label: 'Events Generated' },
          { href: '/partners/inactive', label: 'Inactive' },
          { href: '/partners/referral-performance', label: 'Referral Performance' },
        ],
      },
      {
        href: '/clients/preferences',
        label: 'Preferences & Dietary',
        icon: Sliders,
        children: [
          { href: '/clients/preferences/allergies', label: 'Allergies' },
          { href: '/clients/preferences/dietary-restrictions', label: 'Dietary Restrictions' },
          { href: '/clients/preferences/dislikes', label: 'Dislikes' },
          { href: '/clients/preferences/favorite-dishes', label: 'Favorite Dishes' },
        ],
      },
      {
        href: '/clients/recurring',
        label: 'Recurring Clients',
        icon: RefreshCw,
      },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    icon: Store,
    module: 'commerce',
    items: [
      {
        href: '/commerce/parity',
        label: 'Clover Parity',
        icon: BarChart3,
        adminOnly: true,
      },
      {
        href: '/commerce',
        label: 'Commerce Hub',
        icon: Store,
      },
      {
        href: '/commerce/observability',
        label: 'Observability',
        icon: AlertTriangle,
        adminOnly: true,
      },
      {
        href: '/commerce/orders',
        label: 'Order Queue',
        icon: Receipt,
      },
      {
        href: '/commerce/schedules',
        label: 'Payment Schedules',
        icon: CalendarCheck,
      },
      {
        href: '/commerce/register',
        label: 'POS Register',
        icon: ShoppingCart,
      },
      {
        href: '/commerce/products',
        label: 'Products',
        icon: Package,
        children: [{ href: '/commerce/products/new', label: 'New Product' }],
      },
      {
        href: '/commerce/storefront',
        label: 'Passive Storefront',
        icon: Store,
      },
      {
        href: '/commerce/promotions',
        label: 'Promotions',
        icon: Percent,
      },
      {
        href: '/commerce/reconciliation',
        label: 'Reconciliation',
        icon: Scales,
      },
      {
        href: '/commerce/reports',
        label: 'Reports',
        icon: PieChart,
        children: [{ href: '/commerce/reports/shifts', label: 'Shift Reports' }],
      },
      {
        href: '/commerce/sales',
        label: 'Sales History',
        icon: DollarSign,
      },
      {
        href: '/commerce/settlements',
        label: 'Settlements',
        icon: Landmark,
      },
      {
        href: '/commerce/table-service',
        label: 'Table Service',
        icon: UtensilsCrossed,
      },
      {
        href: '/commerce/virtual-terminal',
        label: 'Virtual Terminal',
        icon: CreditCard,
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
        href: '/culinary/components',
        label: 'Components',
        icon: Package,
        children: [
          { href: '/culinary/components/ferments', label: 'Ferments' },
          { href: '/culinary/components/garnishes', label: 'Garnishes' },
          { href: '/culinary/components/sauces', label: 'Sauces' },
          { href: '/culinary/components/shared-elements', label: 'Shared Elements' },
          { href: '/culinary/components/stocks', label: 'Stocks' },
        ],
      },
      {
        href: '/culinary/costing',
        label: 'Costing',
        icon: Calculator,
        children: [
          { href: '/culinary/costing/food-cost', label: 'Food Cost Analysis' },
          { href: '/culinary/costing/menu', label: 'Menu Costs' },
          { href: '/culinary/costing/sales', label: 'On Sale This Week' },
          { href: '/culinary/costing/recipe', label: 'Recipe Costs' },
        ],
      },
      {
        href: '/culinary-board',
        label: 'Culinary Board',
        icon: Chalkboard,
      },
      {
        href: '/culinary',
        label: 'Culinary Hub',
        icon: ChefHat,
      },
      {
        href: '/culinary/price-catalog',
        label: 'Food Catalog',
        icon: Store,
        tier: 'secondary',
      },
      {
        href: '/recipes/ingredients',
        label: 'Ingredients',
        icon: Package,
        children: [
          { href: '/culinary/ingredients', label: 'Ingredients Database' },
          { href: '/culinary/ingredients/receipt-scan', label: 'Receipt Scanner' },
          { href: '/culinary/ingredients/seasonal-availability', label: 'Seasonal Availability' },
          { href: '/culinary/ingredients/vendor-notes', label: 'Vendor Notes' },
        ],
      },
      {
        href: '/settings/menu-engine',
        label: 'Menu Engine Settings',
        icon: Sliders,
      },
      {
        href: '/menus',
        label: 'Menus',
        icon: UtensilsCrossed,
        children: [
          { href: '/culinary/menus', label: 'All Menus' },
          { href: '/culinary/menus/approved', label: 'Approved' },
          { href: '/culinary/dish-index', label: 'Dish Index' },
          { href: '/culinary/dish-index/insights', label: 'Dish Insights' },
          { href: '/menus/dishes', label: 'Dishes' },
          { href: '/culinary/menus/drafts', label: 'Drafts' },
          { href: '/menus/estimate', label: 'Estimate', icon: Calculator },
          { href: '/culinary/menus/engineering', label: 'Menu Engineering' },
          { href: '/menus/upload', label: 'Menu Upload', icon: Upload },
          { href: '/menus/new', label: 'New Menu' },
          { href: '/culinary/menus/scaling', label: 'Scaling' },
          { href: '/culinary/menus/substitutions', label: 'Substitutions' },
          { href: '/menus/tasting', label: 'Tasting Menus' },
          { href: '/culinary/menus/templates', label: 'Templates' },
        ],
      },
      {
        href: '/culinary/my-kitchen',
        label: 'My Kitchen',
        icon: Flame,
      },
      {
        href: '/culinary/prep',
        label: 'Prep Workspace',
        icon: Timer,
        children: [
          { href: '/culinary/prep/timeline', label: 'Prep Timeline' },
          { href: '/culinary/prep/shopping', label: 'Shopping Lists' },
        ],
      },
      {
        href: '/recipes/import',
        label: 'Recipe Import Hub',
        icon: Upload,
      },
      {
        href: '/recipes/sprint',
        label: 'Recipe Sprint',
        icon: Zap,
      },
      {
        href: '/recipes',
        label: 'Recipes',
        icon: BookOpen,
        children: [
          { href: '/recipes/dump', label: 'Brain Dump' },
          { href: '/culinary/recipes/dietary-flags', label: 'By Dietary Flags' },
          { href: '/culinary/recipes/drafts', label: 'Drafts' },
          { href: '/recipes/new', label: 'New Recipe' },
          { href: '/recipes/production-log', label: 'Production Log' },
          { href: '/culinary/recipes', label: 'Recipe Library' },
          { href: '/culinary/recipes/seasonal-notes', label: 'Seasonal Notes' },
          { href: '/recipes/photos', label: 'Step Photos' },
          { href: '/culinary/recipes/tags', label: 'Tags' },
        ],
      },
      {
        href: '/settings/repertoire',
        label: 'Seasonal Palettes',
        icon: Flower,
      },
      {
        href: '/culinary/substitutions',
        label: 'Substitutions',
        icon: RefreshCw,
      },
      {
        href: '/culinary/call-sheet',
        label: 'Voice Hub',
        icon: Phone,
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
        href: '/calendar',
        label: 'Calendar',
        icon: CalendarDays,
        children: [
          { href: '/calendar/day', label: 'Day View' },
          { href: '/calendar/share', label: 'Share Calendar' },
          { href: '/waitlist', label: 'Waitlist' },
          { href: '/calendar/week', label: 'Week Planner' },
          { href: '/calendar/year', label: 'Year View' },
        ],
      },
      {
        href: '/feedback',
        label: 'Client Feedback',
        icon: Star,
        children: [
          { href: '/feedback/dashboard', label: 'Feedback Dashboard' },
          { href: '/feedback/requests', label: 'Send Requests' },
        ],
      },
      {
        href: '/production',
        label: 'Event Calendar',
        icon: CalendarDays,
      },
      {
        href: '/aar',
        label: 'Event Reviews',
        icon: Exam,
        children: [
          { href: '/reviews', label: 'Reviews' },
          { href: '/import', label: 'Smart Import' },
        ],
      },
      {
        href: '/events/upcoming',
        label: 'Event Status',
        icon: CalendarDays,
        children: [
          { href: '/events/awaiting-deposit', label: 'Awaiting Deposit' },
          { href: '/events/cancelled', label: 'Cancelled' },
          { href: '/events/completed', label: 'Completed' },
          { href: '/events/confirmed', label: 'Confirmed' },
          { href: '/events/new', label: 'Create Event' },
          { href: '/events/new/from-text', label: 'Create from Text' },
          { href: '/events/new/wizard', label: 'Event Wizard' },
          { href: '/events/board', label: 'Kanban Board' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: CurrencyCircleDollar,
    module: 'finance',
    items: [
      {
        href: '/finance/contractors',
        label: '1099 Contractors',
        icon: IdentificationBadge,
      },
      {
        href: '/finance/planning/break-even',
        label: 'Break-Even Analysis',
        icon: Target,
      },
      {
        href: '/expenses',
        label: 'Expenses',
        icon: Coins,
        children: [
          { href: '/expenses/new', label: 'Add Expense' },
          { href: '/finance/expenses', label: 'By Category' },
          { href: '/finance/expenses/food-ingredients', label: 'Food & Ingredients' },
          { href: '/finance/expenses/labor', label: 'Labor' },
          { href: '/finance/expenses/marketing', label: 'Marketing' },
          { href: '/finance/expenses/miscellaneous', label: 'Miscellaneous' },
          { href: '/finance/plate-costs', label: 'Plate Costs' },
          { href: '/receipts', label: 'Receipt Library' },
          { href: '/finance/expenses/rentals-equipment', label: 'Rentals & Equipment' },
          { href: '/finance/expenses/software', label: 'Software' },
          { href: '/finance/expenses/travel', label: 'Travel' },
        ],
      },
      {
        href: '/finance/goals',
        label: 'Financial Goals',
        icon: Target,
      },
      {
        href: '/finance',
        label: 'Financial Hub',
        icon: DollarSign,
        children: [
          { href: '/finance/overview/cash-flow', label: 'Cash Flow', hidden: true },
          { href: '/finance', label: 'Finance Home' },
          { href: '/finance/overview/outstanding-payments', label: 'Outstanding Payments' },
          { href: '/finance/overview', label: 'Overview' },
          { href: '/finance/overview/revenue-summary', label: 'Revenue Summary' },
        ],
      },
      {
        href: '/finance/forecast',
        label: 'Forecasting',
        icon: TrendingUp,
        children: [{ href: '/finance/cash-flow', label: 'Cash Flow Forecast', hidden: true }],
      },
      {
        href: '/finance/invoices',
        label: 'Invoices',
        icon: Invoice,
        children: [
          { href: '/finance/invoices/cancelled', label: 'Cancelled' },
          { href: '/finance/invoices/draft', label: 'Draft' },
          { href: '/finance/invoices/overdue', label: 'Overdue' },
          { href: '/finance/invoices/paid', label: 'Paid' },
          { href: '/finance/recurring', label: 'Recurring Invoices' },
          { href: '/finance/invoices/refunded', label: 'Refunded' },
          { href: '/finance/invoices/sent', label: 'Sent' },
        ],
      },
      {
        href: '/finance/ledger',
        label: 'Ledger',
        icon: NotebookIcon,
        children: [
          { href: '/finance/ledger/adjustments', label: 'Adjustments' },
          { href: '/finance/ledger/transaction-log', label: 'Transaction Log' },
        ],
      },
      {
        href: '/payments/splitting',
        label: 'Payment Splitting',
        icon: CurrencyCircleDollar,
      },
      {
        href: '/finance/payments',
        label: 'Payments',
        icon: CurrencyCircleDollar,
        children: [
          { href: '/finance/payments/deposits', label: 'Deposits' },
          { href: '/finance/disputes', label: 'Disputes' },
          { href: '/finance/payments/failed', label: 'Failed Payments' },
          { href: '/finance/payments/installments', label: 'Installments' },
          { href: '/finance/retainers/new', label: 'New Retainer' },
          { href: '/finance/payments/refunds', label: 'Refunds' },
          { href: '/finance/retainers', label: 'Retainers' },
        ],
      },
      {
        href: '/finance/payouts',
        label: 'Payouts',
        icon: Landmark,
        children: [
          { href: '/finance/bank-feed', label: 'Bank Feed', hidden: true },
          { href: '/finance/payouts/manual-payments', label: 'Manual Payments' },
          { href: '/finance/payouts/reconciliation', label: 'Reconciliation' },
          { href: '/finance/payouts/stripe-payouts', label: 'Stripe Payouts' },
        ],
      },
      {
        href: '/finance/payroll',
        label: 'Payroll',
        icon: Wallet,
        children: [
          { href: '/finance/payroll/941', label: '941 Filing' },
          { href: '/finance/payroll/employees', label: 'Employees' },
          { href: '/finance/payroll/run', label: 'Run Payroll' },
          { href: '/finance/payroll/w2', label: 'W-2 Forms' },
        ],
      },
      {
        href: '/finance/reporting',
        label: 'Reports',
        icon: BarChart3,
        children: [
          { href: '/finance/reporting/expense-by-category', label: 'Expense by Category' },
          { href: '/finance/reporting/profit-loss', label: 'Profit & Loss' },
          { href: '/finance/reporting/profit-by-event', label: 'Profit by Event' },
          { href: '/finance/reporting/revenue-by-client', label: 'Revenue by Client' },
          { href: '/finance/reporting/revenue-by-event', label: 'Revenue by Event' },
          { href: '/finance/reporting/revenue-by-month', label: 'Revenue by Month' },
          { href: '/finance/reporting/year-to-date-summary', label: 'Year-to-Date Summary' },
          { href: '/finance/reporting/yoy-comparison', label: 'Year-over-Year Comparison' },
        ],
      },
      {
        href: '/finance/sales-tax',
        label: 'Sales Tax',
        icon: Receipt,
        children: [
          { href: '/finance/sales-tax/remittances', label: 'Remittances' },
          { href: '/finance/sales-tax/settings', label: 'Tax Settings' },
        ],
      },
      {
        href: '/finance/tax',
        label: 'Tax Center',
        icon: PieChart,
        children: [
          { href: '/finance/tax/1099-nec', label: '1099-NEC' },
          { href: '/finance/tax/depreciation', label: 'Depreciation' },
          { href: '/finance/tax/home-office', label: 'Home Office' },
          { href: '/finance/tax/quarterly', label: 'Quarterly Estimates' },
          { href: '/finance/tax/retirement', label: 'Retirement' },
          { href: '/finance/reporting/tax-summary', label: 'Tax Summary' },
          { href: '/finance/tax/year-end', label: 'Year-End Package' },
        ],
      },
      {
        href: '/finance/year-end',
        label: 'Year-End Close',
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    module: 'more',
    items: [
      {
        href: '/reputation/mentions',
        label: 'Brand Mentions',
        icon: ShieldAlert,
      },
      {
        href: '/marketing/content-pipeline',
        label: 'Campaign Content',
        icon: PenNib,
      },
      {
        href: '/content',
        label: 'Content Pipeline',
        icon: Kanban,
      },
      {
        href: '/social/planner',
        label: 'Content Planner',
        icon: PenNib,
        children: [
          { href: '/social/calendar', label: 'Content Calendar' },
          { href: '/social/vault', label: 'Media Vault' },
          { href: '/social/connections', label: 'Platform Connections' },
          { href: '/social/settings', label: 'Queue Settings' },
          { href: '/social/templates', label: 'Social Templates' },
        ],
      },
      {
        href: '/marketing',
        label: 'Email Campaigns',
        icon: Mail,
        children: [
          { href: '/marketing/push-dinners/new', label: 'New Push Event' },
          { href: '/marketing/push-dinners', label: 'Push Events' },
          { href: '/marketing/sequences', label: 'Sequences' },
          { href: '/marketing/templates', label: 'Templates' },
        ],
      },
      {
        href: '/portfolio',
        label: 'Event Portfolio',
        icon: Image,
      },
      {
        href: '/reviews',
        label: 'Reviews',
        icon: Star,
      },
      {
        href: '/social',
        label: 'Social Media',
        icon: MessagesSquare,
        children: [
          { href: '/social/hub-overview', label: 'Dinner Circle Overview' },
          { href: '/social/planner', label: 'Post Planner' },
        ],
      },
    ],
  },
  {
    id: 'network',
    label: 'Network',
    icon: Users,
    module: 'more',
    items: [
      {
        href: '/charity',
        label: 'Community Impact',
        icon: HeartHandshake,
        hidden: true,
        children: [{ href: '/charity/hours', label: 'Volunteer Hours' }],
      },
      {
        href: '/network',
        label: 'Chef Network',
        icon: Users,
        children: [
          { href: '/network/collabs', label: 'Collaborations' },
          { href: '/network/emergency', label: 'Emergency Triage' },
          { href: '/network/notifications', label: 'Notifications' },
          { href: '/network/saved', label: 'Saved Chefs' },
        ],
      },
      {
        href: '/community',
        label: 'Community',
        icon: FileText,
        children: [
          { href: '/community/directory', label: 'Chef Directory' },
          { href: '/community/mentorship', label: 'Mentorship' },
          { href: '/community/subcontracts', label: 'Subcontracts' },
          { href: '/community/messaging', label: 'Messaging' },
          { href: '/community/benchmarks', label: 'Benchmarks' },
          { href: '/community/templates', label: 'Templates' },
          { href: '/community/roadmap', label: 'Feature Board' },
          { href: '/community/profile', label: 'My Profile' },
        ],
      },
      {
        href: '/wix-submissions',
        label: 'Wix Submissions',
        icon: Inbox,
      },
    ],
  },
  {
    id: 'locations',
    label: 'Locations',
    icon: MapPin,
    module: 'multi-location',
    items: [
      {
        href: '/locations',
        label: 'Command Center',
        icon: Activity,
      },
      {
        href: '/locations/compliance',
        label: 'Recipe Compliance',
        icon: ClipboardCheck,
      },
      {
        href: '/locations/purchasing',
        label: 'Centralized Purchasing',
        icon: ShoppingCart,
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Activity,
    module: 'station-ops',
    items: [
      {
        href: '/ops',
        label: 'Ops Hub',
        icon: Activity,
        children: [
          { href: '/ops/service', label: 'Service Day' },
          { href: '/ops/prep', label: 'Prep Board' },
          { href: '/ops/stations', label: 'Station Coordination' },
          { href: '/ops/inventory', label: 'Inventory Status' },
          { href: '/ops/performance', label: 'Menu Performance' },
        ],
      },
      {
        href: '/stations/daily-ops',
        label: 'Daily Ops',
        icon: Activity,
      },
      {
        href: '/daily',
        label: 'Daily View',
        icon: ListChecks,
      },
      {
        href: '/documents',
        label: 'Documents',
        icon: FileText,
      },
      {
        href: '/operations/equipment',
        label: 'Equipment',
        icon: Wrench,
        children: [
          { href: '/operations/equipment?tab=maintenance', label: 'Maintenance Schedule' },
        ],
      },
      {
        href: '/kitchen',
        label: 'Kitchen Mode',
        icon: Flame,
      },
      {
        href: '/operations/kitchen-rentals',
        label: 'Kitchen Rentals',
        icon: Warehouse,
      },
      {
        href: '/meal-prep',
        label: 'Meal Prep',
        icon: RefreshCw,
        children: [{ href: '/meal-prep', label: 'Dashboard' }],
      },
      {
        href: '/queue',
        label: 'Priority Queue',
        icon: Zap,
      },
      {
        href: '/scheduling',
        label: 'Scheduling',
        icon: CalendarCheck,
      },
      {
        href: '/staff',
        label: 'Staff',
        icon: IdentificationBadge,
        children: [
          { href: '/staff/availability', label: 'Availability' },
          { href: '/staff/clock', label: 'Clock In/Out' },
          { href: '/staff/labor', label: 'Labor Dashboard' },
          { href: '/staff/live', label: 'Live Activity' },
          { href: '/staff/performance', label: 'Performance' },
          { href: '/staff/permissions', label: 'Permissions' },
          { href: '/staff/roster', label: 'Location Roster' },
          { href: '/staff/schedule', label: 'Schedule' },
        ],
      },
      {
        href: '/stations',
        label: 'Station Clipboards',
        icon: Notepad,
        children: [
          { href: '/stations/ops-log', label: 'Ops Log' },
          { href: '/stations/orders', label: 'Order Sheet' },
          { href: '/stations/waste', label: 'Waste Log' },
        ],
      },
      {
        href: '/reminders',
        label: 'Reminders',
        icon: Bell,
      },
      {
        href: '/tasks',
        label: 'Tasks',
        icon: ListChecks,
        children: [
          { href: '/tasks/gantt', label: 'Gantt Chart' },
          { href: '/tasks/templates', label: 'Task Templates' },
          { href: '/tasks/va', label: 'VA Tasks' },
        ],
      },
      {
        href: '/team',
        label: 'Team Management',
        icon: Users,
      },
      {
        href: '/travel',
        label: 'Travel Planning',
        icon: MapPin,
      },
    ],
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: Funnel,
    module: 'pipeline',
    items: [
      {
        href: '/calls',
        label: 'Calls & Meetings',
        icon: Phone,
        children: [
          { href: '/calls?status=completed', label: 'Completed' },
          { href: '/calls/new', label: 'Schedule Call' },
          { href: '/calls?status=scheduled', label: 'Upcoming' },
        ],
      },
      {
        href: '/consulting',
        label: 'Consulting Hub',
        icon: Compass,
      },
      {
        href: '/contracts',
        label: 'Contracts',
        icon: ScrollText,
        children: [{ href: '/settings/contracts', label: 'Templates' }],
      },
      {
        href: '/inquiries',
        label: 'Inquiries',
        icon: ChatTeardropText,
        children: [
          { href: '/inquiries/awaiting-response', label: 'Awaiting Response' },
          { href: '/inquiries/awaiting-client-reply', label: 'Client Reply' },
          { href: '/inquiries/declined', label: 'Declined' },
          { href: '/inquiries/menu-drafting', label: 'Menu Drafting' },
          { href: '/inquiries/new', label: 'New Inquiry' },
          { href: '/inquiries/sent-to-client', label: 'Sent to Client' },
        ],
      },
      {
        href: '/leads',
        label: 'Leads',
        icon: Target,
        children: [
          { href: '/leads/archived', label: 'Archived' },
          { href: '/leads/contacted', label: 'Contacted' },
          { href: '/leads/converted', label: 'Converted' },
          { href: '/leads/new', label: 'New' },
          { href: '/leads/qualified', label: 'Qualified' },
        ],
      },
      {
        href: '/marketplace',
        label: 'Marketplace',
        icon: Store,
        children: [
          { href: '/availability', label: 'Availability Broadcaster' },
          { href: '/marketplace/capture', label: 'Capture Live Page' },
          { href: '/marketplace', label: 'Command Center' },
        ],
      },
      {
        href: '/proposals',
        label: 'Proposals',
        icon: Presentation,
        children: [
          { href: '/proposals/addons', label: 'Add-Ons' },
          { href: '/proposals/builder', label: 'Proposal Builder' },
          { href: '/proposals/templates', label: 'Templates' },
        ],
      },
      {
        href: '/prospecting',
        label: 'Prospecting',
        icon: Crosshair,
        adminOnly: true,
        children: [
          { href: '/prospecting/scrub', label: 'AI Scrub' },
          { href: '/prospecting/queue', label: 'Call Queue' },
          { href: '/prospecting/scripts', label: 'Call Scripts' },
          { href: '/prospecting/clusters', label: 'Clusters' },
          { href: '/prospecting/import', label: 'Import Leads' },
          { href: '/prospecting/pipeline', label: 'Pipeline' },
        ],
      },
      {
        href: '/quotes',
        label: 'Quotes',
        icon: Invoice,
        children: [
          { href: '/quotes/accepted', label: 'Accepted' },
          { href: '/quotes/draft', label: 'Draft' },
          { href: '/quotes/expired', label: 'Expired' },
          { href: '/quotes/new', label: 'New Quote' },
          { href: '/quotes/rejected', label: 'Rejected' },
          { href: '/quotes/sent', label: 'Sent' },
          { href: '/quotes/viewed', label: 'Viewed' },
        ],
      },
      {
        href: '/rate-card',
        label: 'Rate Card',
        icon: Coins,
      },
      {
        href: '/testimonials',
        label: 'Testimonials',
        icon: Star,
      },
      {
        href: '/wix-submissions',
        label: 'Wix Forms',
        icon: Inbox,
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
        href: '/safety/backup-chef',
        label: 'Backup Coverage',
        icon: IdentificationBadge,
      },
      {
        href: '/settings/protection',
        label: 'Business Health',
        icon: ShieldCheck,
        children: [
          { href: '/settings/protection/continuity', label: 'Business Continuity' },
          { href: '/settings/protection/business-health', label: 'Business Health' },
          { href: '/settings/protection/certifications', label: 'Certifications' },
          { href: '/settings/protection/crisis', label: 'Crisis Response' },
          { href: '/settings/protection/insurance', label: 'Insurance' },
          { href: '/settings/protection/nda', label: 'NDA & Permissions' },
          { href: '/settings/protection/portfolio-removal', label: 'Portfolio Removal' },
        ],
      },
      {
        href: '/safety/incidents',
        label: 'Incidents',
        icon: AlertTriangle,
        children: [{ href: '/safety/incidents/new', label: 'Report Incident' }],
      },
      {
        href: '/safety/claims',
        label: 'Insurance Claims',
        icon: ShieldAlert,
        children: [
          { href: '/safety/claims/documents', label: 'Claim Documents' },
          { href: '/safety/claims/new', label: 'New Claim', hidden: true },
        ],
      },
    ],
  },
  {
    id: 'supply-chain',
    label: 'Supply Chain',
    icon: Truck,
    module: 'operations',
    items: [
      {
        href: '/inventory/demand',
        label: 'Demand Forecast',
        icon: TrendingUp,
      },
      {
        href: '/inventory/expiry',
        label: 'Expiry Alerts',
        icon: Clock,
      },
      {
        href: '/food-cost',
        label: 'Food Cost',
        icon: Calculator,
        children: [{ href: '/food-cost/revenue', label: 'Daily Revenue' }],
      },
      {
        href: '/inventory/food-cost',
        label: 'Food Cost Analysis',
        icon: Calculator,
      },
      {
        href: '/inventory/counts',
        label: 'Inventory Counts',
        icon: ListChecks,
      },
      {
        href: '/inventory',
        label: 'Inventory Hub',
        icon: Warehouse,
      },
      {
        href: '/inventory/audits',
        label: 'Physical Audits',
        icon: MagnifyingGlassPlus,
        children: [{ href: '/inventory/audits/new', label: 'New Audit' }],
      },
      {
        href: '/inventory/procurement',
        label: 'Procurement Hub',
        icon: HandArrowDown,
      },
      {
        href: '/inventory/purchase-orders',
        label: 'Purchase Orders',
        icon: Truck,
        children: [{ href: '/inventory/purchase-orders/new', label: 'New PO' }],
      },
      {
        href: '/vendors',
        label: 'Purveyors',
        icon: Truck,
        children: [
          { href: '/vendors/invoices', label: 'Invoices' },
          { href: '/vendors/price-comparison', label: 'Price Comparison' },
        ],
      },
      {
        href: '/inventory/staff-meals',
        label: 'Staff Meals',
        icon: UtensilsCrossed,
      },
      {
        href: '/inventory/locations',
        label: 'Storage Locations',
        icon: MapPin,
      },
      {
        href: '/inventory/transactions',
        label: 'Transaction Ledger',
        icon: Receipt,
      },
      {
        href: '/inventory/vendor-invoices',
        label: 'Vendor Invoices',
        icon: Invoice,
      },
      {
        href: '/inventory/reorder',
        label: 'Reorder Settings',
        icon: RefreshCw,
      },
      {
        href: '/inventory/waste',
        label: 'Waste Tracking',
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: Toolbox,
    module: 'more',
    items: [
      {
        href: '/activity',
        label: 'Activity Log',
        icon: Activity,
      },
      {
        href: '/import',
        label: 'Data Import',
        icon: Upload,
        children: [
          { href: '/import/csv', label: 'CSV Import' },
          { href: '/import/history', label: 'Import History' },
          { href: '/import/mxp', label: 'MasterCook Import' },
        ],
      },
      {
        href: '/help',
        label: 'Help Center',
        icon: Compass,
        children: [{ href: '/help/food-costing', label: 'Food Costing Guide' }],
      },
      {
        href: '/inbox/history-scan',
        label: 'Inbox Tools',
        icon: MessageCircle,
        children: [{ href: '/inbox/triage', label: 'Sort Messages' }],
      },
      {
        href: '/settings/integrations',
        label: 'Integrations',
        icon: Settings,
        children: [
          { href: '/settings/api-keys', label: 'API Keys', hidden: true },
          { href: '/settings/automations', label: 'Automations' },
          { href: '/settings/calendar-sync', label: 'Calendar Sync' },
          { href: '/settings/custom-fields', label: 'Custom Fields' },
          { href: '/settings/embed', label: 'Embed Widget' },
          { href: '/settings/platform-connections', label: 'Platform Connections' },
          { href: '/settings/stripe-connect', label: 'Stripe Connect' },
          { href: '/settings/webhooks', label: 'Webhooks', hidden: true },
          { href: '/settings/yelp', label: 'Yelp' },
          { href: '/settings/zapier', label: 'Zapier', hidden: true },
        ],
      },
      {
        href: '/chat',
        label: 'Messaging',
        icon: MessageCircle,
      },
      {
        href: '/briefing',
        label: 'Morning Briefing',
        icon: Compass,
      },
      {
        href: '/notifications',
        label: 'Notifications',
        icon: BellRing,
      },
      {
        href: '/commands',
        label: 'Quick Commands',
        icon: Zap,
      },
      {
        href: '/capture',
        label: 'Quick Capture',
        icon: Camera,
      },
      {
        href: '/remy',
        label: 'Remy History',
        icon: Bot,
        adminOnly: true,
      },
    ],
  },
]

// Core groups shown in the sidebar by default.
// Everything else is accessible via /features (All Features gateway).
export const CORE_GROUP_IDS = new Set(['pipeline', 'events', 'clients', 'culinary', 'finance'])

// Sort groups alphabetically so chefs can find features predictably.
navGroups.sort((a, b) => a.label.localeCompare(b.label))

// Sort items within each group alphabetically, and children within each item
for (const group of navGroups) {
  group.items.sort((a, b) => a.label.localeCompare(b.label))
  for (const item of group.items) {
    if (item.children) {
      item.children.sort((a, b) => a.label.localeCompare(b.label))
    }
  }
}

export const standaloneBottom: NavItem[] = [
  { href: '/features', label: 'All Features', icon: Compass },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const mobileTabItems: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/finance', label: 'Finance', icon: DollarSign },
]

// All available options for mobile tab customization.
// Users can pick 5 from this list via Settings > Navigation.
export const MOBILE_TAB_OPTIONS: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/daily', label: 'Daily Ops', icon: ListChecks },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/culinary', label: 'Culinary', icon: ChefHat },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/inquiries', label: 'Pipeline', icon: ChatTeardropText },
  { href: '/menus', label: 'Menus', icon: UtensilsCrossed },
  { href: '/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/chat', label: 'Messaging', icon: MessageCircle },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/culinary/costing', label: 'Costing', icon: Calculator },
  { href: '/briefing', label: 'Briefing', icon: Compass },
  { href: '/culinary/prep/shopping', label: 'Shopping', icon: ShoppingCart },
  { href: '/queue', label: 'Queue', icon: Zap },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const MOBILE_TAB_BY_HREF = new Map(MOBILE_TAB_OPTIONS.map((t) => [t.href, t]))

export function resolveMobileTabs(preferredHrefs?: string[] | null): NavItem[] {
  if (!preferredHrefs || preferredHrefs.length === 0) return mobileTabItems
  const seen = new Set<string>()
  const resolved: NavItem[] = []
  for (const href of preferredHrefs) {
    if (seen.has(href)) continue
    const option = MOBILE_TAB_BY_HREF.get(href)
    if (!option) continue
    seen.add(href)
    resolved.push(option)
    if (resolved.length >= 5) break
  }
  return resolved.length > 0 ? resolved : mobileTabItems
}

const settingsShortcutOptions: PrimaryShortcutOption[] = [
  { href: '/settings/pricing', label: 'Pricing', icon: Settings, context: 'Settings' },
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
  { href: '/settings/restaurants', label: 'My Restaurants', icon: Store, context: 'Settings' },
  {
    href: '/settings/client-preview',
    label: 'Client Preview',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/integrations', label: 'Integrations', icon: Settings, context: 'Settings' },
  {
    href: '/settings/templates',
    label: 'Response Templates',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/automations', label: 'Automations', icon: Settings, context: 'Settings' },
  {
    href: '/settings/touchpoints',
    label: 'Touchpoint Rules',
    icon: BellRing,
    context: 'Settings',
  },
  {
    href: '/settings/contracts',
    label: 'Contract Templates',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/repertoire', label: 'Seasonal Palettes', icon: Settings, context: 'Settings' },
  { href: '/settings/journal', label: 'Chef Journal', icon: Settings, context: 'Settings' },
  {
    href: '/settings/favorite-chefs',
    label: 'Inspiration Board',
    icon: Star,
    context: 'Settings',
  },
  { href: '/settings/profile', label: 'Network Profile', icon: Settings, context: 'Settings' },
  {
    href: '/settings/compliance',
    label: 'Food Safety & Certifications',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/compliance/haccp',
    label: 'HACCP Plan',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/emergency',
    label: 'Emergency Contacts',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/professional',
    label: 'Professional Development',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/credentials',
    label: 'Credentials & Resume',
    icon: IdentificationBadge,
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
  {
    href: '/settings/api-keys',
    label: 'API Keys',
    icon: Settings,
    context: 'Settings',
    hidden: true,
  },
  {
    href: '/settings/webhooks',
    label: 'Webhooks',
    icon: Settings,
    context: 'Settings',
    hidden: true,
  },
  {
    href: '/settings/compliance/gdpr',
    label: 'GDPR & Data Privacy',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/data-export',
    label: 'Data Export',
    icon: Download,
    context: 'Settings',
  },
  { href: '/settings/custom-fields', label: 'Custom Fields', icon: Settings, context: 'Settings' },
  { href: '/settings/taxonomy', label: 'Custom Lists', icon: List, context: 'Settings' },
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
    label: 'Support ChefFlow',
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
  {
    href: '/settings/platform-connections',
    label: 'Platform Connections',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/embed', label: 'Embed Widget', icon: Settings, context: 'Settings' },
  {
    href: '/settings/communication',
    label: 'Communication',
    icon: ChatDots,
    context: 'Settings',
  },
  {
    href: '/settings/calendar-sync',
    label: 'Calendar Sync (iCal)',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/payment-methods',
    label: 'Digital Wallets',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/zapier',
    label: 'Zapier & Webhooks',
    icon: Settings,
    context: 'Settings',
    hidden: true,
  },
  {
    href: '/settings/yelp',
    label: 'Yelp Reviews',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/culinary-profile',
    label: 'Culinary Profile',
    icon: ChefHat,
    context: 'Settings',
  },
  {
    href: '/settings/devices',
    label: 'Devices',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/health',
    label: 'Health & Wellness',
    icon: HeartHandshake,
    context: 'Settings',
  },
  {
    href: '/settings/incidents',
    label: 'Incidents',
    icon: AlertTriangle,
    context: 'Settings',
  },
  {
    href: '/settings/menu-engine',
    label: 'Menu Engine',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/menu-templates',
    label: 'Menu Templates',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/my-services',
    label: 'My Services',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/notifications',
    label: 'Notifications',
    icon: BellRing,
    context: 'Settings',
  },
  {
    href: '/settings/print',
    label: 'Print Settings',
    icon: Settings,
    context: 'Settings',
  },
  {
    href: '/settings/remy',
    label: 'Remy (AI Assistant)',
    icon: Bot,
    context: 'Settings',
  },
  {
    href: '/settings/stripe-connect',
    label: 'Stripe Connect',
    icon: CreditCard,
    context: 'Settings',
  },
  {
    href: '/settings/delete-account',
    label: 'Delete Account',
    icon: AlertTriangle,
    context: 'Settings',
  },
  {
    href: '/settings/professional/skills',
    label: 'Skills & Certifications',
    icon: SealCheck,
    context: 'Settings',
  },
  {
    href: '/settings/professional/momentum',
    label: 'Career Momentum',
    icon: TrendingUp,
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

export const DEFAULT_PRIMARY_SHORTCUT_HREFS = normalizePrimaryNavHrefs(
  standaloneTop.map((item) => item.href)
)

export function resolveStandaloneTop(preferredHrefs?: string[] | null): NavItem[] {
  const byHref = new Map(PRIMARY_SHORTCUT_OPTIONS.map((item) => [item.href, item] as const))
  const seen = new Set<string>()
  const desired = normalizePrimaryNavHrefs(preferredHrefs ?? [])
  const resolved: NavItem[] = []

  for (const href of desired) {
    if (seen.has(href)) continue
    const option = byHref.get(href)
    if (!option) continue
    seen.add(href)
    resolved.push({ ...option })
  }

  if (resolved.length > 0) return resolved
  return standaloneTop.map((item) => ({ ...item }))
}

export function getPrimaryShortcutOptions() {
  return PRIMARY_SHORTCUT_OPTIONS.map(({ href, label, context }) => ({ href, label, context }))
}

// Action Bar: 6 primary domains from the approved navigation contract.
// Today, Inbox, Events, Clients, Culinary, Finance.
// All other surfaces reachable via the All Features collapse, command palette, or direct routes.
export const actionBarItems: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/culinary', label: 'Culinary', icon: UtensilsCrossed },
  { href: '/finance', label: 'Finance', icon: DollarSign },
]

// ─── + Create dropdown: 15 direct navigation links ───
// Sorted by workflow chain: creative > pipeline > operational > uploads
// Separators between groups at indices 2, 7, 11 (after Recipe, Expense, Inventory Item)
export type CreateDropdownItem = {
  href: string
  label: string
  icon: LucideIcon
  group: 'creative' | 'pipeline' | 'operational' | 'upload'
}

export const createDropdownItems: CreateDropdownItem[] = [
  // Creative
  { href: '/menus/new', label: 'New Menu', icon: UtensilsCrossed, group: 'creative' },
  { href: '/recipes/new', label: 'New Recipe', icon: BookOpen, group: 'creative' },
  // Pipeline
  { href: '/events/new', label: 'New Event', icon: CalendarDays, group: 'pipeline' },
  { href: '/clients/new', label: 'New Client', icon: Users, group: 'pipeline' },
  { href: '/quotes/new', label: 'New Quote', icon: FileText, group: 'pipeline' },
  { href: '/inquiries/new', label: 'New Inquiry', icon: Inbox, group: 'pipeline' },
  { href: '/expenses/new', label: 'New Expense', icon: DollarSign, group: 'pipeline' },
  // Operational
  { href: '/documents', label: 'Documents', icon: FileText, group: 'operational' },
  { href: '/culinary/prep', label: 'Prep', icon: Timer, group: 'operational' },
  { href: '/calendar', label: 'Calendar Date', icon: Calendar, group: 'operational' },
  {
    href: '/culinary/prep/shopping',
    label: 'Shopping List',
    icon: ShoppingCart,
    group: 'operational',
  },
  { href: '/inventory', label: 'Inventory Item', icon: Package, group: 'operational' },
  // Uploads
  { href: '/receipts', label: 'Upload Receipt', icon: Receipt, group: 'upload' },
  { href: '/recipes/photos', label: 'Photo Upload', icon: Camera, group: 'upload' },
  { href: '/menus/upload', label: 'Upload Menu', icon: Upload, group: 'upload' },
]

export type { NavItem, NavSubItem, NavCollapsibleItem, NavGroup, PrimaryShortcutOption }
