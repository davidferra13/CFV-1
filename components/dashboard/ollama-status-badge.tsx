'use client'

// Ollama Status Badge
// Polls /api/ollama-status with adaptive intervals.
//
// Three states:
//   configured + online + model ready → green (local AI running, data stays on-device)
//   configured + online + model loading → blue (Ollama up, model loading)
//   configured + offline → red warning (local AI down — private features unavailable)
//   not configured       → renders nothing (cloud AI is expected behavior, no alarm needed)
//
// The badge is intentionally shown site-wide (in the sidebar) so the chef sees the
// warning regardless of which page they trigger an AI operation from.

import { useState, useEffect, useRef, useCallback } from 'react'

interface OllamaStatus {
  online: boolean
  configured: boolean
  isRemote: boolean
  model: string
  modelReady: boolean
  latencyMs: number | null
  gpuLayers: number | null
  totalLayers: number | null
  error: string | null
}

// Adaptive polling intervals (ms)
const POLL_ONLINE = 60_000 // When healthy — check once per minute
const POLL_OFFLINE = 10_000 // When down — check every 10s to detect recovery
const POLL_BACKOFF_MAX = 120_000 // Max backoff after consecutive failures

export function OllamaStatusBadge() {
  const [status, setStatus] = useState<OllamaStatus | null>(null)
  const failCountRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getInterval = useCallback(() => {
    if (!status) return POLL_ONLINE // initial — no need to poll aggressively before first result
    if (status.online) {
      failCountRef.current = 0
      return POLL_ONLINE
    }
    // Exponential backoff: 10s, 20s, 40s, 80s, 120s max
    const backoff = Math.min(POLL_OFFLINE * Math.pow(2, failCountRef.current), POLL_BACKOFF_MAX)
    return backoff
  }, [status])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama-status', { cache: 'no-store' })
      if (!res.ok) {
        failCountRef.current++
        return
      }
      const data = await res.json()
      setStatus(data)
      if (!data.online) failCountRef.current++
    } catch {
      failCountRef.current++
      setStatus({
        online: false,
        configured: false,
        isRemote: false,
        model: '',
        modelReady: false,
        latencyMs: null,
        gpuLayers: null,
        totalLayers: null,
        error: 'Fetch failed',
      })
    }
  }, [])

  // Initial fetch + adaptive interval
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const ms = getInterval()
    intervalRef.current = setInterval(fetchStatus, ms)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [status, getInterval, fetchStatus])

  // Not loaded yet, or Ollama was never configured — show nothing
  if (!status || !status.configured) return null

  // Online + model ready
  if (status.online && status.modelReady !== false) {
    const sourceLabel = status.isRemote ? 'Pi' : 'Local'
    const latencyLabel =
      status.latencyMs !== null ? `${sourceLabel} · ${status.latencyMs}ms` : `${sourceLabel} Mode`
    const tooltip = status.isRemote
      ? 'Running on your Raspberry Pi — data stays private'
      : 'Private AI — data stays within ChefFlow'
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 shrink-0"
        title={tooltip}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {latencyLabel}
      </span>
    )
  }

  // Online but model not loaded yet
  if (status.online && status.modelReady === false) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 shrink-0"
        title={`Ollama is running but model "${status.model}" is loading...`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
        Loading Model
      </span>
    )
  }

  // Configured but offline — this is a hard failure, not a graceful degradation
  const offlineLabel = status.isRemote ? 'Pi Offline' : 'Local AI Offline'
  const offlineTooltip = status.isRemote
    ? `Raspberry Pi AI is unreachable — check that the Pi is powered on and connected. Error: ${status.error ?? 'unreachable'}`
    : `Local AI offline — private AI features are unavailable. Start Ollama to restore. Error: ${status.error ?? 'unreachable'}`
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 shrink-0"
      title={offlineTooltip}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      {offlineLabel}
    </span>
  )
}
