// Quick Log Page
// 3-tap entry for expenses, notes, and tasks between events.
// Mobile-first, minimal chrome.

import { Metadata } from 'next'
import { getRecentQuickLogs, getNextUpcomingEvent } from '@/lib/mobile/quick-log-actions'
import { QuickLogPageClient } from '@/components/mobile/quick-log-page-client'

export const metadata: Metadata = {
  title: 'Quick Log | ChefFlow',
}

export default async function QuickLogPage() {
  const [recentLogs, upcomingEvents] = await Promise.all([
    getRecentQuickLogs(15),
    getNextUpcomingEvent(),
  ])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Quick Log</h1>
        <p className="text-sm text-stone-500 mt-1">
          Expenses, notes, and tasks in one tap.
        </p>
      </div>

      <QuickLogPageClient
        upcomingEvents={upcomingEvents}
        recentLogs={recentLogs}
      />
    </div>
  )
}
