'use client'

// Ollama Status Badge — Clickable Control Panel
// Shows AI endpoint status at a glance. Click to open a popover with
// per-endpoint ping, wake/restart toggle, and model loading controls.
//
// Uses existing API: POST /api/ai/wake with actions: ping, wake, restart, load-model
// Uses existing API: GET /api/ai/health for polling status

import { useState, useEffect, useRef, useCallback } from 'react'
import { Power, RefreshCw, Loader2, Wifi, Cpu, Server, RotateCcw, Stethoscope } from 'lucide-react'

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

const POLL_HEALTHY = 60_000
const POLL_DEGRADED = 15_000
const POLL_OFFLINE = 10_000
const POLL_BACKOFF_MAX = 120_000

export function OllamaStatusBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [legacy, setLegacy] = useState<LegacyStatus | null>(null)
  const [useDualMode, setUseDualMode] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number } | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [actionResults, setActionResults] = useState<
    Record<string, { success: boolean; message: string } | null>
  >({})
  const failCountRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // ── Close popover on outside click ──
  useEffect(() => {
    if (!popoverOpen) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popoverOpen])

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const width = 320
    const gutter = 8
    const top = rect.bottom + 8
    const maxLeft = window.innerWidth - width - gutter
    const left = Math.min(Math.max(rect.left, gutter), Math.max(gutter, maxLeft))
    setPopoverStyle({ top, left })
  }, [])

  useEffect(() => {
    if (!popoverOpen) return
    updatePopoverPosition()
    const onViewportChange = () => updatePopoverPosition()
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [popoverOpen, updatePopoverPosition])

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
      return legacy.online ? POLL_HEALTHY : POLL_OFFLINE
    }
    return POLL_HEALTHY
  }, [health, legacy])

  const fetchHealth = useCallback(async () => {
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
      /* fall through */
    }

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
      /* both failed */
    }

    failCountRef.current++
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const ms = Math.min(getInterval() * Math.pow(1.5, failCountRef.current), POLL_BACKOFF_MAX)
    intervalRef.current = setInterval(fetchHealth, ms)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [health, legacy, getInterval, fetchHealth])

  // ── API action helper ──
  const runAction = useCallback(
    async (action: string, endpoint: string) => {
      const key = `${action}-${endpoint}`
      setActionLoading((prev) => ({ ...prev, [key]: true }))
      setActionResults((prev) => ({ ...prev, [key]: null }))

      try {
        const res = await fetch('/api/ai/wake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, endpoint }),
        })
        let data: { success?: boolean; message?: string; error?: string } = {}
        try {
          data = await res.json()
        } catch {
          /* response may not be JSON */
        }
        const success = res.ok && data.success === true
        const message =
          data.message ??
          data.error ??
          (res.ok ? `${action} completed` : `${action} failed (${res.status})`)
        setActionResults((prev) => ({
          ...prev,
          [key]: { success, message },
        }))
        // Refresh health after action
        setTimeout(fetchHealth, 1000)
      } catch (err) {
        setActionResults((prev) => ({
          ...prev,
          [key]: { success: false, message: err instanceof Error ? err.message : 'Failed' },
        }))
      } finally {
        setActionLoading((prev) => ({ ...prev, [key]: false }))
        setTimeout(() => setActionResults((prev) => ({ ...prev, [key]: null })), 4000)
      }
    },
    [fetchHealth]
  )

  // ── Build endpoint list ──
  const endpoints: Array<{
    name: 'pc' | 'pi'
    online: boolean
    latencyMs: number | null
    modelReady: boolean
    model: string
    error: string | null
  }> = []

  if (useDualMode && health) {
    for (const ep of health.endpoints) {
      endpoints.push({
        name: ep.name,
        online: ep.online,
        latencyMs: ep.latencyMs,
        modelReady: ep.modelReady,
        model: ep.configuredModel,
        error: ep.error,
      })
    }
  } else if (legacy) {
    if (!legacy.configured) return null
    endpoints.push({
      name: legacy.isRemote ? 'pi' : 'pc',
      online: legacy.online,
      latencyMs: legacy.latencyMs,
      modelReady: legacy.modelReady !== false,
      model: legacy.model,
      error: legacy.error,
    })
  } else if (health && !health.dualMode && health.endpoints.length > 0) {
    const ep = health.endpoints[0]
    endpoints.push({
      name: ep.name,
      online: ep.online,
      latencyMs: ep.latencyMs,
      modelReady: ep.modelReady,
      model: ep.configuredModel,
      error: ep.error,
    })
  }

  if (endpoints.length === 0) return null

  const allOnline = endpoints.every((e) => e.online && e.modelReady)
  const anyOnline = endpoints.some((e) => e.online)
  // PC is the primary endpoint — if it's healthy, AI is functional
  const pcEndpoint = endpoints.find((e) => e.name === 'pc')
  const pcHealthy = pcEndpoint?.online && pcEndpoint?.modelReady

  let badgeClass: string
  let badgeDot: string
  let badgeLabel: string

  if (allOnline) {
    badgeClass = 'border-emerald-200 bg-emerald-950 text-emerald-700'
    badgeDot = 'bg-emerald-500 animate-pulse'
    if (endpoints.length === 2) {
      badgeLabel = `PC · ${endpoints[0].latencyMs ?? '?'}ms | Pi · ${endpoints[1].latencyMs ?? '?'}ms`
    } else {
      const ep = endpoints[0]
      badgeLabel = `${ep.name === 'pi' ? 'Pi' : 'Local'} · ${ep.latencyMs ?? '?'}ms`
    }
  } else if (pcHealthy) {
    // PC is fine, Pi is down — still green, Pi is a bonus not a requirement
    badgeClass = 'border-emerald-200 bg-emerald-950 text-emerald-700'
    badgeDot = 'bg-emerald-500 animate-pulse'
    badgeLabel =
      endpoints.length === 2
        ? `PC · ${pcEndpoint.latencyMs ?? '?'}ms | Pi Off`
        : `Local · ${pcEndpoint.latencyMs ?? '?'}ms`
  } else if (anyOnline) {
    // PC is down but Pi is up — amber, degraded
    badgeClass = 'border-amber-200 bg-amber-950 text-amber-700'
    badgeDot = 'bg-amber-500 animate-pulse'
    badgeLabel =
      endpoints.length === 2
        ? endpoints
            .map((e) => `${e.name === 'pc' ? 'PC' : 'Pi'} ${e.online ? `${e.latencyMs}ms` : 'Off'}`)
            .join(' | ')
        : 'AI Degraded'
  } else {
    badgeClass = 'border-red-300 bg-red-950 text-red-700'
    badgeDot = 'bg-red-500'
    badgeLabel = 'AI Offline'
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setPopoverOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0 cursor-pointer transition-all hover:brightness-125 ${badgeClass}`}
        title="Click to manage AI endpoints"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${badgeDot}`} />
        <span className="hidden sm:inline">{badgeLabel}</span>
        <span className="sm:hidden">
          {allOnline || pcHealthy ? 'AI' : anyOnline ? 'AI ⚠' : 'AI Off'}
        </span>
      </button>

      {popoverOpen && (
        <div
          className="fixed w-80 rounded-xl border border-stone-700 bg-stone-900 shadow-2xl z-[100] overflow-hidden"
          style={popoverStyle ?? undefined}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
            <span className="text-sm font-semibold text-stone-200">AI Infrastructure</span>
            <button
              type="button"
              onClick={() => runAction('ping', 'all')}
              disabled={!!actionLoading['ping-all']}
              className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {actionLoading['ping-all'] ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Wifi className="h-3 w-3" />
              )}
              Ping All
            </button>
          </div>

          <div className="divide-y divide-stone-800">
            {endpoints.map((ep) => {
              const label = ep.name === 'pc' ? 'PC' : 'Raspberry Pi'
              const Icon = ep.name === 'pc' ? Cpu : Server
              const wakeKey = `wake-${ep.name}`
              const restartKey = `restart-${ep.name}`
              const pingKey = `ping-${ep.name}`
              const loadKey = `load-model-${ep.name}`
              const rebootKey = `reboot-${ep.name}`
              const diagnoseKey = `diagnose-${ep.name}`
              const resultKey =
                actionResults[wakeKey] ||
                actionResults[restartKey] ||
                actionResults[pingKey] ||
                actionResults[loadKey] ||
                actionResults[rebootKey] ||
                actionResults[diagnoseKey]

              return (
                <div key={ep.name} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-stone-400" />
                      <span className="text-sm font-medium text-stone-200">{label}</span>
                      {ep.online ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {ep.latencyMs}ms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-500 mb-2">
                    {ep.model}
                    {ep.online && ep.modelReady && ' — ready'}
                    {ep.online && !ep.modelReady && ' — not loaded'}
                    {!ep.online && ep.error && ` — ${ep.error}`}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {!ep.online ? (
                      <ActionButton
                        label="Wake"
                        icon={<Power className="h-3 w-3" />}
                        loading={!!actionLoading[wakeKey]}
                        onClick={() => runAction('wake', ep.name)}
                        color="emerald"
                      />
                    ) : (
                      <ActionButton
                        label="Restart"
                        icon={<RefreshCw className="h-3 w-3" />}
                        loading={!!actionLoading[restartKey]}
                        onClick={() => runAction('restart', ep.name)}
                        color="amber"
                      />
                    )}
                    <ActionButton
                      label="Ping"
                      icon={<Wifi className="h-3 w-3" />}
                      loading={!!actionLoading[pingKey]}
                      onClick={() => runAction('ping', ep.name)}
                      color="blue"
                    />
                    {ep.online && !ep.modelReady && (
                      <ActionButton
                        label="Load Model"
                        icon={<Loader2 className="h-3 w-3" />}
                        loading={!!actionLoading[loadKey]}
                        onClick={() => runAction('load-model', ep.name)}
                        color="purple"
                      />
                    )}
                    <ActionButton
                      label="Diagnose"
                      icon={<Stethoscope className="h-3 w-3" />}
                      loading={!!actionLoading[diagnoseKey]}
                      onClick={() => runAction('diagnose', ep.name)}
                      color="blue"
                    />
                    {ep.name === 'pi' && !ep.online && (
                      <ActionButton
                        label="Reboot Pi"
                        icon={<RotateCcw className="h-3 w-3" />}
                        loading={!!actionLoading[rebootKey]}
                        onClick={() => runAction('reboot', ep.name)}
                        color="red"
                      />
                    )}
                  </div>

                  {resultKey && (
                    <div
                      className={`mt-2 text-[11px] ${resultKey.success ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {resultKey.message}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="px-4 py-2 border-t border-stone-800 bg-stone-950/50">
            <div className="text-[10px] text-stone-600">
              Private AI — data stays on your devices
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({
  label,
  icon,
  loading,
  onClick,
  color,
}: {
  label: string
  icon: React.ReactNode
  loading: boolean
  onClick: () => void
  color: 'emerald' | 'amber' | 'blue' | 'purple' | 'red'
}) {
  const colors = {
    emerald: 'bg-emerald-950 border-emerald-800 text-emerald-400 hover:bg-emerald-900',
    amber: 'bg-amber-950 border-amber-800 text-amber-400 hover:bg-amber-900',
    blue: 'bg-blue-950 border-blue-800 text-blue-400 hover:bg-blue-900',
    purple: 'bg-purple-950 border-purple-800 text-purple-400 hover:bg-purple-900',
    red: 'bg-red-950 border-red-800 text-red-400 hover:bg-red-900',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
      {label}
    </button>
  )
}
