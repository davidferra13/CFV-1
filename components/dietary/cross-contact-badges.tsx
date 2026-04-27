'use client'

// Cross-Contact Badges
// Shows hidden allergen risk badges on ingredient rows.
// Pure lookup from the deterministic cross-contact database (Formula > AI).

import { CROSS_CONTACT_RISKS } from '@/lib/dietary/constraint-enforcement'

interface CrossContactBadgesProps {
  ingredientName: string
  compact?: boolean
}

export function getCrossContactRisks(ingredientName: string) {
  const normalized = ingredientName.toLowerCase().trim()
  const risks: { allergen: string; reason: string }[] = []

  for (const [riskIngredient, entries] of Object.entries(CROSS_CONTACT_RISKS)) {
    if (normalized.includes(riskIngredient)) {
      for (const entry of entries) {
        if (!risks.some((r) => r.allergen === entry.allergen)) {
          risks.push(entry)
        }
      }
    }
  }

  return risks
}

export function CrossContactBadges({ ingredientName, compact }: CrossContactBadgesProps) {
  const risks = getCrossContactRisks(ingredientName)

  if (risks.length === 0) return null

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] text-amber-500/80 ml-1"
        title={risks.map((r) => `May contain ${r.allergen}: ${r.reason}`).join('\n')}
      >
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        {risks.length}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {risks.map((risk) => (
        <span
          key={risk.allergen}
          className="inline-flex items-center gap-0.5 rounded-full bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-400"
          title={risk.reason}
        >
          <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {risk.allergen.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  )
}
