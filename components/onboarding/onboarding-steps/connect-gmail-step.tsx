'use client'

// Import Leads Step - Onboarding
// Explains how Gmail integration works and initiates OAuth flow.
// Skippable. Copy is permission-focused and non-invasive.

import { useEffect, useState } from 'react'
import { buildGoogleConnectEntryUrl } from '@/lib/google/connect-entry'

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
]

const BENEFITS = [
  'Auto-import booking inquiries',
  'Parse guest count, date, and budget',
  'Track response times',
  'Never miss a lead',
]

interface ConnectGmailStepProps {
  onComplete: (data?: Record<string, unknown>) => void
  onSkip: () => void
  gmailAlreadyConnected?: boolean
  oauthError?: string | null
}

export function ConnectGmailStep({
  onComplete,
  onSkip,
  gmailAlreadyConnected = false,
  oauthError = null,
}: ConnectGmailStepProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(oauthError)

  useEffect(() => {
    setError(oauthError)
  }, [oauthError])

  // Timeout recovery: if redirect hangs, reset after 10s
  useEffect(() => {
    if (!loading) return
    const timeout = setTimeout(() => {
      setLoading(false)
      setError(
        'Could not redirect to Google. Please try again, or skip and connect later from Settings.'
      )
    }, 10_000)
    return () => clearTimeout(timeout)
  }, [loading])

  if (gmailAlreadyConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gmail is connected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Gmail is already linked. New inquiries will flow in automatically.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onComplete({ skipped: false, already_connected: true })}
            className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-500"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  const handleConnect = () => {
    setLoading(true)
    setError(null)
    window.location.assign(
      buildGoogleConnectEntryUrl(GMAIL_SCOPES, {
        returnTo: '/onboarding',
      })
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Import leads automatically</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ChefFlow scans your inbox for booking inquiries from any platform and imports them
          automatically. No manual copy-pasting.
        </p>
      </div>

      {/* Benefits */}
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          What you get
        </p>
        <ul className="space-y-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* How it works */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">How it works</p>
        <p className="text-sm text-muted-foreground">
          With your permission, ChefFlow checks for booking notification emails in your inbox. Only
          booking-related emails are read. Your personal emails are never accessed.
        </p>
      </div>

      {/* Privacy note */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <strong>Your data stays on your device.</strong> You can disconnect anytime from Settings.
        Your email data is never sent to third parties.
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-500 disabled:opacity-60"
        >
          {loading ? 'Redirecting to Google...' : 'Connect Gmail'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Skip for now
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        You can always connect later from Settings &gt; Integrations.
      </p>
    </div>
  )
}
