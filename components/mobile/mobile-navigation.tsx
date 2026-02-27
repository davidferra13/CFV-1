'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type MobileNavItem = {
  href: string
  label: string
}

export function MobileNavigation({ items }: { items: MobileNavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-20 border-b border-stone-700 bg-stone-950/95 px-4 py-2 backdrop-blur">
      <div className="flex gap-2 overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-amber-500 text-stone-950'
                  : 'border border-stone-700 bg-stone-900 text-stone-300'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
