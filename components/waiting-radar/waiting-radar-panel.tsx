import Link from 'next/link'
import type { WaitingRadarItem, WaitingRadarSummary } from '@/lib/waiting-radar/types'

interface WaitingRadarPanelProps {
  items: WaitingRadarItem[]
  summary: WaitingRadarSummary
  limit?: number
}

const RISK_LABELS: Record<WaitingRadarItem['riskLevel'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function WaitingRadarPanel({ items, summary, limit = 5 }: WaitingRadarPanelProps) {
  const visibleItems = items.slice(0, limit)

  return (
    <section className="space-y-4" aria-labelledby="waiting-radar-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="waiting-radar-title" className="text-lg font-semibold text-slate-950">
            Waiting Radar
          </h2>
          <p className="text-sm text-slate-600">{emptyCopy(summary) ?? summaryCopy(summary)}</p>
        </div>
        {summary.total > 0 ? (
          <Link
            className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
            href="/waiting"
          >
            View all
          </Link>
        ) : null}
      </div>

      {summary.total > 0 ? (
        <div className="grid grid-cols-4 gap-2 text-sm">
          <Stat label="Overdue" value={summary.overdue} />
          <Stat label="Due soon" value={summary.dueSoon} />
          <Stat label="Client" value={summary.waitingOnClient} />
          <Stat label="System" value={summary.waitingOnSystem} />
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        <ul className="divide-y divide-slate-200">
          {visibleItems.map((item) => (
            <li key={item.id} className="py-3">
              <Link
                className="block rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                href={item.proofHref}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Waiting on {item.waitingOn}: {item.waitingReason}
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700">
                    {RISK_LABELS[item.riskLevel]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {item.followUpAt
                    ? `Follow up ${item.followUpAt.slice(0, 10)}`
                    : 'No follow-up set'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 p-2">
      <div className="text-base font-semibold text-slate-950">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function summaryCopy(summary: WaitingRadarSummary): string {
  return `${summary.total} waiting item${summary.total === 1 ? '' : 's'} with explicit follow-up paths.`
}

function emptyCopy(summary: WaitingRadarSummary): string | null {
  if (summary.emptyReason === 'no_source_data') {
    return 'No source data is connected to the waiting radar yet.'
  }

  if (summary.emptyReason === 'no_waiting_items') {
    return 'Nothing is waiting right now.'
  }

  return null
}
