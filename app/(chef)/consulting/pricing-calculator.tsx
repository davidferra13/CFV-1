'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Calculator, Check, Copy, Printer, RotateCcw } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'

const EXAMPLE_VALUES = {
  foodCost: '420',
  laborHours: '9',
  laborRate: '70',
  overhead: '150',
  targetMargin: '28',
  guestCount: '10',
}

const MAX_MARGIN_PERCENT = 95

function parseNonNegative(value: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

function formatDollars(amount: number): string {
  return formatCurrency(Math.round(amount * 100))
}

export function PricingCalculator() {
  const router = useRouter()
  const [foodCost, setFoodCost] = useState('0')
  const [laborHours, setLaborHours] = useState('0')
  const [laborRate, setLaborRate] = useState('65')
  const [overhead, setOverhead] = useState('0')
  const [targetMargin, setTargetMargin] = useState('25')
  const [guestCount, setGuestCount] = useState('0')
  const [clientName, setClientName] = useState('')
  const [eventName, setEventName] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [copied, setCopied] = useState(false)

  const numbers = useMemo(() => {
    const safeMargin = Math.min(parseNonNegative(targetMargin), MAX_MARGIN_PERCENT)
    const food = parseNonNegative(foodCost)
    const hours = parseNonNegative(laborHours)
    const rate = parseNonNegative(laborRate)
    const overheadAllocation = parseNonNegative(overhead)
    const guests = Math.floor(parseNonNegative(guestCount))

    const laborValue = hours * rate
    const costFloor = food + laborValue + overheadAllocation
    const marginDecimal = safeMargin / 100
    const recommendedQuote = costFloor > 0 ? costFloor / (1 - marginDecimal) : 0
    const projectedProfit = recommendedQuote - costFloor
    const perGuest = guests > 0 ? recommendedQuote / guests : 0
    const deposit50 = recommendedQuote * 0.5
    const deposit60 = recommendedQuote * 0.6
    const balance50 = recommendedQuote - deposit50
    const balance60 = recommendedQuote - deposit60
    const suggestedDepositRate = recommendedQuote >= 2000 ? 60 : 50

    return {
      margin: safeMargin,
      food,
      hours,
      rate,
      guests,
      laborValue,
      costFloor,
      recommendedQuote,
      projectedProfit,
      perGuest,
      deposit50,
      deposit60,
      balance50,
      balance60,
      suggestedDepositRate,
    }
  }, [foodCost, laborHours, laborRate, overhead, targetMargin, guestCount])

  const summaryText = useMemo(() => {
    const line = '----------------------------------------'
    const title = eventName.trim() || 'Private Chef Service'
    const dateLabel = serviceDate || 'TBD'
    const clientLabel = clientName.trim() || 'Client'
    const guestLine =
      numbers.guests > 0
        ? `Estimated per guest (${numbers.guests} guests): ${formatDollars(numbers.perGuest)}`
        : 'Estimated per guest: N/A (guest count not set)'

    return [
      `ChefFlow Pricing Summary - ${title}`,
      line,
      `Client: ${clientLabel}`,
      `Service date: ${dateLabel}`,
      '',
      `Recommended quote: ${formatDollars(numbers.recommendedQuote)}`,
      `Cost floor: ${formatDollars(numbers.costFloor)}`,
      `Target margin: ${numbers.margin.toFixed(0)}%`,
      `Projected profit: ${formatDollars(numbers.projectedProfit)}`,
      guestLine,
      '',
      'Deposit options:',
      `- 50% deposit: ${formatDollars(numbers.deposit50)} | Remaining: ${formatDollars(numbers.balance50)}`,
      `- 60% deposit: ${formatDollars(numbers.deposit60)} | Remaining: ${formatDollars(numbers.balance60)}`,
      '',
      `Suggested deposit policy for this quote: ${numbers.suggestedDepositRate}%`,
      'Quote validity suggestion: 7 days.',
    ].join('\n')
  }, [clientName, eventName, serviceDate, numbers])

  const handleReset = () => {
    setFoodCost('0')
    setLaborHours('0')
    setLaborRate('65')
    setOverhead('0')
    setTargetMargin('25')
    setGuestCount('0')
    setClientName('')
    setEventName('')
    setServiceDate('')
    setCopied(false)
  }

  const handleLoadExample = () => {
    setFoodCost(EXAMPLE_VALUES.foodCost)
    setLaborHours(EXAMPLE_VALUES.laborHours)
    setLaborRate(EXAMPLE_VALUES.laborRate)
    setOverhead(EXAMPLE_VALUES.overhead)
    setTargetMargin(EXAMPLE_VALUES.targetMargin)
    setGuestCount(EXAMPLE_VALUES.guestCount)
    setClientName('Sample Client')
    setEventName('Intimate Dinner Experience')
  }

  const handleCopySummary = async () => {
    if (!navigator?.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const handlePrint = () => {
    if (typeof window === 'undefined') return
    window.print()
  }

  const handleCreateQuoteDraft = () => {
    if (numbers.recommendedQuote <= 0) return

    const params = new URLSearchParams()
    const quoteName = eventName.trim() || 'Private Chef Service Quote'
    const suggestedDepositCents = Math.round(
      numbers.recommendedQuote * (numbers.suggestedDepositRate / 100) * 100
    )
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 7)
    const validUntilIso = validUntil.toISOString().slice(0, 10)

    params.set('source', 'consulting')
    params.set('quote_name', quoteName)
    params.set('pricing_model', 'flat_rate')
    params.set('total_cents', String(Math.round(numbers.recommendedQuote * 100)))
    params.set('deposit_required', 'true')
    params.set('deposit_percentage', String(numbers.suggestedDepositRate))
    params.set('deposit_amount_cents', String(suggestedDepositCents))
    params.set('valid_until', validUntilIso)

    if (numbers.guests > 0) {
      params.set('guest_count', String(numbers.guests))
      params.set('price_per_person_cents', String(Math.round(numbers.perGuest * 100)))
    }

    params.set(
      'pricing_notes',
      `Proposed service total ${formatDollars(numbers.recommendedQuote)}. ${numbers.suggestedDepositRate}% deposit requested to reserve the date.`
    )
    params.set(
      'internal_notes',
      `Consulting calculator prefill. Cost floor ${formatDollars(numbers.costFloor)}. Projected profit ${formatDollars(numbers.projectedProfit)}.`
    )

    router.push(`/quotes/new?${params.toString()}`)
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-brand-600" />
            Pricing Calculator
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="info">Interactive</Badge>
            <Button type="button" variant="secondary" size="sm" onClick={handleLoadExample}>
              Load Example
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
        <p className="text-sm text-stone-400">
          Enter your event assumptions to calculate a profitable minimum quote.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input
            type="number"
            min="0"
            step="0.01"
            label="Food Cost ($)"
            value={foodCost}
            onChange={(event) => setFoodCost(event.target.value)}
            helperText="Ingredients, disposables, rentals paid per event."
          />
          <Input
            type="number"
            min="0"
            step="0.25"
            label="Labor Hours"
            value={laborHours}
            onChange={(event) => setLaborHours(event.target.value)}
            helperText="Prep + shopping + service + cleanup + admin."
          />
          <Input
            type="number"
            min="0"
            step="1"
            label="Your Labor Rate ($/hr)"
            value={laborRate}
            onChange={(event) => setLaborRate(event.target.value)}
            helperText="What your time is worth, not minimum wage."
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            label="Overhead Allocation ($)"
            value={overhead}
            onChange={(event) => setOverhead(event.target.value)}
            helperText="Insurance, software, vehicle, and business overhead."
          />
          <Input
            type="number"
            min="0"
            max={MAX_MARGIN_PERCENT}
            step="1"
            label="Target Profit Margin (%)"
            value={targetMargin}
            onChange={(event) => setTargetMargin(event.target.value)}
            helperText={`Limited to ${MAX_MARGIN_PERCENT}% for stable pricing math.`}
          />
          <Input
            type="number"
            min="0"
            step="1"
            label="Guest Count (optional)"
            value={guestCount}
            onChange={(event) => setGuestCount(event.target.value)}
            helperText="Used for estimated per-person quote guidance."
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-stone-700/60 bg-stone-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Labor Value</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">
              {formatDollars(numbers.laborValue)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {numbers.hours.toFixed(2)} hrs x {formatDollars(numbers.rate)}
            </p>
          </div>

          <div className="rounded-xl border border-stone-700/60 bg-stone-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Cost Floor</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">
              {formatDollars(numbers.costFloor)}
            </p>
            <p className="mt-1 text-xs text-stone-500">Minimum to avoid underpricing this event.</p>
          </div>

          <div className="rounded-xl border border-brand-700/60 bg-brand-950/25 p-4">
            <p className="text-xs uppercase tracking-wide text-brand-400">Recommended Quote</p>
            <p className="mt-1 text-2xl font-semibold text-brand-200">
              {formatDollars(numbers.recommendedQuote)}
            </p>
            <p className="mt-1 text-xs text-brand-400">
              Targets ~{numbers.margin.toFixed(0)}% profit margin.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-400">Projected Profit</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">
              {formatDollars(numbers.projectedProfit)}
            </p>
            <p className="mt-1 text-xs text-emerald-400">
              Remaining after direct costs and overhead.
            </p>
          </div>
        </div>

        {numbers.guests > 0 && (
          <div className="rounded-xl border border-stone-700/60 bg-stone-900/30 p-4">
            <p className="text-sm text-stone-300">
              Estimated per-guest quote at {numbers.guests} guests:{' '}
              <span className="font-semibold text-stone-100">
                {formatDollars(numbers.perGuest)}
              </span>
            </p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-stone-700/60 bg-stone-900/30 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">50% Deposit</p>
            <p className="mt-1 text-xl font-semibold text-stone-100">
              {formatDollars(numbers.deposit50)}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Remaining balance: {formatDollars(numbers.balance50)}
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 ${
              numbers.suggestedDepositRate === 60
                ? 'border-brand-700/60 bg-brand-950/25'
                : 'border-stone-700/60 bg-stone-900/30'
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-stone-500">60% Deposit</p>
            <p className="mt-1 text-xl font-semibold text-stone-100">
              {formatDollars(numbers.deposit60)}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Remaining balance: {formatDollars(numbers.balance60)}
            </p>
            {numbers.suggestedDepositRate === 60 && (
              <p className="mt-2 text-xs font-medium text-brand-300">
                Suggested for higher-value events.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            type="text"
            label="Client Name (optional)"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="e.g. Sarah Johnson"
          />
          <Input
            type="text"
            label="Event / Service (optional)"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            placeholder="e.g. Anniversary Dinner"
          />
          <Input
            type="date"
            label="Service Date (optional)"
            value={serviceDate}
            onChange={(event) => setServiceDate(event.target.value)}
          />
        </div>

        <div className="rounded-xl border border-stone-700/60 bg-stone-900/20 p-4 print:border print:border-black print:bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-stone-100 print:text-black">
                Client Summary
              </p>
              <p className="text-xs text-stone-400 print:text-black">
                Copy this summary or print as PDF to send with your quote.
              </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateQuoteDraft}
                disabled={numbers.recommendedQuote <= 0}
              >
                Create Quote Draft
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={handleCopySummary}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy Summary'}
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>
          </div>

          <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-stone-700/60 bg-stone-950/60 p-3 text-xs text-stone-300 print:border-black print:bg-white print:text-black">
            {summaryText}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
