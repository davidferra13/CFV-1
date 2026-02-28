'use client'

import { useState, useTransition } from 'react'
import { addAgreement } from '@/lib/staff/contractor-agreement-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Agreement = {
  id: string
  effective_date: string
  status: string
  has_ip_clause: boolean
  has_confidentiality_clause: boolean
  expires_at: string | null
  document_url: string | null
}

const STATUS_VARIANTS: Record<string, 'success' | 'error' | 'warning'> = {
  active: 'success',
  expired: 'error',
  not_on_file: 'warning',
}

export function ContractorAgreementPanel({
  staffMemberId,
  agreements,
}: {
  staffMemberId: string
  agreements: Agreement[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [effectiveDate, setEffectiveDate] = useState('')
  const [scope, setScope] = useState('')
  const [rate, setRate] = useState('')
  const [ipClause, setIpClause] = useState(false)
  const [confClause, setConfClause] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await addAgreement({
          staff_member_id: staffMemberId,
          effective_date: effectiveDate,
          scope_of_work: scope || undefined,
          rate_cents: rate ? Math.round(parseFloat(rate) * 100) : undefined,
          has_ip_clause: ipClause,
          has_confidentiality_clause: confClause,
        })
        setShowForm(false)
      } catch (err) {
        toast.error('Failed to save service agreement')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Service Agreements</CardTitle>
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            Add Agreement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {agreements.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
          >
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANTS[a.status] ?? 'default'}>{a.status}</Badge>
                <span className="text-sm text-stone-300">Effective: {a.effective_date}</span>
              </div>
              <div className="flex gap-3 text-xs text-stone-500 mt-1">
                {a.has_ip_clause && <span>IP clause</span>}
                {a.has_confidentiality_clause && <span>Confidentiality clause</span>}
              </div>
            </div>
          </div>
        ))}
        {agreements.length === 0 && (
          <p className="text-sm text-stone-500">No agreements on file.</p>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-stone-700">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Effective Date *
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                title="Effective date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Scope of Work</label>
              <textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                rows={2}
                className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Rate ($/hr)</label>
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ipClause}
                  onChange={(e) => setIpClause(e.target.checked)}
                />{' '}
                IP Clause
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confClause}
                  onChange={(e) => setConfClause(e.target.checked)}
                />{' '}
                Confidentiality
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending || !effectiveDate}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
