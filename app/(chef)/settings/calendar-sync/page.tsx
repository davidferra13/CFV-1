import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireChef } from '@/lib/auth/get-user'
import { getICalFeedStatus } from '@/lib/integrations/ical/ical-actions'
import { ICalFeedSettings } from '@/components/settings/ical-feed-settings'

export const metadata: Metadata = { title: 'Calendar Sync - ChefFlow' }

export default async function CalendarSyncPage() {
  await requireChef()

  const feedStatus = await getICalFeedStatus()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Calendar Sync</h1>
        <p className="text-stone-400 mt-1">
          Subscribe to your ChefFlow calendar from Apple Calendar, Outlook, or Google Calendar.
        </p>
      </div>

      <ICalFeedSettings enabled={feedStatus.enabled} feedUrl={feedStatus.feedUrl} />
    </div>
  )
}
