'use client'

import { useState } from 'react'
import { ShoppingCart, Loader2, Bot, AlertTriangle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  consolidateGroceryList,
  type GroceryConsolidationResult,
} from '@/lib/ai/grocery-consolidation'
import { toast } from 'sonner'

const SECTION_ICONS: Record<string, string> = {
  Produce: '🥦',
  Proteins: '🥩',
  Dairy: '🧀',
  Pantry: '🫙',
  Bakery: '🍞',
  Alcohol: '🍷',
  Supplies: '🧴',
}

export function GroceryConsolidationPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<GroceryConsolidationResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await consolidateGroceryList(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Consolidation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Consolidated Grocery List</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Consolidating...
              </>
            ) : (
              <>
                <Bot className="w-3 h-3 mr-1" />
                Consolidate
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Merges all recipe ingredients, removes duplicates, groups by store section, flags allergen
          conflicts.
        </p>
      </div>
    )
  }

  const sections = Object.keys(result.bySection)

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Grocery List</span>
          <Badge variant="info">{result.ingredients.length} items</Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {result.dietaryFlags.length > 0 && (
        <div className="space-y-1">
          {result.dietaryFlags.map((flag, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950 border border-amber-200 rounded p-2"
            >
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {flag}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section}>
            <div className="text-xs font-medium text-stone-500 mb-1">
              {SECTION_ICONS[section] ?? '📦'} {section}
            </div>
            <div className="space-y-0.5">
              {result.bySection[section].map((ing, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                  <span className="text-stone-300 font-medium">
                    {ing.totalQuantity} {ing.unit}
                  </span>
                  <span className="text-stone-400">{ing.name}</span>
                  {ing.substitution && (
                    <span className="text-amber-600 text-[11px]">→ sub: {ing.substitution}</span>
                  )}
                  <span className="text-stone-400 text-[11px] ml-auto">
                    {ing.usedIn.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {result.shoppingNotes && (
        <div className="text-xs text-stone-400 bg-stone-800 rounded p-2">
          {result.shoppingNotes}
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        Auto draft · Verify quantities match your final recipe scaling
      </p>
    </div>
  )
}
