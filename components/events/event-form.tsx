// Event Form Component - Used for both create and edit
// Two-step layout: Step 1 = core booking details, Step 2 = pricing & notes
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { AddressAutocomplete, type AddressData } from '@/components/ui/address-autocomplete'
import { PartnerSelect } from '@/components/partners/partner-select'
import { createEvent, updateEvent, type CreateEventInput } from '@/lib/events/actions'
import { checkDateConflicts } from '@/lib/availability/actions'
import { parseCurrencyToCents } from '@/lib/utils/currency'

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

type EventFormProps = {
  clients: Client[]
  mode: 'create' | 'edit'
  event?: Event
  partners?: Partner[]
  partnerLocations?: Record<string, PartnerLocation[]>
  depositDefaults?: DepositDefaults
}

export function EventForm({
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

  // Two-step state — edit mode starts on step 1 (both steps accessible via Back)
  const [step, setStep] = useState<1 | 2>(1)

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

    try {
      const guestCountNum = parseInt(guestCount)
      const totalAmountCents = parseCurrencyToCents(totalAmount)
      const depositAmountCents = parseCurrencyToCents(depositAmount)

      if (depositAmountCents > totalAmountCents) {
        throw new Error('Deposit cannot exceed total amount')
      }

      const eventDateObj = new Date(eventDate)
      if (eventDateObj < new Date()) {
        throw new Error('Event date must be in the future')
      }

      if (mode === 'create') {
        const input: CreateEventInput = {
          client_id: clientId,
          event_date: eventDateObj.toISOString(),
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

        const result = await createEvent(input)

        if (result.success && result.event) {
          router.push(`/events/${result.event.id}`)
        } else {
          throw new Error('Failed to create event')
        }
      } else if (mode === 'edit' && event) {
        const result = await updateEvent(event.id, {
          event_date: eventDateObj.toISOString(),
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
        })

        if (result.success) {
          router.push(`/events/${event.id}`)
        } else {
          throw new Error('Failed to update event')
        }
      }
    } catch (err) {
      console.error('Form error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 1 ? 'bg-brand-600 text-white' : 'bg-green-9500 text-white'
            }`}
          >
            {step === 1 ? '1' : '✓'}
          </div>
          <span
            className={`text-sm font-medium ${step === 1 ? 'text-stone-100' : 'text-green-700'}`}
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
            className={`text-sm font-medium ${step === 2 ? 'text-stone-100' : 'text-stone-400'}`}
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
                <p className="text-sm font-semibold text-amber-800">Scheduling conflict detected</p>
                <ul className="space-y-1">
                  {conflictWarnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-700 flex gap-2">
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
                  <span className="text-sm text-amber-800 font-medium">
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
              <Button type="button" variant="secondary" onClick={() => router.back()}>
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
                    className="text-sm text-stone-400 hover:text-stone-400 underline"
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
              rows={4}
            />

            {partners.length > 0 && (
              <div className="border border-stone-700 rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-stone-300 mb-2">
                  Partner Venue <span className="text-stone-400 font-normal">(optional)</span>
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
    </div>
  )
}
