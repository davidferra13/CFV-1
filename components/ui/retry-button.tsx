'use client'

import { usePathname, useRouter } from 'next/navigation'
import { trackedRouterRefresh } from '@/lib/runtime/tracked-router-refresh'

/**
 * Client-side retry button for use in server-rendered error states.
 * Calls router.refresh() to re-fetch server data without a full page reload.
 */
export function RetryButton({
  label = 'Retry',
  className,
}: {
  label?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <button
      type="button"
      onClick={() =>
        trackedRouterRefresh(router, {
          pathname,
          source: 'retry-button',
          event: 'manual_retry',
          reason: label,
        })
      }
      className={
        className ??
        'mt-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm text-stone-200 transition-colors'
      }
    >
      {label}
    </button>
  )
}
