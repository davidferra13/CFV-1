'use client'

import { useState, useEffect } from 'react'
import { getActiveTaxonomy } from '@/lib/taxonomy/actions'
import { getSystemDefaults } from '@/lib/taxonomy/system-defaults'
import type { TaxonomyCategory, TaxonomyEntry } from '@/lib/taxonomy/types'

/**
 * Returns active taxonomy entries for a category.
 * Instantly returns system defaults, then merges chef customizations when fetched.
 */
export function useTaxonomy(category: TaxonomyCategory) {
  const [entries, setEntries] = useState<TaxonomyEntry[]>(() => getSystemDefaults(category))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getActiveTaxonomy(category)
      .then((result) => {
        if (!cancelled) {
          setEntries(result)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false) // fall back to system defaults on error
        }
      })
    return () => {
      cancelled = true
    }
  }, [category])

  return { entries, loading }
}
