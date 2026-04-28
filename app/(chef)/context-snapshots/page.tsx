import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getContextSnapshotById,
  listContextSnapshots,
  type ContextSnapshotRecord,
  type ContextSnapshotSource,
} from '@/lib/context-snapshots/service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Archive, CalendarDays, Clock, Eye, History, Mail, Settings } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Context Snapshots' }
export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: {
    source?: string
    snapshot?: string
  }
}

const SOURCE_OPTIONS: Array<{ value: ContextSnapshotSource | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'calendar_page', label: 'Calendar' },
  { value: 'integration_callback', label: 'Integrations' },
  { value: 'scheduled_messages_cron', label: 'Scheduled messages' },
]

function normalizeSource(source?: string): ContextSnapshotSource | 'all' {
  if (
    source === 'calendar_page' ||
    source === 'integration_callback' ||
    source === 'scheduled_messages_cron'
  ) {
    return source
  }
  return 'all'
}

function parseSnapshotId(value?: string): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function sourceLabel(snapshot: ContextSnapshotRecord): string {
  const source = snapshot.snapshot.source
  if (source === 'calendar_page') return 'Calendar'
  if (source === 'integration_callback') return 'Integration'
  if (source === 'scheduled_messages_cron') return 'Scheduled message'
  return 'Snapshot'
}

function sourceIcon(snapshot: ContextSnapshotRecord) {
  const source = snapshot.snapshot.source
  if (source === 'calendar_page') return CalendarDays
  if (source === 'integration_callback') return Settings
  if (source === 'scheduled_messages_cron') return Mail
  return Archive
}

function sourceVariant(snapshot: ContextSnapshotRecord): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const source = snapshot.snapshot.source
  if (source === 'calendar_page') return 'info'
  if (source === 'integration_callback') return 'warning'
  if (source === 'scheduled_messages_cron') return 'success'
  return 'default'
}

function summaryText(snapshot: ContextSnapshotRecord): string {
  const summary = snapshot.snapshot.summary
  return typeof summary === 'string' && summary.trim() ? summary : 'Captured context snapshot'
}

function payloadRecord(snapshot: ContextSnapshotRecord): Record<string, unknown> {
  const payload = snapshot.snapshot.payload
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}
}

function compactValue(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (Array.isArray(value)) return `${value.length} items`
  if (typeof value === 'object') return `${Object.keys(value as Record<string, unknown>).length} fields`
  return String(value)
}

export default async function ContextSnapshotsPage({ searchParams }: PageProps) {
  const user = await requireChef()
  const activeSource = normalizeSource(searchParams?.source)
  const selectedSnapshotId = parseSnapshotId(searchParams?.snapshot)

  const [snapshots, selectedSnapshot] = await Promise.all([
    listContextSnapshots({ tenantId: user.tenantId!, source: activeSource, limit: 75 }),
    selectedSnapshotId ? getContextSnapshotById(user.tenantId!, selectedSnapshotId) : null,
  ])

  const latest = selectedSnapshot ?? snapshots[0] ?? null
  const latestPayload = latest ? payloadRecord(latest) : {}

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-500" />
            <h1 className="text-2xl font-bold text-stone-100">Context Snapshots</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-stone-400">
            Review captured operating context from calendar loads, integration callbacks, and
            scheduled-message runs. Snapshots are append-only and read-only here.
          </p>
        </div>
        <Button href="/calendar" variant="secondary" size="sm">
          <CalendarDays className="h-4 w-4" />
          Capture Calendar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SOURCE_OPTIONS.map((option) => {
          const active = activeSource === option.value
          const href =
            option.value === 'all'
              ? '/context-snapshots'
              : `/context-snapshots?source=${option.value}`
          return (
            <Link
              key={option.value}
              href={href}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                active
                  ? 'border-brand-600 bg-brand-950/50 text-brand-300'
                  : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600 hover:text-stone-200'
              }`}
            >
              {option.label}
            </Link>
          )
        })}
      </div>

      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Archive className="mx-auto h-10 w-10 text-stone-600" />
            <h2 className="mt-3 text-base font-semibold text-stone-200">No snapshots yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
              Open the calendar, complete an integration callback, or let scheduled messages run to
              start capturing context.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <div className="space-y-3">
            {snapshots.map((snapshot) => {
              const Icon = sourceIcon(snapshot)
              const active = latest?.id === snapshot.id
              return (
                <Link
                  key={snapshot.id}
                  href={`/context-snapshots?source=${activeSource}&snapshot=${snapshot.id}`}
                  className={`block rounded-lg border p-4 transition-colors ${
                    active
                      ? 'border-brand-600 bg-brand-950/30'
                      : 'border-stone-800 bg-stone-900/70 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-800">
                        <Icon className="h-4 w-4 text-stone-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-stone-100">
                            {summaryText(snapshot)}
                          </p>
                          <Badge variant={sourceVariant(snapshot)}>{sourceLabel(snapshot)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          Entity {snapshot.entity_type} / {snapshot.entity_id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-stone-500">
                      <Clock className="ml-auto mb-1 h-3.5 w-3.5" />
                      {formatDateTime(snapshot.created_at)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Snapshot Detail</CardTitle>
                {latest ? (
                  <Button
                    href={`/api/context-snapshots/${latest.id}`}
                    variant="ghost"
                    size="sm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Eye className="h-4 w-4" />
                    JSON
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {latest ? (
                <>
                  <div>
                    <Badge variant={sourceVariant(latest)}>{sourceLabel(latest)}</Badge>
                    <p className="mt-2 text-sm font-medium text-stone-100">
                      {summaryText(latest)}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Captured {formatDateTime(latest.created_at)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(latestPayload).slice(0, 12).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-4 rounded-lg bg-stone-900 px-3 py-2"
                      >
                        <span className="text-xs font-medium text-stone-500">{key}</span>
                        <span className="max-w-[220px] text-right text-xs text-stone-200">
                          {compactValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Restore policy
                    </p>
                    <p className="mt-1 text-sm text-stone-400">
                      This view exposes the captured state for review and recovery reference. It
                      does not overwrite live records.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-stone-500">Select a snapshot to inspect its payload.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
