'use client'

// Client Risk Radar List - client-side filtering and display

import { useState } from 'react'
import type { ClientRiskReport, RiskLevel } from '@/lib/intelligence/client-risk'
import { ClientRiskCard } from '@/components/intelligence/client-risk-card'

interface ClientRiskRadarListProps {
  reports: ClientRiskReport[]
}

const FILTER_OPTIONS: { label: string; value: RiskLevel | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

export function ClientRiskRadarList({ reports }: ClientRiskRadarListProps) {
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [showDismissed, setShowDismissed] = useState(false)

  const filtered = reports.filter((r) => {
    if (filter !== 'all' && r.riskLevel !== filter) return false
    if (!showDismissed && r.dismissed) return false
    return true
  })

  const dismissedCount = reports.filter((r) => r.dismissed).length

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-6 text-center">
        <p className="text-sm text-emerald-300">
          No clients with risk signals detected. All relationships look healthy.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-stone-800/50 rounded-lg p-0.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === opt.value
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {dismissedCount > 0 && (
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            {showDismissed ? 'Hide' : 'Show'} dismissed ({dismissedCount})
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((report) => (
          <ClientRiskCard key={report.clientId} report={report} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-6 text-center">
          <p className="text-sm text-stone-500">No clients match this filter.</p>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-stone-600 text-center">
        Showing {filtered.length} of {reports.length} clients with risk signals
      </p>
    </div>
  )
}
