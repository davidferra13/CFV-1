'use client'

import { useEffect, useState, useTransition } from 'react'
import { getOverdueCount } from '@/lib/equipment/maintenance-actions'

interface MaintenanceAlertBadgeProps {
  /** Pre-fetched count (avoids a client-side fetch if available) */
  initialCount?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Small badge displaying the count of overdue maintenance items.
 * Renders nothing if count is 0. Suitable for nav items or dashboard widgets.
 */
export default function MaintenanceAlertBadge({
  initialCount,
  className = '',
}: MaintenanceAlertBadgeProps) {
  const [count, setCount] = useState<number>(initialCount ?? 0)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (initialCount !== undefined) return

    startTransition(async () => {
      try {
        const overdueCount = await getOverdueCount()
        setCount(overdueCount)
      } catch {
        // Non-blocking: badge just won't show
      }
    })
  }, [initialCount])

  if (count === 0) return null

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white min-w-[18px] ${className}`}
      title={`${count} equipment item${count !== 1 ? 's' : ''} overdue for maintenance`}
    >
      {count}
    </span>
  )
}
