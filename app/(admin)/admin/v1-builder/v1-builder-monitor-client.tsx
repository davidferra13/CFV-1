'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { BuilderMonitorSnapshot } from '@/lib/admin/v1-builder-monitor'
import type { BuilderMode } from '@/lib/admin/v1-builder-intake'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  Database,
  FileText,
  GitBranch,
  Inbox,
  Pause,
  Play,
  Power,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
} from '@/components/ui/icons'

type Props = {
  initialSnapshot: BuilderMonitorSnapshot
}

const modeOptions: Array<{ mode: BuilderMode; label: string; icon: typeof Power }> = [
  { mode: 'off', label: 'Off', icon: Power },
  { mode: 'watch', label: 'Watch', icon: Activity },
  { mode: 'governed_build', label: 'Governed Build', icon: Play },
  { mode: 'pause_after_current', label: 'Pause After Current', icon: Pause },
  { mode: 'emergency_stop', label: 'Emergency Stop', icon: ShieldAlert },
]

export function V1BuilderMonitorClient({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [rawInput, setRawInput] = useState('')
  const [sourceLabel, setSourceLabel] = useState('Mission Control paste')
  const [submitting, setSubmitting] = useState(false)
  const [lastSignal, setLastSignal] = useState<string | null>(null)
  const [modeReason, setModeReason] = useState('')
  const [modeBusy, setModeBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/admin/v1-builder/status', { cache: 'no-store' })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const next = (await response.json()) as BuilderMonitorSnapshot
      setSnapshot(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(refresh, 5000)
    return () => window.clearInterval(id)
  }, [refresh])

  const runnerStatus = useMemo(() => {
    const status = String(snapshot.runnerStatus?.status ?? 'unknown')
    const reason = String(snapshot.runnerStatus?.reason ?? '')
    return { status, reason }
  }, [snapshot.runnerStatus])

  const activeClaim = snapshot.claims.find((claim) => claim.status === 'running')
  const healthTone =
    runnerStatus.status === 'blocked' && activeClaim ? 'green' : statusTone(runnerStatus.status)

  async function submitRawInput(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/v1-builder/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawInput, sourceLabel }),
      })
      const payload = (await response.json()) as {
        error?: string
        classification?: string
        destination?: string
      }
      if (!response.ok) throw new Error(payload.error ?? `Request failed: ${response.status}`)
      setLastSignal(
        `${payload.classification ?? 'classified'} -> ${payload.destination ?? 'recorded'}`
      )
      setRawInput('')
      setError(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function updateMode(mode: BuilderMode) {
    setModeBusy(mode)
    try {
      const response = await fetch('/api/admin/v1-builder/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, reason: modeReason }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? `Request failed: ${response.status}`)
      setModeReason('')
      setError(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setModeBusy(null)
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-stone-800 p-2">
            <Bot className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-100">V1 Builder Mission Control</h1>
            <p className="text-sm text-stone-500">
              {activeClaim ? activeClaim.displayTitle : 'Third monitor command center'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={statusTone(snapshot.mode.mode)} label={snapshot.mode.label} />
          <StatusPill tone={healthTone} label={runnerStatus.status} />
          {runnerStatus.reason && <StatusPill tone="stone" label={runnerStatus.reason} />}
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 hover:bg-stone-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {(error || snapshot.errors.length > 0) && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          {error && <p>{error}</p>}
          {snapshot.errors.slice(0, 3).map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 xl:grid-cols-10">
        <Metric label="Raw" value={snapshot.counts.rawInputs} />
        <Metric label="Signals" value={snapshot.counts.signals} />
        <Metric label="Approved" value={snapshot.counts.approved} />
        <Metric label="Running" value={snapshot.counts.running} tone="green" />
        <Metric label="Pending" value={snapshot.counts.pending} tone="amber" />
        <Metric label="Blocked" value={snapshot.counts.blocked} tone="red" />
        <Metric label="Research" value={snapshot.counts.research} tone="amber" />
        <Metric label="V2 Parked" value={snapshot.counts.parkedV2} />
        <Metric label="Receipts" value={snapshot.counts.receipts} />
        <Metric label="Processes" value={snapshot.counts.processes} />
      </div>

      <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Power className="h-4 w-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-200">Builder Mode</h2>
        </div>
        <div className="grid gap-3 xl:grid-cols-[1fr_2fr]">
          <div>
            <p className="text-sm text-stone-300">
              {snapshot.mode.reason || 'No mode reason recorded.'}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              Updated {formatDateTime(snapshot.mode.updatedAt)}
            </p>
          </div>
          <div className="space-y-3">
            <input
              value={modeReason}
              onChange={(event) => setModeReason(event.target.value)}
              placeholder="Optional reason for this mode change"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600"
            />
            <div className="flex flex-wrap gap-2">
              {modeOptions.map((option) => {
                const Icon = option.icon
                const active = option.mode === snapshot.mode.mode
                return (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => updateMode(option.mode)}
                    disabled={modeBusy !== null}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                      active
                        ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200'
                        : 'border-stone-700 text-stone-300 hover:bg-stone-800'
                    } disabled:opacity-50`}
                  >
                    <Icon className="h-4 w-4" />
                    {modeBusy === option.mode ? 'Updating' : option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[420px_1fr_420px]">
        <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-200">Raw Intake</h2>
          </div>
          <form onSubmit={submitRawInput} className="space-y-3">
            <input
              value={sourceLabel}
              onChange={(event) => setSourceLabel(event.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            />
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              rows={10}
              placeholder="Paste raw notes, build intent, feedback, screenshots paths, or orchestration ideas."
              className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm text-stone-100 placeholder:text-stone-600"
            />
            <button
              type="submit"
              disabled={submitting || rawInput.trim().length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Classifying' : 'Submit To Pipeline'}
            </button>
            {lastSignal && <p className="text-xs text-emerald-300">{lastSignal}</p>}
          </form>
        </section>

        <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-200">Live Pipeline</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-7">
            {snapshot.pipeline.map((stage) => (
              <div key={stage.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                <p className="text-xs font-medium uppercase text-stone-500">{stage.label}</p>
                <p className={`mt-2 text-2xl font-bold ${metricTone(stage.tone)}`}>{stage.count}</p>
                <p className="mt-1 min-h-8 text-xs text-stone-500">{stage.latest}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <CompactList title="Latest Ledger" icon={FileText} items={snapshot.ledger.latest} />
            <CompactList
              title="Blocked"
              icon={AlertTriangle}
              items={snapshot.blocked}
              empty="No blocked records"
            />
          </div>
        </section>

        <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-200">Founder Authority</h2>
          </div>
          <div className="space-y-3">
            {snapshot.escalations.length === 0 ? (
              <p className="text-sm text-stone-500">No open escalation cards.</p>
            ) : (
              snapshot.escalations.map((card) => (
                <div key={card.id} className="rounded-lg border border-stone-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-stone-200">{card.question}</p>
                    <StatusPill
                      tone={card.status === 'open' ? 'red' : 'stone'}
                      label={card.status}
                    />
                  </div>
                  <p className="mt-2 text-xs text-stone-500">{card.recommendedDefault}</p>
                  <p className="mt-2 text-xs text-amber-300">Blocks: {card.blocks}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-200">Source Map</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Trust</th>
                <th className="pb-2 font-medium">Files</th>
                <th className="pb-2 font-medium">Freshness</th>
                <th className="pb-2 font-medium">Destination</th>
                <th className="pb-2 font-medium">Build</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.sourceMap.map((source) => (
                <tr key={source.id} className="border-b border-stone-800/70 last:border-0">
                  <td className="py-3 pr-4">
                    <p className="text-stone-200">{source.label}</p>
                    <p className="mt-1 font-mono text-xs text-stone-600">{source.path}</p>
                  </td>
                  <td className="py-3 pr-4 text-stone-400">{source.trustLevel}</td>
                  <td className="py-3 pr-4 text-stone-400">{source.count}</td>
                  <td className="py-3 pr-4">
                    <StatusPill
                      tone={source.parserStatus === 'missing' ? 'red' : 'stone'}
                      label={source.freshness}
                    />
                  </td>
                  <td className="py-3 pr-4 text-stone-500">{source.destination}</td>
                  <td className="py-3">
                    <StatusPill
                      tone={source.canCreateBuildCandidates ? 'amber' : 'stone'}
                      label={source.canCreateBuildCandidates ? 'candidate' : 'no'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-200">Approved Queue</h2>
          </div>
          <QueueTable snapshot={snapshot} />
        </section>

        <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-200">Active Claim</h2>
          </div>
          {activeClaim ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Task" value={activeClaim.displayTitle} />
              <Field label="Branch" value={activeClaim.branch ?? 'unavailable'} mono />
              <Field label="Claimed" value={formatDateTime(activeClaim.claimedAt)} />
              <Field label="Expires" value={formatDateTime(activeClaim.expiresAt)} />
              <Field label="Worktree" value={activeClaim.worktreePath ?? 'unavailable'} mono wide />
            </div>
          ) : (
            <p className="text-sm text-stone-500">No active claim found.</p>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <CompactList
          title="Research Queue"
          icon={FileText}
          items={snapshot.researchQueue}
          empty="No research items"
        />
        <CompactList
          title="V2 Parking"
          icon={FileText}
          items={snapshot.parkedV2}
          empty="No parked V2 items"
        />
        <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-200">Processes</h2>
          </div>
          <div className="space-y-3">
            {snapshot.processes.length === 0 ? (
              <p className="text-sm text-stone-500">No builder processes found.</p>
            ) : (
              snapshot.processes.map((process) => (
                <div
                  key={`${process.processId}-${process.commandLine}`}
                  className="rounded-lg border border-stone-800 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-stone-200">{process.name}</span>
                    <span className="text-xs text-stone-500">PID {process.processId}</span>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-stone-500">
                    {process.displayCommandLine}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-200">Recent Receipts</h2>
          </div>
          <div className="space-y-3">
            {snapshot.receipts.map((receipt) => (
              <div key={receipt.file} className="rounded-lg border border-stone-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-200">
                      {receipt.taskId ?? receipt.file}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">{receipt.summary || 'No summary'}</p>
                  </div>
                  <StatusPill
                    tone={receipt.pushed ? 'green' : statusTone(receipt.status)}
                    label={receipt.status}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                  <span>{formatDateTime(receipt.finishedAt)}</span>
                  {receipt.commit && <span className="font-mono">{receipt.commit}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-200">Active Prompt</h2>
          </div>
          {snapshot.activePrompt.text ? (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-800 bg-stone-950 p-4 text-xs leading-relaxed text-stone-400">
              {snapshot.activePrompt.text}
            </pre>
          ) : (
            <p className="text-sm text-stone-500">No active prompt found.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function QueueTable({ snapshot }: { snapshot: BuilderMonitorSnapshot }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-800 text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="pb-2 font-medium">Task</th>
            <th className="pb-2 font-medium">Class</th>
            <th className="pb-2 font-medium">State</th>
            <th className="pb-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.queue.map((item) => (
            <tr key={item.id} className="border-b border-stone-800/70 last:border-0">
              <td className="py-3 pr-4 text-stone-200">{item.displayTitle}</td>
              <td className="py-3 pr-4 text-stone-400">{formatClass(item.classification)}</td>
              <td className="py-3 pr-4">
                <StatusPill
                  tone={item.running ? 'green' : item.completed ? 'stone' : 'amber'}
                  label={item.running ? 'running' : item.completed ? 'done' : item.status}
                />
              </td>
              <td className="py-3 text-xs text-stone-500">{item.sourcePath ?? 'none'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompactList({
  title,
  icon: Icon,
  items,
  empty = 'No records',
}: {
  title: string
  icon: typeof FileText
  items: Array<{
    id: string
    title: string
    status: string
    sourcePath: string | null
    updatedAt: string | null
  }>
  empty?: string
}) {
  return (
    <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-stone-400" />
        <h2 className="text-sm font-semibold text-stone-200">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-stone-500">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-stone-800 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-stone-200">{item.title || item.id}</p>
                <StatusPill tone={statusTone(item.status)} label={item.status || 'unknown'} />
              </div>
              <p className="mt-2 break-all text-xs text-stone-500">
                {item.sourcePath ?? formatDateTime(item.updatedAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  tone = 'stone',
}: {
  label: string
  value: number
  tone?: 'stone' | 'green' | 'amber' | 'red'
}) {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${metricTone(tone)}`}>{value}</p>
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string
  value: string
  mono?: boolean
  wide?: boolean
}) {
  return (
    <div className={`rounded-lg border border-stone-800 px-3 py-3 ${wide ? 'lg:col-span-2' : ''}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 break-words text-sm text-stone-200 ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function StatusPill({ tone, label }: { tone: 'stone' | 'green' | 'amber' | 'red'; label: string }) {
  const icon =
    tone === 'green' ? (
      <CheckCircle className="h-3.5 w-3.5" />
    ) : tone === 'red' ? (
      <AlertTriangle className="h-3.5 w-3.5" />
    ) : (
      <Activity className="h-3.5 w-3.5" />
    )
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${pillTone(tone)}`}
    >
      {icon}
      {label}
    </span>
  )
}

function statusTone(status: string): 'stone' | 'green' | 'amber' | 'red' {
  if (
    [
      'running',
      'watching',
      'ready',
      'pushed',
      'validated',
      'built',
      'watch',
      'governed_build',
    ].includes(status)
  ) {
    return 'green'
  }
  if (['blocked', 'failed', 'error', 'emergency_stop'].includes(status)) return 'red'
  if (['queued', 'claimed', 'research_required', 'pause_after_current'].includes(status))
    return 'amber'
  return 'stone'
}

function pillTone(tone: 'stone' | 'green' | 'amber' | 'red'): string {
  if (tone === 'green') return 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
  if (tone === 'amber') return 'border-amber-800 bg-amber-950/40 text-amber-300'
  if (tone === 'red') return 'border-red-800 bg-red-950/40 text-red-300'
  return 'border-stone-700 bg-stone-800 text-stone-300'
}

function metricTone(tone: 'stone' | 'green' | 'amber' | 'red'): string {
  if (tone === 'green') return 'text-emerald-300'
  if (tone === 'amber') return 'text-amber-300'
  if (tone === 'red') return 'text-red-300'
  return 'text-stone-100'
}

function formatDateTime(value: string | null): string {
  if (!value) return 'unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatClass(value: string): string {
  return value.replace(/^approved_/, '').replace(/_/g, ' ')
}
