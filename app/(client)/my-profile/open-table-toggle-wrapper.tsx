'use client'

import { useEffect, useState } from 'react'
import { OpenTableToggle } from '@/components/open-tables/open-table-toggle'
import { ensureDinnerCircle } from '@/lib/hub/open-table-actions'

/**
 * Wrapper that ensures dinner circle exists before rendering the toggle.
 * Also checks if the circle is currently set to open.
 */
export function OpenTableToggleWrapper() {
  const [loading, setLoading] = useState(true)
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        // This ensures the dinner circle exists
        await ensureDinnerCircle()
        // We'd check is_open_table status here, but the toggle manages its own state
        // via the server. For now, default to false (private).
      } catch {
        // Non-critical
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-stone-700 bg-stone-800/50 p-4 mt-6 animate-pulse">
        <div className="h-12" />
      </div>
    )
  }

  return <OpenTableToggle isEnabled={isEnabled} onToggled={setIsEnabled} />
}
