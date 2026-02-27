// Commerce Sale Detail Actions — void, refund, receipt download
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Download, XCircle, RotateCcw } from 'lucide-react'
import { voidSale } from '@/lib/commerce/sale-actions'
import { createRefund } from '@/lib/commerce/refund-actions'
import { generateReceipt } from '@/lib/commerce/receipt-actions'
import { parseCurrencyToCents } from '@/lib/utils/currency'
import type { SaleStatus } from '@/lib/commerce/constants'
import { TERMINAL_SALE_STATUSES } from '@/lib/commerce/constants'

type Props = {
  saleId: string
  saleStatus: SaleStatus
  totalCents: number
  payments: Array<{ id: string; amount_cents: number; tip_cents: number; status: string }>
}

export function SaleDetailActions({ saleId, saleStatus, totalCents, payments }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Refund form state
  const [showRefund, setShowRefund] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundPaymentId, setRefundPaymentId] = useState('')

  // Void confirm
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  const isTerminal = TERMINAL_SALE_STATUSES.includes(saleStatus)
  const canVoid = !isTerminal && saleStatus !== 'settled'
  const canRefund =
    !isTerminal &&
    ['captured', 'settled', 'partially_refunded'].includes(saleStatus) &&
    payments.some((p) => ['captured', 'settled'].includes(p.status))

  const refundablePayments = payments.filter((p) => ['captured', 'settled'].includes(p.status))

  function handleDownloadReceipt() {
    startTransition(async () => {
      try {
        const { pdf, filename } = await generateReceipt(saleId)
        const binary = atob(pdf)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Receipt downloaded')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to generate receipt')
      }
    })
  }

  function handleVoid() {
    startTransition(async () => {
      try {
        await voidSale(saleId, voidReason.trim() || 'Voided by chef')
        toast.success('Sale voided')
        setShowVoidConfirm(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to void sale')
      }
    })
  }

  function handleRefund() {
    if (!refundPaymentId) {
      toast.error('Select a payment to refund')
      return
    }
    const amountCents = parseCurrencyToCents(refundAmount || '0')
    if (amountCents <= 0) {
      toast.error('Enter a refund amount')
      return
    }
    if (!refundReason.trim()) {
      toast.error('Enter a reason for the refund')
      return
    }

    startTransition(async () => {
      try {
        await createRefund({
          paymentId: refundPaymentId,
          saleId,
          amountCents,
          reason: refundReason.trim(),
          idempotencyKey: `refund_${saleId}_${Date.now()}`,
        })
        toast.success('Refund processed')
        setShowRefund(false)
        setRefundAmount('')
        setRefundReason('')
        setRefundPaymentId('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to process refund')
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={handleDownloadReceipt} disabled={isPending}>
          <Download className="w-4 h-4 mr-2" />
          Receipt
        </Button>

        {canRefund && (
          <Button
            variant="ghost"
            onClick={() => {
              setShowRefund(!showRefund)
              setShowVoidConfirm(false)
              if (refundablePayments.length === 1) {
                setRefundPaymentId(refundablePayments[0].id)
              }
            }}
            disabled={isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Refund
          </Button>
        )}

        {canVoid && (
          <Button
            variant="ghost"
            onClick={() => {
              setShowVoidConfirm(!showVoidConfirm)
              setShowRefund(false)
            }}
            disabled={isPending}
            className="text-red-400 hover:text-red-300"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Void Sale
          </Button>
        )}
      </div>

      {/* Void confirmation */}
      {showVoidConfirm && (
        <Card>
          <CardContent className="p-4">
            <p className="text-stone-300 text-sm mb-3">
              Are you sure you want to void this sale? This cannot be undone.
            </p>
            <div className="mb-3">
              <label className="text-stone-400 text-sm block mb-1">Reason (optional)</label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Entered in error"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleVoid} disabled={isPending}>
                {isPending ? 'Voiding...' : 'Confirm Void'}
              </Button>
              <Button variant="ghost" onClick={() => setShowVoidConfirm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund form */}
      {showRefund && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-stone-200 font-medium">Issue Refund</h3>

            {refundablePayments.length > 1 && (
              <div>
                <label className="text-stone-400 text-sm block mb-1">Payment</label>
                <select
                  value={refundPaymentId}
                  onChange={(e) => setRefundPaymentId(e.target.value)}
                  className="w-full rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
                >
                  <option value="">Select payment...</option>
                  {refundablePayments.map((p) => (
                    <option key={p.id} value={p.id}>
                      ${((p.amount_cents ?? 0) / 100).toFixed(2)} ({p.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-stone-400 text-sm block mb-1">Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-stone-400 text-sm block mb-1">Reason</label>
                <Input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer dissatisfied"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" onClick={handleRefund} disabled={isPending}>
                {isPending ? 'Processing...' : 'Process Refund'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowRefund(false)
                  setRefundAmount('')
                  setRefundReason('')
                  setRefundPaymentId('')
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
