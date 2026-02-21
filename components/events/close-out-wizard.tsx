// Post-Event Close-Out Wizard
// Guides the chef through the 5-step post-event financial closure flow.
// One action per screen. Saves each step to the database as the chef proceeds.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import {
  recordTip,
  updateMileage,
  markFinancialClosed,
  type CloseOutData,
} from '@/lib/events/financial-summary-actions'
import { createAAR } from '@/lib/aar/actions'
import { markFollowUpSent } from '@/lib/events/actions'

const STEPS = ['Tip', 'Receipts', 'Mileage', 'Reflection', 'Close Out']
const TOTAL_STEPS = STEPS.length

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-stone-600">
          Step {current + 1} of {total} — {STEPS[current]}
        </span>
        <span className="text-sm text-stone-400">{Math.round(((current + 1) / total) * 100)}%</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-2">
        <div
          className={`bg-stone-800 h-2 rounded-full transition-all duration-300 ${
            current === 0 ? 'w-1/5' :
            current === 1 ? 'w-2/5' :
            current === 2 ? 'w-3/5' :
            current === 3 ? 'w-4/5' :
            'w-full'
          }`}
        />
      </div>
    </div>
  )
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const labels = ['', 'Rough', 'Okay', 'Good', 'Great', 'Perfect']
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-stone-700 mb-3">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-11 h-11 rounded-full text-sm font-semibold border-2 transition-colors ${
              value >= n
                ? 'bg-stone-800 border-stone-800 text-white'
                : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-xs text-stone-500 mt-2">{labels[value]}</p>
      )}
    </div>
  )
}

// ─── Payment Method Selector ──────────────────────────────────────────────────

const TIP_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'other', label: 'Other' },
] as const

type TipMethod = 'cash' | 'venmo' | 'zelle' | 'other'

function MethodPicker({
  value,
  onChange,
}: {
  value: TipMethod
  onChange: (v: TipMethod) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TIP_METHODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
            value === m.value
              ? 'bg-stone-800 border-stone-800 text-white'
              : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

// ─── Step 0: Tip ──────────────────────────────────────────────────────────────

function TipStep({
  data,
  onNext,
}: {
  data: CloseOutData
  onNext: () => void
}) {
  const [hasTip, setHasTip] = useState<boolean | null>(null)
  const [dollars, setDollars] = useState('')
  const [method, setMethod] = useState<TipMethod>('cash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { existingTip, event, financial } = data

  // Already recorded — show confirmation
  if (existingTip) {
    return (
      <div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold text-emerald-800">Tip already recorded</span>
          </div>
          <p className="text-emerald-700 text-sm ml-8">
            {formatCurrency(existingTip.amountCents)} via {existingTip.paymentMethod}
          </p>
        </div>
        <Button onClick={onNext}>Continue</Button>
      </div>
    )
  }

  const handleSave = async () => {
    const cents = Math.round(parseFloat(dollars) * 100)
    if (!dollars || isNaN(cents) || cents <= 0) {
      setError('Enter a valid tip amount')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await recordTip({ eventId: event.id, amountCents: cents, paymentMethod: method })
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record tip')
    } finally {
      setLoading(false)
    }
  }

  if (financial.outstandingBalanceCents > 0) {
    return (
      <div>
        <Alert variant="warning" title="Balance still outstanding" className="mb-6">
          {event.clientFirstName} has an unpaid balance of{' '}
          <strong>{formatCurrency(financial.outstandingBalanceCents)}</strong>. You can
          record a tip after payment is settled, or continue for now.
        </Alert>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onNext}>Continue without tip</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-900 mb-2">
        Did {event.clientFirstName} leave a tip?
      </h2>
      <p className="text-stone-500 text-sm mb-6">
        Paid {formatCurrency(financial.quotedPriceCents)} for the evening.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {hasTip === null && (
        <div className="flex gap-3">
          <Button onClick={() => setHasTip(true)}>Yes — enter amount</Button>
          <Button variant="secondary" onClick={onNext}>No tip tonight</Button>
        </div>
      )}

      {hasTip === true && (
        <div className="space-y-5">
          <Input
            label="Tip amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
            className="text-xl"
          />

          <div>
            <p className="text-sm font-medium text-stone-700 mb-3">Payment method</p>
            <MethodPicker value={method} onChange={setMethod} />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} loading={loading} disabled={loading}>
              Save Tip & Continue
            </Button>
            <Button variant="ghost" onClick={() => setHasTip(null)} disabled={loading}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 1: Receipts ─────────────────────────────────────────────────────────

function ReceiptsStep({
  data,
  onNext,
}: {
  data: CloseOutData
  onNext: () => void
}) {
  const { expensesNeedingReceipts, hasAnyExpenses, event } = data

  if (!hasAnyExpenses) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Receipt check</h2>
        <Alert variant="info" className="mb-6">
          No expenses have been logged for this event yet. You can add them from
          the event page at any time.
        </Alert>
        <div className="flex gap-3">
          <Button onClick={onNext}>Continue</Button>
          <Link href={`/events/${event.id}`}>
            <Button variant="secondary">Go add expenses</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (expensesNeedingReceipts.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Receipts</h2>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold text-emerald-800">All receipts uploaded</span>
          </div>
        </div>
        <Button onClick={onNext}>Continue</Button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-900 mb-2">Missing receipts</h2>
      <p className="text-stone-500 text-sm mb-5">
        {expensesNeedingReceipts.length} expense{expensesNeedingReceipts.length > 1 ? 's' : ''} still
        need a receipt photo. Upload from the event page, or continue now and come back later.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50 divide-y divide-amber-100 mb-6">
        {expensesNeedingReceipts.map((exp) => (
          <div key={exp.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-stone-800 font-medium">{exp.description}</span>
            <span className="text-sm text-stone-600">{formatCurrency(exp.amountCents)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href={`/events/${event.id}`}>
          <Button variant="primary">Upload receipts</Button>
        </Link>
        <Button variant="secondary" onClick={onNext}>Continue anyway</Button>
      </div>
    </div>
  )
}

// ─── Step 2: Mileage ──────────────────────────────────────────────────────────

const IRS_RATE = 0.70  // $0.70/mile — keep in sync with financial-summary-actions.ts

function MileageStep({
  data,
  onNext,
}: {
  data: CloseOutData
  onNext: () => void
}) {
  const { event, financial } = data
  const [miles, setMiles] = useState(
    event.mileageMiles !== null ? String(event.mileageMiles) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const milesNum = parseFloat(miles) || 0
  const deductionDollars = (milesNum * IRS_RATE).toFixed(2)

  const handleSave = async () => {
    if (!miles || milesNum < 0) {
      setError('Enter miles driven (or 0 if you did not drive)')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await updateMileage(event.id, milesNum)
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mileage')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-900 mb-2">
        Miles driven tonight
      </h2>
      <p className="text-stone-500 text-sm mb-6">
        Round trip — home to store(s) to client and back. Used for your IRS deduction.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="mb-4">
        <Input
          label="Miles (round trip)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          placeholder="0"
          value={miles}
          onChange={(e) => setMiles(e.target.value)}
        />
      </div>

      {milesNum > 0 && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 p-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">IRS deduction ({milesNum.toFixed(1)} mi × $0.70)</span>
            <span className="font-semibold text-stone-900">${deductionDollars}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={loading} disabled={loading}>
          {event.mileageMiles !== null ? 'Update & Continue' : 'Save & Continue'}
        </Button>
        <Button variant="secondary" onClick={onNext} disabled={loading}>
          0 miles — skip
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3: Quick AAR ────────────────────────────────────────────────────────

function AARStep({
  data,
  onNext,
}: {
  data: CloseOutData
  onNext: () => void
}) {
  const { event, aarExists } = data
  const [calmRating, setCalmRating] = useState(0)
  const [prepRating, setPrepRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (aarExists || event.aarFiled) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Reflection</h2>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold text-emerald-800">After-action review already filed</span>
          </div>
          <p className="text-emerald-700 text-sm ml-8 mt-1">
            You can view or edit it from the event page.
          </p>
        </div>
        <Button onClick={onNext}>Continue</Button>
      </div>
    )
  }

  const handleSave = async () => {
    if (calmRating === 0 || prepRating === 0) {
      setError('Please rate both calm and preparation before continuing')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createAAR({
        event_id: event.id,
        calm_rating: calmRating,
        preparation_rating: prepRating,
        general_notes: notes.trim() || undefined,
        execution_rating: undefined,
      })
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reflection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-900 mb-2">
        Quick reflection
      </h2>
      <p className="text-stone-500 text-sm mb-6">
        10 seconds while the memory is fresh. You can add more detail from the event page later.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <StarRating
        label="How calm were you tonight?"
        value={calmRating}
        onChange={setCalmRating}
      />

      <StarRating
        label="How prepared were you?"
        value={prepRating}
        onChange={setPrepRating}
      />

      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          Anything to grab differently next time? <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <textarea
          className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20 resize-none"
          rows={3}
          placeholder="Forgot salt, wish I prepped the dessert earlier..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={loading} disabled={loading}>
          Save & Continue
        </Button>
        <Button variant="secondary" onClick={onNext} disabled={loading}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}

// ─── Celebration Screen ────────────────────────────────────────────────────────
// Shown after financial close is confirmed. CSS-only confetti, auto-advances to
// dashboard after 3 seconds or chef clicks Done.

type CelebrationProps = {
  event: CloseOutData['event']
  financial: CloseOutData['financial']
  followUpSent: boolean
  followUpLoading: boolean
  onFollowUp: () => void
  router: ReturnType<typeof useRouter>
}

function CelebrationAndFollowUp({
  event,
  financial,
  followUpSent,
  followUpLoading,
  onFollowUp,
  router,
}: CelebrationProps) {
  const [celebrating, setCelebrating] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setCelebrating(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const marginColor =
    financial.grossMarginPercent >= 60 ? 'text-emerald-700' :
    financial.grossMarginPercent >= 40 ? 'text-amber-700' :
    'text-red-700'

  return (
    <div className="py-4">
      {/* Celebration hero */}
      <div className="relative text-center mb-8 overflow-hidden">
        {celebrating && (
          <>
            <span className="absolute top-0 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" />
            <span className="absolute top-2 left-12 w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
            <span className="absolute top-0 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
            <span className="absolute top-1 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" />
            <span className="absolute top-0 right-4 w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
            <span className="absolute top-2 right-12 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping" />
            <span className="absolute top-0 right-1/4 w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
            <span className="absolute top-1 right-1/3 w-1.5 h-1.5 bg-teal-400 rounded-full animate-ping" />
          </>
        )}
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          {event.occasion || 'Tonight'} is done! 🎉
        </h2>
        <p className={`text-3xl font-bold ${marginColor} mb-1`}>
          {formatCurrency(financial.netProfitWithTipCents)}
        </p>
        <p className="text-sm text-stone-500">
          {financial.grossMarginPercent}% margin
          {financial.effectiveHourlyRateCents
            ? ` · ${formatCurrency(financial.effectiveHourlyRateCents)}/hr`
            : ''}
        </p>
      </div>

      {/* Follow-up prompt */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 mb-6">
        <p className="text-sm font-semibold text-stone-800 mb-1">
          One last thing — send {event.clientFirstName} a thank you
        </p>
        <p className="text-sm text-stone-500 mb-4">
          A short message goes a long way. Marks your follow-up as done in the dashboard.
        </p>
        {followUpSent ? (
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Follow-up marked as sent
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={onFollowUp}
              loading={followUpLoading}
              disabled={followUpLoading}
            >
              Mark Follow-Up Sent
            </Button>
            <Link href={`/events/${event.id}`}>
              <Button variant="ghost" size="sm">Write a message first</Button>
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
        <Link href={`/events/${event.id}`}>
          <Button variant="secondary">View Event</Button>
        </Link>
      </div>
    </div>
  )
}

// ─── Step 4: Financial Close ──────────────────────────────────────────────────

function CloseStep({
  data,
}: {
  data: CloseOutData
}) {
  const [loading, setLoading] = useState(false)
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closed, setClosed] = useState(data.event.financialClosed)
  const [followUpSent, setFollowUpSent] = useState(false)
  const router = useRouter()

  const { event, financial } = data

  const handleClose = async () => {
    setLoading(true)
    setError(null)
    try {
      await markFinancialClosed(event.id)
      setClosed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close event')
    } finally {
      setLoading(false)
    }
  }

  const handleFollowUp = async () => {
    setFollowUpLoading(true)
    try {
      await markFollowUpSent(event.id)
      setFollowUpSent(true)
    } catch {
      // Non-blocking — don't stop the chef
    } finally {
      setFollowUpLoading(false)
    }
  }

  if (closed) {
    return <CelebrationAndFollowUp event={event} financial={financial} followUpSent={followUpSent} followUpLoading={followUpLoading} onFollowUp={handleFollowUp} router={router} />
  }

  const marginColor =
    financial.grossMarginPercent >= 60
      ? 'text-emerald-700'
      : financial.grossMarginPercent >= 40
      ? 'text-amber-700'
      : 'text-red-700'

  const foodCostOk = financial.foodCostPercent <= 30

  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-900 mb-6">
        How tonight landed
      </h2>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {/* Summary grid */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 divide-y divide-stone-100 mb-6">
        <div className="flex justify-between items-center px-5 py-3">
          <span className="text-sm text-stone-600">Service revenue</span>
          <span className="font-semibold text-stone-900">{formatCurrency(financial.quotedPriceCents)}</span>
        </div>
        {financial.tipCents > 0 && (
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-stone-600">Tip received</span>
            <span className="font-semibold text-emerald-700">+{formatCurrency(financial.tipCents)}</span>
          </div>
        )}
        {financial.actualGrocerySpendCents > 0 && (
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-stone-600">
              Food &amp; expenses
              {!foodCostOk && (
                <span className="ml-2 text-xs text-amber-600">
                  ({financial.foodCostPercent}% food cost)
                </span>
              )}
              {foodCostOk && (
                <span className="ml-2 text-xs text-emerald-600">
                  ({financial.foodCostPercent}% ✓)
                </span>
              )}
            </span>
            <span className="font-semibold text-stone-900">−{formatCurrency(financial.actualGrocerySpendCents)}</span>
          </div>
        )}
        {financial.deductionValueCents && (
          <div className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-stone-600">Mileage deduction</span>
            <span className="font-semibold text-stone-600">
              {event.mileageMiles?.toFixed(1)} mi → ${(financial.deductionValueCents / 100).toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center px-5 py-4 bg-white rounded-b-xl">
          <span className="text-base font-semibold text-stone-800">Net profit</span>
          <div className="text-right">
            <span className={`text-xl font-bold ${marginColor}`}>
              {formatCurrency(financial.netProfitWithTipCents)}
            </span>
            <span className={`ml-2 text-sm font-medium ${marginColor}`}>
              ({financial.grossMarginPercent}%)
            </span>
          </div>
        </div>
      </div>

      {financial.effectiveHourlyRateCents && (
        <p className="text-sm text-stone-500 text-center mb-6">
          Effective rate: <strong className="text-stone-700">{formatCurrency(financial.effectiveHourlyRateCents)}/hr</strong>
        </p>
      )}

      {financial.outstandingBalanceCents > 0 && (
        <Alert variant="warning" className="mb-6">
          Outstanding balance of {formatCurrency(financial.outstandingBalanceCents)} is still unpaid.
          You can still close the event — mark the balance separately when received.
        </Alert>
      )}

      <Button
        onClick={handleClose}
        loading={loading}
        disabled={loading}
        className="w-full"
      >
        Mark Tonight Financially Closed
      </Button>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function CloseOutWizard({ data }: { data: CloseOutData }) {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))

  const eventLabel = data.event.occasion
    ? `${data.event.occasion} · ${format(new Date(data.event.eventDate), 'MMM d')}`
    : format(new Date(data.event.eventDate), 'PPP')

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/events/${data.event.id}`}
          className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to event
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Close Out</h1>
        <p className="text-stone-500 text-sm mt-1">{eventLabel}</p>
      </div>

      <ProgressBar current={step} total={TOTAL_STEPS} />

      {/* Step content */}
      <div className="min-h-[300px]">
        {step === 0 && <TipStep data={data} onNext={next} />}
        {step === 1 && <ReceiptsStep data={data} onNext={next} />}
        {step === 2 && <MileageStep data={data} onNext={next} />}
        {step === 3 && <AARStep data={data} onNext={next} />}
        {step === 4 && <CloseStep data={data} />}
      </div>

      {/* Do this later link — visible on all steps except the final */}
      {step < TOTAL_STEPS - 1 && (
        <div className="mt-8 pt-6 border-t border-stone-100 text-center">
          <Link
            href={`/events/${data.event.id}`}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            Finish later — go back to event
          </Link>
        </div>
      )}
    </div>
  )
}
