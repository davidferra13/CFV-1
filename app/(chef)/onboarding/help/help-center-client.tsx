'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { HelpSearch } from '@/components/help/help-search'
import {
  Calendar,
  Users,
  DollarSign,
  ChefHat,
  Settings,
  BookOpen,
  MessageSquare,
  ChevronDown,
  Play,
} from '@/components/ui/icons'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CONTEXT_MAP: Record<string, { title: string; links: { label: string; href: string }[] }> = {
  '/events': {
    title: 'Working with Events?',
    links: [
      { label: 'Create a new event', href: '/help/events' },
      { label: 'Understand the event lifecycle', href: '/help/events' },
      { label: 'Day-Of Protocol basics', href: '/help/events' },
    ],
  },
  '/clients': {
    title: 'Managing Clients?',
    links: [
      { label: 'Add or import clients', href: '/help/clients' },
      { label: 'Client segments and tags', href: '/help/clients' },
      { label: 'Follow-up workflows', href: '/help/clients' },
    ],
  },
  '/finance': {
    title: 'Financial Questions?',
    links: [
      { label: 'Ledger and invoices', href: '/help/finance' },
      { label: 'Recording expenses', href: '/help/finance' },
      { label: 'Year-end tax summary', href: '/help/finance' },
    ],
  },
  '/culinary': {
    title: 'Culinary Help?',
    links: [
      { label: 'Building menus', href: '/help/culinary' },
      { label: 'Recipe costing', href: '/help/culinary' },
    ],
  },
  '/calendar': {
    title: 'Calendar Help?',
    links: [
      { label: 'Managing availability', href: '/help/events' },
      { label: 'Scheduling overview', href: '/help/events' },
    ],
  },
}

const FAQ_ITEMS = [
  {
    question: 'How do I create my first event?',
    answer:
      'Head to Events, click "New Event," fill in the basics (date, client, guest count), and save. You can add a menu and pricing later.',
    href: '/events',
  },
  {
    question: 'How does pricing work?',
    answer:
      'Your rate card sets default per-head and flat-fee prices. When you build a quote, those rates apply automatically. You can override any line item.',
    href: '/rate-card',
  },
  {
    question: 'Can I import my existing clients?',
    answer:
      'Yes. Go to Clients and use the import option to upload a CSV, or add clients one at a time from the "New Client" button.',
    href: '/clients',
  },
  {
    question: 'How do I build a menu?',
    answer:
      'Open Menus, create a new menu, then add courses and dishes. Link recipes for automatic costing and ingredient lists.',
    href: '/menus',
  },
  {
    question: 'What is the Day-Of Protocol?',
    answer:
      'The Day-Of Protocol (DOP) is your service-day checklist. It tracks prep, travel, setup, service, and breakdown so nothing slips through the cracks.',
    href: '/help/events',
  },
  {
    question: 'How do I track expenses?',
    answer:
      'Go to Expenses and log receipts against an event or as a general business expense. Attach photos of receipts for your records.',
    href: '/expenses',
  },
  {
    question: 'How do I set up payments?',
    answer:
      'Navigate to Settings then Payments to connect your Stripe account. Once connected, you can send invoices and accept online payments.',
    href: '/settings/payments',
  },
  {
    question: 'Where are my analytics?',
    answer:
      'Analytics lives in the main navigation. You will find revenue trends, client lifetime value, pipeline health, and more.',
    href: '/analytics',
  },
]

const HELP_CATEGORIES = [
  {
    icon: Calendar,
    label: 'Events & Scheduling',
    slug: 'events',
    desc: 'Creating events, DOP, transitions',
  },
  {
    icon: Users,
    label: 'Clients & CRM',
    slug: 'clients',
    desc: 'Managing clients, follow-ups, segments',
  },
  {
    icon: DollarSign,
    label: 'Finance & Payments',
    slug: 'finance',
    desc: 'Ledger, invoices, expenses, taxes',
  },
  {
    icon: ChefHat,
    label: 'Menus & Recipes',
    slug: 'culinary',
    desc: 'Recipe book, menu building, costing',
  },
  {
    icon: Settings,
    label: 'Settings & Integrations',
    slug: 'settings',
    desc: 'Automations, integrations, notifications',
  },
  {
    icon: BookOpen,
    label: 'Getting Started',
    slug: 'onboarding',
    desc: 'First steps, setup guide',
  },
]

const VIDEO_PLACEHOLDERS = [
  'Getting Started Tour',
  'Your First Event',
  'Menu Building Basics',
  'Financial Overview',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HelpCenterClient({ fromPage }: { fromPage: string | null }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const context = fromPage ? CONTEXT_MAP[fromPage] : null

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-stone-100">Help Center</h1>
        <p className="text-stone-400 mt-2">Find answers, learn workflows, get unstuck</p>
      </div>

      {/* Contextual Banner */}
      {context && (
        <Card className="border-brand-600/30">
          <CardContent className="py-4">
            <p className="font-semibold text-stone-100 mb-2">{context.title}</p>
            <ul className="space-y-1">
              {context.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <HelpSearch />

      {/* FAQ */}
      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Common Questions</h2>
        <div className="divide-y divide-stone-800">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx
            return (
              <div key={idx} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-3"
                >
                  <span className="text-sm font-medium text-stone-200">{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-stone-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="mt-2 pl-0 space-y-2">
                    <p className="text-sm text-stone-400">{item.answer}</p>
                    <Link
                      href={item.href}
                      className="inline-block text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                    >
                      Go to {item.href.replace('/', '')} &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Help Categories Grid */}
      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Browse by Topic</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HELP_CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/help/${cat.slug}`}>
              <Card interactive className="h-full">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2 bg-stone-800 rounded-lg flex-shrink-0">
                    <cat.icon className="h-5 w-5 text-stone-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-100">{cat.label}</p>
                    <p className="text-sm text-stone-500">{cat.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Ask Remy */}
      <Link href="/remy?context=help" className="block">
        <Card className="bg-stone-800/80 border-stone-700 hover:border-stone-600 transition-colors">
          <CardContent className="py-6 flex items-center gap-4">
            <div className="p-3 bg-stone-700/60 rounded-xl flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-stone-200" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-stone-100">Need more help? Ask Remy</p>
              <p className="text-sm text-stone-400 mt-0.5">
                Your AI assistant can answer questions about any feature
              </p>
            </div>
            <span className="text-sm font-medium text-brand-400 flex-shrink-0">
              Ask Remy &rarr;
            </span>
          </CardContent>
        </Card>
      </Link>

      {/* Video Walkthroughs */}
      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Video Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VIDEO_PLACEHOLDERS.map((title) => (
            <Card key={title} className="bg-stone-900/60 border-stone-800">
              <CardContent className="py-4 space-y-3">
                {/* Thumbnail placeholder */}
                <div className="aspect-video bg-stone-800 rounded-lg flex items-center justify-center">
                  <Play className="h-8 w-8 text-stone-500" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-stone-200">{title}</p>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 bg-stone-800 px-2 py-0.5 rounded">
                    Coming Soon
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
