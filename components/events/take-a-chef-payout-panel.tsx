'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatCentsToDisplay, parseCurrencyToCents } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'
import { saveTakeAChefEventFinance } from '@/lib/integrations/take-a-chef-finance-actions'
import { TAKE_A_CHEF_PAYOUT_STATUS_VALUES } from '@/lib/integrations/take-a-chef-finance'

type TakeAChefFinanceData = {
  eventId: string
  inquiryId: string | null
  isTakeAChef: boolean
  canEdit: boolean
  clientName: string | null
  externalLink: string | null
  defaultCommissionPercent: number
  commissionExpenseId: string | null
  commissionExpenseCount: number
  grossBookingCents: number | null
  commissionPercent: number
  commissionPercentSource: 'stored' | 'derived' | 'default'
  loggedCommissionCents: number
  expectedCommissionCents: number | null
  expectedNetPayoutCents: number | null
  payoutAmountCents: number | null
  payoutStatus: (typeof TAKE_A_CHEF_PAYOUT_STATUS_VALUES)[number]
  payoutArrivalDate: string | null
  payoutReference: string | null
  notes: string | null
  updatedAt: string | null
  commissionGapCents: number | null
  netPayoutGapCents: number | null
  commissionState: 'untracked' | 'missing' | 'matched' | 'mismatch'
} | null

const PAYOUT_STATUS_LABELS: Record<(typeof TAKE_A_CHEF_PAYOUT_STATUS_VALUES)[number], string> = {
  untracked: 'Untracked',
  pending: 'Pending',
  scheduled: 'Scheduled',
  paid: 'Paid',
  issue: 'Issue',
}

const PAYOUT_STATUS_VARIANTS: Record<
  (typeof TAKE_A_CHEF_PAYOUT_STATUS_VALUES)[number],
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  untracked: 'default',
  pending: 'warning',
  scheduled: 'info',
  paid: 'success',
  issue: 'error',
}

export function TakeAChefPayoutPanel({ finance }: { finance: TakeAChefFinanceData }) {
  const router = useRouter()
  const [grossBooking, setGrossBooking] = useState(
    finance?.grossBookingCents != null ? formatCentsToDisplay(finance.grossBookingCents) : ''
  )
  const [commissionPercent, setCommissionPercent] = useState(
    finance?.commissionPercent != null ? String(finance.commissionPercent) : ''
  )
  const [payoutAmount, setPayoutAmount] = useState(
    finance?.payoutAmountCents != null ? formatCentsToDisplay(finance.payoutAmountCents) : ''
  )
  const [payoutStatus, setPayoutStatus] = useState<
    (typeof TAKE_A_CHEF_PAYOUT_STATUS_VALUES)[number]
  >(finance?.payoutStatus ?? 'untracked')
  const [payoutArrivalDate, setPayoutArrivalDate] = useState(finance?.payoutArrivalDate ?? '')
  const [payoutReference, setPayoutReference] = useState(finance?.payoutReference ?? '')
  const [notes, setNotes] = useState(finance?.notes ?? '')
  const [syncCommissionExpense, setSyncCommissionExpense] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const commissionStateLabel = useMemo(() => {
    if (!finance) return null
    if (finance.commissionState === 'matched') return 'Commission matched'
    if (finance.commissionState === 'missing') return 'Commission expense missing'
    if (finance.commissionState === 'mismatch') return 'Commission mismatch'
    return 'Commission not tracked yet'
  }, [finance])

  if (!finance?.isTakeAChef) {
    return null
  }

  const handleSave = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const grossBookingCents = grossBooking.trim() ? parseCurrencyToCents(grossBooking) : null
        const payoutAmountCents = payoutAmount.trim() ? parseCurrencyToCents(payoutAmount) : null
        const commissionValue = commissionPercent.trim() ? Number(commissionPercent) : null

        await saveTakeAChefEventFinance({
          eventId: finance.eventId,
          grossBookingCents,
          commissionPercent: commissionValue,
          payoutAmountCents,
          payoutStatus,
          payoutArrivalDate: payoutArrivalDate || null,
          payoutReference: payoutReference || null,
          notes: notes || null,
          syncCommissionExpense,
        })
        setMessage('Saved')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to save payout details')
      }
    })
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Take a Chef Payout</h2>
            <Badge variant={PAYOUT_STATUS_VARIANTS[payoutStatus]}>
              {PAYOUT_STATUS_LABELS[payoutStatus]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-stone-400">
            Track gross booking value, platform commission, and actual payout for this marketplace
            event.
          </p>
        </div>
        {finance.externalLink && (
          <a
            href={finance.externalLink}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand-500 hover:text-brand-400"
          >
            Open source booking
          </a>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Metric
          label="Gross booking"
          value={
            finance.grossBookingCents != null ? formatCurrency(finance.grossBookingCents) : '—'
          }
        />
        <Metric
          label="Expected commission"
          value={
            finance.expectedCommissionCents != null
              ? formatCurrency(finance.expectedCommissionCents)
              : '—'
          }
        />
        <Metric
          label="Logged commission"
          value={
            finance.loggedCommissionCents > 0 ? formatCurrency(finance.loggedCommissionCents) : '—'
          }
        />
        <Metric
          label="Expected net payout"
          value={
            finance.expectedNetPayoutCents != null
              ? formatCurrency(finance.expectedNetPayoutCents)
              : '—'
          }
        />
        <Metric
          label="Recorded payout"
          value={
            finance.payoutAmountCents != null ? formatCurrency(finance.payoutAmountCents) : '—'
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge
          variant={
            finance.commissionState === 'matched'
              ? 'success'
              : finance.commissionState === 'missing'
                ? 'warning'
                : finance.commissionState === 'mismatch'
                  ? 'error'
                  : 'default'
          }
        >
          {commissionStateLabel}
        </Badge>
        <Badge variant="default">
          Commission source:{' '}
          {finance.commissionPercentSource === 'stored'
            ? 'saved'
            : finance.commissionPercentSource === 'derived'
              ? 'derived'
              : `default ${finance.defaultCommissionPercent}%`}
        </Badge>
        {finance.commissionExpenseCount > 1 && (
          <Badge variant="warning">{finance.commissionExpenseCount} TAC expense rows linked</Badge>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Gross booking">
          <input
            value={grossBooking}
            onChange={(event) => setGrossBooking(event.target.value)}
            placeholder="0.00"
            className={inputClassName}
          />
        </Field>
        <Field label="Commission %">
          <input
            type="number"
            min={0}
            max={50}
            step={1}
            value={commissionPercent}
            onChange={(event) => setCommissionPercent(event.target.value)}
            className={inputClassName}
          />
        </Field>
        <Field label="Recorded payout">
          <input
            value={payoutAmount}
            onChange={(event) => setPayoutAmount(event.target.value)}
            placeholder="0.00"
            className={inputClassName}
          />
        </Field>
        <Field label="Payout status">
          <select
            value={payoutStatus}
            onChange={(event) =>
              setPayoutStatus(
                event.target.value as (typeof TAKE_A_CHEF_PAYOUT_STATUS_VALUES)[number]
              )
            }
            className={inputClassName}
          >
            {TAKE_A_CHEF_PAYOUT_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {PAYOUT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payout arrival date">
          <input
            type="date"
            value={payoutArrivalDate}
            onChange={(event) => setPayoutArrivalDate(event.target.value)}
            className={inputClassName}
          />
        </Field>
        <Field label="Payout reference">
          <input
            value={payoutReference}
            onChange={(event) => setPayoutReference(event.target.value)}
            placeholder="Batch, transfer, or note"
            className={inputClassName}
          />
        </Field>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-stone-300">Notes</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className={cn(inputClassName, 'mt-2 min-h-24 py-2')}
          placeholder="Marketplace payout notes, deductions, or reconciliation context"
        />
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-stone-400">
        <input
          type="checkbox"
          checked={syncCommissionExpense}
          onChange={(event) => setSyncCommissionExpense(event.target.checked)}
          className="h-4 w-4 rounded border-stone-700 bg-stone-900 text-brand-500"
        />
        Sync the Take a Chef commission expense from this form
      </label>

      {finance.canEdit ? null : (
        <p className="mt-3 text-sm text-amber-500">
          This event needs a linked Take a Chef inquiry before payout details can be edited here.
        </p>
      )}

      {(finance.commissionGapCents != null || finance.netPayoutGapCents != null) && (
        <div className="mt-4 grid gap-2 text-sm text-stone-400 sm:grid-cols-2">
          <span>
            Commission variance:{' '}
            <strong className="text-stone-200">
              {finance.commissionGapCents != null
                ? formatCurrency(finance.commissionGapCents)
                : '—'}
            </strong>
          </span>
          <span>
            Payout variance:{' '}
            <strong className="text-stone-200">
              {finance.netPayoutGapCents != null ? formatCurrency(finance.netPayoutGapCents) : '—'}
            </strong>
          </span>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          Default commission currently set to {finance.defaultCommissionPercent}%.
        </p>
        <div className="flex items-center gap-3">
          {message && <span className="text-sm text-stone-400">{message}</span>}
          <Button
            type="button"
            variant="secondary"
            onClick={handleSave}
            disabled={pending || !finance.canEdit}
          >
            {pending ? 'Saving...' : 'Save payout details'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-100">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-300">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

const inputClassName =
  'w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500'
