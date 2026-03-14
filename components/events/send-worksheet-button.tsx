'use client'

// Send Pre-Dinner Worksheet Button
// Creates a shareable worksheet link for the client to fill out
// allergies, preferences, guest count, and address before the event.

import { useState, useCallback } from 'react'
import { createClientWorksheet } from '@/lib/marketplace/worksheet-actions'

type Props = {
  eventId: string
  clientId?: string
  eventDate?: string
  occasion?: string
}

export function SendWorksheetButton({ eventId, clientId, eventDate, occasion }: Props) {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await createClientWorksheet({
        eventId,
        clientId,
        eventDate,
        occasion,
      })

      if (result.success && result.url) {
        setUrl(result.url)
      } else {
        setError(result.error ?? 'Failed to create worksheet')
      }
    } catch {
      setError('Failed to create worksheet')
    } finally {
      setLoading(false)
    }
  }, [eventId, clientId, eventDate, occasion])

  const handleCopy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
    }
  }, [url])

  if (url) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-2">
        <p className="text-xs font-medium text-stone-300">
          Worksheet link ready. Send this to your client:
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-xs text-stone-200 font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={handleCopy}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleCreate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800 disabled:opacity-50"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {loading ? 'Creating...' : 'Send Client Worksheet'}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
