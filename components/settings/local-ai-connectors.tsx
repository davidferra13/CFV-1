'use client'
// components/settings/local-ai-connectors.tsx
// UI for managing Local AI Connectors (BYOA - Bring Your Own Ollama).
// Users create connector keys, install the connector app on their local machine,
// and their local Ollama handles ChefFlow AI jobs without exposing port 11434.

import { useState, useTransition, useRef } from 'react'
import {
  listLocalAiConnectors,
  createLocalAiConnector,
  revokeLocalAiConnector,
} from '@/lib/ai/connector/actions'
import type { LocalAiConnector } from '@/lib/ai/connector/types'

interface Props {
  initialConnectors: LocalAiConnector[]
}

function timeSince(isoDate: string | null): string {
  if (!isoDate) return 'Never'
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function statusDot(connector: LocalAiConnector) {
  if (connector.status === 'revoked') return 'bg-stone-600'
  if (!connector.lastSeenAt) return 'bg-yellow-500'
  const age = Date.now() - new Date(connector.lastSeenAt).getTime()
  if (age < 60_000) return 'bg-green-500'
  if (age < 300_000) return 'bg-yellow-500'
  return 'bg-stone-500'
}

export function LocalAiConnectors({ initialConnectors }: Props) {
  const [connectors, setConnectors] = useState<LocalAiConnector[]>(initialConnectors)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deviceNameRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<HTMLInputElement>(null)
  const baseUrlRef = useRef<HTMLInputElement>(null)
  const authTokenRef = useRef<HTMLInputElement>(null)

  function handleCreate() {
    const deviceName = deviceNameRef.current?.value?.trim()
    if (!deviceName) {
      setError('Device name is required')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const { connector, rawKey } = await createLocalAiConnector({
          deviceName,
          defaultModel: modelRef.current?.value?.trim() || 'gemma4',
          ollamaBaseUrl: baseUrlRef.current?.value?.trim() || 'http://localhost:11434',
          ollamaAuthToken: authTokenRef.current?.value?.trim() || undefined,
        })
        setConnectors((prev) => [connector, ...prev])
        setNewKey(rawKey)
        setShowCreate(false)
      } catch (err: any) {
        setError(err.message ?? 'Failed to create connector')
      }
    })
  }

  function handleRevoke(connectorId: string) {
    if (!confirm('Revoke this connector? The connector app will immediately lose access.')) return
    startTransition(async () => {
      try {
        await revokeLocalAiConnector(connectorId)
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === connectorId
              ? { ...c, status: 'revoked', revokedAt: new Date().toISOString() }
              : c
          )
        )
      } catch (err: any) {
        setError(err.message ?? 'Failed to revoke connector')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-300">
            Connect your local Ollama instance to ChefFlow. Your AI runs on your machine. No cloud
            exposure.
          </p>
        </div>
        {!showCreate && !newKey && (
          <button
            onClick={() => setShowCreate(true)}
            disabled={isPending}
            className="text-xs px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded text-stone-200 transition-colors"
          >
            + Add Device
          </button>
        )}
      </div>

      {/* New key display (shown once, then gone) */}
      {newKey && (
        <div className="rounded-lg border border-amber-600/50 bg-amber-950/30 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-400">
            Copy this key now. It will not be shown again.
          </p>
          <code className="block text-xs text-amber-200 bg-black/40 rounded p-2 break-all select-all">
            {newKey}
          </code>
          <p className="text-xs text-stone-400">
            Paste this into your connector config file. See the{' '}
            <a
              href="/docs/local-ai-connector"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-stone-300"
            >
              setup guide
            </a>{' '}
            for instructions.
          </p>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-stone-500 hover:text-stone-300 underline"
          >
            I have saved the key
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-300">New Local AI Connector</p>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Device name</label>
            <input
              ref={deviceNameRef}
              type="text"
              placeholder="e.g. MacBook Pro, Home Server"
              maxLength={100}
              className="w-full text-sm bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Default model</label>
            <input
              ref={modelRef}
              type="text"
              defaultValue="gemma4"
              placeholder="gemma4"
              className="w-full text-sm bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>

          <details className="group">
            <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-400">
              Advanced: custom Ollama URL / auth (optional)
            </summary>
            <div className="mt-2 space-y-2 pl-2 border-l border-stone-700">
              <p className="text-xs text-stone-500">
                Only needed if Ollama runs behind a secured proxy. Do NOT expose port 11434 to the
                internet.
              </p>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Ollama base URL</label>
                <input
                  ref={baseUrlRef}
                  type="text"
                  defaultValue="http://localhost:11434"
                  className="w-full text-sm bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">
                  Proxy auth token (optional)
                </label>
                <input
                  ref={authTokenRef}
                  type="password"
                  placeholder="Only if your proxy requires auth"
                  className="w-full text-sm bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>
            </div>
          </details>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="text-xs px-3 py-1.5 bg-stone-600 hover:bg-stone-500 rounded text-stone-100 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Generate Key'}
            </button>
            <button
              onClick={() => {
                setShowCreate(false)
                setError(null)
              }}
              disabled={isPending}
              className="text-xs px-3 py-1.5 bg-transparent border border-stone-700 hover:border-stone-500 rounded text-stone-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Connector list */}
      {connectors.length === 0 && !showCreate && !newKey && (
        <p className="text-xs text-stone-500">
          No connectors yet. Add a device to route AI tasks to your local Ollama.
        </p>
      )}

      {connectors.length > 0 && (
        <div className="divide-y divide-stone-800 rounded-lg border border-stone-800 overflow-hidden">
          {connectors.map((connector) => (
            <div
              key={connector.id}
              className={`flex items-center justify-between px-4 py-3 ${
                connector.status === 'revoked' ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(connector)}`} />
                <div className="min-w-0">
                  <p className="text-sm text-stone-200 truncate">{connector.deviceName}</p>
                  <p className="text-xs text-stone-500">
                    {connector.keyPrefix}...
                    {connector.status === 'revoked'
                      ? ' (revoked)'
                      : connector.lastSeenAt
                        ? ` · Last seen ${timeSince(connector.lastSeenAt)}`
                        : ' · Never connected'}
                    {' · '}
                    {connector.defaultModel}
                  </p>
                </div>
              </div>
              {connector.status === 'active' && (
                <button
                  onClick={() => handleRevoke(connector.id)}
                  disabled={isPending}
                  className="ml-4 flex-shrink-0 text-xs text-stone-500 hover:text-red-400 transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-stone-600">
        Your local Ollama is never exposed to the internet. The connector app reaches out to
        ChefFlow. See the{' '}
        <a
          href="/docs/local-ai-connector"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-stone-400"
        >
          setup guide
        </a>{' '}
        for installation instructions.
      </p>
    </div>
  )
}
