import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'
import { isCommTriageEnabled } from '@/lib/features'
import { getUnifiedInbox, getInboxStats } from '@/lib/inbox/actions'
import { InboxFeed } from '@/components/inbox/inbox-feed'

const CommunicationInboxClient = dynamic(
  () =>
    import('@/components/communication/communication-inbox-client').then(
      (m) => m.CommunicationInboxClient
    ),
  {
    loading: () => (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-stone-800 animate-pulse" />
        ))}
      </div>
    ),
  }
)
import { InboxCalendarPeek } from '@/components/communication/inbox-calendar-peek'
import {
  getCommunicationInbox,
  getCommunicationInboxStats,
  getUnreadThreadCount,
} from '@/lib/communication/actions'
import type { CommunicationTab } from '@/lib/communication/types'
import { getCalendarEvents } from '@/lib/scheduling/actions'
import { getGoogleConnection } from '@/lib/google/auth'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Inbox - ChefFlow' }

const VALID_TABS: CommunicationTab[] = ['unlinked', 'needs_attention', 'snoozed', 'resolved']

export default async function InboxPage({ searchParams }: { searchParams?: { tab?: string } }) {
  await requireChef()

  const triageEnabled = isCommTriageEnabled()
  if (triageEnabled) {
    const now = new Date()
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [items, stats, calendarEvents, gmailConnection, unreadCount] = await Promise.all([
      getCommunicationInbox(undefined, 100),
      getCommunicationInboxStats(),
      getCalendarEvents(rangeStart, rangeEnd),
      getGoogleConnection(),
      getUnreadThreadCount(),
    ])

    // Smart default: if user specified a tab use it, otherwise pick the tab with content
    // Prefer needs_attention (actionable), fall back to unlinked (new/unsorted)
    let tab: CommunicationTab = 'needs_attention'
    if (VALID_TABS.includes(searchParams?.tab as CommunicationTab)) {
      tab = searchParams!.tab as CommunicationTab
    } else if (stats.needs_attention === 0 && stats.unlinked > 0) {
      tab = 'unlinked'
    }

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Inbox</h1>
            <p className="text-stone-400 mt-1">
              Manage all your messages, bookings, and follow-ups in one place.
            </p>
          </div>
          <InboxCalendarPeek events={calendarEvents} />
        </div>

        {!gmailConnection.gmail.connected && (
          <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-sm text-amber-800">
            <span className="font-medium">Gmail is disconnected.</span> New emails won&apos;t be
            synced into your inbox.{' '}
            <Link href="/settings" className="underline underline-offset-2 hover:text-amber-900">
              Reconnect in Settings →
            </Link>
          </div>
        )}

        <CommunicationInboxClient
          items={items as any}
          stats={stats}
          initialTab={tab}
          unreadCount={unreadCount}
          gmailConnected={gmailConnection.gmail.connected}
        />
      </div>
    )
  }

  const [items, stats, gmailConnection] = await Promise.all([
    getUnifiedInbox({ limit: 50 }),
    getInboxStats(),
    getGoogleConnection(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Inbox</h1>
        <p className="text-stone-400 mt-1">
          Everything in one place - chat, messages, form submissions, and notifications.
        </p>
      </div>

      {!gmailConnection.gmail.connected && (
        <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Gmail is disconnected.</span> New emails won&apos;t be
          synced into your inbox.{' '}
          <Link href="/settings" className="underline underline-offset-2 hover:text-amber-900">
            Reconnect in Settings →
          </Link>
        </div>
      )}

      <InboxFeed items={items} stats={stats} />
    </div>
  )
}
