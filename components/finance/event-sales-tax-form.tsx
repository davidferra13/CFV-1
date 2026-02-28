'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { setEventSalesTax } from '@/lib/finance/sales-tax-actions'
import type { EventSalesTax, SalesTaxSettings } from '@/lib/finance/sales-tax-actions'
import { bpsToPercent, computeTaxCents } from '@/lib/finance/sales-tax-constants'
import { CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

type Props = {
  eventId: string
  eventPriceCents: number
  existing: EventSalesTax | null
  settings: SalesTaxSettings | null
}

export function EventSalesTaxForm({ eventId, eventPriceCents, existing, settings }: Props) {
  const combinedRateBps = settings ? settings.stateRateBps + settings.localRateBps : 0

  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    taxableAmountCents: existing?.taxableAmountCents ?? eventPriceCents,
    taxRateBps: existing?.taxRateBps ?? combinedRateBps,
    isExempt: existing?.isExempt ?? false,
    exemptionReason: existing?.exemptionReason ?? '',
  })

  const previewTax = form.isExempt ? 0 : computeTaxCents(form.taxableAmountCents, form.taxRateBps)

  function handleSave() {
    startTransition(async () => {
      try {
        await setEventSalesTax({
          eventId,
          taxableAmountCents: form.taxableAmountCents,
          taxRateBps: form.taxRateBps,
          isExempt: form.isExempt,
          exemptionReason: form.exemptionReason || null,
        })
        setSaved(true)
      } catch (err) {
        toast.error('Failed to save event sales tax')
      }
    })
  }

  if (!settings?.enabled) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-stone-500">
            Sales tax is not enabled.{' '}
            <a href="/finance/sales-tax/settings" className="text-brand-600 hover:underline">
              Configure sales tax settings →
            </a>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales Tax for This Event</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-950 rounded-lg px-3 py-2">
            <CheckCircle className="h-4 w-4" />
            Sales tax saved.
          </div>
        )}

        {existing?.remitted && <Badge variant="success">Remitted to state</Badge>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Taxable Amount
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(form.taxableAmountCents / 100).toFixed(2)}
              onChange={(e) =>
                setForm({
                  ...form,
                  taxableAmountCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
            <p className="text-xs text-stone-400 mt-1">
              Defaults to event price. Adjust if some items are non-taxable.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Tax Rate (bps)
            </label>
            <Input
              type="number"
              min="0"
              max="10000"
              value={form.taxRateBps}
              onChange={(e) =>
                setForm({ ...form, taxRateBps: parseInt(e.target.value || '0', 10) })
              }
            />
            <p className="text-xs text-stone-400 mt-1">
              {bpsToPercent(form.taxRateBps)} combined rate
              {settings && (
                <>
                  {' '}
                  (state {bpsToPercent(settings.stateRateBps)} + local{' '}
                  {bpsToPercent(settings.localRateBps)})
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_exempt"
            checked={form.isExempt}
            onChange={(e) => setForm({ ...form, isExempt: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="is_exempt" className="text-sm text-stone-300">
            This event is sales tax exempt
          </label>
        </div>

        {form.isExempt && (
          <Input
            label="Exemption Reason"
            value={form.exemptionReason}
            onChange={(e) => setForm({ ...form, exemptionReason: e.target.value })}
            placeholder="e.g. Non-profit event, resale certificate on file"
          />
        )}

        {/* Live Preview */}
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Taxable Amount</span>
            <span className="font-medium">{formatCurrency(form.taxableAmountCents)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-stone-400">Tax Rate</span>
            <span className="font-medium">{bpsToPercent(form.taxRateBps)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-stone-700">
            <span className="text-stone-200">Tax to Collect</span>
            <span className={form.isExempt ? 'text-stone-400' : 'text-amber-700'}>
              {form.isExempt ? 'Exempt' : formatCurrency(previewTax)}
            </span>
          </div>
        </div>

        <Button size="sm" onClick={handleSave} loading={isPending}>
          Save Sales Tax
        </Button>
      </CardContent>
    </Card>
  )
}
