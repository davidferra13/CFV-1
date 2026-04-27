'use client'

import { useRouter } from 'next/navigation'

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
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className={
        className ??
        'mt-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm text-stone-200 transition-colors'
      }
    >
      {label}
    </button>
  )
}
