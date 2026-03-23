'use client'

// Connect Gmail Step - Onboarding
// Explains why Gmail matters and initiates the OAuth flow.
// Skippable - Gmail is not required to use ChefFlow, just strongly recommended
// for chefs using Take a Chef, Bark, Thumbtack, or any other platform.

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

  // If Gmail is already connected, auto-complete this step
  if (gmailAlreadyConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gmail is connected</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your Gmail is already linked. Platform leads will flow in automatically.
          </p>
        </div>
        <div className="flex gap-3">
          <button
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
      // Stash that we're in onboarding so the callback can complete the step
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
        <h2 className="text-xl font-semibold text-gray-900">Connect your Gmail</h2>
        <p className="mt-1 text-sm text-gray-500">
          ChefFlow reads the notification emails your platforms already send you and turns them into
          structured leads automatically. No manual entry.
        </p>
      </div>

      {/* Platform list */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">
          Platforms ChefFlow can parse automatically
        </p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <span
              key={p}
              className="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
            >
              {p}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Each new inquiry from these platforms will appear in your Marketplace Command Center with
          the client details already extracted.
        </p>
      </div>

      {/* Privacy note */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Your data stays private.</strong> ChefFlow only reads emails from known platform
        senders. All AI processing runs locally on the server - nothing is sent to external AI
        services.
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

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
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip for now
        </button>
      </div>

      <p className="text-xs text-gray-400">
        You can connect Gmail anytime from Settings - Integrations.
      </p>
    </div>
  )
}
