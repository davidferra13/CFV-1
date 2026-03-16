'use client'

// Payment Actions Panel (chef-side)
// Shows "Record Payment" on events with outstanding balance.
// Shows "Process Refund" on cancelled events with prior payments.
// Dynamically loads modals to keep SSR surface small.

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RecordPaymentModal } from './record-payment-modal'
import { InitiateRefundModal } from './initiate-refund-modal'
import type { CancellationRefundResult } from '@/lib/cancellation/policy'

// ── Record Payment Panel ──────────────────────────────────────────────────────

type RecordPaymentPanelProps = {
  eventId: string
  outstandingBalanceCents: number
  depositAmountCents: number
  totalPaidCents: number
}

export function RecordPaymentPanel({
  eventId,
  outstandingBalanceCents,
  depositAmountCents,
  totalPaidCents,
}: RecordPaymentPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const isFirstPayment = totalPaidCents === 0
  const isDepositDue = isFirstPayment && depositAmountCents > 0
  const label = isDepositDue ? 'Record Deposit' : 'Record Payment'
  const defaultAmount = isDepositDue ? depositAmountCents : outstandingBalanceCents

  return (
    <>
      <Card className="p-6 border-amber-200 bg-amber-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-amber-900">
              {isDepositDue ? 'Deposit Pending' : 'Balance Outstanding'}
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {isDepositDue
                ? `A deposit of ${formatCurrency(depositAmountCents)} is awaiting collection.`
                : `${formatCurrency(outstandingBalanceCents)} remaining balance. Record it if paid offline.`}
            </p>
          </div>
          <Button onClick={() => setIsOpen(true)} size="sm">
            {label}
          </Button>
        </div>
      </Card>

      {isOpen && (
        <RecordPaymentModal
          eventId={eventId}
          defaultAmountCents={defaultAmount}
          label={label}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

// ── Process Refund Panel ──────────────────────────────────────────────────────

type ProcessRefundPanelProps = {
  eventId: string
  totalPaidCents: number
  totalRefundedCents: number
  depositPaidCents: number
  recommendation: CancellationRefundResult
}

export function ProcessRefundPanel({
  eventId,
  totalPaidCents,
  totalRefundedCents,
  depositPaidCents,
  recommendation,
}: ProcessRefundPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const netPaidCents = totalPaidCents - totalRefundedCents
  if (netPaidCents <= 0) return null

  return (
    <>
      <Card className="p-6 border-blue-200 bg-blue-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-blue-900">Refund Available</h3>
            <p className="text-sm text-blue-700 mt-1">
              {formatCurrency(netPaidCents)} was collected for this event.{' '}
              {recommendation.refundAmountCents > 0
                ? `Policy recommends a ${formatCurrency(recommendation.refundAmountCents)} refund.`
                : 'Per policy, no refund is owed - but you can override.'}
            </p>
          </div>
          <Button onClick={() => setIsOpen(true)} size="sm" variant="secondary">
            Process Refund
          </Button>
        </div>
      </Card>

      {isOpen && (
        <InitiateRefundModal
          eventId={eventId}
          totalPaidCents={totalPaidCents}
          totalRefundedCents={totalRefundedCents}
          depositPaidCents={depositPaidCents}
          recommendation={recommendation}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
