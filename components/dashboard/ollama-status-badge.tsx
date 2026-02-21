'use client'

// Ollama Status Badge
// Polls /api/ollama-status every 30 seconds.
//
// Three states:
//   configured + online  → green (local AI running, data stays on-device)
//   configured + offline → amber warning (Ollama configured but down; AI ops fall back to Gemini)
//   not configured       → renders nothing (cloud AI is expected behavior, no alarm needed)
//
// The badge is intentionally shown site-wide (in the sidebar) so the chef sees the
// cloud-fallback warning regardless of which page they trigger an AI operation from.

import { useState, useEffect } from 'react'

interface OllamaStatus {
  online: boolean
  configured: boolean
  model: string
  latencyMs: number | null
  error: string | null
}

export function OllamaStatusBadge() {
  const [status, setStatus] = useState<OllamaStatus | null>(null)

  async function fetchStatus() {
    try {
      const res = await fetch('/api/ollama-status', { cache: 'no-store' })
      if (!res.ok) return
      setStatus(await res.json())
    } catch {
      // Network error — treat as offline, unknown config
      setStatus({
        online: false,
        configured: false,
        model: '',
        latencyMs: null,
        error: 'Fetch failed',
      })
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Not loaded yet, or Ollama was never configured — show nothing
  if (!status || !status.configured) return null

  if (status.online) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 shrink-0"
        title={`Running locally — data stays on your device`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {status.latencyMs !== null ? `Local · ${status.latencyMs}ms` : 'Local Mode'}
      </span>
    )
  }

  // Configured but offline — this is the important warning state
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 shrink-0"
      title={`Local processing offline — operations are routing to cloud. Restart local service to keep data on-device. Error: ${status.error ?? 'unreachable'}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Cloud Mode
    </span>
  )
}
