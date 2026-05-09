'use client'

import Link from 'next/link'
import { SETTINGS_NAV } from '@/lib/settings/settings-nav'
import type { IconProps } from '@/components/ui/icons'
import {
  Building2,
  CalendarDays,
  CreditCard,
  Palette,
  MessageSquare,
  Link2,
  Brain,
  Shield,
  Settings2,
  Code2,
  ChevronRight,
} from '@/components/ui/icons'
import type { ComponentType } from 'react'

const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  Building2,
  CalendarDays,
  CreditCard,
  Palette,
  MessageSquare,
  Link2,
  Brain,
  Shield,
  Settings2,
  Code2,
}

interface SettingsMobileNavProps {
  developerToolsEnabled?: boolean
}

export function SettingsMobileNav({ developerToolsEnabled = false }: SettingsMobileNavProps) {
  return (
    <div className="w-full">
      {SETTINGS_NAV.map((group) => {
        const items = group.items.filter((item) => {
          if (item.href === '/settings/developer' && !developerToolsEnabled) {
            return false
          }
          return true
        })

        if (items.length === 0) return null

        return (
          <div key={group.label}>
            <h3 className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
              {group.label}
            </h3>
            <ul>
              {items.map((item) => {
                const Icon = ICON_MAP[item.icon]

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 py-4 px-4 border-b border-stone-800"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-800 text-stone-300">
                        {Icon && <Icon size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-200">{item.label}</p>
                        <p className="text-xs text-stone-400 truncate">{item.description}</p>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-stone-500" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
