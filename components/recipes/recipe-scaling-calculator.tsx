'use client'

// Recipe Scaling Calculator - Smart Portion Intelligence
// ──────────────────────────────────────────────────────────────────────────────
// Replaces the simple "multiply everything by N" approach with real culinary
// scaling logic:
//
//   1. Course position selector - tells the system what portion to expect
//   2. Portion standard lookup - shows oz per guest, total to prepare, yield loss
//   3. Smart scaling - sub-linear exponents for spices/aromatics (0.75–0.90 power)
//      vs. linear for proteins and base liquids (1.0)
//   4. Scale factor derived from recipe base yield OR portion standard
//   5. Clipboard output that prints like a chef's mise en place card

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  COURSE_POSITIONS,
  COURSE_POSITION_LABELS,
  type CoursePosition,
  getPortionInfo,
  smartScale,
  getScalingExponent,
  getScalingLabel,
  getScalingReason,
  formatScaledQty,
} from '@/lib/recipes/portion-standards'

// ─── Types ───────────────────────────────────────────────────────────────────

type RecipeIngredient = {
  id: string
  quantity: number
  unit: string
  is_optional: boolean
  preparation_notes: string | null
  ingredient: {
    name: string
    category: string
  }
}

type RecipeInfo = {
  name: string
  category: string
  yield_quantity: number | null
  yield_unit: string | null
  method: string | null
  ingredients: RecipeIngredient[]
}

type Props = {
  recipe: RecipeInfo
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RecipeScalingCalculator({ recipe }: Props) {
  const [open, setOpen] = useState(false)
  const [coursePosition, setCoursePosition] = useState<CoursePosition | ''>('')
  const [guestCount, setGuestCount] = useState('')
  const [smartMode, setSmartMode] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [hoveredIngredient, setHoveredIngredient] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  if (recipe.ingredients.length === 0) return null

  const guests = parseFloat(guestCount)
  const baseYield = recipe.yield_quantity ?? null

  // Compute scale factor:
  // If recipe has a yield, derive factor from yield. Otherwise scale factor is undefined.
  const scaleFactor = baseYield && guests > 0 ? guests / baseYield : null

  // Portion standard (requires course position + guest count)
  const portionInfo =
    coursePosition && guests > 0
      ? getPortionInfo(recipe.category, coursePosition as CoursePosition, guests)
      : null

  // For the ingredient table, we need a scale factor.
  // Primary: from recipe yield. Fallback: none (show "set yield to scale").
  const effectiveScale = scaleFactor

  const handleClose = () => {
    setOpen(false)
    setCoursePosition('')
    setGuestCount('')
    setCopySuccess(false)
    setOverrides({})
  }

  const getDisplayQty = (ri: RecipeIngredient): number => {
    if (!effectiveScale) return ri.quantity
    const computed = smartMode
      ? smartScale(ri.quantity, effectiveScale, ri.ingredient.category)
      : ri.quantity * effectiveScale
    const raw = overrides[ri.id]
    if (raw !== undefined) {
      const parsed = parseFloat(raw)
      return isNaN(parsed) ? computed : parsed
    }
    return computed
  }

  const setOverride = (id: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [id]: value }))
  }

  const resetOverride = (id: string) => {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleCopy = () => {
    if (!effectiveScale || guests <= 0) return

    const courseLabel = coursePosition
      ? COURSE_POSITION_LABELS[coursePosition as CoursePosition]
      : ''
    const header = [
      `${recipe.name}`,
      courseLabel && `${courseLabel}`,
      `${guests} guests`,
      `×${effectiveScale.toFixed(2)} scale`,
    ]
      .filter(Boolean)
      .join(' - ')

    const lines: string[] = [header, '']

    const hasOverrides = Object.keys(overrides).some((id) => overrides[id] !== undefined)
    // Scaled ingredients
    lines.push(
      hasOverrides
        ? smartMode
          ? 'INGREDIENTS (smart-scaled, chef-adjusted):'
          : 'INGREDIENTS (linear, chef-adjusted):'
        : smartMode
          ? 'INGREDIENTS (smart-scaled):'
          : 'INGREDIENTS (linear):'
    )
    for (const ri of recipe.ingredients) {
      const qty = getDisplayQty(ri)
      const isOverridden = overrides[ri.id] !== undefined
      const formatted = `  ${formatScaledQty(qty).padStart(8)} ${ri.unit}  ${ri.ingredient.name}${isOverridden ? ' *' : ''}`
      const extra = ri.preparation_notes ? `  (${ri.preparation_notes})` : ''
      const opt = ri.is_optional ? '  [optional]' : ''
      lines.push(formatted + extra + opt)
    }

    // Portion reference
    if (portionInfo) {
      lines.push('')
      lines.push('PORTION REFERENCE:')
      lines.push(`  Standard: ${portionInfo.portionNote}`)
      lines.push(`  Total to prepare: ${portionInfo.totalLabel}`)
      if (portionInfo.rawTotalLabel) {
        lines.push(`  Purchase: ${portionInfo.rawTotalLabel} (${portionInfo.rawNote})`)
      }
    }

    // Method
    if (recipe.method) {
      lines.push('')
      lines.push('METHOD:')
      lines.push(recipe.method)
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  return (
    <Card className={open ? 'border-brand-400 shadow-sm' : 'border-stone-700'}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Scale for Guests</CardTitle>
            {!open && baseYield && (
              <p className="text-sm text-stone-500 mt-0.5">
                Base: {baseYield} {recipe.yield_unit || 'servings'}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant={open ? 'secondary' : 'primary'}
            onClick={() => (open ? handleClose() : setOpen(true))}
          >
            {open ? 'Close' : 'Scale for Guests'}
          </Button>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5">
          {/* ── Inputs row ── */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px] max-w-[220px]">
              <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wide">
                Serving as
              </label>
              <select
                value={coursePosition}
                onChange={(e) => setCoursePosition(e.target.value as CoursePosition | '')}
                className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900 focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select course…</option>
                {COURSE_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {COURSE_POSITION_LABELS[pos]}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-32">
              <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wide">
                Guest count
              </label>
              <Input
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder={baseYield ? `Base: ${baseYield}` : 'e.g. 12'}
                min="1"
                step="1"
                autoFocus
              />
            </div>

            {effectiveScale && guests > 0 && (
              <div className="text-sm text-stone-500 pb-2">
                ×{effectiveScale.toFixed(2)} scale factor
              </div>
            )}

            {!baseYield && guests > 0 && (
              <div className="text-xs text-amber-600 pb-2 max-w-[200px]">
                Add a base yield to this recipe to enable ingredient scaling.
              </div>
            )}
          </div>

          {/* ── Portion standard summary ── */}
          {portionInfo && (
            <div className="rounded-lg border border-brand-700 bg-brand-950 p-4 space-y-2">
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide">
                Portion Standard -{' '}
                {coursePosition && COURSE_POSITION_LABELS[coursePosition as CoursePosition]}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-500">Per guest: </span>
                  <span className="font-semibold text-stone-100">{portionInfo.portionOz} oz</span>
                  <p className="text-xs text-stone-500 mt-0.5">{portionInfo.portionNote}</p>
                </div>
                <div>
                  <span className="text-stone-500">Total to prepare: </span>
                  <span className="font-semibold text-stone-100">{portionInfo.totalLabel}</span>
                  {portionInfo.rawTotalLabel && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      Purchase: <strong>{portionInfo.rawTotalLabel}</strong>
                      {portionInfo.rawNote && ` - ${portionInfo.rawNote}`}
                    </p>
                  )}
                </div>
              </div>
              {!scaleFactor && (
                <p className="text-xs text-amber-700 mt-1">
                  To scale ingredients, set a base yield on this recipe (e.g. &quot;8
                  servings&quot;). The portion standard above is a reference for how much to prepare
                  total.
                </p>
              )}
            </div>
          )}

          {/* ── Scaled ingredient table ── */}
          {effectiveScale && guests > 0 && (
            <div className="space-y-3">
              {/* Smart / Linear toggle */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Scaled Ingredients
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Scaling mode:</span>
                  <button
                    type="button"
                    onClick={() => setSmartMode(!smartMode)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      smartMode
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-stone-900 text-stone-400 border-stone-600 hover:border-stone-400'
                    }`}
                  >
                    {smartMode ? 'Smart (sub-linear)' : 'Linear'}
                  </button>
                  {!smartMode && (
                    <button
                      type="button"
                      onClick={() => setSmartMode(true)}
                      className="text-xs text-brand-500 hover:text-brand-400"
                    >
                      What is smart scaling?
                    </button>
                  )}
                </div>
              </div>

              {/* Explanation banner for first-time Smart mode */}
              {smartMode && effectiveScale > 1.5 && (
                <div className="text-xs text-stone-500 bg-stone-800 border border-stone-700 rounded p-2">
                  <strong>Smart scaling:</strong> Spices, aromatics, and condiments scale below the
                  linear amount because their flavor compounds concentrate in larger batches.
                  Proteins and liquids always scale linearly. Hover any ingredient to see why.
                </div>
              )}

              <div className="bg-stone-800 rounded-lg border border-stone-700 divide-y divide-stone-800">
                {recipe.ingredients.map((ri) => {
                  const linearQty = ri.quantity * effectiveScale
                  const smartQty = smartScale(ri.quantity, effectiveScale, ri.ingredient.category)
                  const computedQty = smartMode ? smartQty : linearQty
                  const isOverridden = overrides[ri.id] !== undefined
                  const displayQty = getDisplayQty(ri)
                  const exponent = getScalingExponent(ri.ingredient.category)
                  const isSubLinear = exponent < 0.99
                  const smartLabel = getScalingLabel(ri.ingredient.category)
                  const smartReason = getScalingReason(ri.ingredient.category)
                  const diffPercent =
                    isSubLinear && !isOverridden ? Math.round((1 - smartQty / linearQty) * 100) : 0

                  return (
                    <div
                      key={ri.id}
                      className="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-stone-800 transition-colors relative"
                      onMouseEnter={() => setHoveredIngredient(ri.id)}
                      onMouseLeave={() => setHoveredIngredient(null)}
                    >
                      {/* Editable quantity + unit */}
                      <div className="w-36 shrink-0 flex items-center gap-1">
                        <input
                          type="number"
                          value={isOverridden ? overrides[ri.id] : formatScaledQty(computedQty)}
                          onChange={(e) => setOverride(ri.id, e.target.value)}
                          onFocus={(e) => {
                            if (!isOverridden) {
                              setOverride(ri.id, String(computedQty))
                              e.target.select()
                            }
                          }}
                          step="any"
                          min="0"
                          className={`w-20 text-right tabular-nums text-sm font-semibold rounded border px-1.5 py-0.5 focus:outline-none focus:ring-1 ${
                            isOverridden
                              ? 'border-brand-400 bg-brand-950 text-brand-200 focus:ring-brand-400'
                              : 'border-transparent bg-transparent text-stone-100 hover:border-stone-600 focus:border-stone-400 focus:ring-stone-600'
                          }`}
                        />
                        <span className="text-stone-500 text-xs shrink-0">{ri.unit}</span>
                        {isOverridden && (
                          <button
                            type="button"
                            onClick={() => resetOverride(ri.id)}
                            title="Reset to computed value"
                            className="text-stone-400 hover:text-stone-400 text-xs leading-none"
                          >
                            ↺
                          </button>
                        )}
                      </div>

                      {/* Name + prep notes */}
                      <div className="flex-1 min-w-0">
                        <span className="text-stone-200">{ri.ingredient.name}</span>
                        {ri.preparation_notes && (
                          <span className="text-stone-400 ml-1.5 text-xs">
                            ({ri.preparation_notes})
                          </span>
                        )}
                        {ri.is_optional && (
                          <span className="text-xs text-stone-400 italic ml-1.5">optional</span>
                        )}
                      </div>

                      {/* Scaling badge */}
                      {smartMode && isSubLinear && !isOverridden && (
                        <div className="shrink-0 text-right">
                          <span className="text-xs text-amber-600 font-medium">
                            −{diffPercent}% vs linear
                          </span>
                          <div className="text-xs text-stone-400">{smartLabel}</div>
                        </div>
                      )}
                      {isOverridden && (
                        <div className="shrink-0 text-right">
                          <span className="text-xs text-brand-600 font-medium">chef override</span>
                        </div>
                      )}

                      {/* Hover tooltip */}
                      {smartMode && hoveredIngredient === ri.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-72 bg-stone-900 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none">
                          <p className="font-semibold mb-1">
                            {ri.ingredient.category} → ×{exponent.toFixed(2)} exponent
                          </p>
                          <p>{smartReason}</p>
                          {isSubLinear && (
                            <p className="mt-1.5 text-stone-300">
                              Linear would give: {formatScaledQty(linearQty)} {ri.unit}. Smart
                              gives: {formatScaledQty(smartQty)} {ri.unit}.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Very small quantity warning */}
              {recipe.ingredients.some((ri) => getDisplayQty(ri) < 0.05) && (
                <p className="text-xs text-amber-600">
                  Some quantities are very small - verify these make sense for your batch size.
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-stone-400">
                  {Object.keys(overrides).length > 0
                    ? `${Object.keys(overrides).length} quantity${Object.keys(overrides).length > 1 ? 'ies' : ''} adjusted - click ↺ to reset`
                    : smartMode
                      ? `Smart mode: spices/aromatics at 0.75–0.92×, proteins/liquids at 1.0×. Click any quantity to adjust.`
                      : 'Linear mode: all ingredients multiplied by the same factor. Click any quantity to adjust.'}
                </p>
                <Button size="sm" variant="secondary" onClick={handleCopy}>
                  {copySuccess ? 'Copied!' : 'Copy Scaled Recipe'}
                </Button>
              </div>
            </div>
          )}

          {/* No base yield - can still show portion reference */}
          {!effectiveScale && guests > 0 && !portionInfo && (
            <div className="text-sm text-stone-500 bg-stone-800 rounded p-3">
              Select a course type to see the portion standard for {guests} guests.
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
