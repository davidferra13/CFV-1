'use client'

import { useState } from 'react'
import { Apple, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getMenuNutritionalSummary, type MenuNutritionalSummary } from '@/lib/ai/menu-nutritional'
import { toast } from 'sonner'

export function MenuNutritionalPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<MenuNutritionalSummary | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await getMenuNutritionalSummary(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nutritional analysis failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-stone-700">Menu Nutritional Summary</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Estimating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Estimate Nutrition
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Per-serving nutritional estimates for the full proposed menu.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Apple className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-stone-700">Menu Nutrition</span>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {result.totalCaloriesPerGuest !== null && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Calories', value: result.totalCaloriesPerGuest, unit: 'kcal' },
            { label: 'Protein', value: result.totalProteinG, unit: 'g' },
            { label: 'Carbs', value: result.totalCarbsG, unit: 'g' },
            { label: 'Fat', value: result.totalFatG, unit: 'g' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-stone-50 rounded p-2">
              <div className="text-base font-semibold text-stone-800">{value ?? '?'}</div>
              <div className="text-[10px] text-stone-500">{unit}</div>
              <div className="text-[10px] text-stone-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      {result.courses.length > 0 && (
        <div className="space-y-1">
          {result.courses.map((course, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs border-b border-stone-50 py-1 last:border-0"
            >
              <span className="text-stone-500 w-20 flex-shrink-0 text-[11px]">
                {course.courseName}
              </span>
              <span className="text-stone-700 flex-1">{course.dishName}</span>
              <span className="text-stone-500">{course.calories ?? '?'} kcal</span>
              <span
                className={`text-[10px] px-1 rounded ${course.confidence === 'high' ? 'bg-green-50 text-green-700' : course.confidence === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-500'}`}
              >
                {course.confidence}
              </span>
            </div>
          ))}
        </div>
      )}

      {result.highlights.length > 0 && (
        <div className="text-xs text-stone-600 space-y-0.5">
          {result.highlights.map((h, i) => (
            <div key={i}>• {h}</div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-400">{result.disclaimer}</p>
    </div>
  )
}
