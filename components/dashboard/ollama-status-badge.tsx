'use client'

// Ollama Status Badge — Dual-Endpoint Aware
// Polls /api/ai/health for both PC + Pi status with adaptive intervals.
//
// Best practices adopted:
//   Netflix: graceful degradation — show partial status, not errors
//   Google SRE: expose golden signals (latency per endpoint)
//   AWS: multi-AZ status indicator pattern
//
// Display states:
//   Both healthy     → green: "PC · 45ms | Pi · 120ms"
//   One degraded     → amber: "PC · 45ms | Pi Loading"
//   One offline      → mixed: "PC · 45ms | Pi Offline"
//   Both offline     → red: "AI Offline"
//   Not configured   → renders nothing
//   Single-endpoint  → original behavior: "Local · 45ms"

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────

interface EndpointHealth {
  name: 'pc' | 'pi'
  url: string
  online: boolean
  latencyMs: number | null
  modelReady: boolean
  configuredModel: string
  loadedModels: string[]
  activeGeneration: boolean
  error: string | null
}

interface HealthResponse {
  status: 'all_healthy' | 'degraded' | 'offline'
  endpoints: EndpointHealth[]
  dualMode: boolean
  summary: string
  timestamp: string
}

// Fallback for single-endpoint mode (existing /api/ollama-status)
interface LegacyStatus {
  online: boolean
  configured: boolean
  isRemote: boolean
  model: string
  modelReady: boolean
  latencyMs: number | null
  error: string | null
}

// ── Adaptive Polling ─────────────────────────────────────────

const POLL_HEALTHY = 60_000 // When both healthy — check once per minute
const POLL_DEGRADED = 15_000 // When one is down — check more frequently
const POLL_OFFLINE = 10_000 // When all down — check every 10s for recovery
const POLL_BACKOFF_MAX = 120_000 // Max backoff after repeated fetch failures

export function OllamaStatusBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [legacy, setLegacy] = useState<LegacyStatus | null>(null)
  const [useDualMode, setUseDualMode] = useState(false)
  const failCountRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Determine poll interval based on current state ──
  const getInterval = useCallback(() => {
    if (health) {
      if (health.status === 'all_healthy') {
        failCountRef.current = 0
        return POLL_HEALTHY
      }
      if (health.status === 'degraded') return POLL_DEGRADED
      return POLL_OFFLINE
    }
    if (legacy) {
      if (legacy.online) return POLL_HEALTHY
      return POLL_OFFLINE
    }
    return POLL_HEALTHY
  }, [health, legacy])

  // ── Fetch health status ──
  const fetchHealth = useCallback(async () => {
    // Try dual-endpoint health API first
    try {
      const res = await fetch('/api/ai/health', { cache: 'no-store' })
      if (res.ok) {
        const data: HealthResponse = await res.json()
        setHealth(data)
        setUseDualMode(data.dualMode)
        failCountRef.current = 0
        return
      }
    } catch {
      // /api/ai/health not available — fall back to legacy
    }

    // Fallback to legacy single-endpoint API
    try {
      const res = await fetch('/api/ollama-status', { cache: 'no-store' })
      if (res.ok) {
        const data: LegacyStatus = await res.json()
        setLegacy(data)
        setUseDualMode(false)
        failCountRef.current = 0
        return
      }
    } catch {
      // Both APIs failed
    }

    failCountRef.current++
  }, [])

  // ── Initial fetch ──
  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  // ── Adaptive polling ──
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const ms = Math.min(getInterval() * Math.pow(1.5, failCountRef.current), POLL_BACKOFF_MAX)
    intervalRef.current = setInterval(fetchHealth, ms)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [health, legacy, getInterval, fetchHealth])

  // ── DUAL-ENDPOINT MODE ──
  if (useDualMode && health) {
    return <DualEndpointBadge health={health} />
  }

  // ── SINGLE-ENDPOINT MODE (legacy) ──
  if (legacy) {
    return <SingleEndpointBadge status={legacy} />
  }

  // ── Health API response in single-endpoint mode ──
  if (health && !health.dualMode && health.endpoints.length > 0) {
    const ep = health.endpoints[0]
    return <SingleEndpointBadgeFromHealth endpoint={ep} />
  }

  // Nothing loaded yet or not configured
  return null
}

// ── Dual-Endpoint Badge ──────────────────────────────────────

function DualEndpointBadge({ health }: { health: HealthResponse }) {
  const pc = health.endpoints.find((e) => e.name === 'pc')
  const pi = health.endpoints.find((e) => e.name === 'pi')

  if (!pc && !pi) return null

  // All healthy
  if (health.status === 'all_healthy') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 shrink-0"
        title={`Private AI — both endpoints healthy\nPC: ${pc?.latencyMs ?? '?'}ms (${pc?.configuredModel})\nPi: ${pi?.latencyMs ?? '?'}ms (${pi?.configuredModel})`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="hidden sm:inline">PC · {pc?.latencyMs ?? '?'}ms</span>
        <span className="hidden sm:inline text-emerald-400">|</span>
        <span className="hidden sm:inline">Pi · {pi?.latencyMs ?? '?'}ms</span>
        <span className="sm:hidden">Dual AI</span>
      </span>
    )
  }

  // Degraded — at least one endpoint has issues
  if (health.status === 'degraded') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 shrink-0"
        title={`AI system degraded\n${health.summary}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="hidden sm:inline">
          <EndpointChip ep={pc} />
          <span className="text-amber-400 mx-0.5">|</span>
          <EndpointChip ep={pi} />
        </span>
        <span className="sm:hidden">AI Degraded</span>
      </span>
    )
  }

  // Offline — all endpoints down
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 shrink-0"
      title={`All AI endpoints offline — private AI features unavailable.\n${health.summary}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      AI Offline
    </span>
  )
}

function EndpointChip({ ep }: { ep: EndpointHealth | undefined }) {
  if (!ep) return <span>?</span>

  const label = ep.name === 'pc' ? 'PC' : 'Pi'

  if (ep.online && ep.modelReady) {
    return (
      <span>
        {label} · {ep.latencyMs ?? '?'}ms
      </span>
    )
  }
  if (ep.online && !ep.modelReady) {
    return <span className="text-blue-600">{label} Loading</span>
  }
  return <span className="text-red-600">{label} Off</span>
}

// ── Single-Endpoint Badge (legacy fallback) ──────────────────

function SingleEndpointBadge({ status }: { status: LegacyStatus }) {
  if (!status.configured) return null

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

  const offlineLabel = status.isRemote ? 'Pi Offline' : 'Local AI Offline'
  const offlineTooltip = status.isRemote
    ? `Raspberry Pi AI is unreachable — check that the Pi is powered on. Error: ${status.error ?? 'unreachable'}`
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

// ── Single-Endpoint Badge from Health API ────────────────────

function SingleEndpointBadgeFromHealth({ endpoint: ep }: { endpoint: EndpointHealth }) {
  if (ep.online && ep.modelReady) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 shrink-0"
        title="Private AI — data stays within ChefFlow"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Local · {ep.latencyMs ?? '?'}ms
      </span>
    )
  }

  if (ep.online && !ep.modelReady) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 shrink-0"
        title={`Model "${ep.configuredModel}" is loading...`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
        Loading Model
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 shrink-0"
      title={`Local AI offline — ${ep.error ?? 'unreachable'}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      AI Offline
    </span>
  )
}
