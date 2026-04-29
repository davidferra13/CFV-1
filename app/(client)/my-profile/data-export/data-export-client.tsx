'use client'

import { useState, useTransition } from 'react'
import { exportClientData } from '@/lib/clients/account-deletion-actions'

export function ClientDataExportButton() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const result = await exportClientData()
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `chefflow-my-data-${new Date().toISOString().split('T')[0]}.json`
        link.click()
        URL.revokeObjectURL(url)
        setSuccess('Your data export downloaded. Nothing was deleted or changed.')
      } catch (err) {
        console.error('[client-data-export] Export failed:', err)
        setError('Unable to export your data right now. Please try again.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Download your data</h2>
        <p className="mt-1 text-sm text-stone-400">
          Export your profile, events, inquiries, quotes, messages, allergy records, notes, and
          photo metadata as a JSON file.
        </p>
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Preparing export...' : 'Download data'}
      </button>

      {success && <p className="text-sm text-emerald-400">{success}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
