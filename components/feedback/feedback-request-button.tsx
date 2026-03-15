'use client'

import { useState } from 'react'
import { createFeedbackRequest, getEventFeedback } from '@/lib/feedback/feedback-actions'
import { useEffect } from 'react'

interface FeedbackRequestButtonProps {
  eventId: string
  className?: string
}

export function FeedbackRequestButton({ eventId, className }: FeedbackRequestButtonProps) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [feedbackLink, setFeedbackLink] = useState<string | null>(null)
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkExisting() {
      const result = await getEventFeedback(eventId)
      if (result.data && result.data.length > 0) {
        const submitted = result.data.some((f: Record<string, unknown>) => f.overall_rating !== null)
        setHasExistingFeedback(submitted)
      }
    }
    checkExisting()
  }, [eventId])

  async function handleRequestFeedback() {
    setLoading(true)
    setError(null)

    try {
      const result = await createFeedbackRequest(eventId)

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.token) {
        const link = `${window.location.origin}/feedback/${result.token}`
        setFeedbackLink(link)

        // Copy to clipboard
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      }
    } catch (err) {
      setError('Failed to create feedback request')
      console.error('[feedback] Request error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyLink() {
    if (!feedbackLink) return
    await navigator.clipboard.writeText(feedbackLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (hasExistingFeedback) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 ${className || ''}`}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Feedback received
      </div>
    )
  }

  return (
    <div className={className}>
      {!feedbackLink ? (
        <button
          onClick={handleRequestFeedback}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Request Feedback
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={feedbackLink}
            className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
          />
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            {copied ? (
              <>
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
