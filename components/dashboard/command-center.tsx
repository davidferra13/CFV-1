'use client'

import Link from 'next/link'
import type { LucideIcon } from '@/components/ui/icons'
import {
  Activity,
  BarChart3,
  Bot,
  CalendarDays,
  ChatTeardropText,
  ChefHat,
  Compass,
  DollarSign,
  FlagBanner,
  Gift,
  Handshake,
  Inbox,
  Megaphone,
  MessagesSquare,
  Package,
  Phone,
  ScrollText,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Target,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Wallet,
} from '@/components/ui/icons'
import { useState } from 'react'

// ─── Types ─────────────────────────────────────────────────
type FeatureArea = {
  label: string
  href: string
  icon: LucideIcon
  color: string
  description: string
  count?: number
  countLabel?: string
  quickLinks: Array<{ label: string; href: string }>
}

type CommandCenterProps = {
  counts: {
    events: number
    inquiries: number
    clients: number
    recipes: number
    menus: number
    quotes: number
    expenses: number
    invoices: number
    staff: number
    tasks: number
    vendors: number
    contracts: number
    leads: number
    inventoryAlerts: number
    goals: number
    campaigns: number
    unreadMessages: number
    calls: number
    circles: number
  }
}

// ─── Feature Areas ─────────────────────────────────────────
function getFeatureAreas(counts: CommandCenterProps['counts']): FeatureArea[] {
  return [
    // ─── ROW 1: Core daily workflow ───
    {
      label: 'Inbox',
      href: '/inbox',
      icon: Inbox,
      color: '#6366f1',
      description: 'Messages, emails, and communication hub',
      count: counts.unreadMessages,
      countLabel: 'unread',
      quickLinks: [
        { label: 'All Messages', href: '/inbox' },
        { label: 'Notifications', href: '/notifications' },
      ],
    },
    {
      label: 'Events',
      href: '/events',
      icon: CalendarDays,
      color: '#3b82f6',
      description: 'Plan, manage, and track every event',
      count: counts.events,
      countLabel: 'active',
      quickLinks: [
        { label: 'New Event', href: '/events/new' },
        { label: 'Calendar', href: '/calendar' },
        { label: 'Kanban Board', href: '/events/board' },
        { label: 'Feedback', href: '/feedback' },
      ],
    },
    {
      label: 'Inquiries',
      href: '/inquiries',
      icon: ChatTeardropText,
      color: '#f59e0b',
      description: 'Incoming requests and booking pipeline',
      count: counts.inquiries,
      countLabel: 'open',
      quickLinks: [
        { label: 'New Inquiry', href: '/inquiries/new' },
        { label: 'Awaiting Response', href: '/inquiries/awaiting-response' },
        { label: 'Menu Drafting', href: '/inquiries/menu-drafting' },
      ],
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: Users,
      color: '#a855f7',
      description: 'Directory, insights, guests, and partners',
      count: counts.clients,
      countLabel: 'total',
      quickLinks: [
        { label: 'Add Client', href: '/clients/new' },
        { label: 'Follow-Ups', href: '/clients/communication/follow-ups' },
        { label: 'Top Clients', href: '/clients/insights/top-clients' },
        { label: 'Guests', href: '/guests' },
        { label: 'Partners', href: '/partners' },
      ],
    },
    {
      label: 'Dinner Circles',
      href: '/circles',
      icon: MessagesSquare,
      color: '#f97316',
      description: 'Guest groups, chat, and event coordination',
      count: counts.circles,
      countLabel: 'active',
      quickLinks: [
        { label: 'All Circles', href: '/circles' },
        { label: 'Social Feed', href: '/circles?tab=feed' },
      ],
    },

    // ─── ROW 2: Pipeline and deals ───
    {
      label: 'Quotes',
      href: '/quotes',
      icon: Wallet,
      color: '#ec4899',
      description: 'Pricing, proposals, and quote tracking',
      count: counts.quotes,
      countLabel: 'pending',
      quickLinks: [
        { label: 'New Quote', href: '/quotes/new' },
        { label: 'Proposals', href: '/proposals' },
        { label: 'Rate Card', href: '/rate-card' },
      ],
    },
    {
      label: 'Leads',
      href: '/leads',
      icon: Target,
      color: '#d946ef',
      description: 'Lead pipeline and qualification',
      count: counts.leads,
      countLabel: 'new',
      quickLinks: [
        { label: 'Qualified', href: '/leads/qualified' },
        { label: 'Marketplace', href: '/marketplace' },
        { label: 'Availability', href: '/availability' },
        { label: 'Wix Submissions', href: '/wix-submissions' },
      ],
    },
    {
      label: 'Calls',
      href: '/calls',
      icon: Phone,
      color: '#0d9488',
      description: 'Calls, meetings, and consulting',
      count: counts.calls,
      countLabel: 'upcoming',
      quickLinks: [
        { label: 'Schedule Call', href: '/calls/new' },
        { label: 'Consulting', href: '/consulting' },
      ],
    },
    {
      label: 'Contracts',
      href: '/contracts',
      icon: ScrollText,
      color: '#6366f1',
      description: 'Generate, send, and track contracts',
      count: counts.contracts,
      countLabel: 'active',
      quickLinks: [{ label: 'Templates', href: '/settings/contracts' }],
    },

    // ─── ROW 3: Kitchen and creative ───
    {
      label: 'Culinary',
      href: '/culinary',
      icon: ChefHat,
      color: '#10b981',
      description: 'Recipes, menus, costing, and prep',
      count: counts.recipes,
      countLabel: 'recipes',
      quickLinks: [
        { label: 'Recipes', href: '/culinary/recipes' },
        { label: 'Menus', href: '/menus' },
        { label: 'Costing', href: '/culinary/costing' },
        { label: 'Prep', href: '/culinary/prep' },
        { label: 'Ingredients', href: '/culinary/ingredients' },
        { label: 'Dish Index', href: '/culinary/dish-index' },
      ],
    },
    {
      label: 'Finance',
      href: '/finance',
      icon: DollarSign,
      color: '#22c55e',
      description: 'Invoices, expenses, P&L, payroll, and tax',
      count: counts.invoices,
      countLabel: 'invoices',
      quickLinks: [
        { label: 'Add Expense', href: '/expenses/new' },
        { label: 'Invoices', href: '/finance/invoices' },
        { label: 'P&L', href: '/finance/reporting/profit-loss' },
        { label: 'Tax Center', href: '/finance/tax' },
        { label: 'Payroll', href: '/finance/payroll' },
        { label: 'Ledger', href: '/finance/ledger' },
      ],
    },
    {
      label: 'Operations',
      href: '/operations',
      icon: Activity,
      color: '#06b6d4',
      description: 'Daily ops, kitchen mode, and scheduling',
      count: counts.tasks,
      countLabel: 'tasks',
      quickLinks: [
        { label: 'Tasks', href: '/tasks' },
        { label: 'Scheduling', href: '/scheduling' },
        { label: 'Equipment', href: '/operations/equipment' },
        { label: 'Travel', href: '/travel' },
        { label: 'Kitchen Rentals', href: '/operations/kitchen-rentals' },
      ],
    },
    {
      label: 'Staff',
      href: '/staff',
      icon: Users,
      color: '#8b5cf6',
      description: 'Team roster, scheduling, and performance',
      count: counts.staff,
      countLabel: 'active',
      quickLinks: [
        { label: 'Schedule', href: '/staff/schedule' },
        { label: 'Time Clock', href: '/staff/clock' },
        { label: 'Performance', href: '/staff/performance' },
        { label: 'Live Activity', href: '/staff/live' },
      ],
    },

    // ─── ROW 4: Supply chain and commerce ───
    {
      label: 'Inventory',
      href: '/inventory',
      icon: Package,
      color: '#f97316',
      description: 'Stock levels, expiry alerts, and audits',
      count: counts.inventoryAlerts,
      countLabel: 'alerts',
      quickLinks: [
        { label: 'Counts', href: '/inventory/counts' },
        { label: 'Expiry Alerts', href: '/inventory/expiry' },
        { label: 'Purchase Orders', href: '/inventory/purchase-orders' },
        { label: 'Waste Tracking', href: '/inventory/waste' },
        { label: 'Demand Forecast', href: '/inventory/demand' },
        { label: 'Procurement', href: '/inventory/procurement' },
      ],
    },
    {
      label: 'Vendors',
      href: '/vendors',
      icon: Truck,
      color: '#84cc16',
      description: 'Supplier directory and price tracking',
      count: counts.vendors,
      countLabel: 'vendors',
      quickLinks: [
        { label: 'Invoices', href: '/vendors/invoices' },
        { label: 'Price Comparison', href: '/vendors/price-comparison' },
      ],
    },
    {
      label: 'Commerce',
      href: '/commerce',
      icon: Store,
      color: '#14b8a6',
      description: 'POS register, products, and sales',
      quickLinks: [
        { label: 'Register', href: '/commerce/register' },
        { label: 'Products', href: '/commerce/products' },
        { label: 'Sales', href: '/commerce/sales' },
        { label: 'Table Service', href: '/commerce/table-service' },
        { label: 'Reports', href: '/commerce/reports' },
      ],
    },

    // ─── ROW 5: Growth, marketing, analytics ───
    {
      label: 'Marketing',
      href: '/marketing',
      icon: Megaphone,
      color: '#e11d48',
      description: 'Campaigns, sequences, content, and social',
      count: counts.campaigns,
      countLabel: 'campaigns',
      quickLinks: [
        { label: 'Push Dinners', href: '/marketing/push-dinners' },
        { label: 'Templates', href: '/marketing/templates' },
        { label: 'Sequences', href: '/marketing/sequences' },
        { label: 'Content Pipeline', href: '/marketing/content-pipeline' },
        { label: 'Social Planner', href: '/social/planner' },
      ],
    },
    {
      label: 'Growth',
      href: '/growth',
      icon: TrendingUp,
      color: '#f43f5e',
      description: 'Business development and expansion',
      quickLinks: [
        { label: 'Testimonials', href: '/testimonials' },
        { label: 'Reviews', href: '/reviews' },
        { label: 'Referrals', href: '/clients/loyalty/referrals' },
        { label: 'Community', href: '/network' },
        { label: 'Community Templates', href: '/community/templates' },
        { label: 'Charity Hours', href: '/charity' },
      ],
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      color: '#0ea5e9',
      description: 'Business intelligence and reports',
      quickLinks: [
        { label: 'Daily Report', href: '/analytics/daily-report' },
        { label: 'Pipeline', href: '/analytics/pipeline' },
        { label: 'Funnel', href: '/analytics/funnel' },
        { label: 'Insights', href: '/insights' },
        { label: 'Benchmarks', href: '/analytics/benchmarks' },
      ],
    },
    {
      label: 'Goals',
      href: '/goals',
      icon: FlagBanner,
      color: '#eab308',
      description: 'Set targets and track progress',
      count: counts.goals,
      countLabel: 'active',
      quickLinks: [{ label: 'Revenue Path', href: '/goals/revenue-path' }],
    },

    // ─── ROW 6: Support systems ───
    {
      label: 'Loyalty',
      href: '/loyalty',
      icon: Gift,
      color: '#f472b6',
      description: 'Points, rewards, and client retention',
      quickLinks: [
        { label: 'Points', href: '/clients/loyalty/points' },
        { label: 'Rewards', href: '/clients/loyalty/rewards' },
      ],
    },
    {
      label: 'Safety',
      href: '/safety/incidents',
      icon: ShieldCheck,
      color: '#ef4444',
      description: 'Incidents, claims, insurance, and compliance',
      quickLinks: [
        { label: 'Report Incident', href: '/safety/incidents/new' },
        { label: 'Insurance', href: '/settings/protection/insurance' },
        { label: 'Business Health', href: '/settings/protection' },
        { label: 'Backup Chef', href: '/safety/backup-chef' },
      ],
    },
    {
      label: 'Remy AI',
      href: '#remy',
      icon: Bot,
      color: '#e88f47',
      description: 'Your AI concierge for everything',
      quickLinks: [
        { label: 'Briefing', href: '/briefing' },
        { label: 'Remy History', href: '/remy-history' },
      ],
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      color: '#78716c',
      description: 'Profile, billing, modules, and preferences',
      quickLinks: [
        { label: 'Profile', href: '/settings/profile' },
        { label: 'Modules', href: '/settings/modules' },
        { label: 'Notifications', href: '/settings/notifications' },
        { label: 'Import Data', href: '/import' },
        { label: 'Help', href: '/help' },
        { label: 'Activity Log', href: '/activity' },
      ],
    },
  ]
}

// ─── Component ─────────────────────────────────────────────
export function CommandCenter({ counts }: CommandCenterProps) {
  const [expanded, setExpanded] = useState(true)
  const areas = getFeatureAreas(counts)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="section-label">Command Center</div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xxs text-stone-500 hover:text-stone-300 transition-colors"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {areas.map((area) => (
            <FeatureCard key={area.label} area={area} />
          ))}
        </div>
      ) : (
        /* Collapsed: compact icon strip (like the old shortcut strip but with ALL features) */
        <div className="flex flex-wrap gap-2">
          {areas.map((area) => (
            <Link
              key={area.label}
              href={area.href}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-800 hover:border-stone-600 bg-stone-900/50 hover:bg-stone-800/50 transition-all group"
            >
              <area.icon className="w-3.5 h-3.5" style={{ color: area.color }} />
              <span className="text-xxs font-medium text-stone-400 group-hover:text-stone-200 transition-colors">
                {area.label}
              </span>
              {area.count !== undefined && area.count > 0 && (
                <span
                  className="text-xxs font-medium ml-0.5 px-1 rounded"
                  style={{
                    color: area.color,
                    backgroundColor: `${area.color}15`,
                  }}
                >
                  {area.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Feature Card ──────────────────────────────────────────
function FeatureCard({ area }: { area: FeatureArea }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative group rounded-xl border border-stone-800 bg-stone-900/50 hover:bg-stone-800/40 hover:border-stone-600 transition-all overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main link */}
      <Link href={area.href} className="block p-3.5">
        <div className="flex items-start justify-between mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
            style={{
              backgroundColor: `${area.color}12`,
              border: `1px solid ${area.color}20`,
            }}
          >
            <area.icon className="w-4 h-4" style={{ color: area.color }} />
          </div>
          {area.count !== undefined && area.count > 0 && (
            <div className="text-right">
              <span className="text-lg font-semibold leading-none" style={{ color: area.color }}>
                {area.count}
              </span>
              {area.countLabel && (
                <p className="text-xxs text-stone-500 mt-0.5">{area.countLabel}</p>
              )}
            </div>
          )}
        </div>
        <h3 className="text-sm font-semibold text-stone-200 group-hover:text-stone-100 transition-colors">
          {area.label}
        </h3>
        <p className="text-xxs text-stone-500 mt-0.5 line-clamp-1">{area.description}</p>
      </Link>

      {/* Quick links (show on hover) */}
      {hovered && area.quickLinks.length > 0 && (
        <div className="border-t border-stone-800 px-3.5 py-2 bg-stone-850/50 flex flex-wrap gap-x-3 gap-y-1">
          {area.quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xxs text-stone-400 hover:text-brand-400 transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
