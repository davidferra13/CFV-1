'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Image, Link2, Settings } from 'lucide-react'

const TABS = [
  { href: '/social/planner', label: 'Planner', icon: Calendar },
  { href: '/social/vault', label: 'Media Vault', icon: Image },
  { href: '/social/connections', label: 'Connections', icon: Link2 },
  { href: '/social/settings', label: 'Settings', icon: Settings },
]

export function SocialLayoutTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 -mb-px" aria-label="Social marketing tabs">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              isActive
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300',
            ].join(' ')}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
