'use client'

// MenuNutritionPanel - main panel for viewing and managing menu nutrition data.
// Shows per-dish breakdown, summary totals, and supports chef overrides.
// Used on the nutrition detail page and can be embedded in menu detail views.

import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NutritionCard } from '@/components/nutrition/nutrition-card'
import {
  analyzeMenuNutrition,
  updateDishNutrition,
  deleteDishNutrition,
  toggleNutritionDisplay,
  type MenuNutritionEntry,
} from '@/lib/nutrition/analysis-actions'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  menuId: string
  initialNutrition: MenuNutritionEntry[]
  showOnProposals?: boolean
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

function EditRow({
  entry,
  onSave,
  onCancel,
}: {
  entry: MenuNutritionEntry
  onSave: (id: string, updates: Record<string, number | null>) => void
  onCancel: () => void
}) {
  const [calories, setCalories] = useState(entry.calories?.toString() ?? '')
  const [protein, setProtein] = useState(entry.protein_g?.toString() ?? '')
  const [carbs, setCarbs] = useState(entry.carbs_g?.toString() ?? '')
  const [fat, setFat] = useState(entry.fat_g?.toString() ?? '')

  const handleSave = () => {
    onSave(entry.id, {
      calories: calories ? parseInt(calories, 10) : null,
      protein_g: protein ? parseFloat(protein) : null,
      carbs_g: carbs ? parseFloat(carbs) : null,
      fat_g: fat ? parseFloat(fat) : null,
    })
  }

  return (
    <div className="rounded-lg border border-amber-700/50 bg-stone-800/80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-stone-100">{entry.dish_name}</h4>
        <Badge variant="warning">Editing</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-stone-400 block mb-1">Calories</label>
          <input
            type="number"
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
            placeholder="kcal"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Protein (g)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
            placeholder="g"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Carbs (g)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
            placeholder="g"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Fat (g)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
            placeholder="g"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Override
        </Button>
      </div>
    </div>
  )
}

// ─── Summary Row ──────────────────────────────────────────────────────────────

function NutritionSummary({ entries }: { entries: MenuNutritionEntry[] }) {
  const withData = entries.filter((e) => e.calories !== null)
  if (withData.length === 0) return null

  const totals = {
    calories: withData.reduce((sum, e) => sum + (e.calories ?? 0), 0),
    protein: withData.reduce((sum, e) => sum + (e.protein_g ?? 0), 0),
    carbs: withData.reduce((sum, e) => sum + (e.carbs_g ?? 0), 0),
    fat: withData.reduce((sum, e) => sum + (e.fat_g ?? 0), 0),
  }

  return (
    <div className="rounded-lg border border-stone-600 bg-stone-800 p-4">
      <h3 className="text-sm font-medium text-stone-400 mb-3">Menu Totals (per serving)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-stone-100 tabular-nums">{totals.calories}</div>
          <div className="text-xs text-stone-400">Calories</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-400 tabular-nums">
            {Math.round(totals.protein * 10) / 10}g
          </div>
          <div className="text-xs text-stone-400">Protein</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-400 tabular-nums">
            {Math.round(totals.carbs * 10) / 10}g
          </div>
          <div className="text-xs text-stone-400">Carbs</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-rose-400 tabular-nums">
            {Math.round(totals.fat * 10) / 10}g
          </div>
          <div className="text-xs text-stone-400">Fat</div>
        </div>
      </div>
      <p className="text-xs text-stone-500 mt-3">
        Based on {withData.length} of {entries.length} dishes with data.
        {entries.length - withData.length > 0 &&
          ` ${entries.length - withData.length} dishes could not be analyzed.`}
      </p>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function MenuNutritionPanel({ menuId, initialNutrition, showOnProposals = false }: Props) {
  const [entries, setEntries] = useState<MenuNutritionEntry[]>(initialNutrition)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showOnPortal, setShowOnPortal] = useState(showOnProposals)
  const [isAnalyzing, startAnalyze] = useTransition()
  const [isSaving, startSave] = useTransition()
  const [isToggling, startToggle] = useTransition()

  // ─── Analyze ──────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(() => {
    startAnalyze(async () => {
      try {
        const result = await analyzeMenuNutrition(menuId)
        setEntries(result.entries)

        if (result.failed > 0) {
          toast.warning(
            `Analyzed ${result.analyzed} dishes. ${result.failed} could not be analyzed.`
          )
        } else {
          toast.success(`Nutrition analyzed for ${result.analyzed} dishes.`)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to analyze nutrition')
      }
    })
  }, [menuId])

  // ─── Edit/Save ────────────────────────────────────────────────────────

  const handleSaveOverride = useCallback(
    (id: string, updates: Record<string, number | null>) => {
      const previous = [...entries]

      // Optimistic update
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, ...updates, chef_override: true, source: 'manual' as const } : e
        )
      )
      setEditingId(null)

      startSave(async () => {
        try {
          const updated = await updateDishNutrition(id, updates)
          setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)))
          toast.success('Nutrition values updated')
        } catch (err) {
          setEntries(previous) // rollback
          toast.error(err instanceof Error ? err.message : 'Failed to save override')
        }
      })
    },
    [entries]
  )

  // ─── Delete ───────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    (id: string) => {
      const previous = [...entries]
      setEntries((prev) => prev.filter((e) => e.id !== id))

      startSave(async () => {
        try {
          await deleteDishNutrition(id)
          toast.success('Nutrition entry removed')
        } catch (err) {
          setEntries(previous) // rollback
          toast.error(err instanceof Error ? err.message : 'Failed to delete entry')
        }
      })
    },
    [entries]
  )

  // ─── Display Toggle ──────────────────────────────────────────────────

  const handleToggleDisplay = useCallback(() => {
    const previousVal = showOnPortal
    const newVal = !showOnPortal
    setShowOnPortal(newVal)

    startToggle(async () => {
      try {
        await toggleNutritionDisplay(menuId, newVal)
        toast.success(
          newVal ? 'Nutrition will show on proposals' : 'Nutrition hidden from proposals'
        )
      } catch (err) {
        setShowOnPortal(previousVal) // rollback
        toast.error(err instanceof Error ? err.message : 'Failed to update display setting')
      }
    })
  }, [menuId, showOnPortal])

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? 'Analyzing...' : entries.length > 0 ? 'Re-Analyze' : 'Analyze Nutrition'}
          </Button>

          {entries.length > 0 && (
            <span className="text-sm text-stone-400">
              {entries.length} {entries.length === 1 ? 'dish' : 'dishes'}
            </span>
          )}
        </div>

        {entries.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnPortal}
              onChange={handleToggleDisplay}
              disabled={isToggling}
              className="rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500"
            />
            Show on proposals
          </label>
        )}
      </div>

      {/* Loading state */}
      {isAnalyzing && (
        <Card className="border-stone-700 bg-stone-800/50 p-8 text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-stone-700 rounded w-1/3 mx-auto" />
            <div className="h-3 bg-stone-700 rounded w-1/2 mx-auto" />
            <p className="text-sm text-stone-400 mt-4">
              Fetching nutrition data from Spoonacular. This may take a moment for larger menus.
            </p>
          </div>
        </Card>
      )}

      {/* Summary */}
      {!isAnalyzing && entries.length > 0 && <NutritionSummary entries={entries} />}

      {/* Dish list */}
      {!isAnalyzing && entries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-stone-400">Per-Dish Breakdown</h3>
          {entries.map((entry) =>
            editingId === entry.id ? (
              <EditRow
                key={entry.id}
                entry={entry}
                onSave={handleSaveOverride}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={entry.id} className="group relative">
                <NutritionCard nutrition={entry} />
                {/* Action buttons on hover */}
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    onClick={() => setEditingId(entry.id)}
                    className="h-7 px-2 text-xs"
                    disabled={isSaving}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(entry.id)}
                    className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                    disabled={isSaving}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Empty state */}
      {!isAnalyzing && entries.length === 0 && (
        <Card className="border-stone-700 bg-stone-800/50 p-8 text-center">
          <p className="text-stone-400 mb-2">No nutrition data yet.</p>
          <p className="text-sm text-stone-500">
            Click &quot;Analyze Nutrition&quot; to fetch calorie and macro data for each dish via
            Spoonacular.
          </p>
        </Card>
      )}
    </div>
  )
}
