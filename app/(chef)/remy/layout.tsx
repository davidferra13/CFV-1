'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, History, Settings, Lightbulb, Shield } from '@/components/ui/icons'
import { RemyAvatar } from '@/components/ai/remy-avatar'

const NAV_ITEMS = [
  { href: '/remy', label: 'Chat', icon: Sparkles, exact: true },
  { href: '/remy/operating', label: 'Hub', icon: Shield, exact: false },
  { href: '/remy/signals', label: 'Signals', icon: Lightbulb, exact: false },
  { href: '/remy/history', label: 'History', icon: History, exact: false },
  { href: '/remy/settings', label: 'Settings', icon: Settings, exact: false },
] as const

export default function RemyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top nav bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-stone-800 bg-stone-950/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <RemyAvatar size="sm" />
          <h1 className="text-lg font-semibold text-stone-100">Remy</h1>
        </div>

        <nav className="flex items-center gap-1 ml-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-900/40 text-brand-400'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
