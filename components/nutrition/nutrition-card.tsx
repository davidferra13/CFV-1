'use client'

// NutritionCard - per-dish nutritional breakdown display.
// Shows calories, protein, carbs, fat with visual macro bars.
// Supports compact mode for inline use and expanded mode for detail views.

import { Badge } from '@/components/ui/badge'
import type { MenuNutritionEntry } from '@/lib/nutrition/analysis-actions'

type Props = {
  nutrition: MenuNutritionEntry
  compact?: boolean
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────

function MacroBar({
  label,
  value,
  unit,
  color,
  maxValue,
}: {
  label: string
  value: number | null
  unit: string
  color: string
  maxValue: number
}) {
  if (value === null) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-16 text-stone-400">{label}</span>
        <span className="text-stone-500">N/A</span>
      </div>
    )
  }

  const pct = Math.min((value / maxValue) * 100, 100)

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 text-stone-400">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-stone-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-stone-300 tabular-nums">
        {value}
        {unit}
      </span>
    </div>
  )
}

// ─── Compact Card ─────────────────────────────────────────────────────────────

function CompactView({ nutrition }: { nutrition: MenuNutritionEntry }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="font-medium text-stone-200 truncate flex-1">{nutrition.dish_name}</span>
      {nutrition.calories !== null && (
        <span className="text-stone-400 tabular-nums">{nutrition.calories} cal</span>
      )}
      {nutrition.protein_g !== null && (
        <span className="text-blue-400 tabular-nums">{nutrition.protein_g}g P</span>
      )}
      {nutrition.carbs_g !== null && (
        <span className="text-amber-400 tabular-nums">{nutrition.carbs_g}g C</span>
      )}
      {nutrition.fat_g !== null && (
        <span className="text-rose-400 tabular-nums">{nutrition.fat_g}g F</span>
      )}
      {nutrition.chef_override && <Badge variant="info">Override</Badge>}
    </div>
  )
}

// ─── Expanded Card ────────────────────────────────────────────────────────────

function ExpandedView({ nutrition }: { nutrition: MenuNutritionEntry }) {
  const hasAnyData =
    nutrition.calories !== null ||
    nutrition.protein_g !== null ||
    nutrition.carbs_g !== null ||
    nutrition.fat_g !== null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-stone-100">{nutrition.dish_name}</h4>
        <div className="flex items-center gap-2">
          {nutrition.chef_override && <Badge variant="info">Chef Override</Badge>}
          <Badge variant="default">
            {nutrition.source === 'spoonacular'
              ? 'Spoonacular'
              : nutrition.source === 'usda'
                ? 'USDA'
                : 'Manual'}
          </Badge>
        </div>
      </div>

      {/* Calories headline */}
      {nutrition.calories !== null && (
        <div className="text-2xl font-bold text-stone-100 tabular-nums">
          {nutrition.calories} <span className="text-sm font-normal text-stone-400">calories</span>
        </div>
      )}

      {/* Macro bars */}
      {hasAnyData ? (
        <div className="space-y-2">
          <MacroBar
            label="Protein"
            value={nutrition.protein_g}
            unit="g"
            color="bg-blue-500"
            maxValue={80}
          />
          <MacroBar
            label="Carbs"
            value={nutrition.carbs_g}
            unit="g"
            color="bg-amber-500"
            maxValue={120}
          />
          <MacroBar
            label="Fat"
            value={nutrition.fat_g}
            unit="g"
            color="bg-rose-500"
            maxValue={80}
          />
          {nutrition.fiber_g !== null && (
            <MacroBar
              label="Fiber"
              value={nutrition.fiber_g}
              unit="g"
              color="bg-emerald-500"
              maxValue={30}
            />
          )}
          {nutrition.sodium_mg !== null && (
            <MacroBar
              label="Sodium"
              value={nutrition.sodium_mg}
              unit="mg"
              color="bg-purple-500"
              maxValue={2300}
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          No nutrition data available for this dish. Try re-analyzing or enter values manually.
        </p>
      )}

      {/* Allergens */}
      {nutrition.allergens && nutrition.allergens.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-xs text-stone-400">Allergens:</span>
          {nutrition.allergens.map((allergen) => (
            <Badge key={allergen} variant="warning">
              {allergen}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NutritionCard({ nutrition, compact = false }: Props) {
  if (compact) {
    return <CompactView nutrition={nutrition} />
  }
  return <ExpandedView nutrition={nutrition} />
}
