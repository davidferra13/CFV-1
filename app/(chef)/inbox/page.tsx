import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { isCommTriageEnabled } from '@/lib/features'
import { getUnifiedInbox, getInboxStats } from '@/lib/inbox/actions'
import { InboxFeed } from '@/components/inbox/inbox-feed'
import { CommunicationInboxClient } from '@/components/communication/communication-inbox-client'
import { InboxCalendarPeek } from '@/components/communication/inbox-calendar-peek'
import { TriageSuggestionsSection } from '@/components/communication/triage-suggestions-section'
import { StagedSignalsPanel } from '@/components/communication/staged-signals-panel'
import {
  getCommunicationInbox,
  getCommunicationInboxStats,
  getUnreadThreadCount,
} from '@/lib/communication/actions'
import { getStagedEntities } from '@/lib/comms/staging-actions'
import { getOrCreateEmailChannel } from '@/lib/comms/email-channel'
import type { CommunicationTab } from '@/lib/communication/types'
import { getCalendarEvents } from '@/lib/scheduling/actions'
import { getGoogleConnection } from '@/lib/google/auth'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Inbox' }

const VALID_TABS: CommunicationTab[] = ['unlinked', 'needs_attention', 'snoozed', 'resolved']

export default async function InboxPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const user = await requireChef()

  const triageEnabled = isCommTriageEnabled()
  if (triageEnabled) {
    const now = new Date()
    const _li = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const rangeStart = _li(new Date(now.getFullYear(), now.getMonth(), 1))
    const rangeEnd = _li(new Date(now.getFullYear(), now.getMonth() + 1, 0))

    const [items, stats, calendarEvents, gmailConnection, unreadCount, staged, emailChannel] =
      await Promise.all([
        getCommunicationInbox(undefined, 100),
        getCommunicationInboxStats(),
        getCalendarEvents(rangeStart, rangeEnd),
        getGoogleConnection(),
        getUnreadThreadCount(),
        getStagedEntities().catch(() => ({ clients: [], inquiries: [] })),
        getOrCreateEmailChannel(user.entityId!).catch(() => null),
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

        {/* Staged signals - auto-detected contacts awaiting confirmation */}
        {staged.clients.length > 0 && <StagedSignalsPanel clients={staged.clients} />}

        {/* Per-chef inbound email address + pipeline health */}
        {emailChannel && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              emailChannel.signalCount > 0
                ? 'border-stone-700 bg-stone-900/50'
                : 'border-amber-800/40 bg-amber-950/20'
            }`}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="text-stone-400">Your ChefFlow inbox address: </span>
                <span className="font-mono text-stone-200 select-all">{emailChannel.address}</span>
              </div>
              {emailChannel.signalCount > 0 ? (
                <span className="text-xs text-emerald-500">
                  {emailChannel.signalCount} signal{emailChannel.signalCount !== 1 ? 's' : ''}{' '}
                  received
                </span>
              ) : (
                <span className="text-xs text-amber-500">
                  No signals yet - Cloudflare Email Routing setup required
                </span>
              )}
            </div>
            {emailChannel.signalCount === 0 && (
              <p className="text-xs text-stone-500 mt-1">
                Forward emails here or configure Cloudflare routing to activate the pipeline. See{' '}
                <span className="font-mono text-stone-400">
                  docs/cloudflare-email-routing-setup.md
                </span>
              </p>
            )}
          </div>
        )}

        {/* Triage suggestions - fetches real data, hides when empty */}
        <TriageSuggestionsSection />

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
