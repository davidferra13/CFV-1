// Centralized navigation configuration (single source of truth)
// Organized by chef workflow with granular sub-categories (3-5 items per group).
// Rule: nothing hidden. If it's built, it's findable within 1-2 clicks.
// Items within each group and children within each item are sorted alphabetically.
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
// tier: 'primary' = top section (core daily workflow), 'secondary' = below divider (specialty hubs)
// subMenu: curated quick-access links shown in a collapsible drawer under the hub link
// coreFeature: true = shown in Focus Mode
// adminOnly items are hidden for non-admins
export const standaloneTop: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
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
      { href: '/inquiries', label: 'Inquiries' },
      { href: '/quotes', label: 'Quotes' },
      { href: '/proposals', label: 'Proposals' },
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
    href: '/culinary',
    label: 'Culinary',
    icon: ChefHat,
    coreFeature: true,
    tier: 'secondary',
    subMenu: [
      { href: '/culinary/recipes', label: 'Recipes' },
      { href: '/menus', label: 'Menus' },
      { href: '/culinary/costing', label: 'Costing' },
      { href: '/culinary/prep', label: 'Prep' },
    ],
  },
  {
    href: '/financials',
    label: 'Finance',
    icon: DollarSign,
    coreFeature: true,
    tier: 'secondary',
    subMenu: [
      { href: '/finance/invoices', label: 'Invoices' },
      { href: '/expenses', label: 'Expenses' },
      { href: '/finance/reporting/profit-loss', label: 'Profit and Loss' },
    ],
  },
  {
    href: '/operations',
    label: 'Operations',
    icon: Activity,
    coreFeature: true,
    tier: 'secondary',
    subMenu: [
      { href: '/stations/daily-ops', label: 'Daily Ops' },
      { href: '/staff', label: 'Staff' },
      { href: '/tasks', label: 'Tasks' },
    ],
  },
  { href: '/growth', label: 'Growth', icon: TrendingUp, coreFeature: true, tier: 'secondary' },
  { href: '/admin', label: 'Admin', icon: ShieldAlert, adminOnly: true, tier: 'secondary' },
]

// ─── NAV GROUPS ─────────────────────────────────────────────────
// Groups ordered by chef workflow: Pipeline → Clients → Events → Commerce → Culinary → Operations → Supply Chain → Finance → Marketing → Analytics → Protection → Tools → Admin
// Within each group: items sorted A-Z. Within each item: children sorted A-Z.
export const navGroups: NavGroup[] = [
  // ─── PIPELINE (active deal flow + outreach) ───
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
          { href: '/marketplace', label: 'Command Center' },
          { href: '/availability', label: 'Availability Broadcaster' },
          { href: '/marketplace/capture', label: 'Capture Live Page' },
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
    ],
  },

  // ─── CLIENTS (relationships, intelligence, guests, partners) ───
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
          { href: '/clients/loyalty', label: 'Loyalty Overview' },
          { href: '/clients/loyalty/points', label: 'Points' },
          { href: '/loyalty/settings', label: 'Program Settings' },
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
        href: '/circles',
        label: 'Dinner Circles',
        icon: MessagesSquare,
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
    ],
  },

  // ─── EVENTS (planning, scheduling, reviewing) ───
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
          { href: '/waitlist', label: 'Waitlist' },
          { href: '/calendar/week', label: 'Week Planner' },
          { href: '/calendar/year', label: 'Year View' },
        ],
      },
      {
        href: '/production',
        label: 'Event Calendar',
        icon: CalendarDays,
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
          { href: '/events/board', label: 'Kanban Board' },
        ],
      },
    ],
  },

  // ─── COMMERCE (POS, storefront, reconciliation) ───
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

  // ─── CULINARY (menus, recipes, prep, creative work) ───
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
        href: '/recipes/ingredients',
        label: 'Ingredients',
        icon: Package,
        children: [
          { href: '/culinary/ingredients', label: 'Ingredients Database' },
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
          { href: '/culinary/menus/approved', label: 'Approved' },
          { href: '/culinary/dish-index', label: 'Dish Index' },
          { href: '/culinary/dish-index/insights', label: 'Dish Insights' },
          { href: '/culinary/menus/drafts', label: 'Drafts' },
          { href: '/culinary/menus/engineering', label: 'Menu Engineering' },
          { href: '/menus/upload', label: 'Menu Upload', icon: Upload },
          { href: '/menus/new', label: 'New Menu' },
          { href: '/nutrition', label: 'Nutritional Analysis', hidden: true },
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
        href: '/recipes',
        label: 'Recipes',
        icon: BookOpen,
        children: [
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
        href: '/recipes/sprint',
        label: 'Recipe Sprint',
        icon: Zap,
      },
      {
        href: '/recipes/import',
        label: 'Recipe Import Hub',
        icon: Upload,
      },
      {
        href: '/culinary/substitutions',
        label: 'Substitutions',
        icon: RefreshCw,
      },
    ],
  },

  // ─── OPERATIONS (kitchen day-to-day + workforce + equipment) ───
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
        href: '/tasks',
        label: 'Tasks',
        icon: ListChecks,
        children: [
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

  // ─── SUPPLY CHAIN (vendors, inventory, procurement, cost control) ───
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
        href: '/inventory/waste',
        label: 'Waste Tracking',
        icon: AlertTriangle,
      },
    ],
  },

  // ─── FINANCE (money in, money out, accounting) ───
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
        href: '/expenses',
        label: 'Expenses',
        icon: Coins,
        children: [
          { href: '/expenses/new', label: 'Add Expense' },
          { href: '/finance/expenses', label: 'By Category' },
          { href: '/finance/plate-costs', label: 'Plate Costs' },
          { href: '/receipts', label: 'Receipt Library' },
        ],
      },
      {
        href: '/financials',
        label: 'Financial Hub',
        icon: DollarSign,
        children: [
          { href: '/finance', label: 'Finance Home' },
          { href: '/finance/overview', label: 'Overview' },
        ],
      },
      {
        href: '/finance/forecast',
        label: 'Forecasting',
        icon: TrendingUp,
        children: [{ href: '/finance/cash-flow', label: 'Cash Flow Forecast' }],
      },
      {
        href: '/finance/invoices',
        label: 'Invoices',
        icon: Invoice,
        children: [
          { href: '/finance/invoices/overdue', label: 'Overdue' },
          { href: '/finance/invoices/paid', label: 'Paid' },
          { href: '/finance/recurring', label: 'Recurring Invoices' },
          { href: '/finance/invoices/sent', label: 'Sent' },
        ],
      },
      {
        href: '/finance/ledger',
        label: 'Ledger',
        icon: NotebookIcon,
        children: [{ href: '/finance/ledger/transaction-log', label: 'Transaction Log' }],
      },
      {
        href: '/finance/payments',
        label: 'Payments',
        icon: CurrencyCircleDollar,
        children: [
          { href: '/finance/payments/deposits', label: 'Deposits' },
          { href: '/finance/disputes', label: 'Disputes' },
          { href: '/finance/payments/installments', label: 'Installments' },
          { href: '/finance/payments/refunds', label: 'Refunds' },
          { href: '/finance/retainers', label: 'Retainers' },
        ],
      },
      {
        href: '/finance/payouts',
        label: 'Payouts',
        icon: Landmark,
        children: [
          { href: '/finance/bank-feed', label: 'Bank Feed' },
          { href: '/finance/payouts/stripe-payouts', label: 'Stripe Payouts' },
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
        ],
      },
      {
        href: '/finance/tax',
        label: 'Tax Center',
        icon: PieChart,
        children: [
          { href: '/finance/tax/quarterly', label: 'Quarterly Estimates' },
          { href: '/finance/reporting/tax-summary', label: 'Tax Summary' },
          { href: '/finance/tax/year-end', label: 'Year-End Package' },
        ],
      },
    ],
  },

  // ─── MARKETING (campaigns, content, reputation) ───
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
          { href: '/social/compose', label: 'Post from Event', hidden: true },
          { href: '/social/settings', label: 'Queue Settings' },
          { href: '/social/templates', label: 'Social Templates' },
        ],
      },
      {
        href: '/portfolio',
        label: 'Event Portfolio',
        icon: Image,
      },
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
        href: '/social/hub-overview',
        label: 'Social Hub',
        icon: MessagesSquare,
        adminOnly: true,
      },
    ],
  },

  // ─── ANALYTICS (business intelligence) ───
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
        href: '/goals/setup',
        label: 'Goals',
        icon: Target,
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

  // ─── PROTECTION (safety, compliance, continuity) ───
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
          { href: '/settings/protection/certifications', label: 'Certifications' },
          { href: '/settings/protection/crisis', label: 'Crisis Response' },
          { href: '/settings/protection/insurance', label: 'Insurance' },
          { href: '/settings/protection/nda', label: 'NDA & Permissions' },
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
          { href: '/safety/claims/new', label: 'New Claim' },
        ],
      },
    ],
  },

  // ─── TOOLS (utilities, imports, help) ───
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
        href: '/briefing',
        label: 'Morning Briefing',
        icon: Compass,
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
      },
      {
        href: '/inbox/history-scan',
        label: 'Inbox Tools',
        icon: MessageCircle,
        children: [{ href: '/inbox/triage', label: 'Sort Messages' }],
      },
      {
        href: '/notifications',
        label: 'Notifications',
        icon: BellRing,
      },
      {
        href: '/remy',
        label: 'Remy History',
        icon: Bot,
        adminOnly: true,
      },
    ],
  },

  // ─── ADMIN (platform controls, admin-only) ───
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldAlert,
    items: [
      { href: '/admin/events', label: 'All Events', icon: CalendarDays, adminOnly: true },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
      { href: '/admin/audit', label: 'Audit Log', icon: NotebookIcon, adminOnly: true },
      { href: '/admin/beta', label: 'Early Signups', icon: Star, adminOnly: true },
      {
        href: '/admin/beta-surveys',
        label: 'Surveys',
        icon: ClipboardCheck,
        adminOnly: true,
      },
      // Hidden: { href: '/admin/cannabis', label: 'Cannabis Tier', icon: SealCheck, adminOnly: true },
      { href: '/admin/users', label: 'Chefs', icon: Users, adminOnly: true },
      { href: '/admin/clients', label: 'Clients', icon: Contact, adminOnly: true },
      {
        href: '/admin/command-center',
        label: 'Command Center',
        icon: Broadcast,
        adminOnly: true,
      },
      {
        href: '/admin/communications',
        label: 'Communications',
        icon: Mail,
        adminOnly: true,
      },
      {
        href: '/admin/conversations',
        label: 'Conversations',
        icon: ChatDots,
        adminOnly: true,
      },
      { href: '/admin/directory', label: 'Directory', icon: TreeStructure, adminOnly: true },
      { href: '/admin/flags', label: 'Feature Flags', icon: FlagBanner, adminOnly: true },
      { href: '/admin/feedback', label: 'Feedback', icon: Star, adminOnly: true },
      { href: '/admin/financials', label: 'Financials', icon: DollarSign, adminOnly: true },
      { href: '/admin/hub', label: 'Hub Groups', icon: Users, adminOnly: true },
      { href: '/admin/presence', label: 'Live Presence', icon: WifiHigh, adminOnly: true },
      {
        href: '/admin/notifications',
        label: 'Notifications',
        icon: BellRing,
        adminOnly: true,
      },
      { href: '/admin', label: 'Overview', icon: LayoutDashboard, adminOnly: true },
      { href: '/admin/reconciliation', label: 'Reconciliation', icon: Scales, adminOnly: true },
      {
        href: '/admin/referral-partners',
        label: 'Referral Partners',
        icon: Handshake,
        adminOnly: true,
      },
      { href: '/admin/social', label: 'Social Feed', icon: MessagesSquare, adminOnly: true },
      { href: '/admin/system', label: 'System Health', icon: ShieldCheck, adminOnly: true },
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

// All available options for mobile tab customization.
// Users can pick 5 from this list via Settings > Navigation.
export const MOBILE_TAB_OPTIONS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/daily', label: 'Daily Ops', icon: ListChecks },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/schedule', label: 'Calendar', icon: CalendarDays },
  { href: '/inquiries', label: 'Inquiries', icon: ChatTeardropText },
  { href: '/menus', label: 'Menus', icon: UtensilsCrossed },
  { href: '/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/financials', label: 'Finance', icon: DollarSign },
  { href: '/chat', label: 'Messaging', icon: MessageCircle },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/culinary/costing', label: 'Costing', icon: Calculator },
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
    resolved.push({ ...option })
  }

  if (resolved.length > 0) return resolved
  return standaloneTop
}

export function getPrimaryShortcutOptions() {
  return PRIMARY_SHORTCUT_OPTIONS.map(({ href, label, context }) => ({ href, label, context }))
}

export type { NavItem, NavSubItem, NavCollapsibleItem, NavGroup, PrimaryShortcutOption }
