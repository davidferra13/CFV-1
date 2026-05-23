'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface PortalHeaderProps {
  chefName: string | null
  chefBusinessName: string | null
  clientName: string | null
}

const NAV_ITEMS = [
  { href: '/my-events', label: 'My Events' },
  { href: '/my-bookings', label: 'Bookings' },
  { href: '/my-chat', label: 'Messages' },
]

export function PortalHeader({ chefName, chefBusinessName, clientName }: PortalHeaderProps) {
  const pathname = usePathname()

  const displayChefName = chefBusinessName || chefName
  const greeting = clientName ? `Welcome, ${clientName}` : 'Welcome back'

  return (
    <div className="luxury-portal-header relative overflow-hidden rounded-2xl border border-[#c4a35a]/15 bg-gradient-to-r from-[#2d2d2d] via-[#3a3530] to-[#2d2d2d] mb-8">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,_#c4a35a_1px,_transparent_1px)] bg-[length:24px_24px]" />

      <div className="relative px-8 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          {/* Branding and greeting */}
          <div>
            {displayChefName && (
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c4a35a] mb-2">
                {displayChefName}
              </p>
            )}
            <h1 className="font-display-serif text-2xl sm:text-3xl font-bold text-[#faf9f7]">
              {greeting}
            </h1>
          </div>

          {/* Minimal navigation */}
          <nav className="flex items-center gap-1" aria-label="Portal navigation">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/my-events' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#c4a35a]/20 text-[#c4a35a]'
                      : 'text-[#faf9f7]/60 hover:text-[#faf9f7]/90 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c4a35a]/30 to-transparent" />
      </div>
    </div>
  )
}
