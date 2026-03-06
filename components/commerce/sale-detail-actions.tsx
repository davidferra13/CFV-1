// Commerce Sale Detail Actions — void, refund, receipt download
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Download, XCircle, RotateCcw, DollarSign } from '@/components/ui/icons'
import { voidSale } from '@/lib/commerce/sale-actions'
import { createRefund } from '@/lib/commerce/refund-actions'
import { recordPayment } from '@/lib/commerce/payment-actions'
import { generateReceipt } from '@/lib/commerce/receipt-actions'
import { parseCurrencyToCents } from '@/lib/utils/currency'
import type { SaleStatus } from '@/lib/commerce/constants'
import { TERMINAL_SALE_STATUSES } from '@/lib/commerce/constants'
import { MANUAL_REASON_MAX_LENGTH, MANUAL_REASON_MIN_LENGTH } from '@/lib/commerce/mutation-reason'

type Props = {
  saleId: string
  saleStatus: SaleStatus
  totalCents: number
  payments: Array<{ id: string; amount_cents: number; tip_cents: number; status: string }>
  managerApprovalRequired?: boolean
}

export function SaleDetailActions({
  saleId,
  saleStatus,
  totalCents,
  payments,
  managerApprovalRequired = false,
}: Props) {
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

  // Manual payment form
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentNotes, setPaymentNotes] = useState('')

  const isTerminal = TERMINAL_SALE_STATUSES.includes(saleStatus)
  const canRecordPayment = ['draft', 'pending_payment', 'authorized'].includes(saleStatus)
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
    const normalizedVoidReason = voidReason.trim()
    if (!normalizedVoidReason) {
      toast.error('Enter a reason for voiding this sale')
      return
    }
    if (normalizedVoidReason.length < MANUAL_REASON_MIN_LENGTH) {
      toast.error(`Void reason must be at least ${MANUAL_REASON_MIN_LENGTH} characters`)
      return
    }
    if (normalizedVoidReason.length > MANUAL_REASON_MAX_LENGTH) {
      toast.error(`Void reason must be <= ${MANUAL_REASON_MAX_LENGTH} characters`)
      return
    }

    startTransition(async () => {
      try {
        await voidSale(saleId, normalizedVoidReason)
        toast.success('Sale voided')
        setShowVoidConfirm(false)
        setVoidReason('')
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
    if (refundReason.trim().length < MANUAL_REASON_MIN_LENGTH) {
      toast.error(`Refund reason must be at least ${MANUAL_REASON_MIN_LENGTH} characters`)
      return
    }
    if (refundReason.trim().length > MANUAL_REASON_MAX_LENGTH) {
      toast.error(`Refund reason must be <= ${MANUAL_REASON_MAX_LENGTH} characters`)
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

  function handleRecordPayment() {
    const amountCents = parseCurrencyToCents(paymentAmount || '0')
    if (amountCents <= 0) {
      toast.error('Enter a payment amount')
      return
    }

    startTransition(async () => {
      try {
        await recordPayment({
          saleId,
          amountCents,
          paymentMethod: paymentMethod as any,
          idempotencyKey: `manual_${saleId}_${Date.now()}`,
          notes: paymentNotes.trim() || undefined,
        })
        toast.success('Payment recorded')
        setShowPayment(false)
        setPaymentAmount('')
        setPaymentMethod('cash')
        setPaymentNotes('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to record payment')
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

        {canRecordPayment && (
          <Button
            variant="ghost"
            onClick={() => {
              setShowPayment(!showPayment)
              setShowRefund(false)
              setShowVoidConfirm(false)
            }}
            disabled={isPending}
            className="text-emerald-400 hover:text-emerald-300"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        )}

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
      {managerApprovalRequired && (
        <p className="text-xs text-amber-400">
          Manager approval is required for refund and void actions.
        </p>
      )}

      {/* Void confirmation */}
      {showVoidConfirm && (
        <Card>
          <CardContent className="p-4">
            <p className="text-stone-300 text-sm mb-3">
              Are you sure you want to void this sale? This cannot be undone.
            </p>
            <div className="mb-3">
              <label className="text-stone-400 text-sm block mb-1">Reason (required)</label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Entered in error"
                maxLength={MANUAL_REASON_MAX_LENGTH}
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

      {/* Manual payment form */}
      {showPayment && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-stone-200 font-medium">Record Payment</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-stone-400 text-sm block mb-1">Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-stone-400 text-sm block mb-1">Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-stone-400 text-sm block mb-1">Notes</label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleRecordPayment} disabled={isPending}>
                {isPending ? 'Recording...' : 'Record Payment'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPayment(false)
                  setPaymentAmount('')
                  setPaymentNotes('')
                }}
              >
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
                  maxLength={MANUAL_REASON_MAX_LENGTH}
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
