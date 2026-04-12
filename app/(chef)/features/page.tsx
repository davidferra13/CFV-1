import { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarDays,
  Users,
  ChefHat,
  DollarSign,
  TrendingUp,
  Activity,
  MessagesSquare,
  Inbox,
  FileText,
  Star,
  BarChart3,
  Settings,
  ShoppingCart,
  Clock,
  MessageSquare,
  Map,
  Phone,
  Camera,
  BookOpen,
  Layers,
  Target,
  Handshake,
  Globe,
  Bell,
  Warehouse,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Package,
  Receipt,
  ListChecks,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'All Features',
  description: 'Everything ChefFlow can do, organized by how you work.',
}

type Feature = {
  label: string
  href: string
  description: string
  icon?: React.ElementType
}

type Section = {
  title: string
  subtitle: string
  color: string
  bg: string
  features: Feature[]
}

const SECTIONS: Section[] = [
  {
    title: 'Get Clients',
    subtitle: 'Attract inquiries, convert leads, build your book of business.',
    color: 'text-blue-400',
    bg: 'bg-blue-950/30 border-blue-900/40',
    features: [
      {
        label: 'Inquiries',
        href: '/inquiries',
        description: 'Track every lead from every source in one place.',
        icon: Inbox,
      },
      {
        label: 'Proposals',
        href: '/proposals',
        description: 'Beautiful, branded proposals that close deals.',
        icon: FileText,
      },
      {
        label: 'Quotes',
        href: '/quotes',
        description: 'Itemized pricing with acceptance tracking.',
        icon: DollarSign,
      },
      {
        label: 'Public Booking Page',
        href: '/settings/store-preferences',
        description: 'Your public page where clients can request events.',
        icon: Globe,
      },
      {
        label: 'Embeddable Widget',
        href: '/settings/embed',
        description: 'Add a booking form to any website.',
        icon: Layers,
      },
      {
        label: 'Dinner Circles',
        href: '/circles',
        description: 'Private social feed for your dining community.',
        icon: MessagesSquare,
      },
      {
        label: 'Reputation and Reviews',
        href: '/reviews',
        description: 'Collect and display client testimonials.',
        icon: Star,
      },
      {
        label: 'Chef Network',
        href: '/network',
        description: 'Connect with other chefs, share referrals.',
        icon: Handshake,
      },
    ],
  },
  {
    title: 'Plan Events',
    subtitle: 'From first contact to confirmed date, everything in one flow.',
    color: 'text-violet-400',
    bg: 'bg-violet-950/30 border-violet-900/40',
    features: [
      {
        label: 'Events',
        href: '/events',
        description: 'Manage every event from draft to completion.',
        icon: CalendarDays,
      },
      {
        label: 'Calendar',
        href: '/calendar',
        description: 'Full calendar view of all scheduled events.',
        icon: CalendarDays,
      },
      {
        label: 'Availability',
        href: '/availability',
        description: 'Set and manage your available dates.',
        icon: Clock,
      },
      {
        label: 'Clients',
        href: '/clients',
        description: 'Full CRM with history, preferences, and notes.',
        icon: Users,
      },
      {
        label: 'Contracts',
        href: '/contracts',
        description: 'AI-drafted contracts with e-signature.',
        icon: FileText,
      },
      {
        label: 'Messages',
        href: '/inbox',
        description: 'All client communication in one inbox.',
        icon: MessageSquare,
      },
      {
        label: 'Follow-Ups',
        href: '/clients/communication/follow-ups',
        description: 'Scheduled nudges so no lead goes cold.',
        icon: Bell,
      },
      {
        label: 'Scheduling',
        href: '/scheduling',
        description: 'Manage bookings and schedule across events.',
        icon: CalendarDays,
      },
    ],
  },
  {
    title: 'Cook',
    subtitle: 'Organize your culinary craft and run flawless events.',
    color: 'text-orange-400',
    bg: 'bg-orange-950/30 border-orange-900/40',
    features: [
      {
        label: 'Recipes',
        href: '/culinary/recipes',
        description: 'Your entire recipe book with scaling and costing.',
        icon: BookOpen,
      },
      {
        label: 'Menus',
        href: '/menus',
        description: 'Build and price event menus from your recipes.',
        icon: ChefHat,
      },
      {
        label: 'Food Catalog',
        href: '/culinary/price-catalog',
        description: '32K+ ingredients with real market prices.',
        icon: ShoppingCart,
      },
      {
        label: 'Costing',
        href: '/culinary/costing',
        description: 'Food cost analysis with profit margin targets.',
        icon: BarChart3,
      },
      {
        label: 'Prep Timeline',
        href: '/culinary/prep/timeline',
        description: 'Day-by-day prep schedule for every event.',
        icon: Clock,
      },
      {
        label: 'Shopping Lists',
        href: '/culinary/prep/shopping',
        description: 'Auto-generated lists from your menu selections.',
        icon: ShoppingCart,
      },
      {
        label: 'After-Action Report',
        href: '/aar',
        description: 'Post-event review: what worked, what to improve.',
        icon: FileText,
      },
      {
        label: 'Daily Ops Board',
        href: '/stations/daily-ops',
        description: 'Live board for managing event day from start to finish.',
        icon: Activity,
      },
      {
        label: 'Packing Checklist',
        href: '/events',
        description: 'Interactive pack-the-car checklist with weather and departure time.',
        icon: Truck,
      },
      {
        label: 'Briefing',
        href: '/briefing',
        description: "Daily run-of-show: timeline, client context, and tonight's events.",
        icon: FileText,
      },
      {
        label: 'Import from Email',
        href: '/import?mode=inquiries',
        description: 'Paste any inquiry email or platform message - AI parses it instantly.',
        icon: Inbox,
      },
    ],
  },
  {
    title: 'Get Paid',
    subtitle: 'Invoices, expenses, and the full picture of your finances.',
    color: 'text-green-400',
    bg: 'bg-green-950/30 border-green-900/40',
    features: [
      {
        label: 'Finance Hub',
        href: '/finance',
        description: 'Your complete financial dashboard.',
        icon: DollarSign,
      },
      {
        label: 'Invoices',
        href: '/finance/invoices',
        description: 'Create and send payment requests to clients.',
        icon: FileText,
      },
      {
        label: 'Expenses',
        href: '/expenses',
        description: 'Track every expense with receipt scanning.',
        icon: Camera,
      },
      {
        label: 'Profit and Loss',
        href: '/finance/reporting/profit-loss',
        description: 'Real P&L built from your actual ledger.',
        icon: BarChart3,
      },
      {
        label: 'Rate Card',
        href: '/rate-card',
        description: 'Your standard pricing for services and packages.',
        icon: DollarSign,
      },
      {
        label: 'Tax Prep',
        href: '/finance/tax',
        description: 'Quarterly estimates and mileage tracking.',
        icon: FileText,
      },
      {
        label: 'Goals',
        href: '/goals',
        description: 'Revenue targets with live progress tracking.',
        icon: Target,
      },
      {
        label: 'Loyalty Program',
        href: '/loyalty',
        description: 'Reward repeat clients with points and perks.',
        icon: Star,
      },
    ],
  },
  {
    title: 'Grow',
    subtitle: 'Analytics, marketing, and tools to scale your business.',
    color: 'text-rose-400',
    bg: 'bg-rose-950/30 border-rose-900/40',
    features: [
      {
        label: 'Analytics',
        href: '/analytics',
        description: 'Revenue, client value, and business trends.',
        icon: TrendingUp,
      },
      {
        label: 'Marketing Campaigns',
        href: '/marketing',
        description: 'Email and social campaigns to re-engage clients.',
        icon: Bell,
      },
      {
        label: 'Social Media',
        href: '/social',
        description: 'Plan, draft, and schedule content for all platforms.',
        icon: Camera,
      },
      {
        label: 'Surveys',
        href: '/surveys',
        description: 'Collect structured feedback after every event.',
        icon: Star,
      },
      {
        label: 'Staff Management',
        href: '/staff',
        description: 'Add staff, assign to events, track roles.',
        icon: Users,
      },
      {
        label: 'Journey Journal',
        href: '/journey',
        description: 'Document your career milestones and story.',
        icon: BookOpen,
      },
      {
        label: 'Prospecting',
        href: '/leads',
        description: 'Find and reach new potential clients.',
        icon: Map,
      },
      {
        label: 'Partner Network',
        href: '/partners',
        description: 'Track vendor and partner relationships.',
        icon: Handshake,
      },
    ],
  },
  {
    title: 'Inventory and Sourcing',
    subtitle: 'Track what you have, what you need, and where to buy it.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/30 border-cyan-900/40',
    features: [
      {
        label: 'Inventory Hub',
        href: '/inventory',
        description: 'On-hand stock levels, movement log, and reorder alerts.',
        icon: Warehouse,
      },
      {
        label: 'Vendors',
        href: '/vendors',
        description: 'Purveyor contacts, pricing history, and order tracking.',
        icon: Truck,
      },
      {
        label: 'Purchase Orders',
        href: '/inventory/purchase-orders',
        description: 'Create and track POs sent to vendors.',
        icon: Receipt,
      },
      {
        label: 'Expiry Alerts',
        href: '/inventory/expiry',
        description: 'See what is expiring soon before it becomes waste.',
        icon: Clock,
      },
      {
        label: 'Demand Forecast',
        href: '/inventory/demand',
        description: 'Predict ingredient needs from upcoming events.',
        icon: TrendingUp,
      },
      {
        label: 'Inventory Counts',
        href: '/inventory/counts',
        description: 'Physical count sheets for regular stocktakes.',
        icon: ListChecks,
      },
      {
        label: 'Storage Locations',
        href: '/inventory/locations',
        description: 'Organize stock by fridge, freezer, or dry storage.',
        icon: Package,
      },
      {
        label: 'Food Cost Analysis',
        href: '/food-cost',
        description: 'Real cost-per-event breakdowns from your inventory.',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Protection and Compliance',
    subtitle: 'Licenses, insurance, certifications, and incident records.',
    color: 'text-amber-400',
    bg: 'bg-amber-950/30 border-amber-900/40',
    features: [
      {
        label: 'Business Health',
        href: '/settings/protection',
        description: 'Overview of insurance, certifications, and continuity.',
        icon: ShieldCheck,
      },
      {
        label: 'Insurance',
        href: '/settings/protection/insurance',
        description: 'Track your policies and coverage details.',
        icon: ShieldCheck,
      },
      {
        label: 'Certifications',
        href: '/settings/protection/certifications',
        description: 'Food handler permits and professional credentials.',
        icon: FileText,
      },
      {
        label: 'Backup Coverage',
        href: '/safety/backup-chef',
        description: 'Find or offer coverage when a chef cannot make an event.',
        icon: Users,
      },
      {
        label: 'Incidents',
        href: '/safety/incidents',
        description: 'Log food safety incidents and corrective actions.',
        icon: AlertTriangle,
      },
      {
        label: 'Business Continuity',
        href: '/settings/protection/continuity',
        description: 'Emergency contacts and fallback protocols.',
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: 'Manage and Configure',
    subtitle: 'Settings, integrations, and account management.',
    color: 'text-stone-400',
    bg: 'bg-stone-900/30 border-stone-700/40',
    features: [
      {
        label: 'Account Settings',
        href: '/settings/account',
        description: 'Profile, password, and account preferences.',
        icon: Settings,
      },
      {
        label: 'Store Preferences',
        href: '/settings/store-preferences',
        description: 'Your public booking page and brand settings.',
        icon: Globe,
      },
      {
        label: 'API Keys',
        href: '/settings/api-keys',
        description: 'Integrate ChefFlow with other tools via API.',
        icon: Layers,
      },
      {
        label: 'Webhooks',
        href: '/settings/webhooks',
        description: 'Push events to external systems in real time.',
        icon: Activity,
      },
      {
        label: 'Zapier',
        href: '/settings/zapier',
        description: 'Connect to 5,000+ apps without code.',
        icon: Layers,
      },
      {
        label: 'Calls and Voice',
        href: '/calls',
        description: 'AI-powered call log and voicemail for vendors.',
        icon: Phone,
      },
      {
        label: 'Documents',
        href: '/documents',
        description: 'Upload and organize important business docs.',
        icon: FileText,
      },
      {
        label: 'Help Center',
        href: '/help',
        description: 'Guides and answers for every feature.',
        icon: BookOpen,
      },
    ],
  },
]

export default function FeaturesPage() {
  return (
    <div className="container max-w-5xl py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">All Features</h1>
        <p className="text-stone-400 mt-1">
          Everything ChefFlow can do, organized by how you work. Click any feature to go there
          directly.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${section.color}`}>{section.title}</h2>
            <p className="text-sm text-stone-500">{section.subtitle}</p>
          </div>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border p-4 ${section.bg}`}
          >
            {section.features.map((feature) => {
              const Icon = feature.icon
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group flex flex-col gap-1 rounded-lg bg-stone-900/60 border border-stone-800 p-3 hover:border-stone-600 hover:bg-stone-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className={`h-4 w-4 shrink-0 ${section.color}`} />}
                    <span className="text-sm font-medium text-stone-200 group-hover:text-white transition-colors">
                      {feature.label}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">{feature.description}</p>
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      <p className="text-xs text-stone-600 pb-4">
        All features are free. No paywalls. If something looks broken or missing, use the Help
        Center to report it.
      </p>
    </div>
  )
}
