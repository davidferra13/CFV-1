'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { saveAiPreferences, disableRemy } from '@/lib/ai/privacy-actions'
import {
  deleteRemyApprovalPolicy,
  upsertRemyApprovalPolicy,
  type RemyApprovalDecision,
  type RemyApprovalPolicyRecord,
  type RemyApprovalPolicyTarget,
} from '@/lib/ai/remy-approval-policy-actions'
import type {
  RemyActionAuditEntry,
  RemyActionAuditStatus,
  RemyActionAuditSummary,
} from '@/lib/ai/remy-action-audit-actions'

type Props = {
  targets: RemyApprovalPolicyTarget[]
  initialPolicies: RemyApprovalPolicyRecord[]
  initialAuditRows: RemyActionAuditEntry[]
  auditSummary: RemyActionAuditSummary
  remyEnabled: boolean
  onboardingCompleted: boolean
}

type PolicyMode = 'default' | RemyApprovalDecision

type DraftPolicy = {
  mode: PolicyMode
  reason: string
  enabled: boolean
}

function toPolicyMap(
  policies: RemyApprovalPolicyRecord[]
): Record<string, RemyApprovalPolicyRecord> {
  const map: Record<string, RemyApprovalPolicyRecord> = {}
  for (const policy of policies) map[policy.taskType] = policy
  return map
}

function toDraftMap(
  targets: RemyApprovalPolicyTarget[],
  policyMap: Record<string, RemyApprovalPolicyRecord>
): Record<string, DraftPolicy> {
  const out: Record<string, DraftPolicy> = {}
  for (const target of targets) {
    const policy = policyMap[target.taskType]
    out[target.taskType] = {
      mode: policy && policy.enabled ? policy.decision : 'default',
      reason: policy?.reason ?? '',
      enabled: policy?.enabled ?? true,
    }
  }
  return out
}

function normalizeReason(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(durationMs: number | null) {
  if (typeof durationMs !== 'number' || durationMs < 0) return '-'
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(1)} s`
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function statusBadgeClass(status: RemyActionAuditStatus): string {
  switch (status) {
    case 'success':
      return 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
    case 'blocked':
      return 'border-amber-800 bg-amber-950/40 text-amber-300'
    case 'error':
      return 'border-red-800 bg-red-950/40 text-red-300'
    case 'started':
      return 'border-brand-800 bg-brand-950/40 text-brand-300'
    default:
      return 'border-stone-700 bg-stone-900 text-stone-300'
  }
}

function safetyBadgeClass(safety: RemyApprovalPolicyTarget['safety']): string {
  switch (safety) {
    case 'restricted':
      return 'border-red-800 bg-red-950/40 text-red-300'
    case 'significant':
      return 'border-amber-800 bg-amber-950/40 text-amber-300'
    case 'reversible':
      return 'border-stone-700 bg-stone-900 text-stone-300'
    default:
      return 'border-stone-700 bg-stone-900 text-stone-300'
  }
}

function formatAccessDomains(domains: string[]): string {
  return domains.length > 0 ? domains.join(', ') : 'none'
}

function getOutcomeText(entry: RemyActionAuditEntry): string {
  if (entry.errorMessage) return entry.errorMessage
  const payload = entry.resultPayload as Record<string, unknown> | null
  if (payload && typeof payload.message === 'string') return payload.message
  if (entry.status === 'success') return 'Completed.'
  if (entry.status === 'blocked') return 'Blocked by policy or system safety.'
  if (entry.status === 'started') return 'Started and awaiting finalization.'
  return '-'
}

export function RemyControlClient({
  targets,
  initialPolicies,
  initialAuditRows,
  auditSummary,
  remyEnabled,
  onboardingCompleted,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [runtimeSaving, setRuntimeSaving] = useState(false)
  const [runtimeEnabled, setRuntimeEnabled] = useState(remyEnabled)
  const [policyMap, setPolicyMap] = useState<Record<string, RemyApprovalPolicyRecord>>(() =>
    toPolicyMap(initialPolicies)
  )
  const [draftMap, setDraftMap] = useState<Record<string, DraftPolicy>>(() =>
    toDraftMap(targets, toPolicyMap(initialPolicies))
  )
  const [savingTaskType, setSavingTaskType] = useState<string | null>(null)
  const [targetQuery, setTargetQuery] = useState('')
  const [safetyFilter, setSafetyFilter] = useState<
    'all' | 'reversible' | 'significant' | 'restricted'
  >('all')
  const [auditQuery, setAuditQuery] = useState('')
  const [auditStatus, setAuditStatus] = useState<'all' | RemyActionAuditStatus>('all')

  const activeOverrides = useMemo(
    () => Object.values(policyMap).filter((policy) => policy.enabled),
    [policyMap]
  )

  const filteredTargets = useMemo(() => {
    const query = targetQuery.trim().toLowerCase()
    return targets.filter((target) => {
      if (safetyFilter !== 'all' && target.safety !== safetyFilter) return false
      if (!query) return true
      return (
        target.name.toLowerCase().includes(query) || target.taskType.toLowerCase().includes(query)
      )
    })
  }, [targets, targetQuery, safetyFilter])

  const filteredAuditRows = useMemo(() => {
    const query = auditQuery.trim().toLowerCase()
    return initialAuditRows.filter((entry) => {
      if (auditStatus !== 'all' && entry.status !== auditStatus) return false
      if (!query) return true
      return (
        entry.taskType.toLowerCase().includes(query) ||
        entry.status.toLowerCase().includes(query) ||
        getOutcomeText(entry).toLowerCase().includes(query)
      )
    })
  }, [initialAuditRows, auditQuery, auditStatus])

  const qualityMetrics = useMemo(() => {
    const finalized = initialAuditRows.filter((row) => row.status !== 'started')
    const total = finalized.length
    const success = finalized.filter((row) => row.status === 'success').length
    const blocked = finalized.filter((row) => row.status === 'blocked').length
    const errors = finalized.filter((row) => row.status === 'error').length
    const durations = finalized
      .map((row) => row.durationMs)
      .filter((duration): duration is number => typeof duration === 'number' && duration >= 0)
      .sort((a, b) => a - b)

    const p95Duration =
      durations.length > 0
        ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]
        : null

    return {
      total,
      approveRate: total > 0 ? success / total : 0,
      blockRate: total > 0 ? blocked / total : 0,
      errorRate: total > 0 ? errors / total : 0,
      p95Duration,
    }
  }, [initialAuditRows])

  const policyStatsByTaskType = useMemo(() => {
    const stats = new Map<
      string,
      { total: number; success: number; blocked: number; error: number; lastAt: string | null }
    >()
    for (const entry of initialAuditRows) {
      const current = stats.get(entry.taskType) ?? {
        total: 0,
        success: 0,
        blocked: 0,
        error: 0,
        lastAt: null,
      }
      current.total += 1
      if (entry.status === 'success') current.success += 1
      if (entry.status === 'blocked') current.blocked += 1
      if (entry.status === 'error') current.error += 1
      if (
        entry.startedAt &&
        (!current.lastAt ||
          new Date(entry.startedAt).getTime() > new Date(current.lastAt).getTime())
      ) {
        current.lastAt = entry.startedAt
      }
      stats.set(entry.taskType, current)
    }
    return stats
  }, [initialAuditRows])

  const ribrandTargets = useMemo(() => {
    return targets
      .map((target) => {
        const stats = policyStatsByTaskType.get(target.taskType)
        if (!stats) return null
        const failureCount = stats.error + stats.blocked
        const failureRate = stats.total > 0 ? failureCount / stats.total : 0
        return {
          target,
          stats,
          failureCount,
          failureRate,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => row.stats.total >= 3 && row.failureRate >= 0.35)
      .sort((a, b) => {
        if (b.failureRate !== a.failureRate) return b.failureRate - a.failureRate
        return b.failureCount - a.failureCount
      })
      .slice(0, 8)
  }, [policyStatsByTaskType, targets])

  function rowIsDirty(target: RemyApprovalPolicyTarget): boolean {
    const persisted = policyMap[target.taskType]
    const draft = draftMap[target.taskType] ?? { mode: 'default', reason: '', enabled: true }
    const persistedMode: PolicyMode =
      persisted && persisted.enabled ? persisted.decision : 'default'
    const persistedReason = persisted?.reason ?? ''
    const persistedEnabled = persisted?.enabled ?? true

    return (
      draft.mode !== persistedMode ||
      normalizeReason(draft.reason) !== normalizeReason(persistedReason) ||
      (draft.mode !== 'default' && draft.enabled !== persistedEnabled)
    )
  }

  async function handleEnableRemy() {
    if (!onboardingCompleted) {
      toast.error('Complete AI onboarding in the Trust Center before enabling Remy.')
      return
    }
    setRuntimeSaving(true)
    try {
      const result = await saveAiPreferences({ remy_enabled: true })
      if (!result.success) throw new Error('Failed to enable Remy')
      setRuntimeEnabled(true)
      toast.success('Remy enabled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enable Remy')
    } finally {
      setRuntimeSaving(false)
    }
  }

  async function handleDisableRemy() {
    setRuntimeSaving(true)
    try {
      const result = await disableRemy()
      if (!result.success) throw new Error('Failed to disable Remy')
      setRuntimeEnabled(false)
      toast.success('Remy disabled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable Remy')
    } finally {
      setRuntimeSaving(false)
    }
  }

  async function handleSavePolicy(target: RemyApprovalPolicyTarget) {
    if (target.safety === 'restricted') {
      toast.error('Restricted actions are always blocked by system safety.')
      return
    }

    const draft = draftMap[target.taskType] ?? { mode: 'default', reason: '', enabled: true }
    setSavingTaskType(target.taskType)
    try {
      if (draft.mode === 'default') {
        await deleteRemyApprovalPolicy(target.taskType)
        setPolicyMap((previous) => {
          const next = { ...previous }
          delete next[target.taskType]
          return next
        })
        toast.success(`Reset ${target.name} to default policy`)
      } else {
        const saved = await upsertRemyApprovalPolicy({
          taskType: target.taskType,
          decision: draft.mode,
          reason: normalizeReason(draft.reason),
          enabled: draft.enabled,
        })
        setPolicyMap((previous) => ({ ...previous, [target.taskType]: saved }))
        setDraftMap((previous) => ({
          ...previous,
          [target.taskType]: {
            mode: saved.enabled ? saved.decision : 'default',
            reason: saved.reason ?? '',
            enabled: saved.enabled,
          },
        }))
        toast.success(`Updated ${target.name}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save policy')
    } finally {
      setSavingTaskType(null)
    }
  }

  function handleResetDraft(target: RemyApprovalPolicyTarget) {
    const persisted = policyMap[target.taskType]
    setDraftMap((previous) => ({
      ...previous,
      [target.taskType]: {
        mode: persisted && persisted.enabled ? persisted.decision : 'default',
        reason: persisted?.reason ?? '',
        enabled: persisted?.enabled ?? true,
      },
    }))
  }

  async function handleQuickBlockAction(target: RemyApprovalPolicyTarget) {
    if (target.safety === 'restricted') {
      toast.error('Restricted actions are already blocked by system safety.')
      return
    }
    setSavingTaskType(target.taskType)
    try {
      const saved = await upsertRemyApprovalPolicy({
        taskType: target.taskType,
        decision: 'block',
        enabled: true,
        reason: 'Blocked from reliability recommendations in Remy Control Center.',
      })
      setPolicyMap((previous) => ({ ...previous, [target.taskType]: saved }))
      setDraftMap((previous) => ({
        ...previous,
        [target.taskType]: {
          mode: 'block',
          reason: saved.reason ?? '',
          enabled: saved.enabled,
        },
      }))
      toast.success(`Blocked ${target.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to block action')
    } finally {
      setSavingTaskType(null)
    }
  }

  function handleBulkBlockSignificant() {
    const significantTargets = targets.filter((target) => target.safety === 'significant')
    if (significantTargets.length === 0) {
      toast.error('No significant actions were found.')
      return
    }

    startTransition(async () => {
      try {
        const updates = await Promise.all(
          significantTargets.map((target) =>
            upsertRemyApprovalPolicy({
              taskType: target.taskType,
              decision: 'block',
              enabled: true,
              reason: 'Blocked in bulk policy update for significant actions.',
            })
          )
        )

        setPolicyMap((previous) => {
          const next = { ...previous }
          for (const saved of updates) next[saved.taskType] = saved
          return next
        })

        setDraftMap((previous) => {
          const next = { ...previous }
          for (const saved of updates) {
            next[saved.taskType] = {
              mode: 'block',
              reason: saved.reason ?? '',
              enabled: saved.enabled,
            }
          }
          return next
        })

        toast.success(`Blocked ${updates.length} significant actions`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Bulk update failed')
      }
    })
  }

  function handleEmergencyLockAll() {
    const lockTargets = targets.filter((target) => target.safety !== 'restricted')
    if (lockTargets.length === 0) {
      toast.error('No lockable actions were found.')
      return
    }

    startTransition(async () => {
      try {
        const updates = await Promise.all(
          lockTargets.map((target) =>
            upsertRemyApprovalPolicy({
              taskType: target.taskType,
              decision: 'block',
              enabled: true,
              reason: 'Emergency lock is active for all Remy actions.',
            })
          )
        )

        setPolicyMap((previous) => {
          const next = { ...previous }
          for (const saved of updates) next[saved.taskType] = saved
          return next
        })

        setDraftMap((previous) => {
          const next = { ...previous }
          for (const saved of updates) {
            next[saved.taskType] = {
              mode: 'block',
              reason: saved.reason ?? '',
              enabled: saved.enabled,
            }
          }
          return next
        })

        toast.success(`Emergency lock applied to ${updates.length} actions`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Emergency lock failed')
      }
    })
  }

  function handleResetAllOverrides() {
    const taskTypes = Object.keys(policyMap)
    if (taskTypes.length === 0) {
      toast.success('No overrides to reset')
      return
    }

    startTransition(async () => {
      try {
        await Promise.all(taskTypes.map((taskType) => deleteRemyApprovalPolicy(taskType)))
        setPolicyMap({})
        setDraftMap((previous) => {
          const next = { ...previous }
          for (const target of targets) {
            next[target.taskType] = {
              mode: 'default',
              reason: '',
              enabled: true,
            }
          }
          return next
        })
        toast.success(`Reset ${taskTypes.length} overrides`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reset overrides')
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">Remy Runtime</p>
          <p className="mt-2 text-sm font-semibold text-stone-100">
            {runtimeEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">Onboarding</p>
          <p className="mt-2 text-sm font-semibold text-stone-100">
            {onboardingCompleted ? 'Completed' : 'Incomplete'}
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">Overrides</p>
          <p className="mt-2 text-sm font-semibold text-stone-100">{activeOverrides.length}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">Audit (14d)</p>
          <p className="mt-2 text-sm font-semibold text-stone-100">
            {auditSummary.success} success / {auditSummary.error} errors
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">Approve Rate</p>
          <p className="mt-2 text-sm font-semibold text-stone-100">
            {formatPercent(qualityMetrics.approveRate)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">Block Rate</p>
          <p className="mt-2 text-sm font-semibold text-stone-100">
            {formatPercent(qualityMetrics.blockRate)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">Error Rate</p>
          <p className="mt-2 text-sm font-semibold text-stone-100">
            {formatPercent(qualityMetrics.errorRate)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-400">P95 Duration</p>
          <p className="mt-2 text-sm font-semibold text-stone-100">
            {formatDuration(qualityMetrics.p95Duration)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900 p-4">
        <h2 className="text-base font-semibold text-stone-100">Runtime Control</h2>
        <p className="mt-1 text-sm text-stone-400">
          Control whether Remy appears in the chef portal. Disabled means no Remy UI is rendered.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleEnableRemy}
            disabled={runtimeSaving || runtimeEnabled || !onboardingCompleted}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enable Remy
          </button>
          <button
            type="button"
            onClick={handleDisableRemy}
            disabled={runtimeSaving || !runtimeEnabled}
            className="rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Disable Remy
          </button>
          {!onboardingCompleted && (
            <Link
              href="/settings/ai-privacy"
              className="rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800"
            >
              Complete onboarding
            </Link>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900 p-4">
        <h2 className="text-base font-semibold text-stone-100">Approval Policy Matrix</h2>
        <p className="mt-1 text-sm text-stone-400">
          Override action-level policy. Restricted actions are always blocked by system safety.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={targetQuery}
            onChange={(event) => setTargetQuery(event.target.value)}
            placeholder="Filter by action name or task type"
            className="min-w-[260px] flex-1 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
          />
          <select
            value={safetyFilter}
            onChange={(event) =>
              setSafetyFilter(
                event.target.value as 'all' | 'reversible' | 'significant' | 'restricted'
              )
            }
            className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
          >
            <option value="all">All safety levels</option>
            <option value="reversible">Reversible</option>
            <option value="significant">Significant</option>
            <option value="restricted">Restricted</option>
          </select>
          <button
            type="button"
            onClick={handleBulkBlockSignificant}
            disabled={isPending}
            className="rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Block all significant
          </button>
          <button
            type="button"
            onClick={handleEmergencyLockAll}
            disabled={isPending}
            className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Emergency lock all
          </button>
          <button
            type="button"
            onClick={handleResetAllOverrides}
            disabled={isPending}
            className="rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset all overrides
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-800">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="bg-stone-950 text-stone-400">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Action</th>
                <th className="px-2 py-2 text-left font-medium">Access</th>
                <th className="px-2 py-2 text-left font-medium">Safety</th>
                <th className="px-2 py-2 text-left font-medium">Default</th>
                <th className="px-2 py-2 text-left font-medium">Last run</th>
                <th className="px-2 py-2 text-left font-medium">Success rate</th>
                <th className="px-2 py-2 text-left font-medium">Mode</th>
                <th className="px-2 py-2 text-left font-medium">Reason</th>
                <th className="px-2 py-2 text-left font-medium">Enabled</th>
                <th className="px-2 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 bg-stone-900">
              {filteredTargets.map((target) => {
                const persisted = policyMap[target.taskType]
                const draft = draftMap[target.taskType] ?? {
                  mode: 'default',
                  reason: '',
                  enabled: true,
                }
                const restricted = target.safety === 'restricted'
                const dirty = rowIsDirty(target)
                const isSavingRow = savingTaskType === target.taskType
                const stats = policyStatsByTaskType.get(target.taskType)
                const lastRun = stats?.lastAt ? formatDateTime(stats.lastAt) : '-'
                const successRate =
                  stats && stats.total > 0
                    ? `${Math.round((stats.success / stats.total) * 100)}% (${stats.success}/${stats.total})`
                    : '-'

                return (
                  <tr key={target.taskType}>
                    <td className="px-2 py-2 align-top">
                      <p className="font-medium text-stone-100">{target.name}</p>
                      <p className="font-mono text-xs text-stone-500">{target.taskType}</p>
                      <p className="mt-1 text-xs text-stone-500">{target.auditLabel}</p>
                    </td>
                    <td className="px-2 py-2 align-top text-xs text-stone-400">
                      <p>
                        <span className="text-stone-500">Reads:</span>{' '}
                        {formatAccessDomains(target.reads)}
                      </p>
                      <p>
                        <span className="text-stone-500">Writes:</span>{' '}
                        {formatAccessDomains(target.writes)}
                      </p>
                      <p className="mt-1 text-stone-500">
                        {target.requiresPrivateModel ? 'Private model' : 'Platform allowed'} ·{' '}
                        {target.requiresApproval ? 'Approval required' : 'No approval required'}
                      </p>
                      {target.controlledBy.length > 0 && (
                        <p className="mt-1 text-amber-300">
                          Control: {target.controlledBy.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs-tight ${safetyBadgeClass(target.safety)}`}
                      >
                        {target.safety}
                      </span>
                    </td>
                    <td className="px-2 py-2 align-top text-xs text-stone-400">
                      {target.defaultDecision}
                    </td>
                    <td className="px-2 py-2 align-top text-xs text-stone-400">{lastRun}</td>
                    <td className="px-2 py-2 align-top text-xs text-stone-400">{successRate}</td>
                    <td className="px-2 py-2 align-top">
                      <select
                        value={restricted ? 'block' : draft.mode}
                        disabled={restricted || isSavingRow}
                        onChange={(event) =>
                          setDraftMap((previous) => ({
                            ...previous,
                            [target.taskType]: {
                              ...draft,
                              mode: event.target.value as PolicyMode,
                            },
                          }))
                        }
                        className="w-[190px] rounded-md border border-stone-700 bg-stone-950 px-2 py-1.5 text-xs text-stone-100"
                      >
                        <option value="default">Default</option>
                        <option value="require_approval">Require approval</option>
                        <option value="block">Block</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={draft.reason}
                        disabled={restricted || draft.mode === 'default' || isSavingRow}
                        onChange={(event) =>
                          setDraftMap((previous) => ({
                            ...previous,
                            [target.taskType]: {
                              ...draft,
                              reason: event.target.value,
                            },
                          }))
                        }
                        placeholder="Optional reason"
                        className="w-[320px] rounded-md border border-stone-700 bg-stone-950 px-2 py-1.5 text-xs text-stone-100 placeholder:text-stone-500"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <label className="inline-flex items-center gap-2 text-xs text-stone-300">
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          disabled={restricted || draft.mode === 'default' || isSavingRow}
                          onChange={(event) =>
                            setDraftMap((previous) => ({
                              ...previous,
                              [target.taskType]: {
                                ...draft,
                                enabled: event.target.checked,
                              },
                            }))
                          }
                        />
                        Enabled
                      </label>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSavePolicy(target)}
                          disabled={restricted || !dirty || isSavingRow}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSavingRow ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetDraft(target)}
                          disabled={isSavingRow || !dirty}
                          className="rounded-md border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredTargets.length === 0 && (
          <p className="mt-3 text-sm text-stone-500">No actions match your current filters.</p>
        )}
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900 p-4">
        <h2 className="text-base font-semibold text-stone-100">
          Current Overrides ({activeOverrides.length})
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-800">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-950 text-stone-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Task</th>
                <th className="px-3 py-2 text-left font-medium">Decision</th>
                <th className="px-3 py-2 text-left font-medium">Enabled</th>
                <th className="px-3 py-2 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 bg-stone-900">
              {activeOverrides.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-stone-400" colSpan={4}>
                    No overrides are active.
                  </td>
                </tr>
              ) : (
                activeOverrides
                  .sort((a, b) => a.taskType.localeCompare(b.taskType))
                  .map((policy) => (
                    <tr key={policy.taskType}>
                      <td className="px-3 py-2 font-mono text-xs text-stone-200">
                        {policy.taskType}
                      </td>
                      <td className="px-3 py-2 text-stone-200">{policy.decision}</td>
                      <td className="px-3 py-2 text-stone-200">{policy.enabled ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-stone-400">{policy.reason ?? '-'}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900 p-4">
        <h2 className="text-base font-semibold text-stone-100">Reliability Recommendations</h2>
        <p className="mt-1 text-sm text-stone-400">
          Actions below have high recent failure or block rates. Review and block unstable actions
          while you improve quality.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-800">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-950 text-stone-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Attempts</th>
                <th className="px-3 py-2 text-left font-medium">Failures + blocked</th>
                <th className="px-3 py-2 text-left font-medium">Failure rate</th>
                <th className="px-3 py-2 text-left font-medium">Last run</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 bg-stone-900">
              {ribrandTargets.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-stone-400" colSpan={6}>
                    No high-risk actions detected in the current audit window.
                  </td>
                </tr>
              ) : (
                ribrandTargets.map(({ target, stats, failureCount, failureRate }) => (
                  <tr key={target.taskType}>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium text-stone-100">{target.name}</p>
                      <p className="font-mono text-xs text-stone-500">{target.taskType}</p>
                    </td>
                    <td className="px-3 py-2 text-stone-300">{stats.total}</td>
                    <td className="px-3 py-2 text-stone-300">{failureCount}</td>
                    <td className="px-3 py-2 text-amber-300">{Math.round(failureRate * 100)}%</td>
                    <td className="px-3 py-2 text-stone-400">{formatDateTime(stats.lastAt)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleQuickBlockAction(target)}
                        disabled={savingTaskType === target.taskType}
                        className="rounded-md border border-red-800 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingTaskType === target.taskType ? 'Blocking...' : 'Block action'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900 p-4">
        <h2 className="text-base font-semibold text-stone-100">Recent Action Audit Log</h2>
        <p className="mt-1 text-sm text-stone-400">
          Last {filteredAuditRows.length} entries. Started at {formatDateTime(auditSummary.since)}.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={auditQuery}
            onChange={(event) => setAuditQuery(event.target.value)}
            placeholder="Filter audit log by task, status, or message"
            className="min-w-[260px] flex-1 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
          />
          <select
            value={auditStatus}
            onChange={(event) =>
              setAuditStatus(event.target.value as 'all' | RemyActionAuditStatus)
            }
            className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="blocked">Blocked</option>
            <option value="error">Error</option>
            <option value="started">Started</option>
          </select>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-800">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-950 text-stone-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Started</th>
                <th className="px-3 py-2 text-left font-medium">Task</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Duration</th>
                <th className="px-3 py-2 text-left font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 bg-stone-900">
              {filteredAuditRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-stone-400" colSpan={5}>
                    No audit entries match your filter.
                  </td>
                </tr>
              ) : (
                filteredAuditRows.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 text-stone-200">{formatDateTime(entry.startedAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-stone-200">{entry.taskType}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs-tight ${statusBadgeClass(entry.status)}`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-stone-400">{formatDuration(entry.durationMs)}</td>
                    <td className="px-3 py-2 text-stone-400">{getOutcomeText(entry)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
