'use client'

import { useState, useTransition } from 'react'

import { runGeographicPricingProofAction } from '@/lib/pricing/geographic-proof-actions'

export function GeographicProofRunForm() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<'success' | 'error' | null>(null)

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setMessage(null)
          setTone(null)
          startTransition(async () => {
            try {
              const result = await runGeographicPricingProofAction({ dryRun: false })
              if (!result.success) {
                setTone('error')
                setMessage(result.error ?? 'Pricing proof failed.')
                return
              }
              setTone('success')
              setMessage(`Proof run created with ${result.totalRows}/${result.expectedRows} rows.`)
            } catch {
              setTone('error')
              setMessage('Pricing proof could not be run.')
            }
          })
        }}
        className="rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Running...' : 'Run Proof'}
      </button>
      {message && (
        <p className={tone === 'success' ? 'text-xs text-emerald-300' : 'text-xs text-red-300'}>
          {message}
        </p>
      )}
    </div>
  )
}
