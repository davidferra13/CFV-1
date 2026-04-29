'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Info,
  DollarSign,
  ClipboardList,
  CheckSquare,
  Ticket,
  ListChecks,
  Store,
  MessageCircle,
} from '@/components/ui/icons'
import {
  normalizeEventDetailTab,
  type EventDetailTab,
} from '@/components/events/event-detail-tabs'

export type { EventDetailTab } from '@/components/events/event-detail-tabs'

const TABS: { id: EventDetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Info className="h-4 w-4" /> },
  { id: 'popup', label: 'Pop-Up', icon: <Store className="h-4 w-4" /> },
  { id: 'chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
  { id: 'money', label: 'Finance', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'prep', label: 'Prep', icon: <ListChecks className="h-4 w-4" /> },
  { id: 'tickets', label: 'Tickets', icon: <Ticket className="h-4 w-4" /> },
  { id: 'ops', label: 'Ops', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'wrap', label: 'Wrap-up', icon: <CheckSquare className="h-4 w-4" /> },
]

/**
 * Sticky in-page tab bar for event detail on mobile.
 * Hidden on md+ - desktop shows all sections as a full scroll.
 * Uses URL search params so tab state survives refresh and is linkable.
 */
export function EventDetailMobileNav() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeTab = normalizeEventDetailTab(searchParams?.get('tab'))

  function switchTab(tab: EventDetailTab) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <nav className="md:hidden sticky top-14 z-30 bg-stone-900 border-b border-stone-700 shadow-sm -mx-4 px-4">
      <div className="flex">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}

/**
 * Wraps a section group so it's only visible on the given tab on mobile.
 * On md+ all sections are always visible (full scroll, no tabs).
 */
export function EventDetailSection({
  tab,
  activeTab,
  children,
}: {
  tab: EventDetailTab
  activeTab: EventDetailTab
  children: React.ReactNode
}) {
  return <div className={tab === activeTab ? '' : 'hidden md:contents'}>{children}</div>
}
