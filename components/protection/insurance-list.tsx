'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Shield, Plus, Trash2, Pencil } from '@/components/ui/icons'
import { deletePolicy } from '@/lib/protection/insurance-actions'
import { InsurancePolicyForm } from './insurance-policy-form'
import { format } from 'date-fns'

interface Policy {
  id: string
  policy_type: string
  carrier: string | null
  policy_number: string | null
  coverage_limit_cents: number | null
  effective_date: string | null
  expiry_date: string | null
  notes: string | null
}

interface InsuranceListProps {
  policies: Policy[]
}

function formatPolicyType(raw: string): string {
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <Badge variant="info">No Expiry Set</Badge>

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = format(expiry, 'MMM d, yyyy')

  if (diffDays < 0) return <Badge variant="error">Expired {formatted}</Badge>
  if (diffDays <= 30) return <Badge variant="warning">Expires {formatted}</Badge>
  return <Badge variant="success">Expires {formatted}</Badge>
}

export function InsuranceList({ policies }: InsuranceListProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [localPolicies, setLocalPolicies] = useState<Policy[]>(policies)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  function handleDelete(id: string) {
    setPendingDeleteId(id)
    setShowDeleteConfirm(true)
  }

  function handleConfirmedDelete() {
    if (!pendingDeleteId) return
    setShowDeleteConfirm(false)
    setDeletingId(pendingDeleteId)
    const idToDelete = pendingDeleteId
    setPendingDeleteId(null)
    startTransition(async () => {
      try {
        await deletePolicy(idToDelete)
        setLocalPolicies((prev) => prev.filter((p) => p.id !== idToDelete))
      } catch (err) {
        console.error('[InsuranceList] delete failed', err)
      } finally {
        setDeletingId(null)
      }
    })
  }

  function handleAdded(policy: Policy) {
    setLocalPolicies((prev) => [...prev, policy])
    setShowAdd(false)
  }

  function handleUpdated(policy: Policy) {
    setLocalPolicies((prev) => prev.map((p) => (p.id === policy.id ? policy : p)))
    setEditingPolicy(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-semibold text-stone-100">Insurance Policies</h2>
          {localPolicies.length > 0 && <Badge variant="info">{localPolicies.length}</Badge>}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {showAdd && (
        <Card className="border-brand-700">
          <CardContent className="pt-4">
            <InsurancePolicyForm onClose={() => setShowAdd(false)} onSuccess={handleAdded} />
          </CardContent>
        </Card>
      )}

      {localPolicies.length === 0 && !showAdd && (
        <Card>
          <CardContent className="py-10 text-center">
            <Shield className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-500">No insurance policies on file</p>
            <p className="text-xs text-stone-400 mt-1">
              Add your general liability, liquor liability, and other policies here.
            </p>
          </CardContent>
        </Card>
      )}

      {localPolicies.map((policy) => (
        <Card key={policy.id}>
          {editingPolicy?.id === policy.id ? (
            <CardContent className="pt-4">
              <InsurancePolicyForm
                policy={editingPolicy}
                onClose={() => setEditingPolicy(null)}
                onSuccess={handleUpdated}
              />
            </CardContent>
          ) : (
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-sm font-semibold text-stone-100">
                      {formatPolicyType(policy.policy_type)}
                    </span>
                    <ExpiryBadge expiryDate={policy.expiry_date} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-stone-500">
                    {policy.carrier && (
                      <div>
                        <span className="font-medium text-stone-300">Carrier:</span>{' '}
                        {policy.carrier}
                      </div>
                    )}
                    {policy.policy_number && (
                      <div>
                        <span className="font-medium text-stone-300">Policy #:</span>{' '}
                        {policy.policy_number}
                      </div>
                    )}
                    {policy.coverage_limit_cents != null && (
                      <div>
                        <span className="font-medium text-stone-300">Coverage:</span>{' '}
                        {formatCurrency(policy.coverage_limit_cents)}
                      </div>
                    )}
                    {policy.effective_date && (
                      <div>
                        <span className="font-medium text-stone-300">Effective:</span>{' '}
                        {format(new Date(policy.effective_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  {policy.notes && (
                    <p className="mt-2 text-xs text-stone-400 italic">{policy.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setEditingPolicy(policy)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(policy.id)}
                    loading={deletingId === policy.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Remove this insurance policy?"
        description="This cannot be undone."
        confirmLabel="Remove"
        variant="danger"
        loading={deletingId !== null}
        onConfirm={handleConfirmedDelete}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setPendingDeleteId(null)
        }}
      />
    </div>
  )
}
