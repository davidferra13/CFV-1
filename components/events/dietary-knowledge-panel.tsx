'use client'

/**
 * DietaryKnowledgePanel
 *
 * Shows which menu ingredients have verified dietary_flags from the knowledge
 * database, cross-referenced with guest/client dietary restrictions.
 *
 * Honest about coverage gaps: "No data" means the ingredient hasn't been
 * enriched yet, not that it's unsafe. Supplements the allergen conflict alert.
 */

import { useEffect, useState } from 'react'
import {
  getKnowledgeDietaryCheck,
  type KnowledgeDietaryResult,
} from '@/lib/dietary/knowledge-dietary-check'

const FLAG_LABEL: Record<string, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  'gluten-free': 'Gluten-Free',
  'dairy-free': 'Dairy-Free',
  halal: 'Halal',
  kosher: 'Kosher',
}

function FlagBadge({ flag }: { flag: string }) {
  const label = FLAG_LABEL[flag] ?? flag
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300 border border-emerald-700/40">
      {label}
    </span>
  )
}

export function DietaryKnowledgePanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<KnowledgeDietaryResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getKnowledgeDietaryCheck(eventId)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading || !result) return null

  // Only render if there's a menu AND mappable restrictions AND at least some enriched ingredients
  if (!result.hasMenu || !result.hasRestrictions || result.enrichedIngredients === 0) return null

  const coveragePercent =
    result.totalMenuIngredients > 0
      ? Math.round((result.enrichedIngredients / result.totalMenuIngredients) * 100)
      : 0

  return (
    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-emerald-200">Dietary Knowledge Coverage</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            {result.enrichedIngredients} of {result.totalMenuIngredients} menu ingredients have
            verified dietary data ({coveragePercent}% coverage). Unverified ingredients should be
            checked manually.
          </p>
        </div>
      </div>

      {/* Flagged ingredients summary */}
      {result.flaggedIngredients.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stone-300 mb-1.5">
            Ingredients with confirmed dietary flags:
          </p>
          <div className="space-y-1.5">
            {result.flaggedIngredients.map((item) => (
              <div key={item.ingredientName} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-stone-300 min-w-[120px]">{item.ingredientName}</span>
                <div className="flex gap-1 flex-wrap">
                  {item.flags.map((flag) => (
                    <FlagBadge key={flag} flag={flag} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-restriction coverage */}
      {result.restrictionCoverage.length > 0 && (
        <div className="border-t border-emerald-800/30 pt-3 space-y-2">
          <p className="text-xs font-medium text-stone-300">Coverage by guest restriction:</p>
          {result.restrictionCoverage.map((rc) => (
            <div key={rc.restriction} className="text-xs">
              <span className="text-amber-300 font-medium capitalize">{rc.restriction}</span>
              {rc.confirmedSafe.length > 0 ? (
                <span className="text-stone-400 ml-1">
                  {rc.confirmedSafe.length} verified
                  {rc.unverified.length > 0 ? `, ${rc.unverified.length} unverified` : ''}
                </span>
              ) : (
                <span className="text-stone-500 ml-1">
                  no verified ingredients ({rc.unverified.length} need manual check)
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xxs text-stone-600">
        Data sourced from Wikipedia and Wikidata. Enrichment improves as more ingredients are
        processed.
      </p>
    </div>
  )
}
