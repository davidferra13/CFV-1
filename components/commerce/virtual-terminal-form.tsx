'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils/currency'
import {
  runVirtualTerminalCharge,
  type VirtualTerminalResult,
} from '@/lib/commerce/virtual-terminal-actions'
import type { PaymentMethod } from '@/lib/ledger/append'
import type { SaleChannel, TaxClass } from '@/lib/commerce/constants'

type Props = {
  defaultTaxZip?: string
}

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
]

const SALE_CHANNEL_OPTIONS: Array<{ value: SaleChannel; label: string }> = [
  { value: 'phone', label: 'Phone Order' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'online', label: 'Online' },
  { value: 'order_ahead', label: 'Order Ahead' },
]

const TAX_CLASS_OPTIONS: Array<{ value: TaxClass; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: 'prepared_food', label: 'Prepared Food' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'zero', label: 'Zero Rate' },
  { value: 'reduced', label: 'Reduced Rate' },
]

export function VirtualTerminalForm({ defaultTaxZip }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState('Phone order')
  const [amountInput, setAmountInput] = useState('')
  const [tipInput, setTipInput] = useState('0.00')
  const [taxClass, setTaxClass] = useState<TaxClass>('standard')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [saleChannel, setSaleChannel] = useState<SaleChannel>('phone')
  const [cardEntryMode, setCardEntryMode] = useState<'manual_keyed' | 'terminal'>('manual_keyed')
  const [manualCardReference, setManualCardReference] = useState('')
  const [taxZip, setTaxZip] = useState(defaultTaxZip ?? '')
  const [promotionCode, setPromotionCode] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptEmail, setReceiptEmail] = useState('')
  const [receiptPhone, setReceiptPhone] = useState('')
  const [lastResult, setLastResult] = useState<VirtualTerminalResult | null>(null)

  function handleSubmit() {
    const amountCents = parseCurrencyToCents(amountInput || '0')
    const tipCents = parseCurrencyToCents(tipInput || '0')

    if (!description.trim()) {
      toast.error('Description is required')
      return
    }
    if (amountCents <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }
    if (
      paymentMethod === 'card' &&
      cardEntryMode === 'manual_keyed' &&
      !manualCardReference.trim()
    ) {
      toast.error('Manual keyed reference is required for keyed card entry')
      return
    }

    startTransition(async () => {
      try {
        const result = await runVirtualTerminalCharge({
          description: description.trim(),
          amountCents,
          tipCents,
          taxClass,
          paymentMethod,
          saleChannel,
          taxZipCode: taxZip.trim() || undefined,
          cardEntryMode: paymentMethod === 'card' ? cardEntryMode : undefined,
          manualCardReference:
            paymentMethod === 'card' && cardEntryMode === 'manual_keyed'
              ? manualCardReference.trim()
              : undefined,
          promotionCode: promotionCode.trim() || undefined,
          notes: notes.trim() || undefined,
          receiptEmail: receiptEmail.trim() || undefined,
          receiptPhone: receiptPhone.trim() || undefined,
        })

        setLastResult(result)
        toast.success(`Charge captured: ${result.saleNumber}`)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Charge failed')
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Virtual Terminal</CardTitle>
          <p className="text-sm text-stone-400">
            Run card-not-present or phone-order transactions and send digital receipts.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-stone-400">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Phone order - family meal package"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Sale Channel</label>
              <select
                value={saleChannel}
                onChange={(e) => setSaleChannel(e.target.value as SaleChannel)}
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
              >
                {SALE_CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-stone-400">Amount ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Tip ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={tipInput}
                onChange={(e) => setTipInput(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Tax Class</label>
              <select
                value={taxClass}
                onChange={(e) => setTaxClass(e.target.value as TaxClass)}
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
              >
                {TAX_CLASS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-stone-400">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-400">Tax ZIP</label>
              <Input
                value={taxZip}
                onChange={(e) => setTaxZip(e.target.value)}
                placeholder="02139"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Promotion Code</label>
              <Input
                value={promotionCode}
                onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                placeholder="Optional"
              />
            </div>
          </div>

          {paymentMethod === 'card' && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-stone-400">Card Entry Mode</label>
                <select
                  value={cardEntryMode}
                  onChange={(e) => setCardEntryMode(e.target.value as 'manual_keyed' | 'terminal')}
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
                >
                  <option value="manual_keyed">Manual Keyed (Recommended)</option>
                  <option value="terminal">Terminal</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-400">Card Reference / Auth Code</label>
                <Input
                  value={manualCardReference}
                  onChange={(e) => setManualCardReference(e.target.value)}
                  placeholder="AUTH-12345"
                  disabled={cardEntryMode !== 'manual_keyed'}
                />
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-stone-400">Receipt Email (optional)</label>
              <Input
                type="email"
                value={receiptEmail}
                onChange={(e) => setReceiptEmail(e.target.value)}
                placeholder="guest@example.com"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Receipt SMS (optional)</label>
              <Input
                value={receiptPhone}
                onChange={(e) => setReceiptPhone(e.target.value)}
                placeholder="+1 617 555 0101"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-400">Notes (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Call-in order from repeat customer"
            />
          </div>

          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Processing...' : 'Run Charge'}
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-emerald-400 font-medium">Sale {lastResult.saleNumber} captured</p>
            <p className="text-sm text-stone-300">
              Total: {formatCurrency(lastResult.totalCents)}
              {lastResult.changeDueCents > 0
                ? ` - Change due: ${formatCurrency(lastResult.changeDueCents)}`
                : ''}
            </p>
            <p className="text-xs text-stone-500">
              Receipt delivery - Email: {lastResult.receiptEmailStatus} - SMS:{' '}
              {lastResult.receiptSmsStatus}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push(`/commerce/sales/${lastResult.saleId}`)}
              >
                Open Sale
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
