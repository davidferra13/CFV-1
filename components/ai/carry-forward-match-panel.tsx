'use client'

import { useState } from 'react'
import { Recycle, Loader2, Sparkles, DollarSign } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  matchCarryForwardToEvent,
  type CarryForwardMatchResult,
} from '@/lib/ai/carry-forward-match'
import { toast } from 'sonner'

function formatDollars(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

const MATCH_COLORS: Record<string, string> = {
  exact: 'bg-green-950 border-green-200',
  partial: 'bg-blue-950 border-blue-200',
  substitution: 'bg-amber-950 border-amber-200',
}

export function CarryForwardMatchPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<CarryForwardMatchResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await matchCarryForwardToEvent(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Matching failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Recycle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-stone-300">Carry-Forward Match</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Matching...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Find Matches
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Matches leftover ingredients from previous events to this event's recipe needs.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Recycle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-stone-300">Carry-Forward Matches</span>
          <Badge variant={result.matches.length > 0 ? 'success' : 'default'}>
            {result.matches.length} found
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {result.totalEstimatedSavingsCents > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
              <DollarSign className="w-3 h-3" />
              {formatDollars(result.totalEstimatedSavingsCents)} est. savings
            </span>
          )}
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-stone-400">{result.summary}</p>

      {result.matches.length > 0 && (
        <div className="space-y-1.5">
          {result.matches.map((match, i) => (
            <div
              key={i}
              className={`border rounded p-2 space-y-0.5 ${MATCH_COLORS[match.matchType]}`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-stone-300">{match.leftoverItem}</span>
                <span className="text-stone-400">→</span>
                <span className="text-stone-400">{match.neededIngredient}</span>
                <span
                  className={`text-[10px] px-1 rounded ml-auto ${match.matchType === 'exact' ? 'bg-green-900 text-green-700' : match.matchType === 'partial' ? 'bg-blue-900 text-blue-700' : 'bg-amber-900 text-amber-700'}`}
                >
                  {match.matchType}
                </span>
              </div>
              {match.estimatedSavingsCents && (
                <div className="text-[11px] text-green-700">
                  Est. savings: {formatDollars(match.estimatedSavingsCents)}
                </div>
              )}
              {match.notes && <div className="text-[11px] text-stone-500">{match.notes}</div>}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        Auto match · Verify quantities and freshness before using carry-forward items
      </p>
    </div>
  )
}
