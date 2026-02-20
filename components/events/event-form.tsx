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
}

type EventFormProps = {
  clients: Client[]
  mode: 'create' | 'edit'
  event?: Event
  partners?: Partner[]
  partnerLocations?: Record<string, PartnerLocation[]>
}

export function EventForm({ clients, mode, event, partners = [], partnerLocations = {} }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Two-step state — edit mode starts on step 1 (both steps accessible via Back)
  const [step, setStep] = useState<1 | 2>(1)

  // Form state
  const [clientId, setClientId] = useState(event?.client_id || '')
  const [occasion, setOccasion] = useState(event?.occasion || '')
  const [referralPartnerId, setReferralPartnerId] = useState<string | null>(event?.referral_partner_id ?? null)
  const [partnerLocationId, setPartnerLocationId] = useState<string | null>(event?.partner_location_id ?? null)
  const [eventDate, setEventDate] = useState(
    event?.event_date ? event.event_date.substring(0, 16) : ''
  )
  const [serveTime, setServeTime] = useState(event?.serve_time || '')
  const [guestCount, setGuestCount] = useState(event?.guest_count?.toString() || '')
  const [locationAddress, setLocationAddress] = useState(event?.location_address || '')
  const [locationCity, setLocationCity] = useState(event?.location_city || '')
  const [locationState, setLocationState] = useState(event?.location_state || '')
  const [locationZip, setLocationZip] = useState(event?.location_zip || '')
  const [locationLat, setLocationLat] = useState<number | null>((event as any)?.location_lat ?? null)
  const [locationLng, setLocationLng] = useState<number | null>((event as any)?.location_lng ?? null)
  const [specialRequests, setSpecialRequests] = useState(event?.special_requests || '')
  const [totalAmount, setTotalAmount] = useState(
    event?.quoted_price_cents ? (event.quoted_price_cents / 100).toString() : ''
  )
  const [depositAmount, setDepositAmount] = useState(
    event?.deposit_amount_cents ? (event.deposit_amount_cents / 100).toString() : ''
  )

  const handlePlaceSelect = (data: AddressData) => {
    setLocationAddress(data.address)
    setLocationCity(data.city)
    setLocationState(data.state)
    setLocationZip(data.zip)
    setLocationLat(data.lat)
    setLocationLng(data.lng)
  }

  // Step 1 validation before advancing
  const handleContinue = () => {
    setError(null)
    if (!clientId) { setError('Please select a client'); return }
    if (!eventDate) { setError('Event date & time is required'); return }
    if (!serveTime) { setError('Serve time is required'); return }
    if (!guestCount || parseInt(guestCount) <= 0) { setError('Guest count must be a positive number'); return }
    if (!locationAddress) { setError('Address is required'); return }
    if (!locationCity) { setError('City is required'); return }
    if (!locationZip) { setError('ZIP code is required'); return }
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
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 1 ? 'bg-brand-600 text-white' : 'bg-green-500 text-white'
          }`}>
            {step === 1 ? '1' : '✓'}
          </div>
          <span className={`text-sm font-medium ${step === 1 ? 'text-stone-900' : 'text-green-700'}`}>
            Event Details
          </span>
        </div>
        <div className="flex-1 h-px bg-stone-200" />
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 2 ? 'bg-brand-600 text-white' : 'bg-stone-200 text-stone-500'
          }`}>
            2
          </div>
          <span className={`text-sm font-medium ${step === 2 ? 'text-stone-900' : 'text-stone-400'}`}>
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
              options={clients.map(client => ({
                value: client.id,
                label: `${client.full_name} (${client.email})`
              }))}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={mode === 'edit'}
              helperText={mode === 'edit' ? 'Client cannot be changed after event creation' : undefined}
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
              onChange={(e) => setEventDate(e.target.value)}
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

            <Input
              label="Number of Guests"
              type="number"
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

            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={handleContinue} variant="primary">
                Continue →
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
              step="0.01"
              min="0"
              placeholder="e.g., 2500.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              helperText="Total quoted price for the event"
            />

            <Input
              label="Deposit Amount ($)"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 500.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              helperText="Required deposit amount (optional)"
            />

            <Textarea
              label="Special Requests"
              placeholder="Any additional details or special requests..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={4}
            />

            {partners.length > 0 && (
              <div className="border border-stone-200 rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-stone-700 mb-2">Partner Venue <span className="text-stone-400 font-normal">(optional)</span></p>
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
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                variant="primary"
              >
                {mode === 'create' ? 'Create Event' : 'Update Event'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setError(null); setStep(1) }}
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
