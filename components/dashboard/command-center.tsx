'use client'

import Link from 'next/link'
import type { LucideIcon } from '@/components/ui/icons'
import {
  CalendarDays,
  ChatTeardropText,
  DollarSign,
  Inbox,
  UtensilsCrossed,
  Users,
} from '@/components/ui/icons'

// ─── Types ─────────────────────────────────────────────────
type CoreArea = {
  label: string
  href: string
  icon: LucideIcon
  color: string
  description: string
  count?: number
  countLabel?: string
  links: Array<{ label: string; href: string }>
}

// Keep the full counts interface so the server data component still compiles unchanged
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

function getCoreAreas(counts: CommandCenterProps['counts']): CoreArea[] {
  return [
    {
      label: 'Inbox',
      href: '/inbox',
      icon: Inbox,
      color: '#6366f1',
      description: 'Messages and communication',
      count: counts.unreadMessages > 0 ? counts.unreadMessages : undefined,
      countLabel: 'unread',
      links: [
        { label: 'All messages', href: '/inbox' },
        { label: 'Notifications', href: '/notifications' },
      ],
    },
    {
      label: 'Inquiries',
      href: '/inquiries',
      icon: ChatTeardropText,
      color: '#f59e0b',
      description: 'Incoming requests and booking pipeline',
      count: counts.inquiries > 0 ? counts.inquiries : undefined,
      countLabel: 'open',
      links: [
        { label: 'New inquiry', href: '/inquiries/new' },
        { label: 'Awaiting response', href: '/inquiries/awaiting-response' },
      ],
    },
    {
      label: 'Events',
      href: '/events',
      icon: CalendarDays,
      color: '#3b82f6',
      description: 'Plan and manage every event',
      count: counts.events > 0 ? counts.events : undefined,
      countLabel: 'active',
      links: [
        { label: 'New event', href: '/events/new' },
        { label: 'Calendar', href: '/calendar' },
      ],
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: Users,
      color: '#a855f7',
      description: 'Directory, history, and communication',
      count: counts.clients > 0 ? counts.clients : undefined,
      countLabel: 'total',
      links: [
        { label: 'Add client', href: '/clients/new' },
        { label: 'Follow-ups', href: '/clients/communication/follow-ups' },
      ],
    },
    {
      label: 'Menus',
      href: '/menus',
      icon: UtensilsCrossed,
      color: '#10b981',
      description: 'Menus, recipes, and costing',
      count: counts.menus > 0 ? counts.menus : undefined,
      countLabel: 'menus',
      links: [
        { label: 'New menu', href: '/menus/new' },
        { label: 'Costing', href: '/culinary/costing' },
      ],
    },
    {
      label: 'Money',
      href: '/financials',
      icon: DollarSign,
      color: '#22d3ee',
      description: 'Finance, quotes, and expenses',
      count: counts.quotes > 0 ? counts.quotes : undefined,
      countLabel: 'pending quotes',
      links: [
        { label: 'New quote', href: '/quotes/new' },
        { label: 'Expenses', href: '/expenses' },
      ],
    },
  ]
}

// ─── Core Area Card ─────────────────────────────────────────
function CoreAreaCard({ area }: { area: CoreArea }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 hover:bg-stone-800/40 hover:border-stone-600 transition-all overflow-hidden">
      <Link href={area.href} className="block p-4">
        <div className="flex items-start justify-between mb-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${area.color}12`,
              border: `1px solid ${area.color}20`,
            }}
          >
            <area.icon className="w-4 h-4" style={{ color: area.color }} />
          </div>
          {area.count !== undefined && (
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
        <h3 className="text-sm font-semibold text-stone-200">{area.label}</h3>
        <p className="text-xxs text-stone-500 mt-0.5">{area.description}</p>
      </Link>

      {area.links.length > 0 && (
        <div className="border-t border-stone-800 px-4 py-2 flex gap-3">
          {area.links.map((link) => (
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

// ─── Component ─────────────────────────────────────────────
export function CommandCenter({ counts }: CommandCenterProps) {
  const areas = getCoreAreas(counts)

  return (
    <section>
      <div className="section-label mb-4">Core Areas</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {areas.map((area) => (
          <CoreAreaCard key={area.label} area={area} />
        ))}
      </div>
    </section>
  )
}
