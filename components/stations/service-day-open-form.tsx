'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { openServiceDay } from '@/lib/service-days/actions'

export function ServiceDayOpenForm({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await openServiceDay(id)
        if (!result.success) {
          setError(result.error || 'Failed to open service day')
          return
        }
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
      >
        {isPending ? 'Opening...' : 'Open Service Day'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
