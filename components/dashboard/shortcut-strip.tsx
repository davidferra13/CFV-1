'use client'

import Link from 'next/link'
import {
  Calendar,
  ChatTeardropText,
  Users,
  Bot,
  Utensils,
  BarChart2,
  Wallet,
  Settings,
} from '@/components/ui/icons'

const SHORTCUTS = [
  { label: 'Events', href: '/events', icon: Calendar, color: '#3b82f6' },
  { label: 'Inquiries', href: '/inquiries', icon: ChatTeardropText, color: '#f59e0b' },
  { label: 'Clients', href: '/clients', icon: Users, color: '#a855f7' },
  { label: 'Remy', href: '#remy', icon: Bot, color: '#e88f47' },
  { label: 'Recipes', href: '/recipes', icon: Utensils, color: '#10b981' },
  { label: 'Analytics', href: '/analytics', icon: BarChart2, color: '#06b6d4' },
  { label: 'Finance', href: '/finance/reporting', icon: Wallet, color: '#22c55e' },
  { label: 'Settings', href: '/settings', icon: Settings, color: '#78716c' },
] as const

/**
 * Horizontal row of icon shortcut buttons (like phone app icons).
 * Scrollable on mobile, centered on desktop.
 */
export function ShortcutStrip() {
  return (
    <div className="col-span-1 sm:col-span-2 md:col-span-4">
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col items-center gap-1.5 min-w-[56px] group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg group-active:scale-95"
              style={{ backgroundColor: `${s.color}14`, border: `1px solid ${s.color}20` }}
            >
              <s.icon className="w-[18px] h-[18px]" style={{ color: s.color }} />
            </div>
            <span className="text-xxs font-medium text-stone-500 group-hover:text-stone-300 transition-colors">
              {s.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
