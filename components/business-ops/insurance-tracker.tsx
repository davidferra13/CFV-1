'use client'

import { useState, useTransition } from 'react'
import { ExternalLink } from '@/components/ui/external-link'
import {
  Shield,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
} from '@/components/ui/icons'
import type {
  InsurancePolicy,
  CreateInsurancePolicyInput,
  PolicyType,
  PremiumFrequency,
} from '@/lib/business-ops/insurance-actions'
import { createInsurancePolicy, deleteInsurancePolicy } from '@/lib/business-ops/insurance-actions'

const TYPE_LABELS: Record<PolicyType, string> = {
  general_liability: 'General Liability',
  professional_liability: 'Professional Liability',
  auto: 'Auto',
  health: 'Health',
  equipment: 'Equipment',
  workers_comp: "Workers' Comp",
  other: 'Other',
}

const FREQ_LABELS: Record<PremiumFrequency, string> = {
  annual: '/yr',
  semi_annual: '/6mo',
  quarterly: '/qtr',
  monthly: '/mo',
}

function formatCents(cents: number | null): string {
  if (!cents) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function getRenewalStatus(renewalDate: string | null): 'expired' | 'warning' | 'current' | 'none' {
  if (!renewalDate) return 'none'
  const now = new Date()
  const renewal = new Date(renewalDate)
  if (renewal < now) return 'expired'
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (renewal <= thirtyDays) return 'warning'
  return 'current'
}

function RenewalBadge({ status }: { status: ReturnType<typeof getRenewalStatus> }) {
  if (status === 'expired')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-900/50 text-red-300">
        <AlertTriangle className="w-3 h-3" />
        Lapsed
      </span>
    )
  if (status === 'warning')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-900/50 text-amber-300">
        <AlertTriangle className="w-3 h-3" />
        Renewal Soon
      </span>
    )
  if (status === 'current')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-900/50 text-green-300">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    )
  return null
}

export function InsuranceTracker({ initialData }: { initialData: InsurancePolicy[] }) {
  const [policies, setPolicies] = useState(initialData)
  const [isOpen, setIsOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    const premiumStr = formData.get('premium_dollars') as string
    const coverageStr = formData.get('coverage_dollars') as string
    const input: CreateInsurancePolicyInput = {
      policy_type: formData.get('policy_type') as PolicyType,
      provider_name: formData.get('provider_name') as string,
      policy_number: (formData.get('policy_number') as string) || null,
      coverage_amount_cents: coverageStr ? Math.round(parseFloat(coverageStr) * 100) : null,
      premium_cents: premiumStr ? Math.round(parseFloat(premiumStr) * 100) : null,
      premium_frequency: (formData.get('premium_frequency') as PremiumFrequency) || null,
      renewal_date: (formData.get('renewal_date') as string) || null,
      agent_name: (formData.get('agent_name') as string) || null,
      agent_phone: (formData.get('agent_phone') as string) || null,
      agent_email: (formData.get('agent_email') as string) || null,
      portal_url: (formData.get('portal_url') as string) || null,
      notes: (formData.get('notes') as string) || null,
    }
    startTransition(async () => {
      try {
        const result = await createInsurancePolicy(input)
        setPolicies((prev) => [...prev, result.policy])
        setShowForm(false)
      } catch (e) {
        console.error('Failed to create policy:', e)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteInsurancePolicy(id)
        setPolicies((prev) => prev.filter((p) => p.id !== id))
      } catch (e) {
        console.error('Failed to delete policy:', e)
      }
    })
  }

  return (
    <div className="bg-stone-800 rounded-lg border border-stone-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-750"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-stone-100">Insurance</h2>
          <span className="text-sm text-stone-400">({policies.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {policies.length === 0 && !showForm && (
            <p className="text-stone-500 text-sm py-2">No insurance policies tracked yet.</p>
          )}

          {policies.map((policy) => {
            const status = getRenewalStatus(policy.renewal_date)
            return (
              <div
                key={policy.id}
                className="p-3 bg-stone-900 rounded-md border border-stone-700 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{policy.provider_name}</span>
                      <span className="text-xs text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
                        {TYPE_LABELS[policy.policy_type]}
                      </span>
                      <RenewalBadge status={status} />
                    </div>
                    {policy.policy_number && (
                      <p className="text-xs text-stone-500">Policy #{policy.policy_number}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(policy.id)}
                    disabled={isPending}
                    className="p-1 text-stone-500 hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-stone-400">
                  {policy.coverage_amount_cents != null && (
                    <span>Coverage: {formatCents(policy.coverage_amount_cents)}</span>
                  )}
                  {policy.premium_cents != null && (
                    <span>
                      Premium: {formatCents(policy.premium_cents)}
                      {policy.premium_frequency ? FREQ_LABELS[policy.premium_frequency] : ''}
                    </span>
                  )}
                  {policy.renewal_date && (
                    <span>Renewal: {new Date(policy.renewal_date).toLocaleDateString()}</span>
                  )}
                </div>

                {(policy.agent_name ||
                  policy.agent_phone ||
                  policy.agent_email ||
                  policy.portal_url) && (
                  <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                    {policy.agent_name && <span>{policy.agent_name}</span>}
                    {policy.agent_phone && (
                      <a
                        href={`tel:${policy.agent_phone}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        <Phone className="w-3 h-3" />
                        {policy.agent_phone}
                      </a>
                    )}
                    {policy.agent_email && (
                      <a
                        href={`mailto:${policy.agent_email}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        <Mail className="w-3 h-3" />
                        {policy.agent_email}
                      </a>
                    )}
                    {policy.portal_url && (
                      <ExternalLink
                        href={policy.portal_url}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Provider Portal
                      </ExternalLink>
                    )}
                  </div>
                )}
                {policy.notes && <p className="text-xs text-stone-500">{policy.notes}</p>}
              </div>
            )
          })}

          {showForm ? (
            <form
              action={handleCreate}
              className="p-3 bg-stone-900 rounded-md border border-stone-700 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="provider_name"
                  placeholder="Provider name"
                  required
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <select
                  name="policy_type"
                  required
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                >
                  <option value="general_liability">General Liability</option>
                  <option value="professional_liability">Professional Liability</option>
                  <option value="auto">Auto</option>
                  <option value="health">Health</option>
                  <option value="equipment">Equipment</option>
                  <option value="workers_comp">Workers&apos; Comp</option>
                  <option value="other">Other</option>
                </select>
                <input
                  name="policy_number"
                  placeholder="Policy number"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="coverage_dollars"
                  type="number"
                  step="0.01"
                  placeholder="Coverage amount ($)"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <div className="flex gap-2">
                  <input
                    name="premium_dollars"
                    type="number"
                    step="0.01"
                    placeholder="Premium ($)"
                    className="flex-1 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                  />
                  <select
                    name="premium_frequency"
                    className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                  >
                    <option value="">Freq</option>
                    <option value="annual">Annual</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Renewal Date</label>
                  <input
                    name="renewal_date"
                    type="date"
                    className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                  />
                </div>
                <input
                  name="agent_name"
                  placeholder="Agent name"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="agent_phone"
                  placeholder="Agent phone"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="agent_email"
                  type="email"
                  placeholder="Agent email"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="portal_url"
                  placeholder="Provider portal URL"
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <textarea
                  name="notes"
                  placeholder="Notes"
                  rows={2}
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
            >
              <Plus className="w-4 h-4" /> Add Policy
            </button>
          )}
        </div>
      )}
    </div>
  )
}
