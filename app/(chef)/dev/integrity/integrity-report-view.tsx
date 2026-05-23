'use client'

import type { IntegrityReport, IntegrityCheck } from '@/lib/system-integrity/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

function statusColor(status: string): string {
  switch (status) {
    case 'pass': return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'fail': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'warn': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    default: return 'bg-stone-500/20 text-stone-400 border-stone-500/30'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pass': return 'PASS'
    case 'fail': return 'FAIL'
    case 'warn': return 'WARN'
    case 'skip': return 'SKIP'
    default: return status.toUpperCase()
  }
}

function healthColor(score: number): string {
  if (score >= 90) return 'text-green-400'
  if (score >= 70) return 'text-yellow-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case 'event_lifecycle': return 'Event Lifecycle'
    case 'financial': return 'Financial'
    case 'client_data': return 'Client Data'
    case 'hub_surfaces': return 'Hub Surfaces'
    case 'cascade_safety': return 'Cascade Safety'
    case 'data_consistency': return 'Data Consistency'
    default: return cat
  }
}

function CheckRow({ check }: { check: IntegrityCheck }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-stone-700 bg-stone-800/50 p-3">
      <Badge className={`shrink-0 text-[10px] ${statusColor(check.status)}`}>
        {statusLabel(check.status)}
      </Badge>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-200">{check.name}</span>
          <span className="text-[10px] text-stone-500">{categoryLabel(check.category)}</span>
        </div>
        <p className="text-xs text-stone-400 mt-0.5">{check.description}</p>
        {check.detail && (
          <p className="text-xs text-yellow-400/80 mt-1">{check.detail}</p>
        )}
        {check.affectedIds.length > 0 && (
          <p className="text-[10px] text-stone-500 mt-1 truncate">
            IDs: {check.affectedIds.slice(0, 5).join(', ')}
            {check.affectedIds.length > 5 && ` +${check.affectedIds.length - 5} more`}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-stone-500">{check.durationMs}ms</span>
    </div>
  )
}

export function IntegrityReportView({ report }: { report: IntegrityReport }) {
  const passChecks = report.checks.filter((c) => c.status === 'pass')
  const failChecks = report.checks.filter((c) => c.status === 'fail')
  const warnChecks = report.checks.filter((c) => c.status === 'warn')
  const skipChecks = report.checks.filter((c) => c.status === 'skip')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="border-stone-700 bg-stone-800/50 col-span-2 sm:col-span-1">
          <CardContent className="pt-4 text-center">
            <p className={`text-4xl font-bold ${healthColor(report.healthScore)}`}>
              {report.healthScore}
            </p>
            <p className="text-xs text-stone-500 mt-1">Health Score</p>
          </CardContent>
        </Card>
        <SummaryCard label="Checks" value={report.checks.length} color="text-stone-300" />
        <SummaryCard label="Critical" value={report.criticalCount} color="text-red-400" />
        <SummaryCard label="Warnings" value={report.warningCount} color="text-yellow-400" />
        <SummaryCard
          label="Scan Time"
          value={`${report.totalDurationMs}ms`}
          color="text-stone-400"
        />
      </div>

      {failChecks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-red-400 mb-2">
            Critical Issues ({failChecks.length})
          </h2>
          <div className="space-y-2">
            {failChecks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </div>
        </div>
      )}

      {warnChecks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-yellow-400 mb-2">
            Warnings ({warnChecks.length})
          </h2>
          <div className="space-y-2">
            {warnChecks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </div>
        </div>
      )}

      {passChecks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-green-400 mb-2">
            Passing ({passChecks.length})
          </h2>
          <div className="space-y-2">
            {passChecks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </div>
        </div>
      )}

      {skipChecks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-stone-500 mb-2">
            Skipped ({skipChecks.length})
          </h2>
          <div className="space-y-2">
            {skipChecks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-stone-600 text-right">
        Generated {new Date(report.generatedAt).toLocaleString()}
      </p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card className="border-stone-700 bg-stone-800/50">
      <CardContent className="pt-4 text-center">
        <p className={`text-2xl font-semibold ${color}`}>{value}</p>
        <p className="text-xs text-stone-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}
