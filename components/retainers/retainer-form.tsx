'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createRetainer, updateRetainer } from '@/lib/retainers/actions'
import { BILLING_CYCLE_LABELS } from '@/lib/retainers/constants'
import { parseCurrencyToCents, formatCentsToDisplay } from '@/lib/utils/currency'

type RetainerFormProps = {
  clients: Array<{ id: string; full_name: string }>
  mode: 'create' | 'edit'
  retainer?: any
}

export function RetainerForm({ clients, mode, retainer }: RetainerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientId, setClientId] = useState(retainer?.client_id ?? '')
  const [name, setName] = useState(retainer?.name ?? '')
  const [billingCycle, setBillingCycle] = useState(retainer?.billing_cycle ?? 'monthly')
  const [amountDisplay, setAmountDisplay] = useState(
    retainer?.amount_cents ? formatCentsToDisplay(retainer.amount_cents) : ''
  )
  const [includesEventsCount, setIncludesEventsCount] = useState<string>(
    retainer?.includes_events_count != null ? String(retainer.includes_events_count) : ''
  )
  const [includesHours, setIncludesHours] = useState<string>(
    retainer?.includes_hours != null ? String(retainer.includes_hours) : ''
  )
  const [startDate, setStartDate] = useState(retainer?.start_date ?? '')
  const [endDate, setEndDate] = useState(retainer?.end_date ?? '')
  const [notes, setNotes] = useState(retainer?.notes ?? '')
  const [termsSummary, setTermsSummary] = useState(retainer?.terms_summary ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const amountCents = parseCurrencyToCents(amountDisplay)
      if (isNaN(amountCents) || amountCents < 0) {
        throw new Error('Please enter a valid amount')
      }

      const payload = {
        clientId,
        name,
        billingCycle: billingCycle as 'weekly' | 'biweekly' | 'monthly',
        amountCents,
        includesEventsCount: includesEventsCount ? parseInt(includesEventsCount, 10) : null,
        includesHours: includesHours ? parseFloat(includesHours) : null,
        startDate,
        endDate: endDate || null,
        notes: notes || null,
        termsSummary: termsSummary || null,
      }

      if (mode === 'create') {
        await createRetainer(payload)
      } else if (retainer?.id) {
        await updateRetainer(retainer.id, payload)
      }

      router.push('/finance/retainers')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-950 text-red-200 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Client */}
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Retainer Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Monthly Meal Prep — Johnson Family"
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Billing Cycle + Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Billing Cycle</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Amount ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                $
              </span>
              <input
                type="text"
                value={amountDisplay}
                onChange={(e) => setAmountDisplay(e.target.value)}
                required
                placeholder="0.00"
                className="w-full rounded-lg border border-stone-600 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Inclusions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Included Events <span className="text-stone-400">(optional)</span>
            </label>
            <input
              type="number"
              value={includesEventsCount}
              onChange={(e) => setIncludesEventsCount(e.target.value)}
              min={0}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Included Hours <span className="text-stone-400">(optional)</span>
            </label>
            <input
              type="number"
              value={includesHours}
              onChange={(e) => setIncludesHours(e.target.value)}
              min={0}
              step={0.5}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              End Date <span className="text-stone-400">(optional)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this retainer agreement..."
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Terms Summary */}
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Terms Summary</label>
          <textarea
            value={termsSummary}
            onChange={(e) => setTermsSummary(e.target.value)}
            rows={3}
            placeholder="Human-readable terms for the client portal..."
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" loading={loading}>
            {mode === 'create' ? 'Create Retainer' : 'Save Changes'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/finance/retainers')}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
