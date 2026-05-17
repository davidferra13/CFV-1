'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitAgeAttestation } from '@/lib/cannabis/client-portal-actions'

export function AgeAttestationForm() {
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit() {
    if (!confirmed) return
    setSubmitting(true)
    setError(null)

    try {
      await submitAgeAttestation()
      router.push('/my-cannabis')
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 text-left p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm">
          I confirm that I am 21 years of age or older and understand that cannabis dining
          experiences are intended exclusively for adults of legal age.
        </span>
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!confirmed || submitting}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Verifying...' : 'Confirm Age and Continue'}
      </button>
    </div>
  )
}
