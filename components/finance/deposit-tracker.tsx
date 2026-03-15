'use client'

// Deposit Tracker - Event detail panel
// Shows deposit/balance progress, payment history, and record buttons.

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format, differenceInDays } from 'date-fns'
import { recordDeposit, recordBalancePayment } from '@/lib/finance/deposit-actions'
import type { DepositSummary, DepositPayment } from '@/lib/finance/deposit-actions'
import type { PaymentMethod } from '@/lib/ledger/append'
import { toast } from 'sonner'

interface Props {
  eventId: string
  deposit: DepositSummary
  onUpdate?: () => void
}

const STATUS_BADGE: Record<
  string,
  { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }
> = {
  not_required: { variant: 'default', label: 'Not Required' },
  pending: { variant: 'warning', label: 'Pending' },
  partial: { variant: 'info', label: 'Partial' },
  paid: { variant: 'success', label: 'Paid' },
  overdue: { variant: 'error', label: 'Overdue' },
  not_due: { variant: 'default', label: 'Not Due Yet' },
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'card', label: 'Card' },
  { value: 'check', label: 'Check' },
  { value: 'paypal', label: 'PayPal' },
]

export function DepositTracker({ eventId, deposit, onUpdate }: Props) {
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [showBalanceForm, setShowBalanceForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [isPending, startTransition] = useTransition()

  const {
    quotedAmountCents,
    depositAmountCents,
    balanceDueCents,
    balanceDueDate,
    depositStatus,
    balanceStatus,
    payments,
  } = deposit

  // Progress bar calculation
  const totalPaid = quotedAmountCents - balanceDueCents
  const progressPercent =
    quotedAmountCents > 0 ? Math.min(100, Math.round((totalPaid / quotedAmountCents) * 100)) : 0
  const depositPercent =
    quotedAmountCents > 0 ? Math.round((depositAmountCents / quotedAmountCents) * 100) : 0

  const balanceDueDateObj = new Date(balanceDueDate + 'T12:00:00')
  const daysUntilBalance = differenceInDays(balanceDueDateObj, new Date())

  function handleRecordDeposit() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (isNaN(cents) || cents <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    startTransition(async () => {
      try {
        await recordDeposit(eventId, cents, method)
        toast.success(`Deposit of ${formatCurrency(cents)} recorded`)
        setShowDepositForm(false)
        setAmount('')
        onUpdate?.()
      } catch (err) {
        toast.error('Failed to record deposit')
      }
    })
  }

  function handleRecordBalance() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (isNaN(cents) || cents <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    startTransition(async () => {
      try {
        await recordBalancePayment(eventId, cents, method)
        toast.success(`Balance payment of ${formatCurrency(cents)} recorded`)
        setShowBalanceForm(false)
        setAmount('')
        onUpdate?.()
      } catch (err) {
        toast.error('Failed to record balance payment')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payment Progress</CardTitle>
          <div className="flex gap-2">
            {depositStatus !== 'not_required' && (
              <Badge variant={STATUS_BADGE[depositStatus]?.variant ?? 'default'}>
                Deposit: {STATUS_BADGE[depositStatus]?.label}
              </Badge>
            )}
            <Badge variant={STATUS_BADGE[balanceStatus]?.variant ?? 'default'}>
              Balance: {STATUS_BADGE[balanceStatus]?.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue warning */}
        {(depositStatus === 'overdue' || balanceStatus === 'overdue') && (
          <div className="rounded-md bg-red-900/30 border border-red-800/50 px-4 py-3">
            <p className="text-sm font-medium text-red-300">
              {depositStatus === 'overdue' && balanceStatus === 'overdue'
                ? 'Both deposit and balance are overdue.'
                : depositStatus === 'overdue'
                  ? 'Deposit is overdue.'
                  : 'Balance payment is overdue.'}
            </p>
            <p className="text-xs text-red-400/70 mt-1">
              Outstanding: {formatCurrency(balanceDueCents)}
            </p>
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>{formatCurrency(totalPaid)} paid</span>
            <span>{formatCurrency(quotedAmountCents)} total</span>
          </div>
          <div className="h-3 bg-stone-800 rounded-full overflow-hidden relative">
            {/* Deposit marker line */}
            {depositStatus !== 'not_required' && depositPercent > 0 && depositPercent < 100 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-stone-500 z-10"
                style={{ left: `${depositPercent}%` }}
                title={`Deposit: ${formatCurrency(depositAmountCents)}`}
              />
            )}
            {/* Paid bar */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent >= 100
                  ? 'bg-emerald-500'
                  : depositStatus === 'overdue' || balanceStatus === 'overdue'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-stone-500 mt-1">
            {depositStatus !== 'not_required' && (
              <span>
                Deposit: {formatCurrency(depositAmountCents)} ({deposit.depositPercentage}%)
              </span>
            )}
            <span className="ml-auto">
              {daysUntilBalance > 0
                ? `Balance due in ${daysUntilBalance} day${daysUntilBalance !== 1 ? 's' : ''}`
                : daysUntilBalance === 0
                  ? 'Balance due today'
                  : `Balance was due ${Math.abs(daysUntilBalance)} day${Math.abs(daysUntilBalance) !== 1 ? 's' : ''} ago`}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {balanceDueCents > 0 && (
          <div className="flex gap-2">
            {depositStatus !== 'paid' && depositStatus !== 'not_required' && (
              <Button
                variant="primary"
                onClick={() => {
                  setShowDepositForm(true)
                  setShowBalanceForm(false)
                  // Pre-fill remaining deposit amount
                  const depositPaid = payments
                    .filter((p) => p.type === 'deposit')
                    .reduce((s, p) => s + p.amountCents, 0)
                  const remaining = depositAmountCents - depositPaid
                  setAmount(remaining > 0 ? (remaining / 100).toFixed(2) : '')
                }}
                disabled={isPending}
              >
                Record Deposit
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setShowBalanceForm(true)
                setShowDepositForm(false)
                setAmount(balanceDueCents > 0 ? (balanceDueCents / 100).toFixed(2) : '')
              }}
              disabled={isPending}
            >
              Record Balance
            </Button>
          </div>
        )}

        {/* Deposit form */}
        {showDepositForm && (
          <PaymentForm
            label="Record Deposit"
            amount={amount}
            method={method}
            isPending={isPending}
            onAmountChange={setAmount}
            onMethodChange={setMethod}
            onSubmit={handleRecordDeposit}
            onCancel={() => setShowDepositForm(false)}
          />
        )}

        {/* Balance form */}
        {showBalanceForm && (
          <PaymentForm
            label="Record Balance Payment"
            amount={amount}
            method={method}
            isPending={isPending}
            onAmountChange={setAmount}
            onMethodChange={setMethod}
            onSubmit={handleRecordBalance}
            onCancel={() => setShowBalanceForm(false)}
          />
        )}

        {/* Payment history */}
        {payments.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Payment History
            </h4>
            <div className="space-y-1.5">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md bg-stone-800/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-stone-200 capitalize">{payment.type}</p>
                    <p className="text-xs text-stone-500">
                      {format(new Date(payment.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400 shrink-0 ml-2">
                    {formatCurrency(payment.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Internal: Payment Form ─────────────────────────────────────

function PaymentForm({
  label,
  amount,
  method,
  isPending,
  onAmountChange,
  onMethodChange,
  onSubmit,
  onCancel,
}: {
  label: string
  amount: string
  method: PaymentMethod
  isPending: boolean
  onAmountChange: (v: string) => void
  onMethodChange: (v: PaymentMethod) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="border border-stone-700 rounded-lg p-3 space-y-3">
      <p className="text-sm font-medium text-stone-200">{label}</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-stone-500 block mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="w-full rounded-md bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => onMethodChange(e.target.value as PaymentMethod)}
            className="rounded-md bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={onSubmit} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
