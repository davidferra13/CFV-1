'use client'

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getInsurancePolicies,
  deletePolicy,
  type InsurancePolicy,
  type InsurancePolicyType,
  type InsuranceStatus,
} from '@/lib/compliance/insurance-actions'
import { InsurancePolicyForm } from './insurance-policy-form'

const POLICY_TYPE_LABELS: Record<InsurancePolicyType, string> = {
  general_liability: 'General Liability',
  product_liability: 'Product Liability',
  professional_liability: 'Professional Liability',
  workers_comp: "Workers' Comp",
  commercial_auto: 'Commercial Auto',
  property: 'Property',
  umbrella: 'Umbrella',
  other: 'Other',
}

const STATUS_VARIANT: Record<InsuranceStatus, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  expiring_soon: 'warning',
  expired: 'error',
  cancelled: 'default',
}

const STATUS_LABELS: Record<InsuranceStatus, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

function formatCents(cents: number | null): string {
  if (cents == null) return '-'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function InsurancePolicyList() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<InsurancePolicyType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<InsuranceStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null)
  const [isPending, startTransition] = useTransition()

  async function loadPolicies() {
    try {
      setLoading(true)
      setError(null)
      const data = await getInsurancePolicies()
      setPolicies(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicies()
  }, [])

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this policy?')) return
    const previous = policies
    setPolicies(policies.filter(p => p.id !== id))
    startTransition(async () => {
      try {
        await deletePolicy(id)
      } catch (err) {
        setPolicies(previous)
        alert(err instanceof Error ? err.message : 'Failed to delete policy')
      }
    })
  }

  function handleFormClose(saved?: boolean) {
    setShowForm(false)
    setEditingPolicy(null)
    if (saved) loadPolicies()
  }

  const filtered = policies.filter(p => {
    if (filterType !== 'all' && p.policy_type !== filterType) return false
    if (filterStatus !== 'all' && p.computed_status !== filterStatus) return false
    return true
  })

  if (showForm || editingPolicy) {
    return (
      <InsurancePolicyForm
        policy={editingPolicy}
        onClose={handleFormClose}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Insurance Policies</h2>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          Add Policy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="rounded border px-3 py-1.5 text-sm"
          value={filterType}
          onChange={e => setFilterType(e.target.value as InsurancePolicyType | 'all')}
        >
          <option value="all">All Types</option>
          {Object.entries(POLICY_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          className="rounded border px-3 py-1.5 text-sm"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as InsuranceStatus | 'all')}
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading policies...</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          {policies.length === 0
            ? 'No insurance policies added yet.'
            : 'No policies match your filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Provider</th>
                <th className="pb-2 pr-4 font-medium">Coverage</th>
                <th className="pb-2 pr-4 font-medium">Start</th>
                <th className="pb-2 pr-4 font-medium">End</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(policy => (
                <tr key={policy.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">{POLICY_TYPE_LABELS[policy.policy_type]}</td>
                  <td className="py-3 pr-4">{policy.provider}</td>
                  <td className="py-3 pr-4">{formatCents(policy.coverage_amount_cents)}</td>
                  <td className="py-3 pr-4">{formatDate(policy.start_date)}</td>
                  <td className="py-3 pr-4">{formatDate(policy.end_date)}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={STATUS_VARIANT[policy.computed_status ?? policy.status]}>
                      {STATUS_LABELS[policy.computed_status ?? policy.status]}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setEditingPolicy(policy)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(policy.id)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
