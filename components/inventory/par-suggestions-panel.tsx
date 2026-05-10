'use client'

// ParSuggestionsPanel - Recommends par levels based on recipe usage frequency and event density.
// Loads suggestions on mount, shows top 10 sorted by gap, allows applying per row.

import { useEffect, useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Check, TrendingUp } from '@/components/ui/icons'
import {
  getParLevelSuggestions,
  applyParSuggestion,
  type ParSuggestion,
} from '@/lib/inventory/par-suggestions-actions'
import { toast } from 'sonner'

export function ParSuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<ParSuggestion[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getParLevelSuggestions()
      .then((data) => setSuggestions(data))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-stone-700 rounded w-1/3" />
            <div className="h-3 bg-stone-800 rounded w-2/3" />
            <div className="h-3 bg-stone-800 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            Par Level Suggestions
          </CardTitle>
          <Badge variant="default">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Based on recipe usage and event frequency over the last 90 days. Safety buffer: 1.5x
          weekly average.
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-stone-800">
          {suggestions.map((suggestion) => (
            <SuggestionRow
              key={suggestion.ingredientId}
              suggestion={suggestion}
              applied={appliedIds.has(suggestion.ingredientId)}
              onApplied={() => setAppliedIds((prev) => new Set([...prev, suggestion.ingredientId]))}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SuggestionRow({
  suggestion,
  applied,
  onApplied,
}: {
  suggestion: ParSuggestion
  applied: boolean
  onApplied: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleApply() {
    startTransition(async () => {
      try {
        const result = await applyParSuggestion(suggestion.ingredientId, suggestion.suggestedPar)
        if (result.success) {
          onApplied()
          toast.success(
            `Par level set to ${suggestion.suggestedPar} for ${suggestion.ingredientName}`
          )
        } else {
          toast.error(result.error || 'Failed to apply par level')
        }
      } catch {
        toast.error('Failed to apply par level')
      }
    })
  }

  const hasNoPar = suggestion.currentPar === null

  return (
    <div className="px-6 py-3 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-stone-100 truncate">{suggestion.ingredientName}</p>
          {hasNoPar && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
              No par
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500">
          <span>
            Current:{' '}
            <span className={hasNoPar ? 'text-amber-400' : 'text-stone-300'}>
              {suggestion.currentPar != null
                ? `${suggestion.currentPar} ${suggestion.unit}`
                : 'None'}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            Suggested:{' '}
            <span className="text-emerald-400 font-medium">
              {suggestion.suggestedPar} {suggestion.unit}
            </span>
          </span>
        </div>
        <p className="text-[11px] text-stone-600 mt-0.5">{suggestion.reason}</p>
      </div>

      <div className="ml-4 flex-shrink-0">
        {applied ? (
          <Badge variant="success" className="text-xs">
            <Check className="h-3 w-3 mr-1" />
            Applied
          </Badge>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleApply}
            loading={isPending}
            disabled={isPending}
          >
            Apply
          </Button>
        )}
      </div>
    </div>
  )
}
