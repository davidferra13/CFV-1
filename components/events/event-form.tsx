// Event Form Component - Used for both create and edit
// Two-step layout: Step 1 = core booking details, Step 2 = pricing & notes
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
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { AddressAutocomplete, type AddressData } from '@/components/ui/address-autocomplete'
import { PartnerSelect } from '@/components/partners/partner-select'
import { createEvent, getEventById, updateEvent, type CreateEventInput } from '@/lib/events/actions'
import { checkDateConflicts } from '@/lib/availability/actions'
import { parseCurrencyToCents } from '@/lib/utils/currency'
import { useDurableDraft } from '@/lib/drafts/use-durable-draft'
import { useUnsavedChangesGuard } from '@/lib/navigation/use-unsaved-changes-guard'
import { useIdempotentMutation } from '@/lib/offline/use-idempotent-mutation'
import { parseConflictError, type ConflictErrorPayload } from '@/lib/mutations/conflict'
import { ValidationError } from '@/lib/errors/app-error'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'
import { setActiveForm } from '@/lib/ai/remy-activity-tracker'
import { PrepTimeEstimateHint } from '@/components/intelligence/prep-time-estimate-hint'

type Client = {
  id: string
  full_name: string
  email: string
}

type Partner = {
  id: string
  name: string
  partner_type: string
}

type PartnerLocation = {
  id: string
  name: string
  city: string | null
  state: string | null
}

// Common IANA timezone options for the picker
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

type Event = {
  id: string
  client_id: string
  updated_at?: string
  occasion: string | null
  event_date: string
  serve_time: string | null
  guest_count: number
  location_address: string | null
  location_city: string | null
  location_state: string | null
  location_zip: string | null
  special_requests: string | null
  quoted_price_cents: number | null
  deposit_amount_cents: number | null
  referral_partner_id?: string | null
  partner_location_id?: string | null
  event_timezone?: string | null
}

type DepositDefaults = {
  enabled: boolean
  type: 'percentage' | 'fixed'
  percentage: number
  amountCents: number
}

type EventFormData = {
  client_id: string
  occasion: string
  event_date: string
  serve_time: string
  guest_count: string
  location_address: string
  location_city: string
  location_state: string
  location_zip: string
  special_requests: string
  quoted_price: string
  deposit_amount: string
  referral_partner_id: string | null
  partner_location_id: string | null
  event_timezone: string
}

type EventFormProps = {
  tenantId: string
  clients: Client[]
  mode: 'create' | 'edit'
  event?: Event
  partners?: Partner[]
  partnerLocations?: Record<string, PartnerLocation[]>
  depositDefaults?: DepositDefaults
}

export function EventForm({
  tenantId,
  clients,
  mode,
  event,
  partners = [],
  partnerLocations = {},
  depositDefaults,
}: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictError, setConflictError] = useState<ConflictErrorPayload | null>(null)
  const [latestConflictData, setLatestConflictData] = useState<EventFormData | null>(null)

  // Two-step state — edit mode starts on step 1 (both steps accessible via Back)
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    setActiveForm(mode === 'create' ? 'New Event' : 'Edit Event')
    return () => setActiveForm(null)
  }, [mode])

  // Conflict warning state
  const [conflictWarnings, setConflictWarnings] = useState<string[] | null>(null)
  const [conflictOverride, setConflictOverride] = useState(false)
  const [conflictChecking, setConflictChecking] = useState(false)

  // Form state
  const [clientId, setClientId] = useState(event?.client_id || '')
  const [occasion, setOccasion] = useState(event?.occasion || '')
  const [referralPartnerId, setReferralPartnerId] = useState<string | null>(
    event?.referral_partner_id ?? null
  )
  const [partnerLocationId, setPartnerLocationId] = useState<string | null>(
    event?.partner_location_id ?? null
  )
  const [eventTimezone, setEventTimezone] = useState(
    event?.event_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  )
  const [eventDate, setEventDate] = useState(
    event?.event_date ? event.event_date.substring(0, 16) : ''
  )
  const [serveTime, setServeTime] = useState(event?.serve_time || '')
  const [guestCount, setGuestCount] = useState(event?.guest_count?.toString() || '')
  const [locationAddress, setLocationAddress] = useState(event?.location_address || '')
  const [locationCity, setLocationCity] = useState(event?.location_city || '')
  const [locationState, setLocationState] = useState(event?.location_state || '')
  const [locationZip, setLocationZip] = useState(event?.location_zip || '')
  const [locationLat, setLocationLat] = useState<number | null>(
    (event as any)?.location_lat ?? null
  )
  const [locationLng, setLocationLng] = useState<number | null>(
    (event as any)?.location_lng ?? null
  )
  const [specialRequests, setSpecialRequests] = useState(event?.special_requests || '')
  const [totalAmount, setTotalAmount] = useState(
    event?.quoted_price_cents ? (event.quoted_price_cents / 100).toString() : ''
  )

  // Deposit auto-fill from chef defaults (create mode only)
  const shouldAutoFill =
    mode === 'create' && depositDefaults?.enabled && !event?.deposit_amount_cents
  const initialDeposit = (() => {
    if (!shouldAutoFill || !depositDefaults) return ''
    if (depositDefaults.type === 'fixed') {
      return (depositDefaults.amountCents / 100).toString()
    }
    // Percentage type: can only compute if there's already a quoted price (unlikely on create, but handle it)
    return ''
  })()

  const [depositAmount, setDepositAmount] = useState(
    event?.deposit_amount_cents ? (event.deposit_amount_cents / 100).toString() : initialDeposit
  )
  const [depositSource, setDepositSource] = useState<'default' | 'manual' | 'none'>(
    event?.deposit_amount_cents ? 'manual' : shouldAutoFill && initialDeposit ? 'default' : 'none'
  )

  const currentFormData = useMemo<EventFormData>(
    () => ({
      client_id: clientId,
      occasion,
      event_date: eventDate,
      serve_time: serveTime,
      guest_count: guestCount,
      location_address: locationAddress,
      location_city: locationCity,
      location_state: locationState,
      location_zip: locationZip,
      special_requests: specialRequests,
      quoted_price: totalAmount,
      deposit_amount: depositAmount,
      referral_partner_id: referralPartnerId,
      partner_location_id: partnerLocationId,
      event_timezone: eventTimezone,
    }),
    [
      clientId,
      occasion,
      eventDate,
      serveTime,
      guestCount,
      locationAddress,
      locationCity,
      locationState,
      locationZip,
      specialRequests,
      totalAmount,
      depositAmount,
      referralPartnerId,
      partnerLocationId,
      eventTimezone,
    ]
  )

  const initialFormData = useMemo<EventFormData>(
    () => ({
      client_id: event?.client_id || '',
      occasion: event?.occasion || '',
      event_date: event?.event_date ? event.event_date.substring(0, 16) : '',
      serve_time: event?.serve_time || '',
      guest_count: event?.guest_count?.toString() || '',
      location_address: event?.location_address || '',
      location_city: event?.location_city || '',
      location_state: event?.location_state || '',
      location_zip: event?.location_zip || '',
      special_requests: event?.special_requests || '',
      quoted_price: event?.quoted_price_cents ? (event.quoted_price_cents / 100).toString() : '',
      deposit_amount: event?.deposit_amount_cents
        ? (event.deposit_amount_cents / 100).toString()
        : initialDeposit,
      referral_partner_id: event?.referral_partner_id ?? null,
      partner_location_id: event?.partner_location_id ?? null,
      event_timezone:
        event?.event_timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        'America/New_York',
    }),
    [event, initialDeposit]
  )
  const [committedFormData, setCommittedFormData] = useState<EventFormData>(initialFormData)

  const createMutation = useIdempotentMutation<
    CreateEventInput & { idempotency_key?: string },
    any
  >('events/create', { mutation: createEvent as any })
  const updateMutation = useIdempotentMutation<
    (CreateEventInput & { expected_updated_at?: string; idempotency_key?: string }) | any,
    any
  >('events/update', {
    mutation: (input: any) => updateEvent(event!.id, input),
  })
  const mutation = mode === 'create' ? createMutation : updateMutation

  const durableDraft = useDurableDraft<EventFormData>(
    'event-form',
    mode === 'edit' ? event?.id : null,
    {
      schemaVersion: 1,
      tenantId,
      defaultData: initialFormData,
      debounceMs: 700,
    }
  )

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

  useEffect(() => {
    if (!durableDraft.showRestorePrompt || !durableDraft.pendingDraft) return
    // Keep dirty state until user explicitly restores/discards the recovered draft.
  }, [durableDraft.pendingDraft, durableDraft.showRestorePrompt])

  const applyFormData = (data: EventFormData) => {
    setClientId(data.client_id)
    setOccasion(data.occasion)
    setEventDate(data.event_date)
    setServeTime(data.serve_time)
    setGuestCount(data.guest_count)
    setLocationAddress(data.location_address)
    setLocationCity(data.location_city)
    setLocationState(data.location_state)
    setLocationZip(data.location_zip)
    setSpecialRequests(data.special_requests)
    setTotalAmount(data.quoted_price)
    setDepositAmount(data.deposit_amount)
    setReferralPartnerId(data.referral_partner_id)
    setPartnerLocationId(data.partner_location_id)
    setEventTimezone(data.event_timezone)
  }

  const buildEditPayload = (expectedUpdatedAt?: string) => {
    const guestCountNum = parseInt(guestCount)
    const hasQuotedPrice = totalAmount.trim().length > 0
    const parsedQuotedPrice = hasQuotedPrice ? parseCurrencyToCents(totalAmount) : undefined
    const totalAmountCents =
      parsedQuotedPrice !== undefined && Number.isFinite(parsedQuotedPrice)
        ? parsedQuotedPrice
        : undefined
    if (hasQuotedPrice && totalAmountCents === undefined) {
      throw new ValidationError('Quoted price must be a valid number')
    }

    const hasDepositAmount = depositAmount.trim().length > 0
    const parsedDepositAmount = hasDepositAmount ? parseCurrencyToCents(depositAmount) : undefined
    const depositAmountCents =
      parsedDepositAmount !== undefined && Number.isFinite(parsedDepositAmount)
        ? parsedDepositAmount
        : undefined
    if (hasDepositAmount && depositAmountCents === undefined) {
      throw new ValidationError('Deposit amount must be a valid number')
    }

    if (
      depositAmountCents !== undefined &&
      totalAmountCents !== undefined &&
      depositAmountCents > totalAmountCents
    ) {
      throw new ValidationError('Deposit cannot exceed total amount')
    }

    // Validate date is in the future (compare date strings to avoid timezone shift)
    const todayStr = new Date().toISOString().split('T')[0]
    if (eventDate < todayStr) {
      throw new ValidationError('Event date must be in the future')
    }

    return {
      // Keep as YYYY-MM-DD string — toISOString() shifts dates by timezone offset
      event_date: eventDate,
      serve_time: serveTime,
      guest_count: guestCountNum,
      location_address: locationAddress,
      location_city: locationCity,
      location_state: locationState || undefined,
      location_zip: locationZip,
      occasion: occasion || undefined,
      special_requests: specialRequests || undefined,
      quoted_price_cents: totalAmountCents,
      deposit_amount_cents: depositAmountCents,
      location_lat: locationLat ?? undefined,
      location_lng: locationLng ?? undefined,
      referral_partner_id: referralPartnerId,
      partner_location_id: partnerLocationId,
      event_timezone: eventTimezone || undefined,
      expected_updated_at: expectedUpdatedAt,
    }
  }

  const loadLatestConflictData = async () => {
    if (mode !== 'edit' || !event) return
    const latest = await getEventById(event.id)
    if (!latest) return
    setLatestConflictData({
      client_id: latest.client_id || '',
      occasion: latest.occasion || '',
      event_date: latest.event_date ? latest.event_date.substring(0, 16) : '',
      serve_time: latest.serve_time || '',
      guest_count: latest.guest_count?.toString() || '',
      location_address: latest.location_address || '',
      location_city: latest.location_city || '',
      location_state: latest.location_state || '',
      location_zip: latest.location_zip || '',
      special_requests: latest.special_requests || '',
      quoted_price: latest.quoted_price_cents ? (latest.quoted_price_cents / 100).toString() : '',
      deposit_amount: latest.deposit_amount_cents
        ? (latest.deposit_amount_cents / 100).toString()
        : '',
      referral_partner_id: latest.referral_partner_id ?? null,
      partner_location_id: latest.partner_location_id ?? null,
      event_timezone: latest.event_timezone || 'America/New_York',
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
    if (mode !== 'edit' || !event || !conflictError) return
    setLoading(true)
    setError(null)
    try {
      const mutationResult = await updateMutation.mutate(
        buildEditPayload(conflictError.currentUpdatedAt ?? event.updated_at)
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
        router.push(`/events/${event.id}`)
      } else {
        throw new Error('Failed to update event')
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

  const handlePlaceSelect = (data: AddressData) => {
    setLocationAddress(data.address)
    setLocationCity(data.city)
    setLocationState(data.state)
    setLocationZip(data.zip)
    setLocationLat(data.lat)
    setLocationLng(data.lng)
  }

  // Step 1 validation before advancing (async — checks availability conflicts)
  const handleContinue = async () => {
    setError(null)
    if (!clientId) {
      setError('Please select a client')
      return
    }
    if (!eventDate) {
      setError('Event date & time is required')
      return
    }
    if (!serveTime) {
      setError('Serve time is required')
      return
    }
    if (!guestCount || parseInt(guestCount) <= 0) {
      setError('Guest count must be a positive number')
      return
    }
    if (!locationAddress) {
      setError('Address is required')
      return
    }
    if (!locationCity) {
      setError('City is required')
      return
    }
    if (!locationZip) {
      setError('ZIP code is required')
      return
    }

    // If user already acknowledged conflicts, advance
    if (conflictWarnings !== null && conflictOverride) {
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Check for scheduling conflicts
    const dateOnly = eventDate.slice(0, 10) // YYYY-MM-DD
    setConflictChecking(true)
    try {
      const result = await checkDateConflicts(dateOnly, mode === 'edit' ? event?.id : undefined)
      setConflictChecking(false)

      if (result.warnings.length > 0) {
        setConflictWarnings(result.warnings)
        setConflictOverride(false)
        return // Stay on step 1 until user acknowledges
      }
    } catch {
      setConflictChecking(false)
      // Non-blocking: if conflict check fails, still allow advance
    }

    setConflictWarnings(null)
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setConflictError(null)

    try {
      await durableDraft.persistDraft(currentFormData, { immediate: true })

      const guestCountNum = parseInt(guestCount)
      const hasQuotedPrice = totalAmount.trim().length > 0
      const parsedQuotedPrice = hasQuotedPrice ? parseCurrencyToCents(totalAmount) : undefined
      const totalAmountCents =
        parsedQuotedPrice !== undefined && Number.isFinite(parsedQuotedPrice)
          ? parsedQuotedPrice
          : undefined
      if (hasQuotedPrice && totalAmountCents === undefined) {
        throw new ValidationError('Quoted price must be a valid number')
      }

      const hasDepositAmount = depositAmount.trim().length > 0
      const parsedDepositAmount = hasDepositAmount ? parseCurrencyToCents(depositAmount) : undefined
      const depositAmountCents =
        parsedDepositAmount !== undefined && Number.isFinite(parsedDepositAmount)
          ? parsedDepositAmount
          : undefined
      if (hasDepositAmount && depositAmountCents === undefined) {
        throw new ValidationError('Deposit amount must be a valid number')
      }

      if (
        depositAmountCents !== undefined &&
        totalAmountCents !== undefined &&
        depositAmountCents > totalAmountCents
      ) {
        throw new ValidationError('Deposit cannot exceed total amount')
      }

      // Validate date is in the future (compare date strings to avoid timezone shift)
      const todayStr2 = new Date().toISOString().split('T')[0]
      if (eventDate < todayStr2) {
        throw new ValidationError('Event date must be in the future')
      }

      if (mode === 'create') {
        const input: CreateEventInput & { idempotency_key?: string } = {
          client_id: clientId,
          // Keep as YYYY-MM-DD string — toISOString() shifts dates by timezone offset
          event_date: eventDate,
          serve_time: serveTime,
          guest_count: guestCountNum,
          location_address: locationAddress,
          location_city: locationCity,
          location_state: locationState || undefined,
          location_zip: locationZip,
          occasion: occasion || undefined,
          special_requests: specialRequests || undefined,
          quoted_price_cents: totalAmountCents,
          deposit_amount_cents: depositAmountCents,
          location_lat: locationLat ?? undefined,
          location_lng: locationLng ?? undefined,
          referral_partner_id: referralPartnerId,
          partner_location_id: partnerLocationId,
          event_timezone: eventTimezone || undefined,
        }

        const mutationResult = await createMutation.mutate(input)
        if (mutationResult.queued) {
          setLoading(false)
          return
        }
        const result = mutationResult.result as any

        if (result.success && result.event) {
          setCommittedFormData(currentFormData)
          await durableDraft.clearDraft()
          router.push(`/events/${result.event.id}`)
        } else {
          throw new Error('Failed to create event')
        }
      } else if (mode === 'edit' && event) {
        const mutationResult = await updateMutation.mutate(buildEditPayload(event.updated_at))
        if (mutationResult.queued) {
          setLoading(false)
          return
        }

        const result = mutationResult.result as any

        if (result.success) {
          setCommittedFormData(currentFormData)
          await durableDraft.clearDraft()
          router.push(`/events/${event.id}`)
        } else {
          throw new Error('Failed to update event')
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SaveStateBadge state={mutation.saveState} onRetry={mutation.retryLast} />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 1 ? 'bg-brand-600 text-white' : 'bg-green-500 text-white'
            }`}
          >
            {step === 1 ? '1' : '✓'}
          </div>
          <span
            className={`text-sm font-medium ${step === 1 ? 'text-stone-100' : 'text-green-200'}`}
          >
            Event Details
          </span>
        </div>
        <div className="flex-1 h-px bg-stone-700" />
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 2 ? 'bg-brand-600 text-white' : 'bg-stone-700 text-stone-500'
            }`}
          >
            2
          </div>
          <span
            className={`text-sm font-medium ${step === 2 ? 'text-stone-100' : 'text-stone-300'}`}
          >
            Pricing &amp; Notes
          </span>
        </div>
      </div>

      <Card className="p-6">
        {error && (
          <Alert variant="error" title="Error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* ── Step 1: Core booking details ────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <Select
              label="Client"
              required
              options={clients.map((client) => ({
                value: client.id,
                label: `${client.full_name} (${client.email})`,
              }))}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={mode === 'edit'}
              helperText={
                mode === 'edit' ? 'Client cannot be changed after event creation' : undefined
              }
            />

            <Input
              label="Occasion"
              placeholder="e.g., Wedding Reception, Corporate Dinner"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            />

            <Input
              label="Event Date & Time"
              type="datetime-local"
              required
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value)
                setConflictWarnings(null)
                setConflictOverride(false)
              }}
              helperText="Select the date and time of your event"
            />

            <Input
              label="Serve Time"
              type="time"
              required
              value={serveTime}
              onChange={(e) => setServeTime(e.target.value)}
              helperText="When food should be served"
            />

            <Select
              label="Timezone"
              options={TIMEZONE_OPTIONS}
              value={eventTimezone}
              onChange={(e) => setEventTimezone(e.target.value)}
              helperText="All times for this event are in this timezone"
            />

            {mode === 'edit' && (
              <p className="text-xs text-stone-400">
                Need a multi-day event? Enable it from the event detail page after saving.
              </p>
            )}

            <Input
              label="Number of Guests"
              type="number"
              inputMode="numeric"
              required
              min="1"
              placeholder="e.g., 8"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
            />

            {/* Prep time estimate — appears when guest count is entered */}
            {parseInt(guestCount) > 0 && (
              <PrepTimeEstimateHint guestCount={parseInt(guestCount)} occasion={occasion || null} />
            )}

            <AddressAutocomplete
              label="Address"
              required
              placeholder="e.g., 123 Main St"
              value={locationAddress}
              onChange={(val) => setLocationAddress(val)}
              onPlaceSelect={handlePlaceSelect}
              helperText="Start typing for Google address suggestions"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                required
                placeholder="City"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
              />
              <Input
                label="State"
                placeholder="State"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
              />
              <Input
                label="ZIP"
                required
                placeholder="ZIP"
                value={locationZip}
                onChange={(e) => setLocationZip(e.target.value)}
              />
            </div>

            {/* Conflict warning banner */}
            {conflictWarnings && conflictWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-950 p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-200">Scheduling conflict detected</p>
                <ul className="space-y-1">
                  {conflictWarnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-200 flex gap-2">
                      <span className="mt-0.5 shrink-0">⚠</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={conflictOverride}
                    onChange={(e) => setConflictOverride(e.target.checked)}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-200 font-medium">
                    I understand — create the event anyway
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={handleContinue}
                variant="primary"
                loading={conflictChecking}
                disabled={
                  conflictChecking ||
                  (conflictWarnings !== null && conflictWarnings.length > 0 && !conflictOverride)
                }
              >
                {conflictChecking ? 'Checking...' : 'Continue →'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => unsavedGuard.requestNavigation(() => router.back())}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Pricing & Notes ──────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Quoted Price ($)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="e.g., 2500.00"
              value={totalAmount}
              onChange={(e) => {
                const newTotal = e.target.value
                setTotalAmount(newTotal)
                // Auto-recalculate deposit for percentage defaults (only if still auto-filled)
                if (
                  depositSource === 'default' &&
                  depositDefaults?.enabled &&
                  depositDefaults.type === 'percentage' &&
                  newTotal
                ) {
                  const price = parseFloat(newTotal)
                  if (!isNaN(price) && price > 0) {
                    const computed = ((price * depositDefaults.percentage) / 100).toFixed(2)
                    setDepositAmount(computed)
                  }
                } else if (
                  depositSource === 'none' &&
                  mode === 'create' &&
                  depositDefaults?.enabled &&
                  depositDefaults.type === 'percentage' &&
                  newTotal
                ) {
                  // First time entering a price with percentage defaults — auto-fill
                  const price = parseFloat(newTotal)
                  if (!isNaN(price) && price > 0) {
                    const computed = ((price * depositDefaults.percentage) / 100).toFixed(2)
                    setDepositAmount(computed)
                    setDepositSource('default')
                  }
                }
              }}
              helperText="Total quoted price for the event"
            />

            <div>
              <Input
                label="Deposit Amount ($)"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="e.g., 500.00"
                value={depositAmount}
                onChange={(e) => {
                  setDepositAmount(e.target.value)
                  // Any manual edit switches source to manual
                  if (depositSource !== 'manual') {
                    setDepositSource(e.target.value ? 'manual' : 'none')
                  }
                }}
                helperText={
                  depositSource !== 'default' ? 'Required deposit amount (optional)' : undefined
                }
              />
              {depositSource === 'default' && depositDefaults && (
                <div className="mt-1.5 flex items-center gap-2">
                  <p className="text-sm text-brand-600">
                    {depositDefaults.type === 'percentage'
                      ? `Auto-filled from your defaults (${depositDefaults.percentage}%)`
                      : `Auto-filled from your defaults ($${(depositDefaults.amountCents / 100).toFixed(2)})`}
                  </p>
                  <button
                    type="button"
                    className="text-sm text-stone-300 hover:text-stone-300 underline"
                    onClick={() => {
                      setDepositAmount('')
                      setDepositSource('none')
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <Textarea
              label="Special Requests"
              placeholder="Any additional details or special requests..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              onBlur={() => void durableDraft.persistDraft(currentFormData, { immediate: true })}
              rows={4}
            />

            {partners.length > 0 && (
              <div className="border border-stone-700 rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-stone-300 mb-2">
                  Partner Venue <span className="text-stone-300 font-normal">(optional)</span>
                </p>
                <PartnerSelect
                  partners={partners}
                  partnerLocations={partnerLocations}
                  defaultPartnerId={referralPartnerId}
                  defaultLocationId={partnerLocationId}
                  onPartnerChange={setReferralPartnerId}
                  onLocationChange={setPartnerLocationId}
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} disabled={loading} variant="primary">
                {mode === 'create' ? 'Create Event' : 'Update Event'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setError(null)
                  setStep(1)
                }}
                disabled={loading}
              >
                ← Back
              </Button>
            </div>
          </form>
        )}
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
