'use client'

// Cross-Contact Risk Matrix
// Module: culinary
// Shows allergen cross-contact risk across all dishes in a menu.
// Extends the existing per-dish allergen matrix with inter-dish contamination risk.

type AllergenPresence = {
  dishId: string
  dishName: string
  allergens: string[]
}

type CrossContactRisk = {
  allergen: string
  sourceDishes: string[]
  atRiskDishes: string[]
  riskLevel: 'high' | 'medium' | 'low'
}

type Props = {
  dishes: AllergenPresence[]
  guestAllergens?: string[] // allergens reported by event guests
}

const FDA_BIG_9 = [
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree_nuts',
  'peanuts',
  'wheat',
  'soy',
  'sesame',
]

const RISK_COLORS = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-stone-700/30 text-stone-400 border-stone-700',
}

const CELL_COLORS = {
  contains: 'bg-red-500/30',
  safe: 'bg-emerald-500/10',
  empty: 'bg-stone-800/30',
}

function allergenLabel(a: string): string {
  return a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function CrossContactRiskMatrix({ dishes, guestAllergens = [] }: Props) {
  if (dishes.length === 0) {
    return (
      <div className="text-sm text-stone-500 p-4">No dishes with allergen data to analyze.</div>
    )
  }

  // Collect all allergens across all dishes
  const allAllergens = new Set<string>()
  for (const dish of dishes) {
    for (const a of dish.allergens) allAllergens.add(a)
  }

  // Sort: FDA Big 9 first, then alphabetical
  const sortedAllergens = Array.from(allAllergens).sort((a, b) => {
    const aFda = FDA_BIG_9.indexOf(a)
    const bFda = FDA_BIG_9.indexOf(b)
    if (aFda >= 0 && bFda >= 0) return aFda - bFda
    if (aFda >= 0) return -1
    if (bFda >= 0) return 1
    return a.localeCompare(b)
  })

  // Compute cross-contact risks
  const risks: CrossContactRisk[] = []
  for (const allergen of sortedAllergens) {
    const sourceDishes = dishes.filter((d) => d.allergens.includes(allergen)).map((d) => d.dishName)
    const atRiskDishes = dishes
      .filter((d) => !d.allergens.includes(allergen))
      .map((d) => d.dishName)

    if (sourceDishes.length > 0 && atRiskDishes.length > 0) {
      const isGuestAllergen = guestAllergens.some(
        (ga) => ga.toLowerCase() === allergen.toLowerCase()
      )
      const isBig9 = FDA_BIG_9.includes(allergen)

      risks.push({
        allergen,
        sourceDishes,
        atRiskDishes,
        riskLevel: isGuestAllergen ? 'high' : isBig9 ? 'medium' : 'low',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Risk alerts */}
      {risks.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium').length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
            Cross-Contact Risks
          </h4>
          {risks
            .filter((r) => r.riskLevel !== 'low')
            .map((risk) => (
              <div
                key={risk.allergen}
                className={`rounded-lg border p-3 ${RISK_COLORS[risk.riskLevel]}`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      risk.riskLevel === 'high' ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                  />
                  {allergenLabel(risk.allergen)}
                  {risk.riskLevel === 'high' && (
                    <span className="text-[10px] uppercase tracking-wide opacity-70">
                      Guest allergen
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 opacity-80">
                  Present in: {risk.sourceDishes.join(', ')}. Separate prep from:{' '}
                  {risk.atRiskDishes.join(', ')}.
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Allergen x Dish matrix grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 text-stone-500 font-medium sticky left-0 bg-stone-900 z-10">
                Allergen
              </th>
              {dishes.map((d) => (
                <th
                  key={d.dishId}
                  className="py-2 px-2 text-stone-400 font-medium text-center max-w-[100px] truncate"
                >
                  {d.dishName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAllergens.map((allergen) => {
              const isBig9 = FDA_BIG_9.includes(allergen)
              const isGuest = guestAllergens.some(
                (ga) => ga.toLowerCase() === allergen.toLowerCase()
              )
              return (
                <tr key={allergen} className="border-t border-stone-800">
                  <td className="py-1.5 pr-3 sticky left-0 bg-stone-900 z-10">
                    <div className="flex items-center gap-1.5">
                      <span className={isGuest ? 'text-red-400 font-medium' : 'text-stone-300'}>
                        {allergenLabel(allergen)}
                      </span>
                      {isBig9 && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">
                          Big 9
                        </span>
                      )}
                    </div>
                  </td>
                  {dishes.map((dish) => {
                    const contains = dish.allergens.includes(allergen)
                    return (
                      <td key={dish.dishId} className="py-1.5 px-2 text-center">
                        <span
                          className={`inline-block w-5 h-5 rounded ${
                            contains ? CELL_COLORS.contains : CELL_COLORS.safe
                          }`}
                          title={contains ? 'Contains' : 'Safe'}
                        >
                          {contains ? (
                            <span className="text-red-400 text-[10px] leading-5 block">X</span>
                          ) : (
                            <span className="text-emerald-500 text-[10px] leading-5 block">
                              &bull;
                            </span>
                          )}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sortedAllergens.length === 0 && (
        <p className="text-sm text-stone-500">No allergens detected in this menu.</p>
      )}
    </div>
  )
}
