import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getClientStrategyReadinessReport } from '@/lib/clients/client-strategy-ops'
import type { ClientStrategyPriority } from '@/lib/clients/client-strategy-brief'

export const metadata: Metadata = { title: 'Client Strategy Readiness' }

type ReadinessFilter =
  | 'all'
  | 'missing_safety'
  | 'stale_profile'
  | 'low_readiness'
  | 'no_preferences'
  | 'no_contact_method'

const FILTERS: Array<{ key: ReadinessFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'missing_safety', label: 'Missing safety' },
  { key: 'stale_profile', label: 'Stale profile' },
  { key: 'low_readiness', label: 'Low readiness' },
  { key: 'no_preferences', label: 'No preferences' },
  { key: 'no_contact_method', label: 'No contact method' },
]

function priorityVariant(
  priority: ClientStrategyPriority
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (priority === 'critical' || priority === 'high') return 'error'
  if (priority === 'medium') return 'warning'
  return 'success'
}

function SummaryTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-stone-100">{value}</p>
        <p className="mt-1 text-sm text-stone-400">{detail}</p>
      </CardContent>
    </Card>
  )
}

export default async function ClientStrategyReadinessPage({
  searchParams,
}: {
  searchParams?: { filter?: string }
}) {
  const report = await getClientStrategyReadinessReport()
  const activeFilter = normalizeFilter(searchParams?.filter)
  const rows = report.rows.filter((row) => matchesFilter(row, activeFilter))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          Back to clients
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Client Strategy Readiness</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-400">
          Portfolio data quality for strategy briefs, personalization, safety review, and client
          confirmation work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Clients"
          value={String(report.summary.totalClients)}
          detail="Profiles included"
        />
        <SummaryTile
          label="Average score"
          value={`${report.summary.averageScore}/100`}
          detail="Across client records"
        />
        <SummaryTile
          label="High risk"
          value={String(report.summary.highRiskClients)}
          detail="Critical or high readiness gaps"
        />
        <SummaryTile
          label="Missing safety"
          value={String(report.summary.missingSafetyClients)}
          detail="Allergy or dietary gaps"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Readiness Queue</CardTitle>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <Link
                  key={filter.key}
                  href={
                    filter.key === 'all'
                      ? '/clients/strategy-readiness'
                      : `/clients/strategy-readiness?filter=${filter.key}`
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    activeFilter === filter.key
                      ? 'border-brand-700 bg-brand-950/60 text-brand-200'
                      : 'border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-stone-400">No clients matched this readiness filter.</p>
          ) : (
            rows.map((row) => (
              <Link
                key={row.clientId}
                href={`/clients/${row.clientId}/relationship`}
                className="block rounded-lg border border-stone-800 bg-stone-950/30 p-4 transition-colors hover:border-brand-800/60 hover:bg-stone-900"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-stone-100">{row.clientName}</h2>
                      <Badge variant={priorityVariant(row.priority)}>{row.priority}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-stone-400">
                      {row.knownPreferenceCount} known preference facts
                    </p>
                  </div>
                  <p className="text-xl font-semibold text-stone-100">{row.score}/100</p>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Missing
                    </p>
                    <p className="mt-1 text-sm text-stone-300">
                      {row.missingFields.length > 0 ? row.missingFields.join(', ') : 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Stale
                    </p>
                    <p className="mt-1 text-sm text-stone-300">
                      {row.staleFields.length > 0 ? row.staleFields.join(', ') : 'None'}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function normalizeFilter(value?: string): ReadinessFilter {
  return FILTERS.some((filter) => filter.key === value) ? (value as ReadinessFilter) : 'all'
}

function matchesFilter(
  row: Awaited<ReturnType<typeof getClientStrategyReadinessReport>>['rows'][number],
  filter: ReadinessFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'missing_safety') {
    return (
      row.missingFields.includes('allergies') || row.missingFields.includes('dietary restrictions')
    )
  }
  if (filter === 'stale_profile') return row.staleFields.length > 0
  if (filter === 'low_readiness') return row.score < 65
  if (filter === 'no_preferences') return row.knownPreferenceCount === 0
  if (filter === 'no_contact_method') {
    return row.missingFields.includes('preferred contact method')
  }
  return true
}
