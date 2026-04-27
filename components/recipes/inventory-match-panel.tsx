'use client'

// Inventory Match Panel
// Shows recipes ranked by how many ingredients the chef already has.
// "What can I make with what I have?"

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  getInventoryMatches,
  type InventoryMatchResult,
} from '@/lib/recipes/inventory-match-actions'

export function InventoryMatchPanel() {
  const [result, setResult] = useState<InventoryMatchResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'all' | 'ready' | 'almost'>('all')

  function runMatch() {
    startTransition(async () => {
      try {
        const data = await getInventoryMatches()
        setResult(data)
        if (data.error) {
          toast.warning(data.error)
        } else {
          const ready = data.matches.filter((m) => m.matchPct === 100).length
          toast.success(
            `${ready} recipe${ready !== 1 ? 's' : ''} ready to make with current inventory`
          )
        }
      } catch {
        toast.error('Failed to match inventory')
      }
    })
  }

  if (!result) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-200">Inventory Match</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Find recipes you can make with ingredients on hand
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={runMatch} disabled={isPending}>
            {isPending ? 'Matching...' : 'What Can I Make?'}
          </Button>
        </div>
      </Card>
    )
  }

  if (result.error && result.matches.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-stone-500">{result.error}</p>
      </Card>
    )
  }

  const filtered = result.matches.filter((m) => {
    if (filter === 'ready') return m.matchPct === 100
    if (filter === 'almost') return m.matchPct >= 70 && m.matchPct < 100
    return true
  })

  const readyCount = result.matches.filter((m) => m.matchPct === 100).length
  const almostCount = result.matches.filter((m) => m.matchPct >= 70 && m.matchPct < 100).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Inventory Match
            <span className="text-xs text-stone-500 font-normal ml-2">
              {result.inventorySize} ingredients, {result.totalRecipes} recipes
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={runMatch} disabled={isPending}>
            {isPending ? 'Matching...' : 'Refresh'}
          </Button>
        </div>
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-stone-700 text-stone-200'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            All ({result.matches.length})
          </button>
          <button
            onClick={() => setFilter('ready')}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              filter === 'ready'
                ? 'bg-emerald-900/50 text-emerald-300'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Ready ({readyCount})
          </button>
          <button
            onClick={() => setFilter('almost')}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              filter === 'almost'
                ? 'bg-amber-900/50 text-amber-300'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Almost ({almostCount})
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-4">
            {filter === 'ready'
              ? 'No recipes fully covered by your inventory'
              : 'No matches in this category'}
          </p>
        ) : (
          filtered.slice(0, 20).map((match) => (
            <Link
              key={match.recipeId}
              href={`/recipes/${match.recipeId}`}
              className="block rounded-lg border border-stone-800 p-3 hover:border-stone-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-200 truncate">{match.recipeName}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {match.matchedIngredients.length}/{match.totalIngredients} ingredients
                    {match.servings ? ` · ${match.servings} servings` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {match.matchPct === 100 ? (
                    <Badge variant="success">Ready</Badge>
                  ) : match.matchPct >= 70 ? (
                    <Badge variant="warning">{match.matchPct}%</Badge>
                  ) : (
                    <Badge variant="default">{match.matchPct}%</Badge>
                  )}
                </div>
              </div>
              {match.missingIngredients.length > 0 && match.matchPct >= 50 && (
                <p className="text-[10px] text-stone-600 mt-1 truncate">
                  Missing: {match.missingIngredients.join(', ')}
                </p>
              )}
            </Link>
          ))
        )}
        {filtered.length > 20 && (
          <p className="text-xs text-stone-600 text-center pt-2">
            +{filtered.length - 20} more recipes
          </p>
        )}
      </CardContent>
    </Card>
  )
}
