'use client'

import { useState, useTransition } from 'react'
import { getMenuNutrition } from '@/lib/nutrition/nutrition-actions'
import type { MenuNutritionResult } from '@/lib/nutrition/nutrition-actions'
import { NutritionLabel } from './nutrition-label'

type MenuNutritionSummaryProps = {
  menuId: string
  menuName: string
}

/**
 * Aggregate nutrition summary for a full menu/meal.
 * Shows per-course breakdown, total meal calories and macros,
 * and dietary compliance indicators.
 */
export function MenuNutritionSummary({ menuId, menuName }: MenuNutritionSummaryProps) {
  const [data, setData] = useState<MenuNutritionResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  function handleLoad() {
    setLoadError(null)
    startTransition(async () => {
      try {
        const result = await getMenuNutrition(menuId)
        if (result.success && result.data) {
          setData(result.data)
          setLoaded(true)
        } else {
          setLoadError(result.error || 'Failed to load menu nutrition')
        }
      } catch {
        setLoadError('Failed to load menu nutrition')
      }
    })
  }

  if (!loaded) {
    return (
      <div className="rounded-lg border border-gray-200 p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Menu Nutrition Summary</h3>
        <p className="text-sm text-gray-500 mb-4">
          View aggregate nutrition across all courses and dishes
        </p>
        <button
          onClick={handleLoad}
          disabled={isPending}
          className="rounded-md bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? 'Loading...' : 'Analyze Menu Nutrition'}
        </button>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          onClick={handleLoad}
          className="mt-2 text-sm text-red-700 underline hover:text-red-900"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const totalCals = data.totalNutrients.calories

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Menu Nutrition: {data.menuName}</h3>
        <button
          onClick={handleLoad}
          disabled={isPending}
          className="text-xs text-brand-600 underline hover:text-brand-800"
        >
          Refresh
        </button>
      </div>

      {/* Top-level macro summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MacroCard label="Total Calories" value={`${Math.round(totalCals)}`} unit="kcal" />
        <MacroCard label="Protein" value={`${data.totalNutrients.protein_g}`} unit="g" />
        <MacroCard label="Carbs" value={`${data.totalNutrients.carbs_g}`} unit="g" />
        <MacroCard label="Fat" value={`${data.totalNutrients.fat_g}`} unit="g" />
      </div>

      {/* Macro ratio bar */}
      {totalCals > 0 && <MacroRatioBar nutrients={data.totalNutrients} />}

      {/* Dietary compliance indicators */}
      {data.dietaryIndicators.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Dietary Indicators</h4>
          <div className="flex flex-wrap gap-2">
            {data.dietaryIndicators.map((indicator) => (
              <div
                key={indicator.label}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  indicator.met
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
                title={indicator.description}
              >
                <span className="mr-1">{indicator.met ? 'Yes' : 'No'}</span>
                <span className="font-medium">{indicator.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content: label + course breakdown */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nutrition label for full meal */}
        <div className="shrink-0">
          <NutritionLabel
            nutrients={data.totalNutrients}
            recipeName={`Full Menu: ${data.menuName}`}
          />
        </div>

        {/* Per-course breakdown */}
        <div className="flex-1 min-w-0 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700">Per-Course Breakdown</h4>

          {data.courses.length === 0 && (
            <p className="text-sm text-gray-400">No dishes found in this menu.</p>
          )}

          {data.courses.map((course) => (
            <div
              key={course.courseNumber}
              className="rounded-md border border-gray-200 overflow-hidden"
            >
              {/* Course header */}
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{course.courseName}</span>
                <span className="text-xs text-gray-500">
                  {Math.round(course.courseTotal.calories)} cal
                </span>
              </div>

              {/* Dishes in this course */}
              {course.dishes.map((dish) => (
                <div
                  key={dish.dishId}
                  className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-xs"
                >
                  <span className="text-gray-700 truncate">{dish.dishName}</span>
                  <div className="flex gap-3 text-gray-500 shrink-0">
                    <span>{Math.round(dish.nutrients.calories)} cal</span>
                    <span>P: {dish.nutrients.protein_g}g</span>
                    <span>C: {dish.nutrients.carbs_g}g</span>
                    <span>F: {dish.nutrients.fat_g}g</span>
                  </div>
                </div>
              ))}

              {/* Course total row */}
              <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs font-medium">
                <span className="text-gray-600">Course total</span>
                <div className="flex gap-3 text-gray-700">
                  <span>{Math.round(course.courseTotal.calories)} cal</span>
                  <span>P: {course.courseTotal.protein_g}g</span>
                  <span>C: {course.courseTotal.carbs_g}g</span>
                  <span>F: {course.courseTotal.fat_g}g</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function MacroCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-center">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xxs text-gray-400 uppercase">{unit}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function MacroRatioBar({
  nutrients,
}: {
  nutrients: { protein_g: number; carbs_g: number; fat_g: number }
}) {
  // Calculate caloric contribution: protein 4cal/g, carbs 4cal/g, fat 9cal/g
  const proteinCals = nutrients.protein_g * 4
  const carbsCals = nutrients.carbs_g * 4
  const fatCals = nutrients.fat_g * 9
  const totalMacroCals = proteinCals + carbsCals + fatCals

  if (totalMacroCals === 0) return null

  const proteinPct = Math.round((proteinCals / totalMacroCals) * 100)
  const carbsPct = Math.round((carbsCals / totalMacroCals) * 100)
  const fatPct = 100 - proteinPct - carbsPct

  return (
    <div>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden">
        <div
          className="bg-brand-500 transition-all"
          style={{ width: `${proteinPct}%` }}
          title={`Protein: ${proteinPct}%`}
        />
        <div
          className="bg-amber-400 transition-all"
          style={{ width: `${carbsPct}%` }}
          title={`Carbs: ${carbsPct}%`}
        />
        <div
          className="bg-red-400 transition-all"
          style={{ width: `${fatPct}%` }}
          title={`Fat: ${fatPct}%`}
        />
      </div>
      <div className="flex justify-between mt-1 text-xxs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
          Protein {proteinPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Carbs {carbsPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          Fat {fatPct}%
        </span>
      </div>
    </div>
  )
}
