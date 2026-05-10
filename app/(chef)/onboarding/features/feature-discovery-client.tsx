'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Inbox,
  FileText,
  DollarSign,
  Globe,
  MessagesSquare,
  Users,
  MessageSquare,
  Bell,
  CalendarDays,
  Clock,
  ChefHat,
  BookOpen,
  ShoppingCart,
  BarChart3,
  Activity,
  Truck,
  Camera,
  TrendingUp,
  Star,
  Settings,
  Handshake,
  Target,
  Warehouse,
  ShieldCheck,
  Zap,
  Check,
} from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Feature = {
  label: string
  href: string
  description: string
  icon: React.ElementType
}

type Category = {
  name: string
  color: string
  features: Feature[]
}

const CATEGORIES: Category[] = [
  {
    name: 'Booking Clients',
    color: 'blue-400',
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
        label: 'Dinner Circles',
        href: '/circles',
        description: 'Private social feed for your dining community.',
        icon: MessagesSquare,
      },
      {
        label: 'Clients',
        href: '/clients',
        description: 'Full CRM with history, preferences, and notes.',
        icon: Users,
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
    ],
  },
  {
    name: 'Running Events',
    color: 'violet-400',
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
        label: 'Contracts',
        href: '/contracts',
        description: 'AI-drafted contracts with e-signature.',
        icon: FileText,
      },
      {
        label: 'Menus',
        href: '/menus',
        description: 'Build and price event menus from your recipes.',
        icon: ChefHat,
      },
      {
        label: 'Prep Timeline',
        href: '/culinary/prep/timeline',
        description: 'Day-by-day prep schedule for every event.',
        icon: Clock,
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
        description: 'Daily run-of-show: timeline, client context, and the night ahead.',
        icon: FileText,
      },
    ],
  },
  {
    name: 'Managing Money',
    color: 'green-400',
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
    ],
  },
  {
    name: 'Growing Your Business',
    color: 'rose-400',
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
      {
        label: 'Portfolio',
        href: '/portfolio',
        description: 'Showcase your past events and build social proof.',
        icon: Camera,
      },
    ],
  },
  {
    name: 'Settings and Tools',
    color: 'stone-400',
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
        label: 'Integrations',
        href: '/settings/integrations',
        description: 'Connect ChefFlow to Google, Stripe, and more.',
        icon: Zap,
      },
      {
        label: 'Documents',
        href: '/documents',
        description: 'Upload and organize important business docs.',
        icon: FileText,
      },
      {
        label: 'Help Center',
        href: '/onboarding/help',
        description: 'Guides and answers for every feature.',
        icon: BookOpen,
      },
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
        icon: ShieldCheck,
      },
    ],
  },
]

const TOTAL_FEATURES = CATEGORIES.reduce((sum, c) => sum + c.features.length, 0)
const STORAGE_KEY = 'chefflow:explored-features'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureDiscoveryClient() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState(0)
  const [explored, setExplored] = useState<Set<string>>(new Set())

  // Load explored set from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as string[]
        if (Array.isArray(parsed)) {
          setExplored(new Set(parsed))
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, [])

  const markExplored = useCallback((href: string) => {
    setExplored((prev) => {
      const next = new Set(prev)
      next.add(href)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      } catch {
        // quota exceeded, ignore
      }
      return next
    })
  }, [])

  const handleTryIt = useCallback(
    (href: string) => {
      markExplored(href)
      router.push(href)
    },
    [markExplored, router]
  )

  const exploredCount = explored.size
  const progressPct = TOTAL_FEATURES > 0 ? Math.round((exploredCount / TOTAL_FEATURES) * 100) : 0
  const category = CATEGORIES[activeCategory]

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Discover ChefFlow</h1>
        <p className="text-stone-400 mt-1">Explore features organized by how you work</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <p className="text-sm text-stone-400">
          You&apos;ve explored {exploredCount}/{TOTAL_FEATURES} features
        </p>
        <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-stone-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat, idx) => {
          const isActive = idx === activeCategory
          // Build class strings with Tailwind safelist-friendly literals
          const pillClass = isActive
            ? pillActiveClass(cat.color)
            : 'bg-stone-800 text-stone-400 border-stone-700'

          return (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(idx)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${pillClass}`}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {category.features.map((feature) => {
          const Icon = feature.icon
          const isExplored = explored.has(feature.href)

          return (
            <Card
              key={feature.label}
              className={`relative bg-stone-900/60 border-stone-800 hover:border-stone-600 transition-colors ${isExplored ? 'opacity-70' : ''}`}
            >
              {isExplored && (
                <div className="absolute top-3 right-3">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 shrink-0 ${textColor(category.color)}`} />
                  <span className="text-sm font-medium text-stone-200">{feature.label}</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">{feature.description}</p>
                <button
                  onClick={() => handleTryIt(feature.href)}
                  className={`text-xs font-medium px-3 py-1 rounded-md border transition-colors ${tryItClass(category.color)}`}
                >
                  {isExplored ? 'Revisit' : 'Try it'}
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Back link */}
      <div className="pt-2">
        <Link
          href="/onboarding"
          className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
        >
          &larr; Back to Setup
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tailwind-safe color helpers
// Using explicit class strings so Tailwind can detect them at build time.
// ---------------------------------------------------------------------------

function pillActiveClass(color: string): string {
  switch (color) {
    case 'blue-400':
      return 'bg-blue-400/20 text-blue-400 border-blue-400'
    case 'violet-400':
      return 'bg-violet-400/20 text-violet-400 border-violet-400'
    case 'green-400':
      return 'bg-green-400/20 text-green-400 border-green-400'
    case 'rose-400':
      return 'bg-rose-400/20 text-rose-400 border-rose-400'
    case 'stone-400':
      return 'bg-stone-400/20 text-stone-400 border-stone-400'
    default:
      return 'bg-stone-400/20 text-stone-400 border-stone-400'
  }
}

function textColor(color: string): string {
  switch (color) {
    case 'blue-400':
      return 'text-blue-400'
    case 'violet-400':
      return 'text-violet-400'
    case 'green-400':
      return 'text-green-400'
    case 'rose-400':
      return 'text-rose-400'
    case 'stone-400':
      return 'text-stone-400'
    default:
      return 'text-stone-400'
  }
}

function tryItClass(color: string): string {
  switch (color) {
    case 'blue-400':
      return 'border-blue-400/40 text-blue-400 hover:bg-blue-400/10'
    case 'violet-400':
      return 'border-violet-400/40 text-violet-400 hover:bg-violet-400/10'
    case 'green-400':
      return 'border-green-400/40 text-green-400 hover:bg-green-400/10'
    case 'rose-400':
      return 'border-rose-400/40 text-rose-400 hover:bg-rose-400/10'
    case 'stone-400':
      return 'border-stone-400/40 text-stone-400 hover:bg-stone-400/10'
    default:
      return 'border-stone-400/40 text-stone-400 hover:bg-stone-400/10'
  }
}
