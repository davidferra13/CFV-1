'use client'

import Link from 'next/link'
import {
  Calendar,
  ChatTeardropText,
  ChatDots,
  Users,
  Invoice,
  Utensils,
  Warehouse,
  Wallet,
} from '@/components/ui/icons'

const SHORTCUTS = [
  { label: 'Calendar', href: '/schedule', icon: Calendar, color: '#3b82f6' },
  { label: 'Events', href: '/events', icon: Calendar, color: '#2563eb' },
  { label: 'Inquiries', href: '/inquiries', icon: ChatTeardropText, color: '#f59e0b' },
  { label: 'Quotes', href: '/quotes', icon: Invoice, color: '#f97316' },
  { label: 'Clients', href: '/clients', icon: Users, color: '#a855f7' },
  { label: 'Recipes', href: '/recipes', icon: Utensils, color: '#10b981' },
  { label: 'Comms', href: '/communications', icon: ChatDots, color: '#06b6d4' },
  { label: 'Inventory', href: '/inventory', icon: Warehouse, color: '#22c55e' },
  { label: 'Invoices', href: '/finance/invoices', icon: Wallet, color: '#14b8a6' },
] as const

/**
 * Horizontal row of icon shortcut buttons (like phone app icons).
 * Scrollable on mobile, centered on desktop.
 */
export function ShortcutStrip() {
  return (
    <div className="col-span-1 sm:col-span-2 md:col-span-4" data-tour="shortcut-strip">
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col items-center gap-1.5 min-w-[60px] group"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95"
              style={{ backgroundColor: `${s.color}18`, border: `1px solid ${s.color}30` }}
            >
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <span className="text-[10px] font-medium text-stone-500 group-hover:text-stone-300 transition-colors">
              {s.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
