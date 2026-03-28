'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  addReferral,
  getClientReferrals,
  updateReferralStatus,
  deleteReferral,
  type Referral,
  type ReferralStatus,
} from '@/lib/clients/referral-actions'
import { formatCurrency } from '@/lib/utils/currency'

const STATUS_COLORS: Record<ReferralStatus, string> = {
  pending: 'bg-stone-800 text-stone-400',
  contacted: 'bg-brand-900/40 text-brand-300',
  booked: 'bg-emerald-900/40 text-emerald-300',
  completed: 'bg-brand-900/40 text-brand-300',
}

const STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  booked: 'Booked',
  completed: 'Completed',
}

const NEXT_STATUS: Record<ReferralStatus, ReferralStatus | null> = {
  pending: 'contacted',
  contacted: 'booked',
  booked: 'completed',
  completed: null,
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ReferralPanel({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState(false)

  // Form state
  const [formNotes, setFormNotes] = useState('')
  const [formSource, setFormSource] = useState('')

  const loadReferrals = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getClientReferrals(clientId)
        setReferrals(data)
        setLoadError(false)
      } catch {
        setLoadError(true)
      }
    })
  }, [clientId])

  useEffect(() => {
    loadReferrals()
  }, [loadReferrals])

  const totalRevenue = referrals.reduce((s, r) => s + r.revenueGeneratedCents, 0)

  function handleAdd() {
    const previous = referrals
    startTransition(async () => {
      try {
        const newRef = await addReferral({
          referringClientId: clientId,
          notes: formNotes.trim() || undefined,
          referralSource: formSource.trim() || undefined,
        })
        setReferrals((prev) => [newRef, ...prev])
        setFormNotes('')
        setFormSource('')
        setShowForm(false)
      } catch {
        setReferrals(previous)
      }
    })
  }

  function handleAdvanceStatus(ref: Referral) {
    const next = NEXT_STATUS[ref.status]
    if (!next) return
    const previous = referrals
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: next } : r)))
    startTransition(async () => {
      try {
        await updateReferralStatus(ref.id, next)
      } catch {
        setReferrals(previous)
      }
    })
  }

  function handleDelete(refId: string) {
    const previous = referrals
    setReferrals((prev) => prev.filter((r) => r.id !== refId))
    startTransition(async () => {
      try {
        await deleteReferral(refId)
      } catch {
        setReferrals(previous)
      }
    })
  }

  if (loadError) {
    return (
      <Card className="bg-stone-900 border-stone-800">
        <CardContent className="py-6">
          <p className="text-sm text-red-400">Could not load referrals. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-stone-900 border-stone-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base text-stone-100">
            Referrals{clientName ? ` from ${clientName}` : ''}
          </CardTitle>
          {referrals.length > 0 && (
            <p className="text-xs text-stone-500 mt-0.5">
              {referrals.length} referral{referrals.length !== 1 ? 's' : ''} ·{' '}
              {formatCurrency(totalRevenue)} revenue
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={() => setShowForm(!showForm)} className="text-xs">
          {showForm ? 'Cancel' : '+ Add Referral'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add form */}
        {showForm && (
          <div className="space-y-3 p-3 rounded bg-stone-800/60 border border-stone-700">
            <Input
              placeholder="How did they refer? (e.g., word of mouth, Instagram)"
              value={formSource}
              onChange={(e) => setFormSource(e.target.value)}
              className="bg-stone-900"
            />
            <Textarea
              placeholder="Notes (optional)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              className="bg-stone-900"
            />
            <Button variant="primary" onClick={handleAdd} loading={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Add Referral'}
            </Button>
          </div>
        )}

        {/* Referral list */}
        {referrals.length === 0 && !showForm ? (
          <p className="text-sm text-stone-500 py-4 text-center">
            No referrals from this client yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-start justify-between gap-2 p-2 rounded bg-stone-800/40 hover:bg-stone-800/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-xxs px-1.5 py-0.5 rounded ${STATUS_COLORS[ref.status]}`}>
                      {STATUS_LABELS[ref.status]}
                    </span>
                    {ref.referralSource && (
                      <span className="text-xxs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">
                        {ref.referralSource}
                      </span>
                    )}
                    {ref.revenueGeneratedCents > 0 && (
                      <span className="text-xxs text-emerald-400">
                        {formatCurrency(ref.revenueGeneratedCents)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {formatDate(ref.createdAt)}
                    {ref.notes && ` · ${ref.notes}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {NEXT_STATUS[ref.status] && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(ref)}
                      className="text-xxs px-1.5 py-0.5 rounded bg-brand-900/30 text-brand-300 hover:bg-brand-900/50 transition-colors"
                      title={`Move to ${NEXT_STATUS[ref.status]}`}
                    >
                      {NEXT_STATUS[ref.status]}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(ref.id)}
                    className="text-stone-600 hover:text-red-400 text-xs mt-0.5"
                    title="Remove referral"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
