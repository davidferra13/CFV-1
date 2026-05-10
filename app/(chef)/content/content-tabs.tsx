'use client'

// Content Pipeline Tab Navigation
// Client component that switches between From Events, From Captures, and Calendar views.

import { useState, type ReactNode } from 'react'
import { Calendar, FileText, Sparkles } from '@/components/ui/icons'

type Tab = 'events' | 'captures' | 'calendar'

const TABS: { value: Tab; label: string; icon: typeof FileText }[] = [
  { value: 'events', label: 'From Events', icon: FileText },
  { value: 'captures', label: 'From Captures', icon: Sparkles },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
]

export default function ContentTabs({
  eventsTab,
  capturesTab,
  calendarTab,
}: {
  eventsTab: ReactNode
  capturesTab: ReactNode
  calendarTab: ReactNode
}) {
  const [active, setActive] = useState<Tab>('events')

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-stone-800/50 p-1">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActive(value)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              active === value
                ? 'bg-stone-700 text-stone-100 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {active === 'events' && eventsTab}
        {active === 'captures' && capturesTab}
        {active === 'calendar' && calendarTab}
      </div>
    </div>
  )
}
