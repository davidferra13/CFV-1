'use client'

// Import Leads Step - Onboarding
// Explains how Gmail integration works and initiates OAuth flow.
// Skippable. Copy is permission-focused and non-invasive.

import { useState } from 'react'
import { initiateGoogleConnect } from '@/lib/google/auth'

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
]

const PLATFORMS = [
  'Take a Chef',
  'Private Chef Manager',
  'Bark',
  'Thumbtack',
  'Yhangry',
  'GigSalad',
  'The Knot',
  'Cozymeal',
]

interface ConnectGmailStepProps {
  onComplete: (data?: Record<string, unknown>) => void
  onSkip: () => void
  gmailAlreadyConnected?: boolean
}

export function ConnectGmailStep({
  onComplete,
  onSkip,
  gmailAlreadyConnected = false,
}: ConnectGmailStepProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (gmailAlreadyConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gmail is connected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Gmail is already linked. Platform leads will flow in automatically.
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

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const { redirectUrl } = await initiateGoogleConnect(GMAIL_SCOPES)
      sessionStorage.setItem('onboarding_gmail_step', '1')
      window.location.href = redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Gmail connection')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Import leads automatically</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you use platforms like Take a Chef, Bark, or Thumbtack, ChefFlow can pull in new
          inquiries for you automatically.
        </p>
      </div>

      {/* Platform list */}
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Supported platforms
        </p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <span
              key={p}
              className="rounded-full bg-background border border-border px-3 py-1 text-xs font-medium text-foreground shadow-sm"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">How it works</p>
        <p className="text-sm text-muted-foreground">
          With your permission, ChefFlow checks for booking notification emails from these
          platforms. Only platform notifications are read. Your personal emails are never accessed.
        </p>
      </div>

      {/* Privacy note */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <strong>Your data stays on your device.</strong> You can disconnect anytime from Settings.
        Your email data is never sent to third parties.
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-4">
        <button
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
