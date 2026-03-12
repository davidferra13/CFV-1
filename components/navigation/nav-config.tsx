// Centralized navigation configuration (single source of truth)
// Organized by what a chef actually does: Sell → Plan → Cook → Stock → Money → Grow
// Rule: nothing hidden. If it's built, it's findable within 1-2 clicks.
import type { LucideIcon } from '@/components/ui/icons'
import {
  DEFAULT_PRIMARY_SHORTCUT_HREFS as APPROVED_PRIMARY_SHORTCUT_HREFS,
  upgradeLegacyPrimaryNavHrefs,
} from '@/lib/navigation/primary-shortcuts'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  Bot,
  BookOpen,
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
  Palette,
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
  Wine,
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
  module?: string
}
type NavCollapsibleItem = NavItem & {
  children?: NavSubItem[]
  visibility?: 'secondary' | 'advanced'
  adminOnly?: boolean
  module?: string
}
type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  items: NavCollapsibleItem[]
  module?: string
}
type PrimaryShortcutOption = NavItem & { context: string }
type NavRouteEntry = {
  href: string
  label: string
  adminOnly?: boolean
}

// Primary always-visible shortcuts (top of sidebar)
// coreFeature: true = shown in Focus Mode. false/undefined = hidden in Focus Mode, shown when OFF.
// adminOnly items are always hidden for non-admins regardless of Focus Mode.
// All available shortcuts (chefs can pick from these in Settings > Navigation).
// The shipped default bar is controlled by DEFAULT_PRIMARY_SHORTCUT_HREFS below.
export const standaloneTop: NavItem[] = [
  // ── Default shortcuts (shown for new chefs) ──
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, coreFeature: true },
  { href: '/inbox', label: 'Inbox', icon: Inbox, coreFeature: true },
  { href: '/clients', label: 'Clients', icon: Users, coreFeature: true },
  { href: '/inquiries', label: 'Inquiries', icon: ChatTeardropText, coreFeature: true },
  { href: '/quotes', label: 'Quotes', icon: Invoice, coreFeature: true },
  { href: '/schedule', label: 'Calendar', icon: CalendarDays, coreFeature: true },
  { href: '/events', label: 'All Events', icon: CalendarCheck, coreFeature: true },
  { href: '/menus', label: 'Menus', icon: UtensilsCrossed, coreFeature: true },
  { href: '/recipes', label: 'Recipes', icon: BookOpen, coreFeature: true },
  { href: '/communications', label: 'Communications', icon: ChatDots, coreFeature: true },
  { href: '/inventory', label: 'Inventory', icon: Warehouse, coreFeature: true },
  { href: '/documents', label: 'Documents', icon: FileText, coreFeature: true },
  { href: '/finance/invoices', label: 'Invoices', icon: Wallet, coreFeature: true },
  // ── Additional shortcuts (available via Settings > Navigation) ──
  { href: '/briefing', label: 'Briefing', icon: ClipboardCheck, coreFeature: true },
  { href: '/daily', label: 'Daily Ops', icon: ListChecks, coreFeature: true },
  { href: '/commands', label: 'Commands', icon: Broadcast, coreFeature: true, adminOnly: true },
  { href: '/chat', label: 'Messaging', icon: MessageCircle, coreFeature: true },
  { href: '/circles', label: 'Circles', icon: MessagesSquare, coreFeature: true },
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
]

// ─── NAV GROUPS ─────────────────────────────────────────────────
// Organized by chef workflow: Commands → Sell → Plan → Cook → Stock → Money → Grow → Protect
export const navGroups: NavGroup[] = [
  // ─── COMMANDS ───
  {
    id: 'remy',
    label: 'Commands',
    icon: Broadcast,
    items: [
      {
        href: '/commands',
        label: 'Command Center',
        icon: Broadcast,
        adminOnly: true,
        children: [{ href: '/remy', label: 'Workspace History' }],
      },
      {
        href: '/settings/ai-privacy',
        label: 'Privacy & Data',
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
          { href: '/inquiries?status=new', label: 'New' },
          { href: '/inquiries/awaiting-response', label: 'Needs Response' },
          { href: '/inquiries/awaiting-client-reply', label: 'Waiting for Reply' },
          { href: '/inquiries/menu-drafting', label: 'Menu Drafting' },
          { href: '/inquiries?status=confirmed', label: 'Ready to Book' },
          { href: '/inquiries/declined', label: 'Declined' },
          { href: '/inquiries/new', label: 'Log New Inquiry' },
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
        href: '/dashboard/marketplace',
        label: 'Marketplace',
        icon: Store,
        children: [{ href: '/marketplace/capture', label: 'Capture Leads' }],
      },
      {
        href: '/wix-submissions',
        label: 'Wix Submissions',
        icon: Inbox,
      },
      {
        href: '/prospecting',
        label: 'Prospecting',
        icon: Crosshair,
        adminOnly: true,
        children: [
          { href: '/prospecting/clusters', label: 'Clusters' },
          { href: '/prospecting/import', label: 'Import' },
          { href: '/prospecting/pipeline', label: 'Pipeline' },
          { href: '/prospecting/scrub', label: 'Lead Research' },
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
          { href: '/clients/recurring', label: 'Recurring Clients' },
          { href: '/clients/presence', label: 'Client Presence' },
          { href: '/clients/segments', label: 'Segments' },
          { href: '/clients/duplicates', label: 'Duplicates' },
          { href: '/clients/gift-cards', label: 'Gift Cards' },
        ],
      },
      {
        href: '/client-requests',
        label: 'Quick Requests',
        icon: Inbox,
      },
      {
        href: '/communications',
        label: 'Communications',
        icon: ChatDots,
        children: [
          { href: '/clients/communication', label: 'Client Workspace' },
          { href: '/clients/communication/notes', label: 'Client Notes' },
          { href: '/clients/communication/follow-ups', label: 'Follow-Ups' },
          { href: '/clients/communication/upcoming-touchpoints', label: 'Upcoming Touchpoints' },
          { href: '/clients/outreach', label: 'Outreach & Referrals' },
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
        href: '/feedback',
        label: 'Feedback',
        icon: Star,
        children: [{ href: '/surveys', label: 'Survey Inbox' }],
      },
      {
        href: '/loyalty',
        label: 'Loyalty & Rewards',
        icon: Gift,
        children: [
          { href: '/loyalty/settings', label: 'Program Settings' },
          { href: '/loyalty/learn', label: 'Learn Loyalty' },
          { href: '/loyalty/raffle', label: 'Raffle' },
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
        label: 'My Events',
        icon: CalendarDays,
        children: [
          { href: '/events/new', label: 'Create Event' },
          { href: '/events/new/from-text', label: 'Create from Text' },
          { href: '/events/new/wizard', label: 'Event Wizard' },
          { href: '/events/board', label: 'Kanban Board' },
          { href: '/events/awaiting-deposit', label: 'Deposit Pending' },
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
          { href: '/calendar/share', label: 'Share Calendar' },
          { href: '/production', label: 'Production Calendar' },
          { href: '/scheduling', label: 'Scheduling Dashboard' },
          { href: '/scheduling/availability', label: 'Availability' },
          { href: '/scheduling/shifts', label: 'Shifts' },
          { href: '/scheduling/swaps', label: 'Swaps' },
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
        href: '/commerce/kds',
        label: 'Kitchen Display',
        icon: Kanban,
      },
      {
        href: '/commerce/products',
        label: 'Products',
        icon: Package,
        children: [
          { href: '/commerce/products/new', label: 'New Product' },
          { href: '/commerce/modifiers', label: 'Modifiers' },
        ],
      },
      {
        href: '/commerce/gift-cards',
        label: 'Gift Cards',
        icon: Gift,
      },
      {
        href: '/commerce/orders',
        label: 'Order Queue',
        icon: Receipt,
      },
      {
        href: '/commerce/purchase-orders',
        label: 'Purchase Orders',
        icon: Truck,
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
        href: '/commerce/specials',
        label: 'Specials',
        icon: Flower,
      },
      {
        href: '/commerce/qr-menu',
        label: 'QR Menu',
        icon: Compass,
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
        children: [
          { href: '/commerce/analytics', label: 'Analytics' },
          { href: '/commerce/analytics/peak-hours', label: 'Peak Hours' },
          { href: '/commerce/reports/shifts', label: 'Shift Reports' },
        ],
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
        href: '/culinary',
        label: 'Culinary Hub',
        icon: ChefHat,
      },
      {
        href: '/menus',
        label: 'Menus',
        icon: UtensilsCrossed,
        children: [
          { href: '/culinary/menus', label: 'Menu Workspace' },
          { href: '/menus/new', label: 'New Menu' },
          { href: '/menus/dishes', label: 'Dish Library' },
          { href: '/nutrition', label: 'Nutrition Analysis' },
          { href: '/culinary/menus/drafts', label: 'Draft Menus' },
          { href: '/culinary/menus/approved', label: 'Approved Menus' },
          { href: '/culinary/menus/scaling', label: 'Scaling' },
          { href: '/culinary/menus/substitutions', label: 'Substitutions' },
          { href: '/culinary/dish-index', label: 'Dish Index' },
          { href: '/menus/upload', label: 'Menu Upload', icon: Upload },
          { href: '/culinary/dish-index/insights', label: 'Dish Insights' },
          { href: '/culinary/menus/templates', label: 'Menu Templates' },
        ],
      },
      {
        href: '/recipes',
        label: 'Recipes',
        icon: BookOpen,
        children: [
          { href: '/recipes/new', label: 'New Recipe' },
          { href: '/culinary/recipes', label: 'Recipe Library' },
          { href: '/culinary/recipes/drafts', label: 'Draft Recipes' },
          { href: '/culinary/recipes/dietary-flags', label: 'Dietary Flags' },
          { href: '/culinary/recipes/seasonal-notes', label: 'Seasonal Notes' },
          { href: '/culinary/recipes/tags', label: 'Recipe Tags' },
          { href: '/recipes/production-log', label: 'Production Log' },
          { href: '/recipes/sprint', label: 'Recipe Sprint' },
          {
            href: '/culinary/components',
            label: 'Components',
          },
          { href: '/culinary/components/sauces', label: 'Sauces' },
          { href: '/culinary/components/stocks', label: 'Stocks & Broths' },
          { href: '/culinary/components/ferments', label: 'Ferments' },
          { href: '/culinary/components/garnishes', label: 'Garnishes' },
          { href: '/culinary/components/shared-elements', label: 'Shared Elements' },
        ],
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
        href: '/culinary/prep',
        label: 'Prep Workspace',
        icon: Timer,
        children: [
          { href: '/culinary/prep/shopping', label: 'Prep Shopping' },
          { href: '/culinary/prep/timeline', label: 'Prep Timeline' },
        ],
      },
      {
        href: '/culinary/costing',
        label: 'Costing',
        icon: Calculator,
        children: [
          { href: '/culinary/costing/recipe', label: 'Recipe Costing' },
          { href: '/culinary/costing/menu', label: 'Menu Costing' },
          { href: '/culinary/costing/food-cost', label: 'Food Cost' },
        ],
      },
      {
        href: '/culinary/my-kitchen',
        label: 'My Kitchen',
        icon: Store,
      },
      {
        href: '/culinary/vendors',
        label: 'Culinary Vendors',
        icon: Truck,
      },
      {
        href: '/bakery/production',
        label: 'Bakery',
        icon: ChefHat,
        children: [
          { href: '/bakery/orders', label: 'Orders' },
          { href: '/bakery/orders/new', label: 'New Order' },
          { href: '/bakery/oven-schedule', label: 'Oven Schedule' },
          { href: '/bakery/display-case', label: 'Display Case' },
          { href: '/bakery/fermentation', label: 'Fermentation' },
          { href: '/bakery/wholesale', label: 'Wholesale' },
          { href: '/bakery/seasonal', label: 'Seasonal' },
          { href: '/bakery/tastings', label: 'Tastings' },
          { href: '/bakery/batches', label: 'Batches' },
          { href: '/bakery/yield', label: 'Yield' },
        ],
      },
      {
        href: '/culinary-board',
        label: 'Culinary Board',
        icon: Chalkboard,
      },
      {
        href: '/culinary/beverages',
        label: 'Beverages',
        icon: Wine,
        visibility: 'advanced' as const,
      },
      {
        href: '/culinary/plating-guides',
        label: 'Plating Guides',
        icon: Palette,
        visibility: 'advanced' as const,
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
    items: [
      {
        href: '/operations',
        label: 'Operations Hub',
        icon: Activity,
      },
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
          { href: '/stations/orders/print', label: 'Order Sheet Print' },
          { href: '/stations/waste', label: 'Waste Log' },
          { href: '/stations/ops-log', label: 'Ops Log' },
        ],
      },
      {
        href: '/staff',
        label: 'Staff',
        icon: IdentificationBadge,
        children: [
          { href: '/team', label: 'Team Access' },
          { href: '/staff/schedule', label: 'Schedule' },
          { href: '/staff/availability', label: 'Availability' },
          { href: '/staff/clock', label: 'Clock In/Out' },
          { href: '/staff/time-clock', label: 'Time Clock' },
          { href: '/staff/time-clock/weekly', label: 'Weekly Time Clock' },
          { href: '/staff/performance', label: 'Performance' },
          { href: '/staff/labor', label: 'Labor Dashboard' },
          { href: '/staff/forecast', label: 'Staff Forecast' },
          { href: '/staff/freelancers', label: 'Freelancers' },
          { href: '/staff/live', label: 'Live Activity' },
        ],
      },
      {
        href: '/training',
        label: 'Training & SOPs',
        icon: ClipboardCheck,
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
        children: [
          { href: '/meal-prep/containers', label: 'Container Inventory' },
          { href: '/meal-prep/cooking-day', label: 'Cooking Day' },
          { href: '/meal-prep/delivery', label: 'Delivery Route' },
          { href: '/meal-prep/labels', label: 'Container Labels' },
          { href: '/meal-prep/shopping', label: 'Meal Prep Shopping' },
          { href: '/meal-prep/waste', label: 'Meal Prep Waste' },
        ],
      },
      {
        href: '/shopping',
        label: 'Shopping Lists',
        icon: ShoppingCart,
        children: [
          { href: '/shopping/new', label: 'New Shopping List' },
          { href: '/shopping/weekly', label: 'Weekly Shopping' },
        ],
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
      {
        href: '/packing-templates',
        label: 'Packing Templates',
        icon: Package,
      },
      {
        href: '/food-truck/loadout',
        label: 'Food Truck',
        icon: Truck,
        children: [
          { href: '/food-truck/locations', label: 'Locations' },
          { href: '/food-truck/maintenance', label: 'Maintenance' },
          { href: '/food-truck/menu-board', label: 'Menu Board' },
          { href: '/food-truck/menu-board/display', label: 'Menu Board Display' },
          { href: '/food-truck/par-planning', label: 'Par Planning' },
          { href: '/food-truck/permits', label: 'Permits' },
          { href: '/food-truck/preorders', label: 'Preorders' },
          { href: '/food-truck/profitability', label: 'Profitability' },
          { href: '/food-truck/social', label: 'Food Truck Social' },
          { href: '/food-truck/weather', label: 'Weather' },
        ],
      },
    ],
  },

  // ─── VENDORS (buying) ───
  {
    id: 'vendors',
    label: 'Vendors',
    icon: Truck,
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
    items: [
      {
        href: '/inventory',
        label: 'Inventory Hub',
        icon: Warehouse,
      },
      {
        href: '/inventory/transactions',
        label: 'Stock Movements',
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
        children: [
          { href: '/inventory/stocktake', label: 'Stocktake' },
          { href: '/inventory/stocktake/history', label: 'Stocktake History' },
        ],
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
        children: [{ href: '/inventory/fifo', label: 'FIFO' }],
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
        children: [{ href: '/inventory/reorder', label: 'Reorder' }],
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
          { href: '/finance/overview/revenue-summary', label: 'Revenue Summary' },
          { href: '/finance/overview/outstanding-payments', label: 'Outstanding Payments' },
          { href: '/finance/overview/cash-flow', label: 'Cash Flow Overview' },
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
          { href: '/finance/expenses/food-ingredients', label: 'Food Ingredients' },
          { href: '/finance/expenses/labor', label: 'Labor' },
          { href: '/finance/expenses/marketing', label: 'Marketing' },
          { href: '/finance/expenses/miscellaneous', label: 'Miscellaneous' },
          { href: '/finance/expenses/rentals-equipment', label: 'Rentals & Equipment' },
          { href: '/finance/expenses/software', label: 'Software' },
          { href: '/finance/expenses/travel', label: 'Travel' },
        ],
      },
      {
        href: '/finance/invoices',
        label: 'Invoices',
        icon: Invoice,
        children: [
          { href: '/finance/invoices/draft', label: 'Draft' },
          { href: '/finance/invoices/sent', label: 'Sent' },
          { href: '/finance/invoices/paid', label: 'Paid' },
          { href: '/finance/invoices/overdue', label: 'Overdue' },
          { href: '/finance/invoices/refunded', label: 'Refunded' },
          { href: '/finance/invoices/cancelled', label: 'Cancelled' },
          { href: '/finance/recurring', label: 'Recurring Invoices' },
        ],
      },
      {
        href: '/finance/payments',
        label: 'Payments',
        icon: CurrencyCircleDollar,
        children: [
          { href: '/finance/payments/deposits', label: 'Deposits' },
          { href: '/finance/payments/failed', label: 'Failed Payments' },
          { href: '/finance/payments/installments', label: 'Installments' },
          { href: '/payments/splitting', label: 'Split Payments' },
          { href: '/finance/payments/refunds', label: 'Refunds' },
          { href: '/finance/disputes', label: 'Disputes' },
          { href: '/finance/retainers', label: 'Retainers' },
          { href: '/finance/retainers/new', label: 'New Retainer' },
        ],
      },
      {
        href: '/finance/payouts',
        label: 'Payouts',
        icon: Landmark,
        children: [
          { href: '/finance/payouts/manual-payments', label: 'Manual Payments' },
          { href: '/finance/payouts/reconciliation', label: 'Payout Reconciliation' },
          { href: '/finance/payouts/stripe-payouts', label: 'Stripe Payouts' },
          { href: '/finance/bank-feed', label: 'Bank Feed' },
        ],
      },
      {
        href: '/finance/ledger',
        label: 'Ledger',
        icon: NotebookIcon,
        children: [
          { href: '/finance/ledger/transaction-log', label: 'Transaction Log' },
          { href: '/finance/ledger/adjustments', label: 'Adjustments' },
        ],
      },
      {
        href: '/finance/budget',
        label: 'Budget',
        icon: Wallet,
      },
      {
        href: '/finance/food-cost',
        label: 'Food Cost',
        icon: Calculator,
      },
      {
        href: '/finance/goals',
        label: 'Finance Goals',
        icon: Target,
      },
      {
        href: '/finance/reporting',
        label: 'Reports',
        icon: BarChart3,
        children: [
          { href: '/reports', label: 'Advanced Reports' },
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
          { href: '/finance/tax/1099-nec', label: '1099-NEC' },
          { href: '/finance/tax/depreciation', label: 'Depreciation' },
          { href: '/finance/tax/home-office', label: 'Home Office' },
          { href: '/finance/tax/retirement', label: 'Retirement' },
          { href: '/finance/reporting/tax-summary', label: 'Tax Summary' },
          { href: '/finance/tax/quarterly', label: 'Quarterly Estimates' },
          { href: '/finance/tax/year-end', label: 'Year-End Package' },
        ],
      },
      {
        href: '/finance/pricing-calculator',
        label: 'Pricing Calculator',
        icon: Calculator,
      },
      {
        href: '/consulting',
        label: 'Consulting',
        icon: Wallet,
      },
      {
        href: '/finance/revenue-per-hour',
        label: 'Revenue Per Hour',
        icon: Clock,
      },
      {
        href: '/finance/payroll',
        label: 'Payroll',
        icon: IdentificationBadge,
        children: [
          { href: '/finance/payroll/run', label: 'Run Payroll' },
          { href: '/finance/payroll/employees', label: 'Employees' },
          { href: '/finance/payroll/calculator', label: 'Calculator' },
          { href: '/finance/payroll/941', label: '941' },
          { href: '/finance/payroll/w2', label: 'W-2' },
        ],
      },
      {
        href: '/finance/planning/break-even',
        label: 'Break-Even Planning',
        icon: Calculator,
      },
      {
        href: '/finance/pnl',
        label: 'P&L',
        icon: BarChart3,
      },
      {
        href: '/finance/sales-tax',
        label: 'Sales Tax',
        icon: Receipt,
        children: [
          { href: '/finance/sales-tax/jurisdictions', label: 'Jurisdictions' },
          { href: '/finance/sales-tax/remittances', label: 'Remittances' },
        ],
      },
      {
        href: '/finance/tips',
        label: 'Tips',
        icon: Coins,
      },
      {
        href: '/finance/year-end',
        label: 'Year-End',
        icon: CalendarCheck,
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
          { href: '/marketing/push-dinners/new', label: 'New Push Dinner' },
          { href: '/marketing/sequences', label: 'Sequences' },
          { href: '/marketing/templates', label: 'Templates' },
        ],
      },
      {
        href: '/social',
        label: 'Social Workspace',
        icon: MessagesSquare,
      },
      {
        href: '/social/planner',
        label: 'Content Planner',
        icon: PenNib,
        children: [
          { href: '/social/compose', label: 'Post from Event' },
          { href: '/social/vault', label: 'Media Vault' },
          { href: '/photos', label: 'Photo Gallery' },
          { href: '/open-tables', label: 'Open Tables' },
          { href: '/social/connections', label: 'Platform Connections' },
          { href: '/social/settings', label: 'Queue Settings' },
        ],
      },
      {
        href: '/portfolio',
        label: 'Portfolio',
        icon: Image,
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
          { href: '/analytics/funnel', label: 'Funnel' },
          { href: '/analytics/locations', label: 'Locations' },
          { href: '/analytics/menu-engineering', label: 'Menu Engineering' },
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
        href: '/analytics/capacity',
        label: 'Capacity Planning',
        icon: BarChart3,
      },
      {
        href: '/intelligence',
        label: 'Intelligence Hub',
        icon: Compass,
      },
      {
        href: '/goals/setup',
        label: 'Goals',
        icon: Target,
        children: [{ href: '/goals/revenue-path', label: 'Revenue Path' }],
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
          { href: '/compliance/daily', label: 'Daily Compliance' },
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
        href: '/notifications',
        label: 'Notifications',
        icon: BellRing,
        children: [{ href: '/notifications/sms', label: 'SMS History' }],
      },
      {
        href: '/inbox/history-scan',
        label: 'Inbox Tools',
        icon: MessageCircle,
        children: [{ href: '/inbox/triage', label: 'Sort Messages' }],
      },
      {
        href: '/templates',
        label: 'Template Library',
        icon: FileText,
      },
      {
        href: '/onboarding',
        label: 'Onboarding Hub',
        icon: ClipboardCheck,
        children: [
          { href: '/onboarding/clients', label: 'Client Onboarding' },
          { href: '/onboarding/loyalty', label: 'Loyalty Onboarding' },
          { href: '/onboarding/recipes', label: 'Recipe Onboarding' },
          { href: '/onboarding/staff', label: 'Staff Onboarding' },
        ],
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
      {
        href: '/admin/notifications-audit',
        label: 'Delivery Audit',
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
      // Admin Super View — cross-tenant data browsing
      { href: '/admin/recipes', label: 'All Recipes', icon: BookOpen, adminOnly: true },
      { href: '/admin/menus', label: 'All Menus', icon: UtensilsCrossed, adminOnly: true },
      { href: '/admin/quotes', label: 'All Quotes', icon: Receipt, adminOnly: true },
      { href: '/admin/inquiries', label: 'All Inquiries', icon: Inbox, adminOnly: true },
      { href: '/admin/staff', label: 'All Staff', icon: Users, adminOnly: true },
      { href: '/admin/documents', label: 'All Documents', icon: FileText, adminOnly: true },
      { href: '/admin/calendar-view', label: 'Calendar', icon: CalendarDays, adminOnly: true },
      { href: '/admin/loyalty', label: 'Loyalty', icon: Gift, adminOnly: true },
      { href: '/admin/equipment', label: 'Equipment', icon: Toolbox, adminOnly: true },
      { href: '/admin/allergens', label: 'Allergens', icon: AlertTriangle, adminOnly: true },
      // Intelligence & Monitoring
      { href: '/admin/remy-activity', label: 'Remy Activity', icon: Bot, adminOnly: true },
      { href: '/admin/gmail-sync', label: 'Gmail Sync', icon: Mail, adminOnly: true },
      {
        href: '/admin/prospecting-overview',
        label: 'All Prospects',
        icon: Target,
        adminOnly: true,
      },
      { href: '/admin/activity-feed', label: 'Activity Feed', icon: Activity, adminOnly: true },
      // Chef Health & Onboarding
      { href: '/admin/onboarding-status', label: 'Onboarding', icon: ListChecks, adminOnly: true },
      // Platform Search
      { href: '/admin/search', label: 'Search All', icon: MagnifyingGlassPlus, adminOnly: true },
      // Admin Super View — Gap Closure (industry-standard admin features)
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, adminOnly: true },
      { href: '/admin/chef-health', label: 'Chef Health', icon: Activity, adminOnly: true },
      { href: '/admin/lifecycle', label: 'Lifecycle', icon: TrendingUp, adminOnly: true },
      { href: '/admin/errors', label: 'Errors', icon: AlertTriangle, adminOnly: true },
      { href: '/admin/sla', label: 'Response SLA', icon: Clock, adminOnly: true },
      { href: '/admin/jobs', label: 'Jobs', icon: Zap, adminOnly: true },
      { href: '/admin/data-tools', label: 'Data Tools', icon: ShieldCheck, adminOnly: true },
      { href: '/admin/sessions', label: 'Sessions', icon: Users, adminOnly: true },
      { href: '/admin/changelog', label: 'Changelog', icon: FileText, adminOnly: true },
      { href: '/admin/benchmarks', label: 'Benchmarks', icon: BarChart3, adminOnly: true },
    ],
  },
]

export const standaloneBottom: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/games', label: 'Games', icon: Gamepad2 },
]

export const mobileTabItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/menus', label: 'Menus', icon: UtensilsCrossed },
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
  {
    href: '/settings/regional',
    label: 'Currency & Language',
    icon: Settings,
    context: 'Settings',
  },
  { href: '/settings/ai-privacy', label: 'Privacy & Data', icon: ShieldCheck, context: 'Settings' },
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
    label: 'Calendar Sync & Feeds',
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

export function normalizeNavHref(href: string): string {
  return href.split('?')[0] ?? href
}

function pushNavRouteEntry(map: Map<string, NavRouteEntry>, entry: NavRouteEntry) {
  const href = normalizeNavHref(entry.href)
  if (!href.startsWith('/')) return
  if (map.has(href)) return
  map.set(href, { href, label: entry.label, adminOnly: entry.adminOnly })
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
export const REQUIRED_PRIMARY_SHORTCUT_HREFS = ['/menus'] as const

export function ensureRequiredPrimaryShortcutHrefs(hrefs: string[]): string[] {
  const seen = new Set(hrefs)
  const normalized = [...hrefs]

  for (const href of REQUIRED_PRIMARY_SHORTCUT_HREFS) {
    if (seen.has(href)) continue
    seen.add(href)
    normalized.push(href)
  }

  return normalized
}

function ensureRequiredPrimaryItems(
  items: NavItem[],
  byHref: Map<string, PrimaryShortcutOption>
): NavItem[] {
  const seen = new Set(items.map((item) => item.href))
  const normalized = [...items]

  for (const href of REQUIRED_PRIMARY_SHORTCUT_HREFS) {
    if (seen.has(href)) continue
    const option = byHref.get(href)
    if (!option) continue
    seen.add(href)
    normalized.push({ href: option.href, label: option.label, icon: option.icon })
  }

  return normalized
}

export const DEFAULT_PRIMARY_SHORTCUT_HREFS = [...APPROVED_PRIMARY_SHORTCUT_HREFS]

function resolvePrimaryItems(
  hrefs: readonly string[],
  byHref: Map<string, PrimaryShortcutOption>
): NavItem[] {
  const seen = new Set<string>()
  const resolved: NavItem[] = []

  for (const href of hrefs) {
    if (seen.has(href)) continue
    const option = byHref.get(href)
    if (!option) continue
    seen.add(href)
    resolved.push({ href: option.href, label: option.label, icon: option.icon })
  }

  return resolved
}

export function resolveStandaloneTop(preferredHrefs?: string[] | null): NavItem[] {
  const byHref = new Map(PRIMARY_SHORTCUT_OPTIONS.map((item) => [item.href, item] as const))
  const desired = upgradeLegacyPrimaryNavHrefs(preferredHrefs ?? [])
  const resolved = resolvePrimaryItems(desired, byHref)

  if (resolved.length > 0) return ensureRequiredPrimaryItems(resolved, byHref)
  return resolvePrimaryItems(DEFAULT_PRIMARY_SHORTCUT_HREFS, byHref)
}

export function getPrimaryShortcutOptions() {
  return PRIMARY_SHORTCUT_OPTIONS.map(({ href, label, context }) => ({ href, label, context }))
}

export function collectNavRouteEntries(): NavRouteEntry[] {
  const routes = new Map<string, NavRouteEntry>()

  for (const item of standaloneTop) {
    pushNavRouteEntry(routes, item)
  }

  for (const group of navGroups) {
    for (const item of group.items) {
      pushNavRouteEntry(routes, item)

      for (const child of item.children ?? []) {
        pushNavRouteEntry(routes, {
          href: child.href,
          label: child.label,
          adminOnly: item.adminOnly,
        })
      }
    }
  }

  for (const item of standaloneBottom) {
    pushNavRouteEntry(routes, item)
  }

  for (const item of settingsShortcutOptions) {
    pushNavRouteEntry(routes, item)
  }

  return Array.from(routes.values())
}

export type {
  NavItem,
  NavSubItem,
  NavCollapsibleItem,
  NavGroup,
  PrimaryShortcutOption,
  NavRouteEntry,
}
