// components/settings/google-integrations.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { initiateGoogleConnect, disconnectGoogle } from '@/lib/google/auth'
import { triggerGmailSync } from '@/lib/gmail/actions'
import type {
  GoogleConnectionStatus,
  GmailSyncLogEntry,
  GoogleServiceStatus,
} from '@/lib/google/types'
import { HistoricalScanSection } from '@/components/gmail/historical-scan-section'
import type { HistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'

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

  const handleConnect = async () => {
    setLoading(true)
    await onConnect()
  }

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${title}?`)) return
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
            <p className="text-sm text-stone-600">{description}</p>
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
                  <span className="text-sm font-medium text-stone-900">{status.email}</span>
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
      </CardContent>
    </Card>
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
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    processed: number
    inquiriesCreated: number
    skipped: number
    errors: string[]
  } | null>(null)

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

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <ServiceCard
        title="Gmail"
        description="Connect your Gmail to automatically capture dinner inquiries from your inbox and enable automatic drafting of responses."
        status={connection.gmail}
        onConnect={() => handleConnect('gmail')}
        onDisconnect={() => handleDisconnect('gmail')}
      >
        {connection.gmail.connected && (
          <div className="space-y-4 pt-4 border-t border-stone-200 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">Inbox Sync</p>
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
                </div>
              </Alert>
            )}

            {recentSyncs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-stone-700 mb-2">Recent Activity</h4>
                {/* Simplified history for brevity */}
              </div>
            )}

            <HistoricalScanSection initialStatus={historicalScanStatus ?? null} />
          </div>
        )}
      </ServiceCard>

      <ServiceCard
        title="Google Calendar"
        description="Connect your Google Calendar to automatically sync bookings and block off unavailable times."
        status={connection.calendar}
        onConnect={() => handleConnect('calendar')}
        onDisconnect={() => handleDisconnect('calendar')}
      />
    </div>
  )
}
