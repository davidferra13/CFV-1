'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WeeklyNutritionSummary, MacroCheckResult } from '@/lib/meal-prep/nutrition-actions'

// ============================================
// Props
// ============================================

interface NutritionSummaryProps {
  summary: WeeklyNutritionSummary
  macroCheck: MacroCheckResult | null
}

// ============================================
// Helpers
// ============================================

function getStatusColor(status: string): string {
  switch (status) {
    case 'ok':
      return 'text-emerald-400'
    case 'warning':
      return 'text-amber-400'
    case 'over':
      return 'text-red-400'
    case 'under':
      return 'text-red-400'
    default:
      return 'text-stone-400'
  }
}

function getStatusBadge(status: string): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'ok':
      return 'success'
    case 'warning':
      return 'warning'
    default:
      return 'error'
  }
}

function getBarColor(status: string): string {
  switch (status) {
    case 'ok':
      return 'bg-emerald-500'
    case 'warning':
      return 'bg-amber-500'
    default:
      return 'bg-red-500'
  }
}

// ============================================
// Component
// ============================================

export function NutritionSummary({ summary, macroCheck }: NutritionSummaryProps) {
  if (summary.mealCount === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-stone-300 mb-2">Nutrition Summary</h3>
        <p className="text-sm text-stone-500">
          No nutrition data available. Add recipes with nutrition info to see the weekly summary.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Weekly totals */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-300">Weekly Nutrition</h3>
          <span className="text-xs text-stone-500">{summary.mealCount} meals with data</span>
        </div>

        {/* Macro totals grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MacroCard
            label="Calories"
            total={summary.totalCalories}
            daily={summary.dailyAverageCalories}
            unit="kcal"
          />
          <MacroCard
            label="Protein"
            total={summary.totalProtein}
            daily={summary.dailyAverageProtein}
            unit="g"
          />
          <MacroCard
            label="Carbs"
            total={summary.totalCarbs}
            daily={summary.dailyAverageCarbs}
            unit="g"
          />
          <MacroCard
            label="Fat"
            total={summary.totalFat}
            daily={summary.dailyAverageFat}
            unit="g"
          />
        </div>

        {summary.totalFiber > 0 && (
          <p className="text-xs text-stone-500">
            Weekly fiber: {Math.round(summary.totalFiber)}g ({Math.round(summary.totalFiber / 7)}
            g/day avg)
          </p>
        )}
      </Card>

      {/* Macro balance check */}
      {macroCheck && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-300">Macro Balance</h3>
            <Badge variant={macroCheck.withinTargets ? 'success' : 'warning'}>
              {macroCheck.withinTargets ? 'On Target' : 'Needs Attention'}
            </Badge>
          </div>

          <div className="space-y-3">
            {macroCheck.checks.map((check, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{check.label}</span>
                  <span className={getStatusColor(check.status)}>
                    {check.value}
                    {check.status === 'under' && ` (min: ${check.target})`}
                    {check.status === 'over' && ` (max: ${check.target})`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getBarColor(check.status)}`}
                    style={{
                      width: `${Math.min(100, check.target > 0 ? (check.value / check.target) * 100 : 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Per-meal breakdown */}
      {summary.perMeal.length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-300">Per Meal Breakdown</h3>
          <div className="space-y-2">
            {summary.perMeal.map((meal, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-stone-800/50 rounded-lg text-sm"
              >
                <span className="text-stone-200 flex-1 min-w-0 truncate">{meal.name}</span>
                <div className="flex items-center gap-4 text-xs text-stone-400 flex-shrink-0">
                  <span>{meal.calories} cal</span>
                  <span>{meal.protein}g P</span>
                  <span>{meal.carbs}g C</span>
                  <span>{meal.fat}g F</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function MacroCard({
  label,
  total,
  daily,
  unit,
}: {
  label: string
  total: number
  daily: number
  unit: string
}) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-stone-100">
        {Math.round(total)}
        <span className="text-xs text-stone-500 ml-1">{unit}</span>
      </p>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-xs text-stone-600 mt-0.5">~{Math.round(daily)}/day</p>
    </div>
  )
}
