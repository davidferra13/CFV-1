import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { isCommTriageEnabled } from '@/lib/features'
import { getUnifiedInbox, getInboxStats } from '@/lib/inbox/actions'
import { InboxFeed } from '@/components/inbox/inbox-feed'
import { CommunicationInboxClient } from '@/components/communication/communication-inbox-client'
import { InboxCalendarPeek } from '@/components/communication/inbox-calendar-peek'
import { TriageSuggestionsSection } from '@/components/communication/triage-suggestions-section'
import { StagedSignalsPanel } from '@/components/communication/staged-signals-panel'
import { SmsTriage } from '@/components/communication/sms-triage-card'
import {
  getCommunicationInbox,
  getCommunicationInboxStats,
  getUnreadThreadCount,
} from '@/lib/communication/actions'
import { getStagedEntities } from '@/lib/comms/staging-actions'
import { getPendingSmsDrafts } from '@/lib/sms/triage-actions'
import { getOrCreateEmailChannel } from '@/lib/comms/email-channel'
import type { CommunicationTab } from '@/lib/communication/types'
import { getCalendarEvents } from '@/lib/scheduling/actions'
import { getGoogleConnection } from '@/lib/google/auth'
import type { GoogleConnectionStatus } from '@/lib/google/types'
import type { InboxStats } from '@/lib/inbox/types'
import Link from 'next/link'
import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'

export const metadata: Metadata = { title: 'Inbox' }

const VALID_TABS: CommunicationTab[] = ['unlinked', 'needs_attention', 'snoozed', 'resolved']

function withInboxTimeout<T>(label: string, promise: Promise<T>, fallback: T, timeoutMs = 4000) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let timedOut = false

  const guarded = promise.catch((error) => {
    if (!timedOut) {
      console.error(`[inbox] ${label} failed:`, error)
    }
    return fallback
  })

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true
      console.error(`[inbox] ${label} timed out after ${timeoutMs}ms`)
      resolve(fallback)
    }, timeoutMs)
  })

  return Promise.race([guarded, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

const emptyStats = {
  total: 0,
  unlinked: 0,
  needs_attention: 0,
  snoozed: 0,
  resolved: 0,
}

const disconnectedGoogle: GoogleConnectionStatus = {
  gmail: { connected: false, email: null, lastSync: null, errorCount: 0 },
  calendar: {
    connected: false,
    email: null,
    lastSync: null,
    checkedAt: null,
    health: 'unknown',
    healthDetail: null,
    busyRangeCount: 0,
    conflictCount: 0,
    calendarCount: 0,
  },
}

const emptyLegacyInboxStats: InboxStats = {
  total: 0,
  unread: 0,
  bySource: { chat: 0, message: 0, wix: 0, notification: 0 },
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: { tab?: string; clientId?: string }
}) {
  const user = await requireChef()

  const triageEnabled = isCommTriageEnabled()
  if (triageEnabled) {
    const now = new Date()
    const _li = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const rangeStart = _li(new Date(now.getFullYear(), now.getMonth(), 1))
    const rangeEnd = _li(new Date(now.getFullYear(), now.getMonth() + 1, 0))

    const [
      items,
      stats,
      calendarEvents,
      gmailConnection,
      unreadCount,
      staged,
      emailChannel,
      smsDrafts,
    ] = await Promise.all([
      withInboxTimeout(
        'communication inbox',
        getCommunicationInbox(undefined, 100, searchParams?.clientId),
        []
      ),
      withInboxTimeout('communication inbox stats', getCommunicationInboxStats(), emptyStats),
      withInboxTimeout('calendar events', getCalendarEvents(rangeStart, rangeEnd), []),
      withInboxTimeout('google connection', getGoogleConnection(), disconnectedGoogle),
      withInboxTimeout('unread thread count', getUnreadThreadCount(), 0),
      withInboxTimeout('staged entities', getStagedEntities(), { clients: [], inquiries: [] }),
      withInboxTimeout('email channel', getOrCreateEmailChannel(user.entityId!), null),
      withInboxTimeout('sms drafts', getPendingSmsDrafts(), []),
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

        {/* External platform quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <ExitLinkButton exitId={33} context={{}} />
          <ExitLinkButton exitId={34} context={{}} />
        </div>

        {searchParams?.clientId && (
          <div className="rounded-lg border border-brand-700/40 bg-brand-950/20 px-4 py-3 text-sm flex items-center justify-between">
            <span className="text-brand-300">Filtered to emails for this client</span>
            <Link href="/inbox" className="text-xs text-stone-400 hover:text-stone-200">
              Clear filter
            </Link>
          </div>
        )}

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

        {/* SMS triage: Remy draft responses awaiting chef approval */}
        <SmsTriage drafts={smsDrafts} />

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
    withInboxTimeout('legacy inbox', getUnifiedInbox({ limit: 50 }), []),
    withInboxTimeout('legacy inbox stats', getInboxStats(), emptyLegacyInboxStats),
    withInboxTimeout('legacy google connection', getGoogleConnection(), disconnectedGoogle),
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
