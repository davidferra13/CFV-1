'use client'

import { useState } from 'react'
import { ShieldAlert, CheckCircle, AlertTriangle, Loader2, Sparkles } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getEventAllergenRisk, type AllergenRiskResult } from '@/lib/ai/allergen-risk'
import { toast } from 'sonner'
import { AiSourceBadge } from './ai-source-badge'

const RISK_COLORS: Record<string, string> = {
  safe: 'text-green-700 bg-green-950',
  may_contain: 'text-amber-700 bg-amber-950',
  contains: 'text-red-700 bg-red-950',
  unknown: 'text-stone-500 bg-stone-800',
}

const RISK_LABELS: Record<string, string> = {
  safe: 'Safe',
  may_contain: 'May Contain',
  contains: 'Contains',
  unknown: 'Unknown',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-green-400',
  medium: 'text-amber-400',
  low: 'text-red-400',
}

export function AllergenRiskPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<
    (AllergenRiskResult & { _aiSource?: 'formula' | 'ai' }) | null
  >(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await getEventAllergenRisk(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Allergen analysis failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-stone-300">Allergen Risk Matrix</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Scan every dish against every guest's dietary restrictions and allergies.
        </p>
      </div>
    )
  }

  const hasIssues = result.rows.some(
    (r) => r.riskLevel === 'contains' || r.riskLevel === 'may_contain'
  )

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-stone-300">Allergen Risk Matrix</span>
          <Badge variant={hasIssues ? 'error' : 'success'}>
            {hasIssues ? 'Issues Found' : 'All Clear'}
          </Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Re-run'}
        </Button>
      </div>

      {result.safetyFlags.length > 0 && (
        <div className="space-y-1">
          {result.safetyFlags.map((flag, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-red-700 bg-red-950 rounded p-2"
            >
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {flag}
            </div>
          ))}
        </div>
      )}

      {result.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-800">
                <th className="text-left py-1 pr-3 text-stone-500 font-medium">Dish</th>
                <th className="text-left py-1 pr-3 text-stone-500 font-medium">Guest</th>
                <th className="text-left py-1 pr-3 text-stone-500 font-medium">Risk</th>
                <th className="text-left py-1 text-stone-500 font-medium">Allergen</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-b border-stone-50">
                  <td className="py-1 pr-3 text-stone-300">{row.dish}</td>
                  <td className="py-1 pr-3 text-stone-400">{row.guestName}</td>
                  <td className="py-1 pr-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${RISK_COLORS[row.riskLevel]}`}
                    >
                      {RISK_LABELS[row.riskLevel]}
                    </span>
                  </td>
                  <td className="py-1 text-stone-500">{row.triggerAllergen ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        <AiSourceBadge source={result._aiSource} />
        {result._aiSource ? ' · ' : ''}
        Confidence:{' '}
        <span className={CONFIDENCE_COLORS[result.confidence] ?? 'text-stone-400'}>
          {result.confidence}
        </span>
        {result.confidence === 'low' && ' (unverified)'}
        {' · '}Always verify allergens with client before service
      </p>
    </div>
  )
}
