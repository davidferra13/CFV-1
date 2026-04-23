// components/settings/google-integrations.tsx
'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { disconnectGoogle, checkGoogleOAuthHealth } from '@/lib/google/auth'
import { buildGoogleConnectEntryUrl } from '@/lib/google/connect-entry'
import { triggerGmailSync } from '@/lib/gmail/actions'
import type {
  GoogleConnectionStatus,
  GmailSyncLogEntry,
  GoogleServiceStatus,
} from '@/lib/google/types'
import { HistoricalScanSection } from '@/components/gmail/historical-scan-section'
import type { HistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'
import { toast } from 'sonner'

// Reusable card for a single Google service connection
function ServiceCard({
  title,
  description,
  status,
  onConnect,
  onDisconnect,
  children,
}: {
  title: string
  description: string
  status: GoogleServiceStatus
  onConnect: () => void
  onDisconnect: () => void
  children?: ReactNode
}) {
  const [loading, setLoading] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      await onConnect()
    } catch {
      // Parent component will show the error via setError
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true)
  }

  const handleConfirmedDisconnect = async () => {
    setShowDisconnectConfirm(false)
    setLoading(true)
    try {
      await onDisconnect()
    } catch (e) {
      // Parent component will show the error
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.connected ? (
          <>
            <p className="text-sm text-stone-400">{description}</p>
            <Button variant="primary" onClick={handleConnect} loading={loading}>
              Connect {title}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Connected</Badge>
                  <span className="text-sm font-medium text-stone-100">{status.email}</span>
                </div>
                {status.lastSync && (
                  <p className="text-xs text-stone-500 mt-1">
                    Last synced: {new Date(status.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={handleDisconnect} loading={loading}>
                Disconnect
              </Button>
            </div>
            {children}
          </>
        )}

        <ConfirmModal
          open={showDisconnectConfirm}
          title={`Disconnect ${title}?`}
          description="This will stop syncing. You can reconnect later."
          confirmLabel="Disconnect"
          variant="danger"
          loading={loading}
          onConfirm={handleConfirmedDisconnect}
          onCancel={() => setShowDisconnectConfirm(false)}
        />
      </CardContent>
    </Card>
  )
}

// Diagnostic panel - shows when Google OAuth is misconfigured or after errors
function OAuthDiagnostics({
  redirectUri,
  errorMessage,
}: {
  redirectUri: string | null
  errorMessage: string | null
}) {
  if (!errorMessage && !redirectUri) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-950 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-amber-900">Google OAuth Setup</h4>
      {errorMessage && <p className="text-sm text-amber-800">{errorMessage}</p>}
      {redirectUri && (
        <div className="space-y-1">
          <p className="text-xs text-amber-700">
            This redirect URI must be registered in your{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Google Cloud Console
            </a>{' '}
            under OAuth 2.0 Client IDs &rarr; Authorized redirect URIs:
          </p>
          <code className="block bg-amber-900 rounded px-2 py-1 text-xs text-amber-900 font-mono select-all break-all">
            {redirectUri}
          </code>
          <p className="text-xs text-amber-600">
            Also ensure the Gmail API and Google Calendar API are enabled in your Google Cloud
            project.
          </p>
        </div>
      )}
    </div>
  )
}

// Main component that orchestrates all Google integrations
interface GoogleIntegrationsProps {
  connection: GoogleConnectionStatus
  recentSyncs: GmailSyncLogEntry[]
  historicalScanStatus?: HistoricalScanStatus | null
}

export function GoogleIntegrations({
  connection,
  recentSyncs,
  historicalScanStatus,
}: GoogleIntegrationsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [diagnosticUri, setDiagnosticUri] = useState<string | null>(null)
  const [configured, setConfigured] = useState(true)

  // Check Google OAuth configuration on mount
  useEffect(() => {
    checkGoogleOAuthHealth()
      .then((health) => {
        setConfigured(health.configured)
        if (!health.configured || (!connection.gmail.connected && !connection.calendar.connected)) {
          setDiagnosticUri(health.redirectUri)
        }
      })
      .catch(() => {
        // Non-blocking - diagnostics are best-effort
      })
  }, [connection.gmail.connected, connection.calendar.connected])

  // Show toast feedback when returning from Google OAuth redirect
  useEffect(() => {
    if (!searchParams) return
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('error')
    if (connected) {
      const label =
        connected === 'gmail' ? 'Gmail' : connected === 'calendar' ? 'Google Calendar' : 'Google'
      toast.success(`${label} connected successfully!`)
      // Clean the URL so refreshing doesn't re-trigger
      router.replace('/settings', { scroll: false })
    } else if (oauthError) {
      setError(oauthError)
      // Show the diagnostic URI when there's an OAuth error
      checkGoogleOAuthHealth()
        .then((health) => {
          setDiagnosticUri(health.redirectUri)
        })
        .catch(() => {})
      toast.error(oauthError)
      router.replace('/settings', { scroll: false })
    }
  }, [searchParams, router])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    processed: number
    inquiriesCreated: number
    skipped: number
    errors: string[]
  } | null>(null)

  const handleConnect = (service: 'gmail' | 'calendar') => {
    setError(null)
    const scopes =
      service === 'gmail'
        ? [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
          ]
        : [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly',
          ]

    window.location.assign(
      buildGoogleConnectEntryUrl(scopes, {
        returnTo: '/settings',
      })
    )
  }

  const handleDisconnect = async (service: 'gmail' | 'calendar') => {
    setError(null)
    try {
      await disconnectGoogle(service)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setSyncResult(null)
    try {
      const result = await triggerGmailSync()
      setSyncResult(result)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      {!configured && (
        <Alert variant="warning">
          Google OAuth is not configured. Set <code>GOOGLE_CLIENT_ID</code> and{' '}
          <code>GOOGLE_CLIENT_SECRET</code> in your environment variables to enable Gmail and
          Calendar integration.
        </Alert>
      )}

      <OAuthDiagnostics
        redirectUri={error || !configured ? diagnosticUri : null}
        errorMessage={null}
      />

      <ServiceCard
        title="Gmail"
        description="Connect your Gmail to automatically capture dinner inquiries from your inbox and enable automatic drafting of responses."
        status={connection.gmail}
        onConnect={() => handleConnect('gmail')}
        onDisconnect={() => handleDisconnect('gmail')}
      >
        {connection.gmail.connected && (
          <div className="space-y-4 pt-4 border-t border-stone-700 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-100">Inbox Sync</p>
                {connection.gmail.errorCount > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {connection.gmail.errorCount} error(s) in last sync
                  </p>
                )}
              </div>
              <Button variant="primary" size="sm" onClick={handleSync} loading={syncing}>
                Sync Now
              </Button>
            </div>

            {syncResult && (
              <Alert variant={syncResult.errors.length > 0 ? 'warning' : 'success'}>
                <div className="text-sm">
                  <p className="font-medium">
                    Sync complete: {syncResult.processed} processed, {syncResult.inquiriesCreated}{' '}
                    inquiries created, {syncResult.skipped} skipped
                  </p>
                  {syncResult.errors.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-xs">
                      {syncResult.errors.slice(0, 3).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </Alert>
            )}

            {recentSyncs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-stone-300 mb-2">Recent Activity</h4>
                {/* Simplified history for brevity */}
              </div>
            )}

            <HistoricalScanSection initialStatus={historicalScanStatus ?? null} />
          </div>
        )}
      </ServiceCard>

      <ServiceCard
        title="Google Calendar"
        description="Connect your Google Calendar to sync confirmed bookings out and verify external busy time during booking checks."
        status={connection.calendar}
        onConnect={() => handleConnect('calendar')}
        onDisconnect={() => handleDisconnect('calendar')}
      >
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            connection.calendar.health === 'ok'
              ? 'border-emerald-800 bg-emerald-950/30 text-emerald-100'
              : connection.calendar.health === 'warning'
                ? 'border-amber-700 bg-amber-950/30 text-amber-100'
                : connection.calendar.health === 'error'
                  ? 'border-red-800 bg-red-950/30 text-red-100'
                  : 'border-stone-700 bg-stone-900 text-stone-300'
          }`}
        >
          <p className="font-medium">External calendar truth</p>
          <p className="mt-1">
            {connection.calendar.healthDetail ||
              'ChefFlow will verify Google Calendar busy time during booking availability checks.'}
          </p>
          {connection.calendar.checkedAt && (
            <p className="mt-1 opacity-80">
              Last checked: {new Date(connection.calendar.checkedAt).toLocaleString()}
            </p>
          )}
          {connection.calendar.lastSync && (
            <p className="mt-1 opacity-80">
              Latest ChefFlow event sync: {new Date(connection.calendar.lastSync).toLocaleString()}
            </p>
          )}
        </div>
      </ServiceCard>
    </div>
  )
}
