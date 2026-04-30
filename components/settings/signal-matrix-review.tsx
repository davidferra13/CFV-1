'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { SignalDashboardSnapshot } from '@/lib/notifications/signal-dashboard'
import type { SignalAttentionClass, SignalRisk } from '@/lib/notifications/signal-os'

type Props = {
  snapshot: SignalDashboardSnapshot
}

const ATTENTION_LABELS: Record<SignalAttentionClass, string> = {
  interrupt: 'Interrupt',
  decide: 'Decide',
  do: 'Do',
  review: 'Review',
  archive: 'Archive',
  suppress: 'Suppress',
}

const RISK_LABELS: Record<SignalRisk, string> = {
  safety: 'Safety',
  money: 'Money',
  service: 'Service',
  relationship: 'Relationship',
  capacity: 'Capacity',
  reputation: 'Reputation',
  system: 'System',
  growth: 'Growth',
  admin: 'Admin',
  none: 'None',
}

function attentionVariant(attention: SignalAttentionClass) {
  if (attention === 'interrupt') return 'error'
  if (attention === 'decide' || attention === 'do') return 'warning'
  if (attention === 'review') return 'info'
  return 'default'
}

function channelList(channels: { email: boolean; push: boolean; sms: boolean }) {
  const enabled = [
    channels.sms ? 'SMS' : null,
    channels.push ? 'Push' : null,
    channels.email ? 'Email' : null,
  ].filter(Boolean)
  return enabled.length > 0 ? enabled.join(', ') : 'In-app only'
}

export function SignalMatrixReview({ snapshot }: Props) {
  const [attentionFilter, setAttentionFilter] = useState<'all' | SignalAttentionClass>('all')
  const [riskFilter, setRiskFilter] = useState<'all' | SignalRisk>('all')
  const [search, setSearch] = useState('')

  const filteredMatrix = useMemo(() => {
    const term = search.trim().toLowerCase()
    return snapshot.matrix.filter((policy) => {
      if (attentionFilter !== 'all' && policy.attention !== attentionFilter) return false
      if (riskFilter !== 'all' && policy.risk !== riskFilter) return false
      if (!term) return true
      return (
        policy.action.toLowerCase().includes(term) ||
        policy.category.toLowerCase().includes(term) ||
        policy.why.toLowerCase().includes(term) ||
        policy.sourceOfTruth.toLowerCase().includes(term)
      )
    })
  }, [attentionFilter, riskFilter, search, snapshot.matrix])

  return (
    <section className="rounded-xl border border-stone-700 bg-stone-900">
      <div className="border-b border-stone-700 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-100">Signal OS Review Console</h2>
            <p className="mt-1 text-sm text-stone-400">
              Inspect how ChefFlow classifies, routes, batches, and suppresses chef-facing signals.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Metric label="Raw" value={snapshot.simulation.rawSignalCount} />
            <Metric label="Delivered" value={snapshot.simulation.deliveredCount} />
            <Metric label="Suppressed" value={snapshot.simulation.suppressedCount} />
            <Metric label="SMS" value={snapshot.simulation.smsCount} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-stone-800 p-5 lg:grid-cols-3">
        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <h3 className="text-sm font-semibold text-stone-100">Attention Budget</h3>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Metric label="Allowed" value={snapshot.attentionBudget.allowed} />
            <Metric label="Unlimited" value={snapshot.attentionBudget.unlimited} />
            <Metric label="Digest" value={snapshot.attentionBudget.forcedDigest} />
            <Metric label="Suppressed" value={snapshot.attentionBudget.suppressed} />
          </dl>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <h3 className="text-sm font-semibold text-stone-100">Daily Brief Preview</h3>
          <p className="mt-2 text-xs text-stone-400">
            {snapshot.dailyBrief.nextAction ?? 'No next action in the current sample.'}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            {snapshot.dailyBrief.sections.length} sections, push{' '}
            {snapshot.dailyBrief.delivery.push ? 'enabled' : 'not needed'}, SMS{' '}
            {snapshot.dailyBrief.delivery.sms ? 'enabled' : 'not needed'}.
          </p>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <h3 className="text-sm font-semibold text-stone-100">Suppression Audit</h3>
          <p className="mt-2 text-xs text-stone-400">
            {snapshot.suppressionAuditRecords.length} sample signals are archived or suppressed with
            reasons.
          </p>
          <p className="mt-2 text-xs text-stone-500">
            First reason:{' '}
            {snapshot.suppressionAuditRecords[0]?.reason ?? 'No suppressed signal in sample.'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-b border-stone-800 p-5 md:grid-cols-[1fr_180px_180px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search actions, why, or source of truth"
          className="min-h-[44px] rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />
        <select
          value={attentionFilter}
          onChange={(event) =>
            setAttentionFilter(event.target.value as 'all' | SignalAttentionClass)
          }
          className="min-h-[44px] rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All attention</option>
          {Object.entries(ATTENTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value as 'all' | SignalRisk)}
          className="min-h-[44px] rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All risks</option>
          {Object.entries(RISK_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-stone-800 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-5 py-3 font-medium">Signal</th>
              <th className="px-4 py-3 font-medium">Attention</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Cadence</th>
              <th className="px-4 py-3 font-medium">Channels</th>
              <th className="px-4 py-3 font-medium">Source Of Truth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {filteredMatrix.map((policy) => (
              <tr key={policy.action} className="align-top hover:bg-stone-800/40">
                <td className="px-5 py-4">
                  <div className="text-sm font-medium text-stone-100">{policy.action}</div>
                  <div className="mt-1 max-w-md text-xs text-stone-400">{policy.why}</div>
                </td>
                <td className="px-4 py-4">
                  <Badge variant={attentionVariant(policy.attention)}>
                    {ATTENTION_LABELS[policy.attention]}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-sm text-stone-300">{RISK_LABELS[policy.risk]}</td>
                <td className="px-4 py-4 text-sm text-stone-300">{policy.cadence}</td>
                <td className="px-4 py-4 text-sm text-stone-300">
                  {channelList(policy.defaultChannels)}
                </td>
                <td className="px-4 py-4 text-sm text-stone-300">{policy.sourceOfTruth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-stone-800 px-5 py-3 text-xs text-stone-400">
        Showing {filteredMatrix.length} of {snapshot.matrix.length} notification actions.
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-800 bg-stone-950 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-stone-100">{value}</dd>
    </div>
  )
}
