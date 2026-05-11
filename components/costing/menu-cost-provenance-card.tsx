'use client'

// Menu Cost Provenance Card
// Shows overall menu cost confidence with per-dish breakdown.
// Only renders when there are issues or confidence is below high.
// Follows the same expandable details pattern as quote-cost-guard-banner.

import { CONFIDENCE_COLORS, CONFIDENCE_LABELS } from '@/lib/costing/recipe-cost-provenance'
import type { MenuCostProvenance } from '@/lib/costing/menu-cost-provenance'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  provenance: MenuCostProvenance
}

export function MenuCostProvenanceCard({ provenance }: Props) {
  // Don't show if high confidence and no issues
  if (provenance.confidenceLevel === 'high' && provenance.issues.length === 0) {
    return null
  }

  const colors = CONFIDENCE_COLORS[provenance.confidenceLevel]
  const label = CONFIDENCE_LABELS[provenance.confidenceLevel]

  const criticalIssues = provenance.issues.filter((i) => i.severity === 'critical')
  const otherIssues = provenance.issues.filter((i) => i.severity !== 'critical')

  return (
    <Card className={`border ${colors.border} ${colors.bg}`}>
      <CardContent className="py-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {label}
            </span>
            <span className="text-sm text-stone-300">
              Menu Cost Confidence: {provenance.confidenceScore}/100
            </span>
          </div>
          <span className="text-xs text-stone-500">
            {provenance.pricedCount}/{provenance.totalIngredients} ingredients priced
          </span>
        </div>

        {/* Summary label */}
        <p className="text-sm text-stone-400">{provenance.confidenceLabel}</p>

        {/* Critical issues */}
        {criticalIssues.length > 0 && (
          <div className="space-y-1">
            {criticalIssues.map((issue, i) => (
              <p key={i} className="text-sm text-red-400">
                {issue.message}
              </p>
            ))}
          </div>
        )}

        {/* Per-dish breakdown (expandable) */}
        {provenance.dishes.length > 0 && (
          <details>
            <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-300">
              Per-dish breakdown ({provenance.dishes.length} dishes)
            </summary>
            <div className="mt-2 space-y-1.5">
              {provenance.dishes.map((dish) => {
                const dishColors = CONFIDENCE_COLORS[dish.confidenceLevel]
                return (
                  <div
                    key={dish.dishId}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded border border-stone-700/50 bg-stone-800/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dishColors.text.replace('text-', 'bg-')}`}
                      />
                      <span className="text-stone-300 truncate">{dish.dishName}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {dish.recipeCount === 0 ? (
                        <span className="text-stone-500">No recipes</span>
                      ) : (
                        <>
                          <span className={dishColors.text}>{dish.avgConfidenceScore}/100</span>
                          <span className="text-stone-500">
                            {dish.pricedCount}/{dish.totalIngredients} priced
                          </span>
                          {dish.worstRecipeName &&
                            dish.worstRecipeScore !== null &&
                            dish.recipeCount > 1 && (
                              <span
                                className="text-stone-600"
                                title={`Lowest: ${dish.worstRecipeName}`}
                              >
                                low: {dish.worstRecipeScore}
                              </span>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        )}

        {/* Other issues (expandable) */}
        {otherIssues.length > 0 && (
          <details>
            <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-300">
              {otherIssues.length} additional note{otherIssues.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-1 space-y-1">
              {otherIssues.map((issue, i) => (
                <p key={i} className="text-xs text-stone-400">
                  {issue.message}
                </p>
              ))}
            </div>
          </details>
        )}

        {/* Aggregate stats */}
        {provenance.totalIngredients > 0 && (
          <div className="flex gap-4 text-xs text-stone-500 pt-1 border-t border-stone-700/30">
            {provenance.missingCount > 0 && (
              <span className="text-red-400/80">{provenance.missingCount} unpriced</span>
            )}
            {provenance.staleCount > 0 && (
              <span className="text-amber-400/80">{provenance.staleCount} stale</span>
            )}
            <span>
              {provenance.dishCount} dishes, {provenance.componentCount} components
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
