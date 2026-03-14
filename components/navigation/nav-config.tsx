// Centralized navigation configuration (single source of truth)
// Organized by what a chef actually does: Sell → Plan → Cook → Stock → Money → Grow
// Rule: nothing hidden. If it's built, it's findable within 1-2 clicks.
import type { LucideIcon } from '@/components/ui/icons'
import {
  Activity,
  AlertTriangle,
  BarChart3,
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
  Exam,
  FileText,
  FlagBanner,
  Flower,
  Funnel,
  Gamepad2,
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
  Zap,
} from '@/components/ui/icons'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
  coreFeature?: boolean
}
type NavSubItem = {
  href: string
  label: string
  icon?: LucideIcon
  visibility?: 'secondary' | 'advanced'
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

// Primary always-visible shortcuts (top of sidebar)
// coreFeature: true = shown in Focus Mode. false/undefined = hidden in Focus Mode, shown when OFF.
// adminOnly items are always hidden for non-admins regardless of Focus Mode.
export const standaloneTop: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, coreFeature: true },
  { href: '/briefing', label: 'Briefing', icon: ClipboardCheck, coreFeature: true },
  { href: '/commands', label: 'Remy', icon: Bot, coreFeature: true, adminOnly: true },
  { href: '/daily', label: 'Daily Ops', icon: ListChecks, coreFeature: true },
  { href: '/inbox', label: 'Inbox', icon: Inbox, coreFeature: true },
  { href: '/clients', label: 'Clients', icon: Users, coreFeature: true },
  { href: '/inquiries', label: 'Inquiries', icon: ChatTeardropText, coreFeature: true },
  { href: '/chat', label: 'Messaging', icon: MessageCircle, coreFeature: true },
  { href: '/circles', label: 'Circles', icon: MessagesSquare, coreFeature: true },
  { href: '/schedule', label: 'Calendar', icon: CalendarDays, coreFeature: true },
  { href: '/events', label: 'All Events', icon: CalendarCheck, coreFeature: true },
  { href: '/documents', label: 'Documents', icon: FileText, coreFeature: true },
  { href: '/menus', label: 'Menus', icon: UtensilsCrossed, coreFeature: true },
  { href: '/rate-card', label: 'Rate Card', icon: Coins },
  { href: '/travel', label: 'Travel', icon: MapPin },
  { href: '/staff', label: 'Staff', icon: IdentificationBadge },
  { href: '/tasks', label: 'Tasks', icon: Kanban },
  { href: '/stations', label: 'Stations', icon: Notepad },
  { href: '/activity', label: 'Activity', icon: Activity, coreFeature: true },
  { href: '/goals', label: 'Goals', icon: Target, coreFeature: true },
  { href: '/prospecting', label: 'Prospecting', icon: Crosshair, adminOnly: true },
  { href: '/charity', label: 'Charity Hub', icon: HeartHandshake, adminOnly: true },
  { href: '/portfolio', label: 'Portfolio', icon: Image },
  { href: '/commerce', label: 'Commerce', icon: Store },
  { href: '/commerce/register', label: 'POS Register', icon: ShoppingCart },
  { href: '/commerce/virtual-terminal', label: 'Virtual Terminal', icon: CreditCard },
  { href: '/commerce/table-service', label: 'Table Service', icon: UtensilsCrossed },
  { href: '/commerce/promotions', label: 'Promotions', icon: Percent },
  { href: '/commerce/observability', label: 'Observability', icon: AlertTriangle },
  { href: '/commerce/parity', label: 'Clover Parity', icon: BarChart3 },
]

// ─── NAV GROUPS ─────────────────────────────────────────────────
// Organized by chef workflow: AI → Sell → Plan → Cook → Stock → Money → Grow → Protect
export const navGroups: NavGroup[] = [
  // ─── REMY (AI Assistant) ───
  {
    id: 'remy',
    label: 'Remy',
    icon: Bot,
    items: [
      {
        href: '/commands',
        label: 'Ask Remy',
        icon: Bot,
        adminOnly: true,
        children: [{ href: '/remy', label: 'Conversation History' }],
      },
      {
        href: '/settings/ai-privacy',
        label: 'AI Privacy & Settings',
        icon: ShieldCheck,
        adminOnly: true,
      },
    ],
  },

  // ─── SALES & PIPELINE (getting new business) ───
  {
    id: 'sales',
    label: 'Sales',
    icon: Funnel,
    module: 'pipeline',
    items: [
      {
        href: '/inquiries',
        label: 'Inquiries',
        icon: ChatTeardropText,
        children: [
          { href: '/inquiries/awaiting-response', label: 'Awaiting Response' },
          { href: '/inquiries/awaiting-client-reply', label: 'Awaiting Client' },
          { href: '/inquiries/menu-drafting', label: 'Menu Drafting' },
          { href: '/inquiries/sent-to-client', label: 'Sent to Client' },
          { href: '/inquiries/new', label: 'Log New Inquiry' },
          { href: '/inquiries/declined', label: 'Declined' },
        ],
      },
      {
        href: '/quotes',
        label: 'Quotes',
        icon: Invoice,
        children: [
          { href: '/quotes/new', label: 'New Quote' },
          { href: '/quotes/draft', label: 'Draft' },
          { href: '/quotes/sent', label: 'Sent' },
          { href: '/quotes/viewed', label: 'Viewed' },
          { href: '/quotes/accepted', label: 'Accepted' },
          { href: '/quotes/expired', label: 'Expired' },
          { href: '/quotes/rejected', label: 'Rejected' },
        ],
      },
      {
        href: '/rate-card',
        label: 'Rate Card',
        icon: Coins,
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
        href: '/leads',
        label: 'Leads',
        icon: Target,
        children: [
          { href: '/leads/new', label: 'New' },
          { href: '/leads/contacted', label: 'Contacted' },
          { href: '/leads/qualified', label: 'Qualified' },
          { href: '/leads/converted', label: 'Converted' },
          { href: '/leads/archived', label: 'Archived' },
        ],
      },
      {
        href: '/marketplace',
        label: 'Marketplace',
        icon: Store,
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
        ],
      },
      {
        href: '/calls',
        label: 'Calls & Meetings',
        icon: Phone,
        children: [
          { href: '/calls/new', label: 'Schedule Call' },
          { href: '/calls?status=scheduled', label: 'Upcoming' },
          { href: '/calls?status=completed', label: 'Completed' },
        ],
      },
      {
        href: '/testimonials',
        label: 'Testimonials',
        icon: Star,
      },
    ],
  },

  // ─── CONSULTING (pricing, positioning, and offer design) ───
  {
    id: 'consulting',
    label: 'Consulting',
    icon: Compass,
    items: [
      {
        href: '/consulting',
        label: 'Consulting Hub',
        icon: Compass,
      },
    ],
  },

  // ─── CLIENTS & GUESTS (people) ───
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
          { href: '/clients/new', label: 'Add Client' },
          { href: '/clients/segments', label: 'Segments' },
          { href: '/clients/duplicates', label: 'Duplicates' },
          { href: '/clients/gift-cards', label: 'Gift Cards' },
        ],
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
        href: '/clients/history',
        label: 'Client History',
        icon: Clock,
        children: [
          { href: '/clients/history/event-history', label: 'Event History' },
          { href: '/clients/history/past-menus', label: 'Past Menus' },
          { href: '/clients/history/spending-history', label: 'Spending History' },
        ],
      },
      {
        href: '/clients/preferences',
        label: 'Preferences & Dietary',
        icon: Sliders,
        children: [
          { href: '/clients/preferences/dietary-restrictions', label: 'Dietary Restrictions' },
          { href: '/clients/preferences/allergies', label: 'Allergies' },
          { href: '/clients/preferences/favorite-dishes', label: 'Favorite Dishes' },
          { href: '/clients/preferences/dislikes', label: 'Dislikes' },
        ],
      },
      {
        href: '/clients/insights',
        label: 'Client Insights',
        icon: ChartLineUp,
        children: [
          { href: '/clients/insights/top-clients', label: 'Top Clients' },
          { href: '/clients/insights/most-frequent', label: 'Most Frequent' },
          { href: '/clients/insights/at-risk', label: 'At Risk' },
        ],
      },
      {
        href: '/loyalty',
        label: 'Loyalty & Rewards',
        icon: Gift,
        children: [
          { href: '/loyalty/settings', label: 'Program Settings' },
          { href: '/loyalty/rewards/new', label: 'Create Reward' },
          { href: '/clients/loyalty', label: 'Loyalty Overview' },
          { href: '/clients/loyalty/points', label: 'Points' },
          { href: '/clients/loyalty/rewards', label: 'Rewards' },
          { href: '/clients/loyalty/referrals', label: 'Referrals' },
        ],
      },
      {
        href: '/guests',
        label: 'Guest Directory',
        icon: Contact,
        children: [
          { href: '/guests/reservations', label: 'Reservations' },
          { href: '/guest-leads', label: 'Guest Pipeline' },
          { href: '/guest-analytics', label: 'Guest Insights' },
        ],
      },
      {
        href: '/partners',
        label: 'Partners & Referrals',
        icon: Handshake,
        children: [
          { href: '/partners/active', label: 'Active' },
          { href: '/partners/inactive', label: 'Inactive' },
          { href: '/partners/new', label: 'Add Partner' },
          { href: '/partners/referral-performance', label: 'Referral Performance' },
          { href: '/partners/events-generated', label: 'Events Generated' },
        ],
      },
    ],
  },

  // ─── EVENTS (planning and executing) ───
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
        label: 'Calendar',
        icon: CalendarDays,
        children: [
          { href: '/calendar/day', label: 'Day View' },
          { href: '/calendar/week', label: 'Week Planner' },
          { href: '/calendar/year', label: 'Year View' },
          { href: '/waitlist', label: 'Waitlist' },
        ],
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
    ],
  },

  // ─── COMMERCE (POS & sales) ───
  {
    id: 'commerce',
    label: 'Commerce',
    icon: Store,
    module: 'commerce',
    items: [
      {
        href: '/commerce',
        label: 'Commerce Hub',
        icon: Store,
      },
      {
        href: '/commerce/register',
        label: 'POS Register',
        icon: ShoppingCart,
      },
      {
        href: '/commerce/virtual-terminal',
        label: 'Virtual Terminal',
        icon: CreditCard,
      },
      {
        href: '/commerce/table-service',
        label: 'Table Service',
        icon: UtensilsCrossed,
      },
      {
        href: '/commerce/products',
        label: 'Products',
        icon: Package,
        children: [{ href: '/commerce/products/new', label: 'New Product' }],
      },
      {
        href: '/commerce/orders',
        label: 'Order Queue',
        icon: Receipt,
      },
      {
        href: '/commerce/sales',
        label: 'Sales History',
        icon: DollarSign,
      },
      {
        href: '/commerce/promotions',
        label: 'Promotions',
        icon: Percent,
      },
      {
        href: '/commerce/observability',
        label: 'Observability',
        icon: AlertTriangle,
      },
      {
        href: '/commerce/parity',
        label: 'Clover Parity',
        icon: BarChart3,
      },
      {
        href: '/commerce/reconciliation',
        label: 'Reconciliation',
        icon: Scales,
      },
      {
        href: '/commerce/settlements',
        label: 'Settlements',
        icon: Landmark,
      },
      {
        href: '/commerce/reports',
        label: 'Reports',
        icon: PieChart,
        children: [{ href: '/commerce/reports/shifts', label: 'Shift Reports' }],
      },
      {
        href: '/commerce/schedules',
        label: 'Payment Schedules',
        icon: CalendarCheck,
      },
    ],
  },

  // ─── CULINARY (food creation) ───
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
          { href: '/culinary/dish-index', label: 'Dish Index' },
          { href: '/menus/upload', label: 'Menu Upload', icon: Upload },
          { href: '/culinary/dish-index/insights', label: 'Dish Insights' },
          { href: '/nutrition', label: 'Nutritional Analysis' },
        ],
      },
      {
        href: '/recipes',
        label: 'Recipes',
        icon: BookOpen,
        children: [
          { href: '/recipes/new', label: 'New Recipe' },
          { href: '/culinary/recipes', label: 'Recipe Library' },
          { href: '/culinary/components', label: 'Components' },
        ],
      },
      {
        href: '/recipes/ingredients',
        label: 'Ingredients',
        icon: Package,
        children: [{ href: '/culinary/ingredients', label: 'Ingredients Database' }],
      },
      {
        href: '/culinary/prep',
        label: 'Prep Workspace',
        icon: Timer,
      },
      {
        href: '/culinary/costing',
        label: 'Costing',
        icon: Calculator,
      },
      {
        href: '/culinary-board',
        label: 'Culinary Board',
        icon: Chalkboard,
      },
      {
        href: '/settings/repertoire',
        label: 'Seasonal Palettes',
        icon: Flower,
      },
    ],
  },

  // ─── OPERATIONS (running the kitchen day-to-day) ───
  {
    id: 'operations',
    label: 'Operations',
    icon: Activity,
    module: 'station-ops',
    items: [
      {
        href: '/stations/daily-ops',
        label: 'Daily Ops',
        icon: Activity,
      },
      {
        href: '/tasks',
        label: 'Tasks',
        icon: ListChecks,
        children: [{ href: '/tasks/templates', label: 'Task Templates' }],
      },
      {
        href: '/stations',
        label: 'Station Clipboards',
        icon: Notepad,
        children: [
          { href: '/stations/orders', label: 'Order Sheet' },
          { href: '/stations/waste', label: 'Waste Log' },
          { href: '/stations/ops-log', label: 'Ops Log' },
        ],
      },
      {
        href: '/staff',
        label: 'Staff',
        icon: IdentificationBadge,
        children: [
          { href: '/staff/schedule', label: 'Schedule' },
          { href: '/staff/availability', label: 'Availability' },
          { href: '/staff/clock', label: 'Clock In/Out' },
          { href: '/staff/performance', label: 'Performance' },
          { href: '/staff/labor', label: 'Labor Dashboard' },
          { href: '/staff/live', label: 'Live Activity' },
        ],
      },
      {
        href: '/queue',
        label: 'Priority Queue',
        icon: Zap,
      },
      {
        href: '/meal-prep',
        label: 'Meal Prep',
        icon: RefreshCw,
        children: [{ href: '/meal-prep', label: 'Dashboard' }],
      },
      {
        href: '/operations/kitchen-rentals',
        label: 'Kitchen Rentals',
        icon: Warehouse,
      },
      {
        href: '/operations/equipment',
        label: 'Equipment',
        icon: Wrench,
      },
    ],
  },

  // ─── VENDORS (buying) ───
  {
    id: 'vendors',
    label: 'Vendors',
    icon: Truck,
    module: 'vendor-management',
    items: [
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
        href: '/food-cost',
        label: 'Food Cost',
        icon: Calculator,
        children: [{ href: '/food-cost/revenue', label: 'Daily Revenue' }],
      },
    ],
  },

  // ─── INVENTORY (tracking stock) ───
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Warehouse,
    module: 'operations',
    items: [
      {
        href: '/inventory',
        label: 'Inventory Hub',
        icon: Warehouse,
      },
      {
        href: '/inventory/transactions',
        label: 'Transaction Ledger',
        icon: Receipt,
      },
      {
        href: '/inventory/locations',
        label: 'Storage Locations',
        icon: MapPin,
      },
      {
        href: '/inventory/purchase-orders',
        label: 'Purchase Orders',
        icon: Truck,
        children: [{ href: '/inventory/purchase-orders/new', label: 'New PO' }],
      },
      {
        href: '/inventory/procurement',
        label: 'Procurement Hub',
        icon: HandArrowDown,
      },
      {
        href: '/inventory/counts',
        label: 'Inventory Counts',
        icon: ListChecks,
      },
      {
        href: '/inventory/audits',
        label: 'Physical Audits',
        icon: MagnifyingGlassPlus,
        children: [{ href: '/inventory/audits/new', label: 'New Audit' }],
      },
      {
        href: '/inventory/waste',
        label: 'Waste Tracking',
        icon: AlertTriangle,
      },
      {
        href: '/inventory/vendor-invoices',
        label: 'Vendor Invoices',
        icon: Invoice,
      },
      {
        href: '/inventory/food-cost',
        label: 'Food Cost Analysis',
        icon: Calculator,
      },
      {
        href: '/inventory/staff-meals',
        label: 'Staff Meals',
        icon: UtensilsCrossed,
      },
      {
        href: '/inventory/expiry',
        label: 'Expiry Alerts',
        icon: Clock,
      },
      {
        href: '/inventory/demand',
        label: 'Demand Forecast',
        icon: TrendingUp,
      },
    ],
  },

  // ─── FINANCE (money) ───
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
          { href: '/finance/overview', label: 'Overview' },
          { href: '/finance', label: 'Finance Home' },
        ],
      },
      {
        href: '/expenses',
        label: 'Expenses',
        icon: Coins,
        children: [
          { href: '/expenses/new', label: 'Add Expense' },
          { href: '/receipts', label: 'Receipt Library' },
          { href: '/finance/expenses', label: 'By Category' },
        ],
      },
      {
        href: '/finance/invoices',
        label: 'Invoices',
        icon: Invoice,
        children: [
          { href: '/finance/invoices/sent', label: 'Sent' },
          { href: '/finance/invoices/paid', label: 'Paid' },
          { href: '/finance/invoices/overdue', label: 'Overdue' },
          { href: '/finance/recurring', label: 'Recurring Invoices' },
        ],
      },
      {
        href: '/finance/payments',
        label: 'Payments',
        icon: CurrencyCircleDollar,
        children: [
          { href: '/finance/payments/deposits', label: 'Deposits' },
          { href: '/finance/payments/installments', label: 'Installments' },
          { href: '/finance/payments/refunds', label: 'Refunds' },
          { href: '/finance/disputes', label: 'Disputes' },
          { href: '/finance/retainers', label: 'Retainers' },
        ],
      },
      {
        href: '/finance/payouts',
        label: 'Payouts',
        icon: Landmark,
        children: [
          { href: '/finance/payouts/stripe-payouts', label: 'Stripe Payouts' },
          { href: '/finance/bank-feed', label: 'Bank Feed' },
        ],
      },
      {
        href: '/finance/ledger',
        label: 'Ledger',
        icon: NotebookIcon,
        children: [{ href: '/finance/ledger/transaction-log', label: 'Transaction Log' }],
      },
      {
        href: '/finance/reporting',
        label: 'Reports',
        icon: BarChart3,
        children: [
          { href: '/finance/reporting/revenue-by-month', label: 'Revenue by Month' },
          { href: '/finance/reporting/revenue-by-client', label: 'Revenue by Client' },
          { href: '/finance/reporting/revenue-by-event', label: 'Revenue by Event' },
          { href: '/finance/reporting/expense-by-category', label: 'Expense by Category' },
          { href: '/finance/reporting/profit-by-event', label: 'Profit by Event' },
          { href: '/finance/reporting/profit-loss', label: 'Profit & Loss' },
          { href: '/finance/reporting/year-to-date-summary', label: 'Year-to-Date Summary' },
        ],
      },
      {
        href: '/finance/tax',
        label: 'Tax Center',
        icon: PieChart,
        children: [
          { href: '/finance/reporting/tax-summary', label: 'Tax Summary' },
          { href: '/finance/tax/quarterly', label: 'Quarterly Estimates' },
          { href: '/finance/tax/year-end', label: 'Year-End Package' },
        ],
      },
      {
        href: '/finance/forecast',
        label: 'Forecasting',
        icon: TrendingUp,
        children: [{ href: '/finance/cash-flow', label: 'Cash Flow Forecast' }],
      },
      {
        href: '/finance/contractors',
        label: '1099 Contractors',
        icon: IdentificationBadge,
      },
    ],
  },

  // ─── MARKETING & GROWTH (getting the word out) ───
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    module: 'more',
    items: [
      {
        href: '/marketing',
        label: 'Email Campaigns',
        icon: Mail,
        children: [
          { href: '/marketing/push-dinners', label: 'Push Dinners' },
          { href: '/marketing/sequences', label: 'Sequences' },
          { href: '/marketing/templates', label: 'Templates' },
        ],
      },
      {
        href: '/social/planner',
        label: 'Content Planner',
        icon: PenNib,
        children: [
          { href: '/social/vault', label: 'Media Vault' },
          { href: '/social/compose', label: 'Post from Event' },
          { href: '/social/connections', label: 'Platform Connections' },
          { href: '/social/settings', label: 'Queue Settings' },
        ],
      },
      {
        href: '/social/hub-overview',
        label: 'Social Hub',
        icon: MessagesSquare,
        adminOnly: true,
      },
      {
        href: '/reputation/mentions',
        label: 'Brand Mentions',
        icon: ShieldAlert,
      },
    ],
  },

  // ─── ANALYTICS (understanding the business) ───
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    module: 'more',
    items: [
      {
        href: '/insights',
        label: 'Insights',
        icon: BarChart3,
        children: [
          { href: '/analytics/daily-report', label: 'Daily Report' },
          { href: '/analytics', label: 'Source Analytics' },
          { href: '/analytics/reports', label: 'Custom Reports' },
          { href: '/insights/time-analysis', label: 'Time Analysis' },
        ],
      },
      {
        href: '/analytics/benchmarks',
        label: 'Business Analytics',
        icon: TrendingUp,
        children: [
          { href: '/analytics/pipeline', label: 'Pipeline Forecast' },
          { href: '/analytics/demand', label: 'Demand Heatmap' },
          { href: '/analytics/client-ltv', label: 'Client Value' },
          { href: '/analytics/referral-sources', label: 'Referral Sources' },
        ],
      },
      {
        href: '/intelligence',
        label: 'Intelligence Hub',
        icon: Compass,
        children: [{ href: '/intelligence', label: 'Full Dashboard' }],
      },
      {
        href: '/goals/setup',
        label: 'Goals',
        icon: Target,
      },
    ],
  },

  // ─── PROTECTION (safety & compliance) ───
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
        children: [{ href: '/safety/incidents/new', label: 'Report Incident' }],
      },
      {
        href: '/safety/backup-chef',
        label: 'Backup Coverage',
        icon: IdentificationBadge,
      },
    ],
  },

  // Tools (utilities)
  {
    id: 'tools',
    label: 'Tools',
    icon: Toolbox,
    module: 'more',
    items: [
      {
        href: '/inbox/history-scan',
        label: 'Inbox Tools',
        icon: MessageCircle,
        children: [{ href: '/inbox/triage', label: 'Sort Messages' }],
      },
      {
        href: '/help',
        label: 'Help Center',
        icon: Compass,
      },
    ],
  },
  // Admin (platform controls)
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldAlert,
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard, adminOnly: true },
      {
        href: '/admin/command-center',
        label: 'Command Center',
        icon: Broadcast,
        adminOnly: true,
      },
      {
        href: '/admin/conversations',
        label: 'Conversations',
        icon: ChatDots,
        adminOnly: true,
      },
      { href: '/admin/social', label: 'Social Feed', icon: MessagesSquare, adminOnly: true },
      { href: '/admin/hub', label: 'Hub Groups', icon: Users, adminOnly: true },
      {
        href: '/admin/notifications',
        label: 'Notifications',
        icon: BellRing,
        adminOnly: true,
      },
      { href: '/admin/presence', label: 'Live Presence', icon: WifiHigh, adminOnly: true },
      { href: '/admin/users', label: 'Chefs', icon: Users, adminOnly: true },
      { href: '/admin/clients', label: 'Clients', icon: Contact, adminOnly: true },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
      { href: '/admin/financials', label: 'Financials', icon: DollarSign, adminOnly: true },
      { href: '/admin/events', label: 'All Events', icon: CalendarDays, adminOnly: true },
      { href: '/admin/audit', label: 'Audit Log', icon: NotebookIcon, adminOnly: true },
      { href: '/admin/system', label: 'System Health', icon: ShieldCheck, adminOnly: true },
      {
        href: '/admin/communications',
        label: 'Communications',
        icon: Mail,
        adminOnly: true,
      },
      { href: '/admin/flags', label: 'Feature Flags', icon: FlagBanner, adminOnly: true },
      {
        href: '/admin/referral-partners',
        label: 'Referral Partners',
        icon: Handshake,
        adminOnly: true,
      },
      { href: '/admin/feedback', label: 'Feedback', icon: Star, adminOnly: true },
      { href: '/admin/animations', label: 'Animations', icon: Activity, adminOnly: true },
      { href: '/admin/cannabis', label: 'Cannabis Tier', icon: SealCheck, adminOnly: true },
      { href: '/admin/beta', label: 'Beta Signups', icon: Star, adminOnly: true },
      {
        href: '/admin/beta-surveys',
        label: 'Beta Surveys',
        icon: ClipboardCheck,
        adminOnly: true,
      },
      { href: '/admin/directory', label: 'Directory', icon: TreeStructure, adminOnly: true },
      { href: '/admin/reconciliation', label: 'Reconciliation', icon: Scales, adminOnly: true },
    ],
  },
]

export const standaloneBottom: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/games', label: 'Games', icon: Gamepad2 },
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
  {
    href: '/settings/templates',
    label: 'Response Templates',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/automations', label: 'Automations', icon: Settings, context: 'Settings' },
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
  { href: '/settings/embed', label: 'Embed Widget', icon: Settings, context: 'Settings' },
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
  },
  {
    href: '/settings/yelp',
    label: 'Yelp Reviews',
    icon: Settings,
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
