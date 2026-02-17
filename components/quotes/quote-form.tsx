// Quote Form — Create or edit a quote
// Supports pre-filling from inquiry data and showing client pricing history
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { createQuote, updateQuote, type CreateQuoteInput, type UpdateQuoteInput } from '@/lib/quotes/actions'
import { parseCurrencyToCents, formatCurrency } from '@/lib/utils/currency'

type Client = {
  id: string
  full_name: string
  email: string
}

type PricingHistoryEntry = {
  id: string
  total_quoted_cents: number
  price_per_person_cents: number | null
  guest_count_estimated: number | null
  pricing_model: string | null
  accepted_at: string | null
  quote_name: string | null
  event: { id: string; occasion: string | null; event_date: string | null } | null
}

type ExistingQuote = {
  id: string
  quote_name: string | null
  pricing_model: string | null
  total_quoted_cents: number
  price_per_person_cents: number | null
  guest_count_estimated: number | null
  deposit_required: boolean
  deposit_amount_cents: number | null
  deposit_percentage: number | null
  valid_until: string | null
  pricing_notes: string | null
  internal_notes: string | null
}

type QuoteFormProps = {
  clients: Client[]
  pricingHistory?: PricingHistoryEntry[]
  prefilledClientId?: string
  prefilledInquiryId?: string
  prefilledGuestCount?: number | null
  prefilledBudgetCents?: number | null
  existingQuote?: ExistingQuote
}

export function QuoteForm({
  clients,
  pricingHistory,
  prefilledClientId,
  prefilledInquiryId,
  prefilledGuestCount,
  prefilledBudgetCents,
  existingQuote,
}: QuoteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!existingQuote

  // Form state
  const [clientId, setClientId] = useState(prefilledClientId || '')
  const [quoteName, setQuoteName] = useState(existingQuote?.quote_name || '')
  const [pricingModel, setPricingModel] = useState(existingQuote?.pricing_model || 'flat_rate')
  const [totalAmount, setTotalAmount] = useState(
    existingQuote ? (existingQuote.total_quoted_cents / 100).toFixed(2) :
    prefilledBudgetCents ? (prefilledBudgetCents / 100).toFixed(2) : ''
  )
  const [pricePerPerson, setPricePerPerson] = useState(
    existingQuote?.price_per_person_cents ? (existingQuote.price_per_person_cents / 100).toFixed(2) : ''
  )
  const [guestCount, setGuestCount] = useState(
    existingQuote?.guest_count_estimated?.toString() ||
    prefilledGuestCount?.toString() || ''
  )
  const [depositRequired, setDepositRequired] = useState(existingQuote?.deposit_required ?? false)
  const [depositAmount, setDepositAmount] = useState(
    existingQuote?.deposit_amount_cents ? (existingQuote.deposit_amount_cents / 100).toFixed(2) : ''
  )
  const [depositPercentage, setDepositPercentage] = useState(
    existingQuote?.deposit_percentage?.toString() || ''
  )
  const [validUntil, setValidUntil] = useState(existingQuote?.valid_until?.split('T')[0] || '')
  const [pricingNotes, setPricingNotes] = useState(existingQuote?.pricing_notes || '')
  const [internalNotes, setInternalNotes] = useState(existingQuote?.internal_notes || '')

  // Auto-calculate total from per_person * guest_count
  const handlePricingModelChange = (model: string) => {
    setPricingModel(model)
    if (model === 'per_person' && pricePerPerson && guestCount) {
      const total = (parseFloat(pricePerPerson) * parseInt(guestCount)).toFixed(2)
      setTotalAmount(total)
    }
  }

  const handlePerPersonChange = (value: string) => {
    setPricePerPerson(value)
    if (pricingModel === 'per_person' && value && guestCount) {
      const total = (parseFloat(value) * parseInt(guestCount)).toFixed(2)
      setTotalAmount(total)
    }
  }

  const handleGuestCountChange = (value: string) => {
    setGuestCount(value)
    if (pricingModel === 'per_person' && pricePerPerson && value) {
      const total = (parseFloat(pricePerPerson) * parseInt(value)).toFixed(2)
      setTotalAmount(total)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const totalCents = parseCurrencyToCents(totalAmount)
      if (!totalCents || totalCents <= 0) throw new Error('Total amount must be positive')

      if (isEditing) {
        const input: UpdateQuoteInput = {
          quote_name: quoteName || undefined,
          pricing_model: pricingModel as 'per_person' | 'flat_rate' | 'custom',
          total_quoted_cents: totalCents,
          price_per_person_cents: pricePerPerson ? parseCurrencyToCents(pricePerPerson) : null,
          guest_count_estimated: guestCount ? parseInt(guestCount) : null,
          deposit_required: depositRequired,
          deposit_amount_cents: depositAmount ? parseCurrencyToCents(depositAmount) : null,
          deposit_percentage: depositPercentage ? parseFloat(depositPercentage) : null,
          valid_until: validUntil || null,
          pricing_notes: pricingNotes || null,
          internal_notes: internalNotes || null,
        }
        const result = await updateQuote(existingQuote.id, input)
        if (result.success) {
          router.push(`/quotes/${existingQuote.id}`)
        }
      } else {
        if (!clientId) throw new Error('Client is required')

        const input: CreateQuoteInput = {
          client_id: clientId,
          inquiry_id: prefilledInquiryId || null,
          quote_name: quoteName || undefined,
          pricing_model: pricingModel as 'per_person' | 'flat_rate' | 'custom',
          total_quoted_cents: totalCents,
          price_per_person_cents: pricePerPerson ? parseCurrencyToCents(pricePerPerson) : null,
          guest_count_estimated: guestCount ? parseInt(guestCount) : null,
          deposit_required: depositRequired,
          deposit_amount_cents: depositAmount ? parseCurrencyToCents(depositAmount) : null,
          deposit_percentage: depositPercentage ? parseFloat(depositPercentage) : null,
          valid_until: validUntil || null,
          pricing_notes: pricingNotes || undefined,
          internal_notes: internalNotes || undefined,
        }
        const result = await createQuote(input)
        if (result.success && result.quote) {
          router.push(`/quotes/${result.quote.id}`)
        }
      }
    } catch (err) {
      console.error('Quote form error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: `${c.full_name} (${c.email})`
  }))

  const pricingModelOptions = [
    { value: 'flat_rate', label: 'Flat Rate' },
    { value: 'per_person', label: 'Per Person' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <div className="space-y-6">
      {/* Pricing History Intelligence */}
      {pricingHistory && pricingHistory.length > 0 && (
        <Card className="p-6 bg-brand-50 border-brand-200">
          <h3 className="text-sm font-semibold text-brand-900 mb-3">
            Client Pricing History ({pricingHistory.length} accepted {pricingHistory.length === 1 ? 'quote' : 'quotes'})
          </h3>
          <div className="space-y-2">
            {pricingHistory.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-brand-800 font-medium">
                    {formatCurrency(entry.total_quoted_cents)}
                  </span>
                  {entry.price_per_person_cents && entry.guest_count_estimated && (
                    <span className="text-brand-600 ml-2">
                      ({formatCurrency(entry.price_per_person_cents)}/person x {entry.guest_count_estimated})
                    </span>
                  )}
                </div>
                <div className="text-brand-600 text-xs">
                  {entry.event?.occasion || entry.quote_name || 'Quote'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          )}

          {/* Client Selection (create only) */}
          {!isEditing && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                Client
              </h3>
              <Select
                label="Client"
                required
                options={clientOptions}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                helperText={prefilledClientId ? 'Pre-selected from inquiry' : 'Select the client for this quote'}
              />
            </div>
          )}

          {/* Quote Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
              Quote Details
            </h3>

            <Input
              label="Quote Name"
              placeholder="e.g., Anniversary Dinner - Premium Package"
              value={quoteName}
              onChange={(e) => setQuoteName(e.target.value)}
              helperText="Optional label to identify this quote"
            />

            <Select
              label="Pricing Model"
              required
              options={pricingModelOptions}
              value={pricingModel}
              onChange={(e) => handlePricingModelChange(e.target.value)}
            />

            {pricingModel === 'per_person' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Price Per Person ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g., 125.00"
                  value={pricePerPerson}
                  onChange={(e) => handlePerPersonChange(e.target.value)}
                />
                <Input
                  label="Estimated Guests"
                  type="number"
                  min="1"
                  required
                  placeholder="e.g., 12"
                  value={guestCount}
                  onChange={(e) => handleGuestCountChange(e.target.value)}
                />
              </div>
            )}

            <Input
              label="Total Quoted Amount ($)"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="e.g., 2500.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              helperText={pricingModel === 'per_person' ? 'Auto-calculated from per-person x guests' : undefined}
            />
          </div>

          {/* Deposit */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
              Deposit
            </h3>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={depositRequired}
                onChange={(e) => setDepositRequired(e.target.checked)}
                className="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-stone-700">Deposit required</span>
            </label>

            {depositRequired && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Deposit Amount ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 500.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <Input
                  label="Deposit Percentage (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g., 50"
                  value={depositPercentage}
                  onChange={(e) => setDepositPercentage(e.target.value)}
                  helperText="For reference only"
                />
              </div>
            )}
          </div>

          {/* Validity & Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
              Validity & Notes
            </h3>

            <Input
              label="Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              helperText="When does this quote expire?"
            />

            <Textarea
              label="Pricing Notes (visible to client)"
              placeholder="What's included, terms, etc."
              value={pricingNotes}
              onChange={(e) => setPricingNotes(e.target.value)}
              rows={3}
            />

            <Textarea
              label="Internal Notes (chef only)"
              placeholder="Cost breakdown, margins, competitor pricing..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" loading={loading} disabled={loading}>
              {isEditing ? 'Save Changes' : 'Create Quote'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
