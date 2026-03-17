'use client'

import { useState, useTransition } from 'react'
import { analyzeMenuEngineering } from '@/lib/menus/menu-engineering-actions'
import type {
  MenuEngineeringResult,
  MenuQuadrant,
  RecipeEngineering,
} from '@/lib/menus/menu-engineering-actions'

// ============================================
// CONSTANTS
// ============================================

const QUADRANT_STYLES: Record<
  MenuQuadrant,
  { bg: string; border: string; text: string; badge: string; icon: string }
> = {
  star: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-800',
    icon: '\u2605', // filled star
  },
  plowhorse: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-800',
    icon: '\u{1F4AA}', // flexed biceps
  },
  puzzle: {
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-800',
    badge: 'bg-purple-100 text-purple-800',
    icon: '\u{1F9E9}', // puzzle piece
  },
  dog: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-800',
    icon: '\u26A0\uFE0F', // warning
  },
}

const QUADRANT_LABELS: Record<MenuQuadrant, string> = {
  star: 'Stars',
  plowhorse: 'Plowhorses',
  puzzle: 'Puzzles',
  dog: 'Dogs',
}

const QUADRANT_SUBTITLES: Record<MenuQuadrant, string> = {
  star: 'High popularity, high margin',
  plowhorse: 'High popularity, low margin',
  puzzle: 'Low popularity, high margin',
  dog: 'Low popularity, low margin',
}

// ============================================
// HELPERS
// ============================================

function formatCents(cents: number): string {
  const dollars = cents / 100
  return dollars < 0 ? `-$${Math.abs(dollars).toFixed(2)}` : `$${dollars.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

// ============================================
// SUB-COMPONENTS
// ============================================

function RecipeCard({ recipe }: { recipe: RecipeEngineering }) {
  const style = QUADRANT_STYLES[recipe.quadrant]

  return (
    <div className={`rounded-lg border p-3 ${style.bg} ${style.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`font-medium text-sm truncate ${style.text}`}>{recipe.recipeName}</p>
          <p className="text-xs text-gray-500 capitalize">{recipe.category}</p>
        </div>
        {!recipe.hasCompleteCostData && (
          <span
            className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded shrink-0"
            title="Some ingredient prices are missing"
          >
            Partial cost
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Food cost</span>
          <p className="font-medium">{formatCents(recipe.foodCostCents)}</p>
        </div>
        <div>
          <span className="text-gray-500">Served</span>
          <p className="font-medium">{recipe.timesServed}x</p>
        </div>
        <div>
          <span className="text-gray-500">Margin</span>
          <p
            className={`font-medium ${recipe.contributionMarginCents >= 0 ? 'text-green-700' : 'text-red-700'}`}
          >
            {formatCents(recipe.contributionMarginCents)}
          </p>
        </div>
      </div>
    </div>
  )
}

function QuadrantPanel({
  quadrant,
  recipes,
  advice,
}: {
  quadrant: MenuQuadrant
  recipes: RecipeEngineering[]
  advice: string
}) {
  const style = QUADRANT_STYLES[quadrant]

  return (
    <div className={`rounded-xl border-2 ${style.border} ${style.bg} p-4 flex flex-col`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{style.icon}</span>
        <h3 className={`font-semibold text-base ${style.text}`}>
          {QUADRANT_LABELS[quadrant]} ({recipes.length})
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-2">{QUADRANT_SUBTITLES[quadrant]}</p>

      {recipes.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-4 text-center">No recipes in this quadrant</p>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto max-h-80">
          {recipes.map((r) => (
            <RecipeCard key={r.recipeId} recipe={r} />
          ))}
        </div>
      )}

      <div className={`mt-3 pt-3 border-t ${style.border}`}>
        <p className="text-xs text-gray-600">{advice}</p>
      </div>
    </div>
  )
}

function SummaryBar({ result }: { result: MenuEngineeringResult }) {
  const { summary } = result
  const total = summary.totalRecipes

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border p-4 mb-6">
        <h3 className="font-semibold text-sm">Menu Mix Distribution</h3>
        <p className="text-xs text-gray-500 mt-2">
          No recipes analyzed yet. Add costed recipes to see distribution.
        </p>
      </div>
    )
  }

  const segments: { quadrant: MenuQuadrant; count: number }[] = [
    { quadrant: 'star', count: summary.stars },
    { quadrant: 'plowhorse', count: summary.plowhorses },
    { quadrant: 'puzzle', count: summary.puzzles },
    { quadrant: 'dog', count: summary.dogs },
  ]

  return (
    <div className="bg-white rounded-xl border p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Menu Mix Distribution</h3>
        <span className="text-xs text-gray-500">
          {summary.totalRecipes} recipes analyzed
          {summary.uncostableRecipes > 0 &&
            ` (${summary.uncostableRecipes} with incomplete cost data)`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex h-6 rounded-lg overflow-hidden mb-3">
        {segments.map(({ quadrant, count }) => {
          const pct = (count / total) * 100
          if (pct === 0) return null
          const colors: Record<MenuQuadrant, string> = {
            star: 'bg-amber-400',
            plowhorse: 'bg-blue-400',
            puzzle: 'bg-purple-400',
            dog: 'bg-red-400',
          }
          return (
            <div
              key={quadrant}
              className={`${colors[quadrant]} flex items-center justify-center text-xs font-medium text-white`}
              style={{ width: `${Math.max(pct, 5)}%` }}
              title={`${QUADRANT_LABELS[quadrant]}: ${count} (${pct.toFixed(0)}%)`}
            >
              {pct >= 10 && `${pct.toFixed(0)}%`}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {segments.map(({ quadrant, count }) => (
          <div key={quadrant} className="flex items-center gap-1.5">
            <span
              className={`${QUADRANT_STYLES[quadrant].badge} px-1.5 py-0.5 rounded font-medium`}
            >
              {QUADRANT_STYLES[quadrant].icon} {QUADRANT_LABELS[quadrant]}
            </span>
            <span className="text-gray-500">
              {count} ({((count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>

      {/* Key metrics */}
      <div className="mt-4 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-gray-500">Median popularity</span>
          <p className="font-medium">{formatPercent(summary.medianPopularity)}</p>
        </div>
        <div>
          <span className="text-gray-500">Median margin</span>
          <p className="font-medium">{formatCents(summary.medianMarginCents)}</p>
        </div>
        <div>
          <span className="text-gray-500">Star ratio</span>
          <p
            className={`font-medium ${summary.stars / total >= 0.3 ? 'text-green-700' : 'text-orange-700'}`}
          >
            {((summary.stars / total) * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <span className="text-gray-500">Dog ratio</span>
          <p
            className={`font-medium ${summary.dogs / total <= 0.2 ? 'text-green-700' : 'text-red-700'}`}
          >
            {((summary.dogs / total) * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  )
}

function DateRangeSelector({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="text-gray-500">From</label>
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="border rounded px-2 py-1 text-sm"
      />
      <label className="text-gray-500">To</label>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
    </div>
  )
}

// ============================================
// MAIN DASHBOARD
// ============================================

export function MenuEngineeringDashboard() {
  const [result, setResult] = useState<MenuEngineeringResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Default date range: last 12 months
  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const [fromDate, setFromDate] = useState(oneYearAgo.toISOString().split('T')[0])
  const [toDate, setToDate] = useState(now.toISOString().split('T')[0])

  function runAnalysis(from: string, to: string) {
    setError(null)
    startTransition(async () => {
      try {
        const data = await analyzeMenuEngineering({
          from: from || undefined,
          to: to || undefined,
        })
        setResult(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to run analysis')
        setResult(null)
      }
    })
  }

  function handleDateChange(from: string, to: string) {
    setFromDate(from)
    setToDate(to)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Menu Engineering</h2>
          <p className="text-sm text-gray-500">
            Analyze recipe profitability and popularity to optimize your menu mix
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector from={fromDate} to={toDate} onChange={handleDateChange} />
          <button
            onClick={() => runAnalysis(fromDate, toDate)}
            disabled={isPending}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isPending ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && !isPending && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            Select a date range and click &quot;Run Analysis&quot; to see your recipe performance
            matrix.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            The analysis uses your recipe costs and event history to classify each recipe into
            Stars, Plowhorses, Puzzles, or Dogs based on popularity and contribution margin.
          </p>
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      )}

      {/* Results */}
      {result && !isPending && (
        <>
          {result.recipes.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">
                No recipes found. Add recipes with ingredient costs and attach them to menus used in
                events to see the analysis.
              </p>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <SummaryBar result={result} />

              {/* 4-quadrant grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.recommendations.map((rec) => (
                  <QuadrantPanel
                    key={rec.quadrant}
                    quadrant={rec.quadrant}
                    recipes={rec.recipes}
                    advice={rec.advice}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
