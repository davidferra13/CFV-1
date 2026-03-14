// Quote Form — Create or edit a quote
// Supports pre-filling from inquiry data and showing client pricing history
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { ConflictResolutionDialog } from '@/components/ui/conflict-resolution-dialog'
import { SaveStateBadge } from '@/components/ui/save-state-badge'
import { DraftRestorePrompt } from '@/components/ui/draft-restore-prompt'
import { trackAction, setActiveForm } from '@/lib/ai/remy-activity-tracker'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import {
  createQuote,
  getEventMenuCost,
  getQuoteById,
  updateQuote,
  type CreateQuoteInput,
} from '@/lib/quotes/actions'
import { parseCurrencyToCents, formatCurrency } from '@/lib/utils/currency'
import { CurrencyConversionHint } from '@/components/currency/currency-conversion-hint'
import {
  computePricing,
  formatCentsAsDollars,
  type ServiceType,
  type PricingBreakdown,
} from '@/lib/pricing/compute'
import { PricingSuggestionPanel } from '@/components/analytics/pricing-suggestion-panel'
import { SmartPricingHint } from '@/components/intelligence/smart-pricing-hint'
import type { PricingSuggestion } from '@/lib/analytics/pricing-suggestions'
import { useDurableDraft } from '@/lib/drafts/use-durable-draft'
import { useUnsavedChangesGuard } from '@/lib/navigation/use-unsaved-changes-guard'
import { useIdempotentMutation } from '@/lib/offline/use-idempotent-mutation'
import { parseConflictError, type ConflictErrorPayload } from '@/lib/mutations/conflict'
import { ValidationError } from '@/lib/errors/app-error'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'

type Client = {
  id: string
  full_name: string
  email: string
  recurring_pricing_model?: 'none' | 'flat_rate' | 'per_person' | null
  recurring_price_cents?: number | null
  recurring_pricing_notes?: string | null
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
  updated_at?: string
  event_id?: string | null
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

type QuoteFormData = {
  client_id: string
  quote_name: string
  pricing_model: string
  total_amount: string
  price_per_person: string
  guest_count: string
  deposit_required: boolean
  deposit_amount: string
  deposit_percentage: string
  valid_until: string
  pricing_notes: string
  internal_notes: string
}

type QuoteFormProps = {
  tenantId: string
  clients: Client[]
  pricingHistory?: PricingHistoryEntry[]
  pricingSuggestion?: PricingSuggestion | null
  /** GOLDMINE benchmark fallback — shown when chef has no pricing history */
  benchmarkHint?: string | null
  prefilledClientId?: string
  prefilledInquiryId?: string
  prefilledSource?: string | null
  prefilledQuoteName?: string | null
  prefilledPricingModel?: 'flat_rate' | 'per_person' | 'custom' | null
  prefilledGuestCount?: number | null
  prefilledBudgetCents?: number | null
  prefilledPricePerPersonCents?: number | null
  prefilledDepositRequired?: boolean
  prefilledDepositAmountCents?: number | null
  prefilledDepositPercentage?: number | null
  prefilledValidUntil?: string | null
  prefilledPricingNotes?: string | null
  prefilledInternalNotes?: string | null
  prefilledOccasion?: string | null
  prefilledEventDate?: string | null
  prefilledEventId?: string | null
  existingQuote?: ExistingQuote
}

const RECURRING_PRICE_WARNING_PERCENT = 20

export function QuoteForm({
  tenantId,
  clients,
  pricingHistory,
  pricingSuggestion,
  benchmarkHint,
  prefilledClientId,
  prefilledInquiryId,
  prefilledSource,
  prefilledQuoteName,
  prefilledPricingModel,
  prefilledGuestCount,
  prefilledBudgetCents,
  prefilledPricePerPersonCents,
  prefilledDepositRequired,
  prefilledDepositAmountCents,
  prefilledDepositPercentage,
  prefilledValidUntil,
  prefilledPricingNotes,
  prefilledInternalNotes,
  prefilledOccasion,
  prefilledEventDate,
  prefilledEventId,
  existingQuote,
}: QuoteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictError, setConflictError] = useState<ConflictErrorPayload | null>(null)
  const [latestConflictData, setLatestConflictData] = useState<QuoteFormData | null>(null)
  const isEditing = !!existingQuote

  useEffect(() => {
    setActiveForm(isEditing ? 'Edit Quote' : 'New Quote')
    return () => setActiveForm(null)
  }, [isEditing])

  // Menu cost hint state
  const [menuCost, setMenuCost] = useState<{
    menuId: string
    menuName: string
    totalFoodCostCents: number
    costPerGuestCents: number | null
    foodCostPercentage: number | null
    hasAllCosts: boolean
    guestCount: number | null
  } | null>(null)

  // Load menu cost when form has an event ID
  useEffect(() => {
    const eventId = existingQuote?.event_id ?? prefilledEventId ?? null
    if (!eventId) return

    let cancelled = false
    getEventMenuCost(eventId)
      .then((data) => {
        if (!cancelled) setMenuCost(data)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [existingQuote?.event_id, prefilledEventId])

  // Form state
  const [clientId, setClientId] = useState(prefilledClientId || '')
  const [quoteName, setQuoteName] = useState(
    existingQuote?.quote_name || prefilledQuoteName || prefilledOccasion || ''
  )
  const [pricingModel, setPricingModel] = useState(
    existingQuote?.pricing_model || prefilledPricingModel || 'flat_rate'
  )
  const [totalAmount, setTotalAmount] = useState(
    existingQuote
      ? (existingQuote.total_quoted_cents / 100).toFixed(2)
      : prefilledBudgetCents
        ? (prefilledBudgetCents / 100).toFixed(2)
        : ''
  )
  const [pricePerPerson, setPricePerPerson] = useState(
    existingQuote?.price_per_person_cents
      ? (existingQuote.price_per_person_cents / 100).toFixed(2)
      : prefilledPricePerPersonCents
        ? (prefilledPricePerPersonCents / 100).toFixed(2)
        : ''
  )
  const [guestCount, setGuestCount] = useState(
    existingQuote?.guest_count_estimated?.toString() || prefilledGuestCount?.toString() || ''
  )
  const [depositRequired, setDepositRequired] = useState(
    existingQuote?.deposit_required ?? prefilledDepositRequired ?? false
  )
  const [depositAmount, setDepositAmount] = useState(
    existingQuote?.deposit_amount_cents
      ? (existingQuote.deposit_amount_cents / 100).toFixed(2)
      : prefilledDepositAmountCents
        ? (prefilledDepositAmountCents / 100).toFixed(2)
        : ''
  )
  const [depositPercentage, setDepositPercentage] = useState(
    existingQuote?.deposit_percentage?.toString() ||
      (prefilledDepositPercentage != null ? prefilledDepositPercentage.toString() : '')
  )
  const [validUntil, setValidUntil] = useState(
    existingQuote?.valid_until?.split('T')[0] || prefilledValidUntil || ''
  )
  const [pricingNotes, setPricingNotes] = useState(
    existingQuote?.pricing_notes || prefilledPricingNotes || ''
  )
  const [internalNotes, setInternalNotes] = useState(
    existingQuote?.internal_notes || prefilledInternalNotes || ''
  )

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients]
  )

  const recurringPricingCheck = useMemo(() => {
    if (isEditing || !selectedClient) return null

    const recurringModel = selectedClient.recurring_pricing_model
    const recurringRateRaw = selectedClient.recurring_price_cents
    if (
      !recurringModel ||
      recurringModel === 'none' ||
      typeof recurringRateRaw !== 'number' ||
      !Number.isFinite(recurringRateRaw) ||
      recurringRateRaw <= 0
    ) {
      return null
    }
    const recurringRateCents = Math.round(recurringRateRaw)

    const guestCountNum = Number.parseInt(guestCount, 10)
    const hasGuestCount = Number.isFinite(guestCountNum) && guestCountNum > 0
    const totalCents = totalAmount.trim() ? parseCurrencyToCents(totalAmount) : Number.NaN
    const perPersonCents = pricePerPerson.trim() ? parseCurrencyToCents(pricePerPerson) : Number.NaN

    if (pricingModel === 'per_person' && recurringModel === 'per_person') {
      const hasComparablePerPerson = Number.isFinite(perPersonCents) && perPersonCents > 0
      if (!hasComparablePerPerson) {
        return {
          recurringModel,
          recurringRateCents,
          needsGuestCountForComparison: false,
          comparison: null,
        }
      }
      return {
        recurringModel,
        recurringRateCents,
        needsGuestCountForComparison: false,
        comparison: {
          basis: 'per_person' as const,
          baselineCents: recurringRateCents,
          currentCents: perPersonCents,
          deltaPercent: ((perPersonCents - recurringRateCents) / recurringRateCents) * 100,
        },
      }
    }

    if (!Number.isFinite(totalCents) || totalCents <= 0) {
      return {
        recurringModel,
        recurringRateCents,
        needsGuestCountForComparison: recurringModel === 'per_person' && !hasGuestCount,
        comparison: null,
      }
    }

    const baselineTotalCents =
      recurringModel === 'flat_rate'
        ? recurringRateCents
        : hasGuestCount
          ? recurringRateCents * guestCountNum
          : null

    if (!baselineTotalCents || baselineTotalCents <= 0) {
      return {
        recurringModel,
        recurringRateCents,
        needsGuestCountForComparison: recurringModel === 'per_person' && !hasGuestCount,
        comparison: null,
      }
    }

    return {
      recurringModel,
      recurringRateCents,
      needsGuestCountForComparison: false,
      comparison: {
        basis: 'total' as const,
        baselineCents: baselineTotalCents,
        currentCents: totalCents,
        deltaPercent: ((totalCents - baselineTotalCents) / baselineTotalCents) * 100,
      },
    }
  }, [guestCount, isEditing, pricePerPerson, pricingModel, selectedClient, totalAmount])

  // ── Pricing Calculator state ─────────────────────────────────────────────
  const [calcOpen, setCalcOpen] = useState(false)
  const [calcServiceType, setCalcServiceType] = useState<ServiceType>('private_dinner')
  const [calcCourseCount, setCalcCourseCount] = useState('4')
  const [calcEventDate, setCalcEventDate] = useState(prefilledEventDate?.split('T')[0] ?? '')
  const [calcDistance, setCalcDistance] = useState('0')
  const [calcWeekendPremium, setCalcWeekendPremium] = useState(false)
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcResult, setCalcResult] = useState<PricingBreakdown | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)

  const currentFormData = useMemo<QuoteFormData>(
    () => ({
      client_id: clientId,
      quote_name: quoteName,
      pricing_model: pricingModel,
      total_amount: totalAmount,
      price_per_person: pricePerPerson,
      guest_count: guestCount,
      deposit_required: depositRequired,
      deposit_amount: depositAmount,
      deposit_percentage: depositPercentage,
      valid_until: validUntil,
      pricing_notes: pricingNotes,
      internal_notes: internalNotes,
    }),
    [
      clientId,
      quoteName,
      pricingModel,
      totalAmount,
      pricePerPerson,
      guestCount,
      depositRequired,
      depositAmount,
      depositPercentage,
      validUntil,
      pricingNotes,
      internalNotes,
    ]
  )

  const initialFormData = useMemo<QuoteFormData>(
    () => ({
      client_id: prefilledClientId || '',
      quote_name: existingQuote?.quote_name || prefilledQuoteName || prefilledOccasion || '',
      pricing_model: existingQuote?.pricing_model || prefilledPricingModel || 'flat_rate',
      total_amount: existingQuote
        ? (existingQuote.total_quoted_cents / 100).toFixed(2)
        : prefilledBudgetCents
          ? (prefilledBudgetCents / 100).toFixed(2)
          : '',
      price_per_person: existingQuote?.price_per_person_cents
        ? (existingQuote.price_per_person_cents / 100).toFixed(2)
        : prefilledPricePerPersonCents
          ? (prefilledPricePerPersonCents / 100).toFixed(2)
          : '',
      guest_count:
        existingQuote?.guest_count_estimated?.toString() || prefilledGuestCount?.toString() || '',
      deposit_required: existingQuote?.deposit_required ?? prefilledDepositRequired ?? false,
      deposit_amount: existingQuote?.deposit_amount_cents
        ? (existingQuote.deposit_amount_cents / 100).toFixed(2)
        : prefilledDepositAmountCents
          ? (prefilledDepositAmountCents / 100).toFixed(2)
          : '',
      deposit_percentage:
        existingQuote?.deposit_percentage?.toString() ||
        (prefilledDepositPercentage != null ? prefilledDepositPercentage.toString() : ''),
      valid_until: existingQuote?.valid_until?.split('T')[0] || prefilledValidUntil || '',
      pricing_notes: existingQuote?.pricing_notes || prefilledPricingNotes || '',
      internal_notes: existingQuote?.internal_notes || prefilledInternalNotes || '',
    }),
    [
      existingQuote,
      prefilledBudgetCents,
      prefilledClientId,
      prefilledDepositAmountCents,
      prefilledDepositPercentage,
      prefilledDepositRequired,
      prefilledGuestCount,
      prefilledInternalNotes,
      prefilledOccasion,
      prefilledPricePerPersonCents,
      prefilledPricingModel,
      prefilledPricingNotes,
      prefilledQuoteName,
      prefilledValidUntil,
    ]
  )
  const [committedFormData, setCommittedFormData] = useState<QuoteFormData>(initialFormData)

  const createMutation = useIdempotentMutation<
    CreateQuoteInput & { idempotency_key?: string },
    any
  >('quotes/create', {
    mutation: createQuote as any,
  })
  const updateMutation = useIdempotentMutation<any, any>('quotes/update', {
    mutation: (input) => updateQuote(existingQuote!.id, input),
  })
  const mutation = isEditing ? updateMutation : createMutation

  const durableDraft = useDurableDraft<QuoteFormData>('quote-form', existingQuote?.id ?? null, {
    schemaVersion: 1,
    tenantId,
    defaultData: initialFormData,
    debounceMs: 700,
  })

  const isDirty = useMemo(
    () => JSON.stringify(currentFormData) !== JSON.stringify(committedFormData),
    [committedFormData, currentFormData]
  )

  const unsavedGuard = useUnsavedChangesGuard({
    isDirty,
    onSaveDraft: () => durableDraft.persistDraft(currentFormData, { immediate: true }),
    canSaveDraft: true,
    saveState: mutation.saveState,
  })

  useEffect(() => {
    if (!isDirty) return
    void durableDraft.persistDraft(currentFormData)
    if (mutation.saveState.status === 'SAVED') {
      mutation.markUnsaved()
    }
  }, [currentFormData, durableDraft, isDirty, mutation])

  const applyFormData = (data: QuoteFormData) => {
    setClientId(data.client_id)
    setQuoteName(data.quote_name)
    setPricingModel(data.pricing_model)
    setTotalAmount(data.total_amount)
    setPricePerPerson(data.price_per_person)
    setGuestCount(data.guest_count)
    setDepositRequired(data.deposit_required)
    setDepositAmount(data.deposit_amount)
    setDepositPercentage(data.deposit_percentage)
    setValidUntil(data.valid_until)
    setPricingNotes(data.pricing_notes)
    setInternalNotes(data.internal_notes)
  }

  const handleCalculate = async () => {
    setCalcLoading(true)
    setCalcError(null)
    setCalcResult(null)
    try {
      const guests = parseInt(guestCount) || 1
      const result = await computePricing({
        serviceType: calcServiceType,
        guestCount: guests,
        courseCount: calcServiceType === 'private_dinner' ? parseInt(calcCourseCount) : undefined,
        eventDate: calcEventDate || undefined,
        distanceMiles: parseFloat(calcDistance) || 0,
        weekendPremiumEnabled: calcWeekendPremium,
      })
      setCalcResult(result)
    } catch {
      setCalcError('Calculation failed. Check your inputs.')
    }
    setCalcLoading(false)
  }

  const handleUsePrice = () => {
    if (!calcResult) return
    setTotalAmount((calcResult.totalServiceCents / 100).toFixed(2))
    setDepositRequired(true)
    setDepositAmount((calcResult.depositCents / 100).toFixed(2))
    setDepositPercentage(calcResult.depositPercent.toString())
    setPricingModel(calcResult.pricingModel)
    if (calcResult.perPersonCents > 0) {
      setPricePerPerson((calcResult.perPersonCents / 100).toFixed(2))
    }
    setCalcOpen(false)
  }

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

  const buildUpdatePayload = (expectedUpdatedAt?: string) => {
    const totalCents = parseCurrencyToCents(totalAmount)
    if (!totalCents || totalCents <= 0) {
      throw new ValidationError('Total amount must be positive')
    }

    return {
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
      expected_updated_at: expectedUpdatedAt,
    }
  }

  const loadLatestConflictData = async () => {
    if (!isEditing || !existingQuote) return
    const latest = await getQuoteById(existingQuote.id)
    if (!latest) return

    setLatestConflictData({
      client_id: latest.client_id,
      quote_name: latest.quote_name || '',
      pricing_model: latest.pricing_model || 'flat_rate',
      total_amount: (latest.total_quoted_cents / 100).toFixed(2),
      price_per_person: latest.price_per_person_cents
        ? (latest.price_per_person_cents / 100).toFixed(2)
        : '',
      guest_count: latest.guest_count_estimated?.toString() || '',
      deposit_required: latest.deposit_required ?? false,
      deposit_amount: latest.deposit_amount_cents
        ? (latest.deposit_amount_cents / 100).toFixed(2)
        : '',
      deposit_percentage: latest.deposit_percentage?.toString() || '',
      valid_until: latest.valid_until?.split('T')[0] || '',
      pricing_notes: latest.pricing_notes || '',
      internal_notes: latest.internal_notes || '',
    })
  }

  const handleKeepLatest = () => {
    if (!latestConflictData) {
      setConflictError(null)
      return
    }
    applyFormData(latestConflictData)
    setCommittedFormData(latestConflictData)
    setConflictError(null)
    setLatestConflictData(null)
    setError(null)
  }

  const handleKeepMine = async () => {
    if (!isEditing || !existingQuote || !conflictError) return
    setLoading(true)
    setError(null)
    try {
      const mutationResult = await updateMutation.mutate(
        buildUpdatePayload(conflictError.currentUpdatedAt ?? existingQuote.updated_at)
      )
      if (mutationResult.queued) {
        setLoading(false)
        return
      }

      const result = mutationResult.result as any
      if (result.success) {
        setCommittedFormData(currentFormData)
        await durableDraft.clearDraft()
        setConflictError(null)
        setLatestConflictData(null)
        router.push(`/quotes/${existingQuote.id}`)
      } else {
        throw new Error('Failed to update quote')
      }
    } catch (err) {
      const parsedConflict = parseConflictError(err)
      if (parsedConflict) {
        setConflictError(parsedConflict)
        await loadLatestConflictData().catch(() => null)
      } else {
        const uiError = mapErrorToUI(err)
        setError(uiError.message)
      }
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setConflictError(null)

    try {
      await durableDraft.persistDraft(currentFormData, { immediate: true })

      const totalCents = parseCurrencyToCents(totalAmount)
      if (!totalCents || totalCents <= 0) {
        throw new ValidationError('Total amount must be positive')
      }

      if (isEditing) {
        const mutationResult = await updateMutation.mutate(
          buildUpdatePayload(existingQuote.updated_at)
        )
        if (mutationResult.queued) {
          setLoading(false)
          return
        }
        const result = mutationResult.result as any
        if (result.success) {
          trackAction('Updated quote', `$${totalAmount} — ${quoteName || pricingModel}`)
          setCommittedFormData(currentFormData)
          await durableDraft.clearDraft()
          router.push(`/quotes/${existingQuote.id}`)
        }
      } else {
        if (!clientId) throw new ValidationError('Client is required')

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
        const mutationResult = await createMutation.mutate(input as any)
        if (mutationResult.queued) {
          setLoading(false)
          return
        }
        const result = mutationResult.result as any
        if (result.success && result.quote) {
          trackAction('Created quote', `$${totalAmount} — ${quoteName || pricingModel}`)
          setCommittedFormData(currentFormData)
          await durableDraft.clearDraft()
          router.push(`/quotes/${result.quote.id}`)
        }
      }
    } catch (err) {
      const parsedConflict = parseConflictError(err)
      if (parsedConflict) {
        setConflictError(parsedConflict)
        await loadLatestConflictData().catch(() => null)
      } else {
        const uiError = mapErrorToUI(err)
        setError(uiError.message)
      }
      setLoading(false)
    }
  }

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.full_name} (${c.email})`,
  }))

  const pricingModelOptions = [
    { value: 'flat_rate', label: 'Flat Rate' },
    { value: 'per_person', label: 'Per Person' },
    { value: 'custom', label: 'Custom' },
  ]
  const recurringComparison = recurringPricingCheck?.comparison ?? null
  const recurringDeviationPercent = recurringComparison
    ? Math.abs(recurringComparison.deltaPercent)
    : null
  const showRecurringDeviationWarning =
    recurringDeviationPercent != null &&
    recurringDeviationPercent >= RECURRING_PRICE_WARNING_PERCENT

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SaveStateBadge state={mutation.saveState} onRetry={mutation.retryLast} />
      </div>

      {/* Pricing History Intelligence */}
      {pricingHistory && pricingHistory.length > 0 && (
        <Card className="p-6 bg-brand-950 border-brand-700">
          <h3 className="text-sm font-semibold text-brand-200 mb-3">
            Client Pricing History ({pricingHistory.length} accepted{' '}
            {pricingHistory.length === 1 ? 'quote' : 'quotes'})
          </h3>
          <div className="space-y-2">
            {pricingHistory.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-brand-300 font-medium">
                    {formatCurrency(entry.total_quoted_cents)}
                  </span>
                  {entry.price_per_person_cents && entry.guest_count_estimated && (
                    <span className="text-brand-600 ml-2">
                      ({formatCurrency(entry.price_per_person_cents)}/person x{' '}
                      {entry.guest_count_estimated})
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

      {/* ── Pricing Benchmarks (AI suggestion, read-only) ───────────────── */}
      <PricingSuggestionPanel
        suggestion={pricingSuggestion ?? null}
        benchmarkHint={benchmarkHint}
      />

      {/* ── Smart Pricing (Intelligence Engine) ──────────────────────────── */}
      <SmartPricingHint
        guestCount={parseInt(guestCount) || 0}
        onSuggestedPrice={(totalCents) => setTotalAmount((totalCents / 100).toFixed(2))}
      />

      {/* ── Pricing Calculator Panel ─────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setCalcOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-100">Price Calculator</span>
            <span className="text-xs text-stone-500">Auto-fill from your rate sheet</span>
          </div>
          <span className="text-stone-300 text-sm">{calcOpen ? '▲' : '▼'}</span>
        </button>

        {calcOpen && (
          <div className="px-5 pb-5 border-t border-stone-800 space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="calc-service-type"
                  className="text-xs font-medium text-stone-300 block mb-1"
                >
                  Service Type
                </label>
                <select
                  id="calc-service-type"
                  title="Service type"
                  value={calcServiceType}
                  onChange={(e) => setCalcServiceType(e.target.value as ServiceType)}
                  className="w-full text-sm border border-stone-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="private_dinner">Private Dinner</option>
                  <option value="pizza_experience">Pizza Experience</option>
                  <option value="cook_and_leave">Cook &amp; Leave</option>
                  <option value="weekly_standard">Weekly Standard</option>
                  <option value="weekly_commitment">Commitment Rate</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {calcServiceType === 'private_dinner' && (
                <div>
                  <label
                    htmlFor="calc-course-count"
                    className="text-xs font-medium text-stone-300 block mb-1"
                  >
                    Courses
                  </label>
                  <select
                    id="calc-course-count"
                    title="Number of courses"
                    value={calcCourseCount}
                    onChange={(e) => setCalcCourseCount(e.target.value)}
                    className="w-full text-sm border border-stone-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="3">3-course</option>
                    <option value="4">4-course</option>
                    <option value="5">5-course</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="calc-event-date"
                  className="text-xs font-medium text-stone-300 block mb-1"
                >
                  Event Date
                </label>
                <input
                  id="calc-event-date"
                  type="date"
                  title="Event date for pricing calculation"
                  value={calcEventDate}
                  onChange={(e) => setCalcEventDate(e.target.value)}
                  className="w-full text-sm border border-stone-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label
                  htmlFor="calc-distance"
                  className="text-xs font-medium text-stone-300 block mb-1"
                >
                  Distance (miles)
                </label>
                <input
                  id="calc-distance"
                  type="number"
                  min="0"
                  title="Distance in miles for travel fee calculation"
                  placeholder="0"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(e.target.value)}
                  className="w-full text-sm border border-stone-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="calc-weekend"
                checked={calcWeekendPremium}
                onChange={(e) => setCalcWeekendPremium(e.target.checked)}
                className="rounded border-stone-600 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="calc-weekend" className="text-sm text-stone-300 cursor-pointer">
                Apply weekend premium (Fri/Sat)
              </label>
            </div>

            <div className="space-y-1.5">
              {!guestCount || parseInt(guestCount) <= 0 ? (
                <p className="text-xs text-amber-700 bg-amber-950 border border-amber-200 rounded px-2 py-1">
                  Fill in &ldquo;Number of Guests&rdquo; in the main form first — the calculator
                  uses that count.
                </p>
              ) : (
                <p className="text-xs text-stone-300">
                  Calculating for {guestCount} guest{parseInt(guestCount) !== 1 ? 's' : ''} (from
                  guest count above)
                </p>
              )}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleCalculate}
                  disabled={calcLoading || !guestCount || parseInt(guestCount) <= 0}
                  variant="secondary"
                >
                  {calcLoading ? 'Calculating...' : 'Calculate'}
                </Button>
                {calcError && <p className="text-sm text-red-600">{calcError}</p>}
              </div>
            </div>

            {calcResult && (
              <div className="rounded-lg bg-stone-800 border border-stone-700 p-4 space-y-2">
                {calcResult.requiresCustomPricing ? (
                  <p className="text-sm text-amber-700 font-medium">
                    Requires custom pricing — use the notes fields below.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1 text-sm">
                      {calcResult.serviceFeeCents > 0 && (
                        <div className="flex justify-between">
                          <span className="text-stone-300">Service fee</span>
                          <span className="font-medium">
                            {formatCentsAsDollars(calcResult.serviceFeeCents)}
                          </span>
                        </div>
                      )}
                      {calcResult.weekendPremiumCents > 0 && (
                        <div className="flex justify-between">
                          <span className="text-stone-300">Weekend premium</span>
                          <span className="font-medium">
                            +{formatCentsAsDollars(calcResult.weekendPremiumCents)}
                          </span>
                        </div>
                      )}
                      {calcResult.holidayPremiumCents > 0 && (
                        <div className="flex justify-between">
                          <span className="text-stone-300">{calcResult.holidayName} premium</span>
                          <span className="font-medium">
                            +{formatCentsAsDollars(calcResult.holidayPremiumCents)}
                          </span>
                        </div>
                      )}
                      {calcResult.nearHolidayPremiumCents > 0 && (
                        <div className="flex justify-between">
                          <span className="text-stone-300">
                            Near-holiday ({calcResult.nearHolidayName})
                          </span>
                          <span className="font-medium">
                            +{formatCentsAsDollars(calcResult.nearHolidayPremiumCents)}
                          </span>
                        </div>
                      )}
                      {calcResult.travelFeeCents > 0 && (
                        <div className="flex justify-between">
                          <span className="text-stone-300">Travel</span>
                          <span className="font-medium">
                            +{formatCentsAsDollars(calcResult.travelFeeCents)}
                          </span>
                        </div>
                      )}
                      {calcResult.minimumApplied && (
                        <div className="text-xs text-amber-700">Minimum booking floor applied</div>
                      )}
                      <div className="flex justify-between border-t border-stone-700 pt-1 font-semibold text-stone-100">
                        <span>Total</span>
                        <span>{formatCentsAsDollars(calcResult.totalServiceCents)}</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>Deposit ({calcResult.depositPercent}%)</span>
                        <span>{formatCentsAsDollars(calcResult.depositCents)}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleUsePrice}
                      variant="primary"
                      className="w-full mt-2"
                    >
                      Use This Price →
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          )}

          {/* Inquiry context banner */}
          {prefilledInquiryId && (prefilledOccasion || prefilledEventDate) && (
            <div className="rounded-lg bg-stone-800 border border-stone-700 px-4 py-3 text-sm text-stone-300">
              <span className="font-medium text-stone-100">From inquiry: </span>
              {prefilledOccasion && <span>{prefilledOccasion}</span>}
              {prefilledOccasion && prefilledEventDate && <span> · </span>}
              {prefilledEventDate && (
                <span>
                  {new Date(prefilledEventDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          )}
          {prefilledSource === 'consulting' && (
            <div className="rounded-lg bg-brand-950 border border-brand-700 px-4 py-3 text-sm text-brand-300">
              <span className="font-medium text-brand-200">
                Prefilled from Consulting Calculator.
              </span>{' '}
              Review values below, select client, and save as a draft quote.
            </div>
          )}
          {prefilledSource === 'recurring_default' && (
            <div className="rounded-lg bg-emerald-950 border border-emerald-700 px-4 py-3 text-sm text-emerald-700">
              <span className="font-medium text-emerald-600">
                Prefilled from recurring client default pricing.
              </span>{' '}
              Confirm totals for this service before sending.
            </div>
          )}
          {recurringPricingCheck && (
            <div className="rounded-lg bg-stone-900 border border-stone-700 px-4 py-3 text-sm text-stone-300">
              <span className="font-medium text-stone-100">Repeat-client default: </span>
              {recurringPricingCheck.recurringModel === 'per_person'
                ? `${formatCurrency(recurringPricingCheck.recurringRateCents)} per person`
                : `${formatCurrency(recurringPricingCheck.recurringRateCents)} flat rate`}
              {selectedClient?.recurring_pricing_notes && (
                <span className="text-stone-500"> · {selectedClient.recurring_pricing_notes}</span>
              )}
            </div>
          )}
          {recurringPricingCheck?.needsGuestCountForComparison && (
            <Alert variant="info" title="Recurring pricing check">
              Add an estimated guest count to compare this total against the client&apos;s
              per-person recurring default.
            </Alert>
          )}
          {showRecurringDeviationWarning && recurringComparison && (
            <Alert variant="warning" title="Recurring pricing drift">
              This quote is {Math.round(recurringDeviationPercent ?? 0)}%{' '}
              {recurringComparison.deltaPercent >= 0 ? 'above' : 'below'} the recurring{' '}
              {recurringComparison.basis === 'per_person' ? 'per-person rate' : 'total benchmark'} (
              {formatCurrency(recurringComparison.baselineCents)} baseline vs{' '}
              {formatCurrency(recurringComparison.currentCents)} currently entered).
            </Alert>
          )}

          {/* Client Selection (create only) */}
          {!isEditing && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-stone-100 uppercase tracking-wider">
                Client
              </h3>
              <Select
                label="Client"
                required
                options={clientOptions}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                helperText={
                  prefilledSource === 'recurring_default'
                    ? 'Pre-selected repeat client defaults applied'
                    : prefilledClientId
                      ? 'Pre-selected from inquiry'
                      : 'Select the client for this quote'
                }
              />
            </div>
          )}

          {/* Quote Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-100 uppercase tracking-wider">
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

            {/* Menu Food Cost hint — informational only, chef sets the price */}
            {menuCost && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Menu Food Cost
                    </p>
                    <a
                      href={`/menus/${menuCost.menuId}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {menuCost.menuName}
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total food cost</span>
                      <p className="font-medium">{formatCurrency(menuCost.totalFoodCostCents)}</p>
                    </div>
                    {menuCost.costPerGuestCents != null && (
                      <div>
                        <span className="text-muted-foreground">Per guest</span>
                        <p className="font-medium">{formatCurrency(menuCost.costPerGuestCents)}</p>
                      </div>
                    )}
                    {menuCost.foodCostPercentage != null && menuCost.guestCount != null && (
                      <div>
                        <span className="text-muted-foreground">At current quote</span>
                        <p
                          className={`font-medium ${
                            menuCost.foodCostPercentage <= 30
                              ? 'text-green-600'
                              : menuCost.foodCostPercentage <= 40
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {menuCost.foodCostPercentage.toFixed(1)}% food cost
                        </p>
                      </div>
                    )}
                  </div>
                  {!menuCost.hasAllCosts && (
                    <p className="text-xs text-amber-600">
                      Some recipe ingredients are missing price data
                    </p>
                  )}
                </div>
              </Card>
            )}

            <div>
              <Input
                label="Total Quoted Amount ($)"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g., 2500.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                helperText={
                  pricingModel === 'per_person'
                    ? 'Auto-calculated from per-person x guests'
                    : undefined
                }
              />
              {pricingSuggestion?.status === 'ok' &&
                totalAmount &&
                parseFloat(totalAmount) > 0 &&
                (() => {
                  const enteredCents = Math.round(parseFloat(totalAmount) * 100)
                  const { minCents, medianCents, maxCents } = pricingSuggestion
                  const isAboveMedian = enteredCents >= medianCents
                  const isAboveMin = enteredCents >= minCents
                  const label = isAboveMedian
                    ? 'Above median — strong pricing'
                    : isAboveMin
                      ? 'Below median — consider increasing'
                      : 'Below typical minimum — check pricing'
                  const colorClass = isAboveMedian
                    ? 'text-emerald-600'
                    : isAboveMin
                      ? 'text-amber-600'
                      : 'text-red-600'
                  return (
                    <p className={`text-xs mt-1 font-medium ${colorClass}`}>
                      {label} · range: {formatCurrency(minCents)}–{formatCurrency(maxCents)}
                    </p>
                  )
                })()}
              {/* Currency conversion for international clients */}
              {totalAmount && parseFloat(totalAmount) > 0 && (
                <CurrencyConversionHint amountCents={Math.round(parseFloat(totalAmount) * 100)} />
              )}
            </div>
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
                className="rounded border-stone-600 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-stone-300">Deposit required</span>
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
              onBlur={() => void durableDraft.persistDraft(currentFormData, { immediate: true })}
              rows={3}
            />

            <Textarea
              label="Internal Notes (chef only)"
              placeholder="Cost breakdown, margins, competitor pricing..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              onBlur={() => void durableDraft.persistDraft(currentFormData, { immediate: true })}
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
              onClick={() => unsavedGuard.requestNavigation(() => router.back())}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <DraftRestorePrompt
        open={durableDraft.showRestorePrompt}
        lastSavedAt={durableDraft.pendingDraft?.lastSavedAt ?? durableDraft.lastSavedAt}
        onRestore={() => {
          const restored = durableDraft.restoreDraft()
          if (restored) {
            applyFormData(restored)
          }
        }}
        onDiscard={() => void durableDraft.discardDraft()}
      />

      <UnsavedChangesDialog
        open={unsavedGuard.open}
        canSaveDraft={unsavedGuard.canSaveDraft}
        onStay={unsavedGuard.onStay}
        onLeave={unsavedGuard.onLeave}
        onSaveDraftAndLeave={() => void unsavedGuard.onSaveDraftAndLeave()}
      />

      <ConflictResolutionDialog
        open={Boolean(conflictError)}
        message={conflictError?.message}
        attempted={currentFormData}
        latest={latestConflictData}
        loading={loading}
        onKeepMine={() => void handleKeepMine()}
        onKeepLatest={handleKeepLatest}
        onCancel={() => {
          setConflictError(null)
          setLatestConflictData(null)
        }}
      />
    </div>
  )
}
