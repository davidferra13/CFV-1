'use client'

import { useState } from 'react'
import { TrendingUp, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getPricingIntelligence,
  type PricingIntelligenceResult,
} from '@/lib/ai/pricing-intelligence'
import { toast } from 'sonner'

function formatDollars(cents: number) {
  return (
    '$' +
    (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  )
}

export function PricingIntelligencePanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<PricingIntelligenceResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await getPricingIntelligence(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Pricing analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const positionColor =
    result?.marketPosition === 'above_average'
      ? 'success'
      : result?.marketPosition === 'at_average'
        ? 'info'
        : 'warning'

  if (!result) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-700">Pricing Intelligence</span>
            <Badge variant="info">Auto</Badge>
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
                Analyze Pricing
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Optimal price range based on your historical events and this event's profile.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-700">Pricing Intelligence</span>
          <Badge variant={positionColor as any}>{result.marketPosition.replace('_', ' ')}</Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {result.underbiddingRisk && result.underbiddingWarning && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {result.underbiddingWarning}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-stone-50 rounded">
          <div className="text-lg font-semibold text-stone-800">
            {formatDollars(result.suggestedMinCents)}
          </div>
          <div className="text-[11px] text-stone-500">Minimum</div>
        </div>
        <div className="text-center p-2 bg-brand-50 rounded border border-brand-200">
          <div className="text-lg font-semibold text-brand-700">
            {formatDollars(result.suggestedPerHeadCents)}
            <span className="text-sm">/head</span>
          </div>
          <div className="text-[11px] text-stone-500">Per Guest</div>
        </div>
        <div className="text-center p-2 bg-stone-50 rounded">
          <div className="text-lg font-semibold text-stone-800">
            {formatDollars(result.suggestedMaxCents)}
          </div>
          <div className="text-[11px] text-stone-500">Maximum</div>
        </div>
      </div>

      <p className="text-xs text-stone-600">{result.rationale}</p>
      <p className="text-[11px] text-stone-400">
        Based on {result.comparableEvents} comparable events · Confidence: {result.confidence} ·
        Suggested only
      </p>
    </div>
  )
}
