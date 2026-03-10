'use client'

import { useState, type ReactNode } from 'react'

interface ReservationPageTabsProps {
  reservationsPanel: ReactNode
  waitlistPanel: ReactNode
}

export function ReservationPageTabs({
  reservationsPanel,
  waitlistPanel,
}: ReservationPageTabsProps) {
  const [activeTab, setActiveTab] = useState<'reservations' | 'waitlist'>('reservations')

  return (
    <div>
      <div className="flex border-b border-stone-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('reservations')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reservations'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          Reservations
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('waitlist')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'waitlist'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          Walk-In Waitlist
        </button>
      </div>

      {activeTab === 'reservations' ? reservationsPanel : waitlistPanel}
    </div>
  )
}
