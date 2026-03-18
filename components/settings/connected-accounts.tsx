// Connected Accounts - Gmail connection management UI
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { initiateGoogleConnect, disconnectGoogle } from '@/lib/google/auth'
import { triggerGmailSync } from '@/lib/gmail/actions'
import type { GoogleConnectionStatus, GmailSyncLogEntry } from '@/lib/google/types'
import { HistoricalScanSection } from '@/components/gmail/historical-scan-section'
import type { HistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'

interface ConnectedAccountsProps {
  connection: GoogleConnectionStatus
  recentSyncs: GmailSyncLogEntry[]
  historicalScanStatus?: HistoricalScanStatus | null
}

export function ConnectedAccounts({
  connection,
  recentSyncs,
  historicalScanStatus,
}: ConnectedAccountsProps) {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    processed: number
    inquiriesCreated: number
    skipped: number
    errors: string[]
  } | null>(null)

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const { redirectUrl } = await initiateGoogleConnect([
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ])
      window.location.href = redirectUrl
    } catch (err) {
      const e = err as Error
      setError(e.message)
      setConnecting(false)
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
      const e = err as Error
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true)
  }

  const handleConfirmedDisconnect = async () => {
    setShowDisconnectConfirm(false)
    setDisconnecting(true)
    setError(null)
    try {
      await disconnectGoogle('gmail')
      router.refresh()
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Gmail Integration
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {connection.gmail.connected && connection.gmail.errorCount >= 99 && (
          <Alert variant="error">
            <div className="text-sm">
              <p className="font-medium">Gmail permissions need to be updated</p>
              <p className="mt-1">
                Your Gmail token doesn&apos;t have the required scopes. Click &quot;Disconnect&quot;
                below, then reconnect your Gmail to fix this.
              </p>
            </div>
          </Alert>
        )}

        {!connection.gmail.connected ? (
          <>
            <p className="text-sm text-stone-400">
              Connect your Gmail to automatically capture dinner inquiries from your inbox. The
              agent classifies each email and creates inquiry records for potential bookings.
            </p>
            <Button variant="primary" onClick={handleConnect} loading={connecting}>
              Connect Gmail
            </Button>
          </>
        ) : (
          <>
            {/* Connection status */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Connected</Badge>
                  <span className="text-sm font-medium text-stone-100">
                    {connection.gmail.email}
                  </span>
                </div>
                {connection.gmail.lastSync && (
                  <p className="text-xs text-stone-500 mt-1">
                    Last synced: {new Date(connection.gmail.lastSync).toLocaleString()}
                  </p>
                )}
                {connection.gmail.errorCount >= 99 ? (
                  <p className="text-xs text-red-500 mt-1">
                    Gmail permissions are insufficient. Please disconnect and reconnect below.
                  </p>
                ) : connection.gmail.errorCount > 0 ? (
                  <p className="text-xs text-amber-600 mt-1">
                    {connection.gmail.errorCount} error(s) in last sync
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSync} loading={syncing}>
                  Sync Now
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDisconnect}
                  loading={disconnecting}
                >
                  Disconnect
                </Button>
              </div>
            </div>

            {/* Sync results */}
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

            {/* Recent sync history */}
            {recentSyncs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-stone-300 mb-2">Recent Activity</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {recentSyncs.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-xs border-b border-stone-800 py-1.5 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ClassificationBadge classification={entry.classification} />
                        <span className="text-stone-400 truncate">
                          {entry.from_address || 'unknown'}{' '}
                          {entry.subject && (
                            <span className="text-stone-400">- {entry.subject}</span>
                          )}
                        </span>
                      </div>
                      <span className="text-stone-400 ml-2 shrink-0">
                        {entry.action_taken === 'created_inquiry' && '+ inquiry'}
                        {entry.action_taken === 'logged_message' && 'logged'}
                        {entry.action_taken === 'skipped' && 'skipped'}
                        {entry.action_taken === 'error' && (
                          <span className="text-red-500">error</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historical email scan (opt-in subsection) */}
            <HistoricalScanSection initialStatus={historicalScanStatus ?? null} />
          </>
        )}

        <ConfirmModal
          open={showDisconnectConfirm}
          title="Disconnect Gmail?"
          description="This will stop syncing your inbox. You can reconnect later."
          confirmLabel="Disconnect"
          variant="danger"
          loading={disconnecting}
          onConfirm={handleConfirmedDisconnect}
          onCancel={() => setShowDisconnectConfirm(false)}
        />
      </CardContent>
    </Card>
  )
}

function ClassificationBadge({ classification }: { classification: string }) {
  const colors: Record<string, string> = {
    inquiry: 'bg-emerald-900 text-emerald-700',
    existing_thread: 'bg-blue-900 text-blue-700',
    personal: 'bg-stone-800 text-stone-400',
    spam: 'bg-red-900 text-red-600',
    marketing: 'bg-amber-900 text-amber-700',
  }
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-xxs font-medium shrink-0 ${colors[classification] || 'bg-stone-800 text-stone-400'}`}
    >
      {classification}
    </span>
  )
}
