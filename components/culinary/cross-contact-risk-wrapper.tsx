'use client'

// Wrapper that fetches allergen matrix data and passes it to CrossContactRiskMatrix.
// Reuses the existing getMenuAllergenMatrix server action.

import { useState, useEffect, useTransition } from 'react'
import { getMenuAllergenMatrix } from '@/lib/dietary/cross-contamination-check'
import type { AllergenMatrixResult } from '@/lib/dietary/cross-contamination-check'
import { CrossContactRiskMatrix } from '@/components/culinary/cross-contact-risk-matrix'

export function CrossContactRiskWrapper({
  menuId,
  guestAllergens,
}: {
  menuId: string
  guestAllergens?: string[]
}) {
  const [result, setResult] = useState<AllergenMatrixResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await getMenuAllergenMatrix(menuId)
        if (!cancelled) setResult(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      }
    })
    return () => {
      cancelled = true
    }
  }, [menuId])

  if (error) {
    return <p className="text-sm text-red-400">Could not load cross-contact data: {error}</p>
  }

  if (isPending || !result) {
    return <p className="text-sm text-stone-500 animate-pulse">Loading cross-contact analysis...</p>
  }

  // Transform AllergenMatrixResult into CrossContactRiskMatrix props
  const dishes = result.dishes.map((d) => {
    const allergens: string[] = []
    for (const allergen of result.allergens) {
      const cell = result.matrix[allergen]?.[d.id]
      if (cell?.contains) allergens.push(allergen)
    }
    return { dishId: d.id, dishName: d.name, allergens }
  })

  return <CrossContactRiskMatrix dishes={dishes} guestAllergens={guestAllergens} />
}
