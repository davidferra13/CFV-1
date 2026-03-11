// components/settings/google-integrations.tsx
'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  checkGoogleOAuthHealth,
  disconnectGoogle,
  disconnectGoogleMailbox,
  initiateGoogleConnect,
  setPrimaryGoogleMailbox,
} from '@/lib/google/auth'
import { triggerGmailSync } from '@/lib/gmail/actions'
import type {
  GoogleConnectionStatus,
  GoogleMailboxSummary,
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

// Diagnostic panel — shows when Google OAuth is misconfigured or after errors
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
      {errorMessage && <p className="text-sm text-amber-200">{errorMessage}</p>}
      {redirectUri && (
        <div className="space-y-1">
          <p className="text-xs text-amber-200">
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
        // Non-blocking — diagnostics are best-effort
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
  const [busyMailboxId, setBusyMailboxId] = useState<string | null>(null)
  const gmailMailboxes = connection.gmail.mailboxes ?? []
  const primaryMailbox =
    gmailMailboxes.find((mailbox) => mailbox.id === connection.gmail.primaryMailboxId) ??
    gmailMailboxes.find((mailbox) => mailbox.isPrimary) ??
    gmailMailboxes[0] ??
    null

  const handleConnect = async (service: 'gmail' | 'calendar') => {
    setError(null)
    try {
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
      const { redirectUrl } = await initiateGoogleConnect(scopes)
      window.location.href = redirectUrl
    } catch (err) {
      setError((err as Error).message)
    }
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

  const handleSetPrimaryMailbox = async (mailboxId: string) => {
    setBusyMailboxId(mailboxId)
    setError(null)
    try {
      await setPrimaryGoogleMailbox(mailboxId)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyMailboxId(null)
    }
  }

  const handleDisconnectMailbox = async (mailboxId: string) => {
    setBusyMailboxId(mailboxId)
    setError(null)
    try {
      await disconnectGoogleMailbox(mailboxId)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyMailboxId(null)
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
        errorMessage={error}
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
                <p className="text-xs text-stone-500 mt-1">
                  {connection.gmail.connectedCount} inbox
                  {connection.gmail.connectedCount === 1 ? '' : 'es'} connected
                  {primaryMailbox ? ` · primary ${primaryMailbox.email}` : ''}
                </p>
                {connection.gmail.errorCount > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {connection.gmail.errorCount} error(s) in last sync
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleConnect('gmail')}>
                  Connect Another Inbox
                </Button>
                <Button variant="primary" size="sm" onClick={handleSync} loading={syncing}>
                  Sync All Inboxes
                </Button>
              </div>
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

            {gmailMailboxes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-stone-300">Connected Inboxes</h4>
                <div className="space-y-2">
                  {gmailMailboxes.map((mailbox) => (
                    <MailboxSummaryRow
                      key={mailbox.id}
                      mailbox={mailbox}
                      busy={busyMailboxId === mailbox.id}
                      onDisconnect={handleDisconnectMailbox}
                      onSetPrimary={handleSetPrimaryMailbox}
                    />
                  ))}
                </div>
              </div>
            )}

            {recentSyncs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-stone-300 mb-2">Recent Activity</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-md border border-stone-800 bg-stone-900/60 p-2">
                  {recentSyncs.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 text-xs text-stone-400"
                    >
                      <div className="min-w-0">
                        <span className="truncate">
                          {entry.subject || entry.from_address || 'Email'}
                        </span>
                        {entry.mailbox_email && (
                          <span className="ml-2 rounded-full border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-300">
                            {entry.mailbox_email}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0">{entry.action_taken || 'logged'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <HistoricalScanSection initialStatus={historicalScanStatus ?? null} />
          </div>
        )}
      </ServiceCard>

      <ServiceCard
        title="Google Calendar"
        description="Connect your Google Calendar to automatically sync confirmed events into your calendar."
        status={connection.calendar}
        onConnect={() => handleConnect('calendar')}
        onDisconnect={() => handleDisconnect('calendar')}
      />
    </div>
  )
}

function MailboxSummaryRow({
  mailbox,
  busy,
  onDisconnect,
  onSetPrimary,
}: {
  mailbox: GoogleMailboxSummary
  busy: boolean
  onDisconnect: (mailboxId: string) => Promise<void>
  onSetPrimary: (mailboxId: string) => Promise<void>
}) {
  const progressLabel =
    mailbox.estimatedTotal && mailbox.estimatedTotal > 0
      ? `${mailbox.totalSeen.toLocaleString()} / ${mailbox.estimatedTotal.toLocaleString()} scanned`
      : `${mailbox.totalSeen.toLocaleString()} scanned`

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-stone-100">{mailbox.email}</span>
            {mailbox.isPrimary && <Badge variant="secondary">Primary</Badge>}
            {!mailbox.connected && <Badge variant="secondary">Disconnected</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
            {mailbox.lastSync && (
              <span>Last sync {new Date(mailbox.lastSync).toLocaleString()}</span>
            )}
            <span>{progressLabel}</span>
            {mailbox.includeSpamTrash && <span>Includes Spam &amp; Trash</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!mailbox.isPrimary && mailbox.connected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetPrimary(mailbox.id)}
              disabled={busy}
            >
              Make Primary
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDisconnect(mailbox.id)}
            disabled={busy}
          >
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  )
}
