'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generatePrepSheet } from '@/lib/prep/prep-sheet-actions'

export function GeneratePrepButton({ serviceDayId }: { serviceDayId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  function handleGenerate() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await generatePrepSheet(serviceDayId)
        if (result.success) {
          setMessage({ text: `Generated ${result.count ?? 0} prep items`, isError: false })
          router.refresh()
        } else {
          setMessage({ text: result.error || 'Generation failed', isError: true })
        }
      } catch (err) {
        setMessage({ text: 'Unexpected error during generation', isError: true })
      }
    })
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={isPending}
        className="rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-500 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Generating...' : 'Generate Prep Sheet'}
      </button>
      <p className="text-xs text-stone-500">
        This will replace any existing prep items for this day.
      </p>
      {message && (
        <p className={`text-sm ${message.isError ? 'text-red-400' : 'text-emerald-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
