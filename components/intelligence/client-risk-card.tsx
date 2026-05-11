'use client'

// Client Risk Card - expandable card for individual client risk

import { useState, useTransition } from 'react'
import type { ClientRiskReport } from '@/lib/intelligence/client-risk'
import { RiskScoreGauge } from './risk-score-gauge'
import { RiskFactorList } from './risk-factor-list'
import { dismissClientRisk, undismissClientRisk } from '@/lib/intelligence/client-risk-actions'

const LEVEL_STYLES = {
  critical: { border: 'border-red-800/50', bg: 'hover:bg-red-950/20', badge: 'bg-red-900/60 text-red-300' },
  high: { border: 'border-orange-800/50', bg: 'hover:bg-orange-950/20', badge: 'bg-orange-900/60 text-orange-300' },
  medium: { border: 'border-amber-800/50', bg: 'hover:bg-amber-950/20', badge: 'bg-amber-900/60 text-amber-300' },
  low: { border: 'border-stone-700', bg: 'hover:bg-stone-800/50', badge: 'bg-stone-700 text-stone-300' },
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface ClientRiskCardProps {
  report: ClientRiskReport
}

export function ClientRiskCard({ report }: ClientRiskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(report.dismissed)
  const [pending, startTransition] = useTransition()
  const style = LEVEL_STYLES[report.riskLevel]
  const topFactor = report.factors[0]

  function handleDismiss() {
    const prev = dismissed
    setDismissed(!dismissed)
    startTransition(async () => {
      try {
        const result = dismissed
          ? await undismissClientRisk(report.clientId)
          : await dismissClientRisk(report.clientId)
        if (!result.success) {
          setDismissed(prev) // rollback
        }
      } catch {
        setDismissed(prev) // rollback
      }
    })
  }

  if (dismissed && !expanded) {
    return (
      <div
        className="rounded-lg border border-stone-700/50 bg-stone-900/30 px-4 py-3 flex items-center justify-between opacity-60 cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <RiskScoreGauge score={report.riskScore} level={report.riskLevel} size="sm" />
          <div className="min-w-0">
            <p className="text-sm text-stone-400 line-through truncate">{report.clientName}</p>
            <p className="text-xs text-stone-500">Dismissed</p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleDismiss() }}
          disabled={pending}
          className="text-xs text-stone-500 hover:text-stone-300 shrink-0"
        >
          Restore
        </button>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border ${style.border} bg-stone-900/50 transition-colors`}>
      {/* Collapsed view */}
      <button
        className={`w-full text-left px-4 py-3 flex items-center gap-3 ${style.bg} rounded-lg transition-colors`}
        onClick={() => setExpanded(!expanded)}
      >
        <RiskScoreGauge score={report.riskScore} level={report.riskLevel} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-stone-100 truncate">{report.clientName}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.badge}`}>
              {report.riskLevel.toUpperCase()}
            </span>
          </div>
          {topFactor && (
            <p className="text-xs text-stone-400 mt-0.5 truncate">{topFactor.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-stone-500">{pluralize(report.daysSinceContact, 'day')} silent</p>
          <p className="text-xs text-stone-600">{pluralize(report.totalEvents, 'event')}</p>
        </div>
        <svg
          className={`w-4 h-4 text-stone-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-stone-800">
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Last Contact</p>
              <p className="text-sm text-stone-200">{formatDate(report.lastContact)}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Last Event</p>
              <p className="text-sm text-stone-200">{formatDate(report.lastEventDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Avg Cadence</p>
              <p className="text-sm text-stone-200">
                {report.avgBookingCadenceDays ? `Every ${report.avgBookingCadenceDays}d` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Expected Next</p>
              <p className="text-sm text-stone-200">{formatDate(report.expectedNextBooking)}</p>
            </div>
          </div>

          {/* Risk factors */}
          <div>
            <p className="text-xs text-stone-500 mb-2 font-medium">Risk Factors</p>
            <RiskFactorList factors={report.factors} />
          </div>

          {/* Recommendation */}
          <div className="rounded-lg border border-brand-800/30 bg-brand-950/10 px-3 py-2">
            <p className="text-xs text-stone-500 mb-0.5">Recommended action</p>
            <p className="text-sm text-stone-200">{report.recommendation}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <a
              href={`/clients/${report.clientId}`}
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-500 transition-colors"
            >
              View Client
            </a>
            <a
              href={`/clients/${report.clientId}/communication`}
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md border border-stone-600 text-stone-300 hover:bg-stone-800 transition-colors"
            >
              Reach Out
            </a>
            <button
              onClick={handleDismiss}
              disabled={pending}
              className="ml-auto text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              {dismissed ? 'Restore' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
