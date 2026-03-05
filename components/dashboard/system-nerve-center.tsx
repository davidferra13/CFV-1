/* eslint-disable react-hooks/exhaustive-deps */
'use client'

// System Nerve Center â€” Dashboard Panel
// Monitors all ChefFlow services, shows health at a glance,
// and provides one-click fix buttons for auto-fixable issues.
// Admin-only â€” renders nothing for non-admins.

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import type {
  ServiceHealthResult,
  ServiceStatus,
  SweepResult,
  FixAction,
  FixResult,
  ServiceTier,
} from '@/lib/system/types'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const POLL_HEALTHY = 120_000
const POLL_DEGRADED = 30_000
const POLL_ERROR = 15_000

const TIER_LABELS: Record<ServiceTier, string> = {
  0: 'Network',
  1: 'Database',
  2: 'Auth',
  3: 'App',
  4: 'AI',
  5: 'Services',
  6: 'Infrastructure',
}

const STATUS_DOT: Record<ServiceStatus, string> = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500 animate-pulse',
  error: 'bg-red-500 animate-pulse',
  unknown: 'bg-stone-500',
  unchecked: 'bg-stone-600',
}

const STATUS_TEXT: Record<ServiceStatus, string> = {
  healthy: 'text-emerald-400',
  degraded: 'text-amber-400',
  error: 'text-red-400',
  unknown: 'text-stone-500',
  unchecked: 'text-stone-600',
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function SystemNerveCenter() {
  const [sweep, setSweep] = useState<SweepResult | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [sweeping, setSweeping] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showDangerousConfirm, setShowDangerousConfirm] = useState(false)
  const [pendingFixAction, setPendingFixAction] = useState<FixAction | null>(null)

  // â”€â”€ Fetch health â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/system/health', { cache: 'no-store' })
      if (res.status === 401) {
        setIsAdmin(false)
        return
      }
      setIsAdmin(true)
      const data: SweepResult = await res.json()
      setSweep(data)
    } catch {
      // Network error â€” don't crash, just keep last known state
    } finally {
      setLoading(false)
    }
  }, [])

  // â”€â”€ Polling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  useEffect(() => {
    if (isAdmin === false) return

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      const interval =
        !sweep || sweep.overallStatus === 'error'
          ? POLL_ERROR
          : sweep.overallStatus === 'degraded'
            ? POLL_DEGRADED
            : POLL_HEALTHY
      timerRef.current = setTimeout(async () => {
        await fetchHealth()
        schedule()
      }, interval)
    }
    schedule()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sweep?.overallStatus, isAdmin, fetchHealth])

  // â”€â”€ Sweep All â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSweep = async () => {
    setSweeping(true)
    try {
      const res = await fetch('/api/system/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sweep', autoFix: true }),
      })
      const data: SweepResult = await res.json()
      setSweep(data)

      if (data.fixes.length > 0) {
        const fixed = data.fixes.filter((f) => f.success).length
        const failed = data.fixes.filter((f) => !f.success).length
        if (fixed > 0 && failed === 0) {
          toast.success(`Sweep complete: ${fixed} fix${fixed > 1 ? 'es' : ''} applied`)
        } else if (fixed > 0 && failed > 0) {
          toast.warning(`Sweep: ${fixed} fixed, ${failed} need attention`)
        } else {
          toast.error(`Sweep: ${failed} fix${failed > 1 ? 'es' : ''} failed`)
        }
      } else if (data.errorCount > 0 || data.degradedCount > 0) {
        toast.warning(
          `${data.healthyCount} healthy, ${data.errorCount + data.degradedCount} need attention`
        )
      } else {
        toast.success(`All ${data.healthyCount} services healthy`)
      }
    } catch {
      toast.error('Sweep failed â€” check console')
    } finally {
      setSweeping(false)
    }
  }

  // â”€â”€ Execute Fix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFix = async (action: FixAction) => {
    if (action.dangerous) {
      setPendingFixAction(action)
      setShowDangerousConfirm(true)
      return
    }
    await executeFix(action)
  }

  const handleConfirmedFix = async () => {
    if (!pendingFixAction) return
    setShowDangerousConfirm(false)
    await executeFix(pendingFixAction)
    setPendingFixAction(null)
  }

  const executeFix = async (action: FixAction) => {
    setActionLoading((prev) => ({ ...prev, [action.id]: true }))
    try {
      const res = await fetch('/api/system/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix', actionId: action.id }),
      })
      const result: FixResult = await res.json()

      if (result.success) {
        toast.success(`${action.label}: ${result.message}`)
      } else {
        toast.error(`${action.label}: ${result.message}`)
      }

      // Refresh health after fix
      setTimeout(fetchHealth, 1500)
    } catch {
      toast.error(`${action.label} failed`)
    } finally {
      setActionLoading((prev) => ({ ...prev, [action.id]: false }))
    }
  }

  // â”€â”€ Guard: not admin or still loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (isAdmin === false) return null
  if (loading || isAdmin === null) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6">
        <div className="flex items-center gap-2 text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading system health...</span>
        </div>
      </div>
    )
  }

  // â”€â”€ Group services by display tier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const services = sweep?.services ?? []
  const grouped = new Map<ServiceTier, ServiceHealthResult[]>()
  for (const svc of services) {
    const list = grouped.get(svc.tier) || []
    list.push(svc)
    grouped.set(svc.tier, list)
  }

  // Merge tiers 0-3 into "Core" for compact display
  const coreTiers = [0, 1, 2, 3] as ServiceTier[]
  const coreServices = coreTiers.flatMap((t) => grouped.get(t) || [])

  const displayGroups: { label: string; services: ServiceHealthResult[] }[] = [
    { label: 'Core', services: coreServices },
    { label: 'AI', services: grouped.get(4) || [] },
    { label: 'Services', services: grouped.get(5) || [] },
    { label: 'Infrastructure', services: grouped.get(6) || [] },
  ].filter((g) => g.services.length > 0)

  // â”€â”€ Overall status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const overallColor =
    sweep?.overallStatus === 'error'
      ? 'text-red-400'
      : sweep?.overallStatus === 'degraded'
        ? 'text-amber-400'
        : 'text-emerald-400'

  const overallDot =
    sweep?.overallStatus === 'error'
      ? 'bg-red-500 animate-pulse'
      : sweep?.overallStatus === 'degraded'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-emerald-500'

  const ago = sweep ? timeSince(sweep.timestamp) : ''

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <Shield className="h-4 w-4 text-brand-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-stone-200">System Health</span>
          <span className={`h-2 w-2 rounded-full ${overallDot}`} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSweep}
            disabled={sweeping}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            {sweeping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            {sweeping ? 'Healing...' : 'Sweep All'}
          </button>
          <button
            type="button"
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-50"
            aria-label="Refresh health check"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {sweep && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-stone-800 bg-stone-950/30">
          <span className={`text-xs font-medium ${overallColor}`}>
            {sweep.healthyCount} healthy
          </span>
          {sweep.degradedCount > 0 && (
            <span className="text-xs font-medium text-amber-400">
              {sweep.degradedCount} degraded
            </span>
          )}
          {sweep.errorCount > 0 && (
            <span className="text-xs font-medium text-red-400">
              {sweep.errorCount} error{sweep.errorCount > 1 ? 's' : ''}
            </span>
          )}
          {sweep.uncheckedCount > 0 && (
            <span className="text-xs text-stone-600">{sweep.uncheckedCount} skipped</span>
          )}
          <span className="ml-auto text-[10px] text-stone-600">{ago}</span>
        </div>
      )}

      {/* Service groups */}
      <div className="divide-y divide-stone-800">
        {displayGroups.map((group) => (
          <div key={group.label}>
            {/* Group header */}
            <div className="px-4 py-1.5 bg-stone-950/40">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                {group.label}
              </span>
            </div>

            {/* Service rows */}
            {group.services.map((svc) => {
              const isExpanded = expanded === svc.id
              const hasActions = svc.fixActions.length > 0 || svc.error
              const isExpandable = hasActions || svc.status === 'error' || svc.status === 'degraded'

              return (
                <div key={svc.id}>
                  {/* Service row */}
                  <button
                    type="button"
                    onClick={() =>
                      isExpandable ? setExpanded(isExpanded ? null : svc.id) : undefined
                    }
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      isExpandable ? 'hover:bg-stone-800/50 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {/* Status dot */}
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[svc.status]}`}
                      aria-hidden="true"
                    />

                    {/* Name */}
                    <span className="text-xs font-medium text-stone-300 w-24 shrink-0">
                      {svc.name}
                    </span>

                    {/* Detail */}
                    <span className={`text-xs truncate flex-1 ${STATUS_TEXT[svc.status]}`}>
                      {svc.detail}
                    </span>

                    {/* Latency */}
                    {svc.latencyMs != null && (
                      <span className="text-[10px] text-stone-600 shrink-0 tabular-nums">
                        {svc.latencyMs}ms
                      </span>
                    )}

                    {/* Expand arrow */}
                    {isExpandable && (
                      <span className="shrink-0 text-stone-600">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-0 pl-9 space-y-2">
                      {/* Error message */}
                      {svc.error && (
                        <p className="text-[11px] text-red-400/80 leading-relaxed">{svc.error}</p>
                      )}

                      {/* Circuit breaker info */}
                      {svc.circuitBreakerState && (
                        <p className="text-[11px] text-stone-500">
                          Circuit breaker: {svc.circuitBreakerState}
                          {svc.circuitBreakerFailures
                            ? ` (${svc.circuitBreakerFailures} failures)`
                            : ''}
                        </p>
                      )}

                      {/* Fix buttons */}
                      {svc.fixActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {svc.fixActions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleFix(action)
                              }}
                              disabled={!!actionLoading[action.id]}
                              title={action.description}
                              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                                action.dangerous
                                  ? 'bg-red-950 text-red-300 hover:bg-red-900 border border-red-800'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                              }`}
                            >
                              {actionLoading[action.id] && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Docs link for manual-fix services */}
                      {svc.fixActions.length === 0 && svc.status !== 'healthy' && (
                        <a
                          href="/settings"
                          className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          Go to Settings
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <ConfirmModal
        open={showDangerousConfirm}
        title={pendingFixAction?.label ?? 'Confirm action'}
        description={`${pendingFixAction?.description ?? ''}\n\nThis action may disrupt the beta server. Continue?`}
        confirmLabel="Continue"
        variant="danger"
        loading={pendingFixAction ? !!actionLoading[pendingFixAction.id] : false}
        onConfirm={handleConfirmedFix}
        onCancel={() => {
          setShowDangerousConfirm(false)
          setPendingFixAction(null)
        }}
      />

      {/* Footer */}
      {sweep && (
        <div className="px-4 py-2 border-t border-stone-800 bg-stone-950/30">
          <div className="flex items-center gap-1.5 text-[10px] text-stone-600">
            <Activity className="h-3 w-3" aria-hidden="true" />
            Checked {services.length} services in {(sweep.sweepDurationMs / 1000).toFixed(1)}s
          </div>
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`
  return `${Math.round(ms / 3_600_000)}h ago`
}
