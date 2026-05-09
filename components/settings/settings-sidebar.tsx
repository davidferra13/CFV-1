'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { SETTINGS_NAV, getActiveSettingsPath } from '@/lib/settings/settings-nav'
import { cn } from '@/lib/utils'

interface SettingsSidebarProps {
  developerToolsEnabled?: boolean
}

export function SettingsSidebar({ developerToolsEnabled = false }: SettingsSidebarProps) {
  const pathname = usePathname()
  const activePath = getActiveSettingsPath(pathname)

  return (
    <aside className="w-[240px] h-full overflow-y-auto bg-stone-900/50 border-r border-stone-800">
      <div className="p-4 pb-2">
        <Link
          href="/settings"
          className={cn(
            'text-sm font-semibold',
            activePath === '/settings' && pathname === '/settings'
              ? 'text-brand-200'
              : 'text-stone-200 hover:text-stone-100'
          )}
        >
          Settings
        </Link>
      </div>

      <nav className="px-2 pb-4 space-y-4">
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
              <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {group.label}
              </h3>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const isActive = activePath === item.href

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'block px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'text-brand-200 bg-brand-950/40 font-medium border-l-2 border-brand-400'
                            : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/50'
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
