'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateChefInvoiceSettings } from '@/lib/invoices/corporate-billing-actions'
import type { ChefInvoiceSettings } from '@/lib/invoices/corporate-billing-actions'

type Props = {
  settings: ChefInvoiceSettings
}

const fieldClass =
  'w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

export function InvoiceSettingsForm({ settings }: Props) {
  const [paymentTerms, setPaymentTerms] = useState(settings.paymentTerms ?? '')
  const [taxId, setTaxId] = useState(settings.taxId ?? '')
  const [footerNote, setFooterNote] = useState(settings.footerNote ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setSaved(false)
    setError(null)
    startTransition(async () => {
      try {
        await updateChefInvoiceSettings({
          paymentTerms: paymentTerms.trim() || null,
          taxId: taxId.trim() || null,
          footerNote: footerNote.trim() || null,
        })
        setSaved(true)
      } catch (err) {
        setError('Failed to save settings')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-700 bg-stone-950/60 p-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-stone-300" htmlFor="payment-terms">
            Payment Terms
          </label>
          <p className="mt-1 text-xs text-stone-500">
            Shown on invoice footer. Examples: "Due on receipt", "Net 30", "50% deposit required"
          </p>
          <input
            id="payment-terms"
            type="text"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="Due on receipt"
            className={`mt-2 ${fieldClass}`}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-stone-300" htmlFor="tax-id">
            Tax ID / EIN
          </label>
          <p className="mt-1 text-xs text-stone-500">
            Displayed on invoices for corporate clients who need it for expense reports. Leave blank
            to hide.
          </p>
          <input
            id="tax-id"
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="XX-XXXXXXX"
            className={`mt-2 ${fieldClass}`}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-stone-300" htmlFor="footer-note">
            Invoice Footer Note
          </label>
          <p className="mt-1 text-xs text-stone-500">
            Custom text at bottom of every invoice (cancellation policy, terms, thank-you note).
          </p>
          <textarea
            id="footer-note"
            value={footerNote}
            onChange={(e) => setFooterNote(e.target.value)}
            placeholder="Thank you for your business. Cancellation within 48 hours of the event is subject to a 50% fee."
            rows={3}
            className={`mt-2 ${fieldClass} resize-none`}
          />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Settings'}
          </Button>
          {saved && <span className="text-sm text-emerald-400">Saved</span>}
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      </div>
    </div>
  )
}
