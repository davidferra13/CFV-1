'use client'

import { useState } from 'react'
import { ChefHat, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { scaleRecipeWithAI, type ScaledRecipe } from '@/lib/ai/recipe-scaling'
import { toast } from 'sonner'

export function RecipeScalingPanel({
  recipeId,
  defaultServings = 4,
}: {
  recipeId: string
  defaultServings?: number
}) {
  const [result, setResult] = useState<ScaledRecipe | null>(null)
  const [loading, setLoading] = useState(false)
  const [targetServings, setTargetServings] = useState(defaultServings)

  async function run() {
    if (targetServings < 1) return
    setLoading(true)
    try {
      const data = await scaleRecipeWithAI(recipeId, targetServings)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scaling failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-surface border border-stone-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ChefHat className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Recipe Scaling</span>
          <Badge variant="info">Auto</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-500">Target servings:</label>
            <input
              type="number"
              min={1}
              max={500}
              value={targetServings}
              onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
              className="w-16 text-sm border border-stone-700 rounded px-2 py-1"
            />
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Scaling...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Auto Scale
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-2">
          Adjusts technique notes and seasoning — not just multiplying quantities.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">{result.recipeName}</span>
          <Badge variant="info">
            {result.originalServings} → {result.targetServings} servings
          </Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Re-scale'}
        </Button>
      </div>

      {result.yieldNote && <p className="text-xs text-stone-400">{result.yieldNote}</p>}

      {result.techniqueAdjustments.length > 0 && (
        <div className="bg-amber-950 border border-amber-200 rounded p-2">
          <div className="text-xs font-medium text-amber-800 mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Technique Changes
          </div>
          {result.techniqueAdjustments.map((t, i) => (
            <div key={i} className="text-xs text-amber-700">
              • {t}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stone-800">
              <th className="text-left py-1 pr-3 text-stone-500 font-medium">Ingredient</th>
              <th className="text-left py-1 pr-3 text-stone-500 font-medium">Original</th>
              <th className="text-left py-1 pr-3 text-stone-500 font-medium">Scaled</th>
              <th className="text-left py-1 text-stone-500 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {result.scaledIngredients.map((ing, i) => (
              <tr key={i} className="border-b border-stone-50">
                <td className="py-1 pr-3 text-stone-300">{ing.name}</td>
                <td className="py-1 pr-3 text-stone-500">
                  {ing.originalQuantity} {ing.unit}
                </td>
                <td className="py-1 pr-3 font-medium text-stone-200">
                  {ing.scaledQuantity} {ing.unit}
                </td>
                <td className="py-1 text-amber-600 text-[11px]">{ing.scalingNote ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.equipmentNotes.length > 0 && (
        <div>
          <div className="text-xs font-medium text-stone-400 mb-1">Equipment</div>
          {result.equipmentNotes.map((e, i) => (
            <div key={i} className="text-xs text-stone-400">
              • {e}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        Draft · Verify scaled quantities with your kitchen measurements
      </p>
    </div>
  )
}
