'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createAudit } from '@/lib/inventory/audit-actions'

const AUDIT_TYPES = [
  {
    value: 'full',
    label: 'Full Audit',
    description: 'Count everything — comprehensive stock check',
  },
  { value: 'cycle', label: 'Cycle Count', description: 'Subset of items — routine verification' },
  { value: 'spot', label: 'Spot Check', description: 'Quick check on specific items' },
  { value: 'pre_event', label: 'Pre-Event', description: 'Verify stock before an event' },
  { value: 'post_event', label: 'Post-Event', description: 'Check what remains after an event' },
]

export function CreateAuditClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [auditType, setAuditType] = useState('full')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        const result = await createAudit({
          auditType: auditType as any,
          notes: notes.trim() || undefined,
        })
        if (result && typeof result === 'object' && 'id' in result) {
          router.push(`/inventory/audits/${(result as any).id}`)
        } else {
          router.push('/inventory/audits')
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to create audit')
      }
    })
  }

  return (
    <Card className="p-6 max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-2">Audit Type</label>
          <div className="space-y-2">
            {AUDIT_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  auditType === type.value
                    ? 'border-brand-600 bg-brand-600/10'
                    : 'border-stone-700 hover:border-stone-600'
                }`}
              >
                <input
                  type="radio"
                  name="auditType"
                  value={type.value}
                  checked={auditType === type.value}
                  onChange={(e) => setAuditType(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-medium text-stone-100">{type.label}</span>
                  <p className="text-xs text-stone-500 mt-0.5">{type.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this audit..."
            rows={2}
            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={isPending}>
            Start Audit
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
