'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  createDispute,
  updateDisputeEvidence,
  resolveDispute,
  type PaymentDispute,
} from '@/lib/finance/dispute-actions'
import { ShieldAlert, Plus } from '@/components/ui/icons'
import { toast } from 'sonner'

type Props = {
  initialDisputes: PaymentDispute[]
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  open: 'error',
  under_review: 'warning',
  won: 'success',
  lost: 'default',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function DisputeTracker({ initialDisputes }: Props) {
  const [disputes, setDisputes] = useState(initialDisputes)
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newDispute, setNewDispute] = useState({ amountCents: 0, reason: '' })
  const [evidenceNotes, setEvidenceNotes] = useState('')

  function handleCreate() {
    startTransition(async () => {
      try {
        const created = await createDispute({
          amountCents: newDispute.amountCents,
          reason: newDispute.reason || undefined,
        })
        setDisputes((prev) => [created, ...prev])
        setShowCreate(false)
        setNewDispute({ amountCents: 0, reason: '' })
      } catch (err) {
        toast.error('Failed to create dispute')
      }
    })
  }

  function handleAddEvidence(disputeId: string) {
    startTransition(async () => {
      try {
        const updated = await updateDisputeEvidence({
          disputeId,
          evidenceNotes,
        })
        setDisputes((prev) => prev.map((d) => (d.id === disputeId ? updated : d)))
        setEditingId(null)
        setEvidenceNotes('')
      } catch (err) {
        toast.error('Failed to save evidence')
      }
    })
  }

  function handleResolve(disputeId: string, outcome: 'won' | 'lost') {
    startTransition(async () => {
      try {
        const updated = await resolveDispute(disputeId, outcome)
        setDisputes((prev) => prev.map((d) => (d.id === disputeId ? updated : d)))
      } catch (err) {
        toast.error('Failed to resolve dispute')
      }
    })
  }

  const activeCount = disputes.filter(
    (d) => d.status === 'open' || d.status === 'under_review'
  ).length
  const totalAtRiskCents = disputes
    .filter((d) => d.status === 'open' || d.status === 'under_review')
    .reduce((s, d) => s + d.amountCents, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Active Disputes</p>
            <p className="text-2xl font-semibold text-red-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Amount at Risk</p>
            <p className="text-2xl font-semibold text-stone-100">{formatCents(totalAtRiskCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total Disputes</p>
            <p className="text-2xl font-semibold text-stone-400">{disputes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Dispute
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-stone-600">
          <CardContent className="py-4 space-y-3">
            <Input
              label="Amount ($)"
              type="number"
              min="0"
              step="0.01"
              value={(newDispute.amountCents / 100).toString()}
              onChange={(e) =>
                setNewDispute({
                  ...newDispute,
                  amountCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
            <Input
              label="Reason"
              value={newDispute.reason}
              onChange={(e) => setNewDispute({ ...newDispute, reason: e.target.value })}
              placeholder="e.g., Client claims service not rendered"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} loading={isPending}>
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispute List */}
      <div className="space-y-3">
        {disputes.map((d) => (
          <Card key={d.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="h-4 w-4 text-stone-400" />
                    <span className="text-sm font-medium text-stone-100">
                      {formatCents(d.amountCents)}
                    </span>
                    <Badge variant={STATUS_BADGE[d.status]}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                  {d.reason && <p className="text-sm text-stone-400">{d.reason}</p>}
                  <p className="text-xs text-stone-400 mt-1">
                    Opened: {new Date(d.openedAt).toLocaleDateString()}
                    {d.resolvedAt && ` · Resolved: ${new Date(d.resolvedAt).toLocaleDateString()}`}
                  </p>
                  {d.evidenceNotes && (
                    <p className="text-xs text-stone-500 mt-2 p-2 bg-stone-800 rounded">
                      Evidence: {d.evidenceNotes}
                    </p>
                  )}
                </div>
                {(d.status === 'open' || d.status === 'under_review') && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(d.id)
                        setEvidenceNotes(d.evidenceNotes || '')
                      }}
                    >
                      Add Evidence
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResolve(d.id, 'won')}
                      disabled={isPending}
                    >
                      Won
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleResolve(d.id, 'lost')}
                      disabled={isPending}
                    >
                      Lost
                    </Button>
                  </div>
                )}
              </div>

              {editingId === d.id && (
                <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
                  <textarea
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Describe evidence (receipts, photos, communications...)"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAddEvidence(d.id)} loading={isPending}>
                      Save Evidence
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
