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
import { getTwilioCredentialStatus } from '@/lib/comms/twilio-byo-actions'
import type { CommunicationTab } from '@/lib/communication/types'
import { getCalendarEvents } from '@/lib/scheduling/actions'
import { getGoogleConnection } from '@/lib/google/auth'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Inbox' }

const VALID_TABS: CommunicationTab[] = ['unlinked', 'needs_attention', 'snoozed', 'resolved']
const GMAIL_STALE_AFTER_HOURS = 24

type CoverageTone = 'success' | 'warning' | 'error' | 'info'

type CoverageRow = {
  label: string
  status: string
  detail: string
  tone: CoverageTone
  meta?: string
  href?: string
  actionLabel?: string
}

function getCoverageClasses(tone: CoverageTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-700/50 bg-emerald-950/20 text-emerald-300'
    case 'warning':
      return 'border-amber-700/50 bg-amber-950/20 text-amber-300'
    case 'error':
      return 'border-red-700/50 bg-red-950/20 text-red-300'
    case 'info':
    default:
      return 'border-sky-700/50 bg-sky-950/20 text-sky-300'
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getHoursSince(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return null
  return Math.max(0, Math.round((Date.now() - parsed.getTime()) / 36_000) / 100)
}

function describeAge(hours: number | null) {
  if (hours === null) return 'No sync recorded'
  if (hours < 1) return 'Synced within the last hour'
  if (hours < 24) return `Synced ${Math.round(hours)}h ago`
  const days = Math.round(hours / 24)
  return `Synced ${days}d ago`
}

function InboxCoveragePanel({ rows }: { rows: CoverageRow[] }) {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/50">
      <div className="border-b border-stone-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-100">Ingestion coverage</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Real channel status for the communication stream.
            </p>
          </div>
          <span className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-400">
            {rows.filter((row) => row.tone === 'success').length}/{rows.length} active
          </span>
        </div>
      </div>
      <div className="divide-y divide-stone-800">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-3 px-4 py-3 sm:grid-cols-[10rem_1fr_auto]">
            <div>
              <p className="text-sm font-medium text-stone-200">{row.label}</p>
              <span
                className={`mt-1 inline-flex rounded border px-2 py-0.5 text-xs font-medium ${getCoverageClasses(
                  row.tone
                )}`}
              >
                {row.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-stone-300">{row.detail}</p>
              {row.meta && <p className="mt-1 text-xs text-stone-500">{row.meta}</p>}
            </div>
            {row.href && row.actionLabel ? (
              <Link
                href={row.href}
                className="self-start text-sm font-medium text-amber-300 underline underline-offset-4 hover:text-amber-200"
              >
                {row.actionLabel}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function InboxPage({ searchParams }: { searchParams?: { tab?: string } }) {
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
      twilioStatus,
    ] = await Promise.all([
      getCommunicationInbox(undefined, 100),
      getCommunicationInboxStats(),
      getCalendarEvents(rangeStart, rangeEnd),
      getGoogleConnection(),
      getUnreadThreadCount(),
      getStagedEntities().catch(() => ({ clients: [], inquiries: [] })),
      getOrCreateEmailChannel(user.entityId!).catch(() => null),
      getTwilioCredentialStatus().catch(() => null),
    ])

    const gmailLastSyncHours = getHoursSince(gmailConnection.gmail.lastSync)
    const gmailLastSyncLabel = formatTimestamp(gmailConnection.gmail.lastSync)
    const gmailStale =
      gmailConnection.gmail.connected &&
      (gmailLastSyncHours === null || gmailLastSyncHours > GMAIL_STALE_AFTER_HOURS)
    const stagedSignalCount = staged.clients.length + staged.inquiries.length

    const coverageRows: CoverageRow[] = [
      {
        label: 'Gmail',
        status: !gmailConnection.gmail.connected
          ? 'Disconnected'
          : gmailStale
            ? 'Stale'
            : 'Connected',
        tone: !gmailConnection.gmail.connected ? 'error' : gmailStale ? 'warning' : 'success',
        detail: !gmailConnection.gmail.connected
          ? 'No Gmail mailbox is connected, so Gmail messages will not sync into the stream.'
          : gmailConnection.gmail.email
            ? `Connected mailbox: ${gmailConnection.gmail.email}.`
            : 'A Gmail connection exists, but no mailbox address was returned.',
        meta: [
          describeAge(gmailLastSyncHours),
          gmailLastSyncLabel ? `Last sync: ${gmailLastSyncLabel}` : null,
          gmailConnection.gmail.errorCount > 0
            ? `${gmailConnection.gmail.errorCount} sync error${
                gmailConnection.gmail.errorCount === 1 ? '' : 's'
              } recorded`
            : null,
        ]
          .filter(Boolean)
          .join(' | '),
        href: '/settings/integrations',
        actionLabel: gmailConnection.gmail.connected ? 'Manage' : 'Connect',
      },
      {
        label: 'ChefFlow address',
        status: emailChannel
          ? emailChannel.signalCount > 0
            ? 'Receiving'
            : 'No signals'
          : 'Unavailable',
        tone: emailChannel ? (emailChannel.signalCount > 0 ? 'success' : 'warning') : 'error',
        detail: emailChannel
          ? `Inbound alias: ${emailChannel.address}.`
          : 'ChefFlow could not load the per-chef inbox address.',
        meta: emailChannel
          ? `${emailChannel.signalCount} inbound email signal${
              emailChannel.signalCount === 1 ? '' : 's'
            } received. Cloudflare Email Routing or forwarding must point mail at this alias.`
          : 'No address is shown because the channel lookup failed.',
      },
      {
        label: 'SMS/Twilio',
        status: twilioStatus?.connected
          ? 'Connected'
          : twilioStatus === null
            ? 'Unavailable'
            : 'Not configured',
        tone: twilioStatus?.connected ? 'success' : twilioStatus === null ? 'error' : 'warning',
        detail: twilioStatus?.connected
          ? `Active Twilio phone number: ${twilioStatus.phoneNumber}.`
          : twilioStatus === null
            ? 'ChefFlow could not read local Twilio configuration.'
            : 'No active local Twilio credential was found. SMS will not ingest automatically.',
        meta: twilioStatus?.connected
          ? 'Inbound SMS can be routed through the configured Twilio webhook.'
          : 'This is not connected unless local Twilio credentials exist.',
        href: '/settings/integrations',
        actionLabel: 'Manage',
      },
      {
        label: 'Social DMs',
        status: 'Manual only',
        tone: 'info',
        detail:
          'Instagram, Facebook, and other social DMs are not connected to automatic inbox ingestion here.',
        meta: 'Capture social messages manually instead of treating them as synced channels.',
      },
      {
        label: 'Triage pipeline',
        status: stats.total > 0 || stagedSignalCount > 0 ? 'Active' : 'Quiet',
        tone: stats.needs_attention > 0 || stagedSignalCount > 0 ? 'warning' : 'info',
        detail: `${stats.needs_attention} need attention, ${stats.unlinked} unlinked, ${stats.snoozed} snoozed.`,
        meta: `${stagedSignalCount} staged contact signal${
          stagedSignalCount === 1 ? '' : 's'
        } awaiting confirmation. ${calendarEvents.length} calendar event${
          calendarEvents.length === 1 ? '' : 's'
        } loaded for this month.`,
      },
      {
        label: 'Calendar context',
        status: gmailConnection.calendar.connected ? 'Connected' : 'Not connected',
        tone: gmailConnection.calendar.connected
          ? gmailConnection.calendar.health === 'error'
            ? 'warning'
            : 'success'
          : 'info',
        detail: gmailConnection.calendar.connected
          ? `${gmailConnection.calendar.calendarCount} Google calendar${
              gmailConnection.calendar.calendarCount === 1 ? '' : 's'
            } available for scheduling context.`
          : 'Calendar is not required for inbox ingestion, but it helps connect messages to schedule context.',
        meta:
          gmailConnection.calendar.healthDetail ||
          `${gmailConnection.calendar.conflictCount} conflict${
            gmailConnection.calendar.conflictCount === 1 ? '' : 's'
          } detected in the loaded calendar window.`,
        href: '/settings/integrations',
        actionLabel: gmailConnection.calendar.connected ? 'Manage' : 'Connect',
      },
    ]

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
              Reconnect in Settings
            </Link>
          </div>
        )}

        <InboxCoveragePanel rows={coverageRows} />

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
            Reconnect in Settings
          </Link>
        </div>
      )}

      <InboxFeed items={items} stats={stats} />
    </div>
  )
}
