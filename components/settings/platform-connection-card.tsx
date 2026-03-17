'use client'

import { useState, useTransition } from 'react'
import type { PlatformConnectionStatus } from '@/lib/integrations/platform-connections'
import {
  updatePlatformConnection,
  disconnectPlatformConnection,
} from '@/lib/integrations/platform-connections'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const STATUS_BADGE: Record<
  PlatformConnectionStatus['status'],
  { variant: 'success' | 'default' | 'error' | 'warning'; text: string }
> = {
  connected: { variant: 'success', text: 'Connected' },
  disconnected: { variant: 'default', text: 'Not Connected' },
  error: { variant: 'error', text: 'Error' },
  pending: { variant: 'warning', text: 'Pending' },
}

export function PlatformConnectionCard({ connection }: { connection: PlatformConnectionStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)

  const badge = STATUS_BADGE[connection.status]

  function handleConnect() {
    if (connection.authType === 'api_key') {
      setShowApiKeyInput(true)
      setErrorText(null)
    }
    // oauth: button is disabled, nothing to do
  }

  function handleSaveApiKey() {
    if (!apiKeyValue.trim()) {
      setErrorText('API key is required')
      return
    }
    setErrorText(null)
    startTransition(async () => {
      try {
        const result = await updatePlatformConnection(connection.platform, {
          api_key: apiKeyValue.trim(),
        })
        if (!result.success) {
          setErrorText(result.error || 'Failed to connect')
          return
        }
        setShowApiKeyInput(false)
        setApiKeyValue('')
        router.refresh()
      } catch {
        setErrorText('An unexpected error occurred')
      }
    })
  }

  function handleDisconnect() {
    setErrorText(null)
    startTransition(async () => {
      try {
        const result = await disconnectPlatformConnection(connection.platform)
        if (!result.success) {
          setErrorText(result.error || 'Failed to disconnect')
          return
        }
        router.refresh()
      } catch {
        setErrorText('An unexpected error occurred')
      }
    })
  }

  function handleReconnect() {
    handleConnect()
  }

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left side */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-200">{connection.name}</p>
          <p className="text-sm text-stone-400">{connection.description}</p>

          {connection.status === 'connected' && (
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-500">
              {connection.connectedAt && <span>Connected {timeAgo(connection.connectedAt)}</span>}
              {connection.lastSyncAt && <span>Last sync: {timeAgo(connection.lastSyncAt)}</span>}
            </div>
          )}

          {connection.status === 'error' && connection.lastError && (
            <p className="mt-1 text-xs text-red-400">{connection.lastError}</p>
          )}

          {errorText && <p className="mt-1 text-xs text-red-400">{errorText}</p>}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.text}</Badge>

          {connection.status === 'disconnected' &&
            !showApiKeyInput &&
            (connection.authType === 'oauth' ? (
              <Button
                variant="secondary"
                size="sm"
                disabled
                title="OAuth connection not yet available"
              >
                Connect
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleConnect} disabled={isPending}>
                Connect
              </Button>
            ))}

          {connection.status === 'connected' && (
            <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={isPending}>
              Disconnect
            </Button>
          )}

          {connection.status === 'error' && (
            <Button variant="secondary" size="sm" onClick={handleReconnect} disabled={isPending}>
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* API Key input */}
      {showApiKeyInput && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="password"
            placeholder="Enter API key"
            value={apiKeyValue}
            onChange={(e) => setApiKeyValue(e.target.value)}
            className="flex-1 rounded-md border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            disabled={isPending}
          />
          <Button variant="primary" size="sm" onClick={handleSaveApiKey} disabled={isPending}>
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowApiKeyInput(false)
              setApiKeyValue('')
              setErrorText(null)
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
