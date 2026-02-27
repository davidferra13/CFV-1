'use client'

// Google Calendar Connect — Settings card for managing the chef's Google Calendar integration.
// Mirrors the ConnectedAccounts (Gmail) card pattern.
// Backend is fully wired: confirmed events auto-sync, cancelled events auto-delete.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  initiateGoogleCalendarConnect,
  disconnectGoogleCalendar,
  type CalendarConnection,
} from '@/lib/scheduling/calendar-sync-actions'

interface GoogleCalendarConnectProps {
  connection: CalendarConnection
}

// Google Calendar icon
function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="14" width="3" height="3" rx="0.5" fill="#EA4335" />
    </svg>
  )
}

export function GoogleCalendarConnect({ connection }: GoogleCalendarConnectProps) {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const { redirectUrl } = await initiateGoogleCalendarConnect()
      window.location.href = redirectUrl
    } catch (err) {
      setError((err as Error).message)
      setConnecting(false)
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
      await disconnectGoogleCalendar()
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon />
          Google Calendar
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {!connection.connected ? (
          <>
            <p className="text-sm text-stone-400">
              Connect Google Calendar to automatically sync your confirmed events. When you confirm
              an event in ChefFlow it appears in your calendar; when you cancel it, it's removed.
            </p>
            <ul className="text-sm text-stone-500 list-disc list-inside space-y-1">
              <li>Confirmed events → auto-added to your calendar</li>
              <li>Cancelled events → auto-removed from your calendar</li>
              <li>Event details: occasion, date, time, location, guest count</li>
            </ul>
            <Button variant="primary" onClick={handleConnect} loading={connecting}>
              Connect Google Calendar
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Connected</Badge>
                  <span className="text-sm font-medium text-stone-100">{connection.email}</span>
                </div>
                {connection.lastSync ? (
                  <p className="text-xs text-stone-500 mt-1">
                    Last synced: {new Date(connection.lastSync).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xs text-stone-400 mt-1">
                    No events synced yet — sync happens automatically when events are confirmed.
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDisconnect}
                loading={disconnecting}
              >
                Disconnect
              </Button>
            </div>

            <div className="rounded-md bg-stone-800 border border-stone-700 px-3 py-2 text-xs text-stone-400 space-y-0.5">
              <p className="font-medium text-stone-300">How sync works</p>
              <p>Confirming an event → creates a calendar entry automatically.</p>
              <p>Cancelling an event → removes it from your calendar.</p>
              <p>Edits to event date/time/location → update the calendar entry.</p>
            </div>
          </>
        )}

        <ConfirmModal
          open={showDisconnectConfirm}
          title="Disconnect Google Calendar?"
          description="Events will no longer sync automatically. You can reconnect later."
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
