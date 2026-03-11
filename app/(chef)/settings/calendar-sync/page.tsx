import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { getICalFeedStatus } from '@/lib/integrations/ical/ical-actions'
import { getCalendarConnection } from '@/lib/scheduling/calendar-sync-actions'
import { ICalFeedSettings } from '@/components/settings/ical-feed-settings'
import { GoogleCalendarConnect } from '@/components/settings/google-calendar-connect'
import { UpgradeGate } from '@/components/billing/upgrade-gate'

export const metadata: Metadata = { title: 'Calendar Sync - ChefFlow' }

async function CalendarSyncContent() {
  const [feedStatus, calendarConnection] = await Promise.all([
    getICalFeedStatus(),
    getCalendarConnection(),
  ])

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
          Keep ChefFlow aligned with the calendar tools you actually use. Connect Google Calendar
          for automatic event sync, or subscribe anywhere else with an iCal feed.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-400">
          <p className="font-medium text-stone-200">Choose the sync model that fits your setup</p>
          <p className="mt-2">
            Google Calendar is the direct connection for chefs who want confirmed events to appear
            automatically in their calendar. The iCal feed is the portable subscribe-by-URL option
            for Apple Calendar, Outlook, and any app that supports calendar subscriptions.
          </p>
        </div>

        <GoogleCalendarConnect connection={calendarConnection} />
        <ICalFeedSettings enabled={feedStatus.enabled} feedUrl={feedStatus.feedUrl} />
      </div>
    </div>
  )
}

export default async function CalendarSyncPage() {
  const user = await requireChef()

  return (
    <UpgradeGate chefId={user.entityId} featureSlug="integrations">
      <CalendarSyncContent />
    </UpgradeGate>
  )
}
