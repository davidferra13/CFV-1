'use client'

import { useRouter } from 'next/navigation'

export function ReconciliationRetry() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.refresh()}
      className="px-4 py-2 rounded-lg bg-stone-700 text-stone-100 text-sm font-medium hover:bg-stone-600 transition"
    >
      Retry
    </button>
  )
}
