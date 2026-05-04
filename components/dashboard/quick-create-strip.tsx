'use client'

// Quick-Create Strip - persistent row of fast-action buttons on the dashboard
// One tap to create Event, Inquiry, Expense, Recipe, or Todo

import Link from 'next/link'
import { CalendarPlus, Mail, Receipt, Utensils, ListChecks } from '@/components/ui/icons'

const QUICK_ACTIONS = [
  {
    label: 'Event',
    href: '/events/new',
    icon: CalendarPlus,
    color: 'bg-brand-600 hover:bg-brand-700',
  },
  {
    label: 'Inquiry',
    href: '/inquiries/new',
    icon: Mail,
    color: 'bg-violet-600 hover:bg-violet-700',
  },
  {
    label: 'Expense',
    href: '/expenses/new',
    icon: Receipt,
    color: 'bg-emerald-600 hover:bg-emerald-700',
  },
  {
    label: 'Recipe',
    href: '/recipes/new',
    icon: Utensils,
    color: 'bg-amber-600 hover:bg-amber-700',
  },
  {
    label: 'Todo',
    href: '/tasks',
    icon: ListChecks,
    color: 'bg-brand-600 hover:bg-brand-700',
  },
] as const

export function QuickCreateStrip() {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-xs font-semibold transition-all whitespace-nowrap shadow-lg shadow-black/20 hover:scale-105 active:scale-95 ${action.color}`}
        >
          <action.icon className="h-4 w-4" />+ {action.label}
        </Link>
      ))}
    </div>
  )
}
