// Event Form Component - Used for both create and edit
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { createEvent, updateEvent, type CreateEventInput } from '@/lib/events/actions'
import { parseCurrencyToCents } from '@/lib/utils/currency'

type Client = {
  id: string
  full_name: string
  email: string
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
}

type EventFormProps = {
  clients: Client[]
  mode: 'create' | 'edit'
  event?: Event
}

export function EventForm({ clients, mode, event }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [clientId, setClientId] = useState(event?.client_id || '')
  const [occasion, setOccasion] = useState(event?.occasion || '')
  const [eventDate, setEventDate] = useState(
    event?.event_date ? event.event_date.substring(0, 16) : ''
  )
  const [serveTime, setServeTime] = useState(event?.serve_time || '')
  const [guestCount, setGuestCount] = useState(event?.guest_count?.toString() || '')
  const [locationAddress, setLocationAddress] = useState(event?.location_address || '')
  const [locationCity, setLocationCity] = useState(event?.location_city || '')
  const [locationState, setLocationState] = useState(event?.location_state || '')
  const [locationZip, setLocationZip] = useState(event?.location_zip || '')
  const [specialRequests, setSpecialRequests] = useState(event?.special_requests || '')
  const [totalAmount, setTotalAmount] = useState(
    event?.quoted_price_cents ? (event.quoted_price_cents / 100).toString() : ''
  )
  const [depositAmount, setDepositAmount] = useState(
    event?.deposit_amount_cents ? (event.deposit_amount_cents / 100).toString() : ''
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!clientId || !eventDate || !serveTime || !guestCount || !locationAddress || !locationCity || !locationZip) {
        throw new Error('Please fill in all required fields')
      }

      // Validate numbers
      const guestCountNum = parseInt(guestCount)
      if (isNaN(guestCountNum) || guestCountNum <= 0) {
        throw new Error('Guest count must be a positive number')
      }

      const totalAmountCents = parseCurrencyToCents(totalAmount)
      const depositAmountCents = parseCurrencyToCents(depositAmount)

      if (totalAmountCents < 0) {
        throw new Error('Total amount cannot be negative')
      }

      if (depositAmountCents < 0) {
        throw new Error('Deposit amount cannot be negative')
      }

      if (depositAmountCents > totalAmountCents) {
        throw new Error('Deposit cannot exceed total amount')
      }

      // Validate date is in the future
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
          deposit_amount_cents: depositAmountCents
        }

        const result = await createEvent(input)

        if (result.success && result.event) {
          // Redirect to event detail page
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
          deposit_amount_cents: depositAmountCents
        })

        if (result.success) {
          // Redirect to event detail page
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
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Client Selection */}
        <Select
          label="Client"
          required
          options={clients.map(client => ({
            value: client.id,
            label: `${client.full_name} (${client.email})`
          }))}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          disabled={mode === 'edit'} // Can't change client after creation
          helperText={mode === 'edit' ? 'Client cannot be changed after event creation' : undefined}
        />

        {/* Occasion */}
        <Input
          label="Occasion"
          placeholder="e.g., Wedding Reception, Corporate Dinner"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
        />

        {/* Event Date */}
        <Input
          label="Event Date & Time"
          type="datetime-local"
          required
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          helperText="Select the date and time of your event"
        />

        {/* Serve Time */}
        <Input
          label="Serve Time"
          type="time"
          required
          value={serveTime}
          onChange={(e) => setServeTime(e.target.value)}
          helperText="When food should be served"
        />

        {/* Guest Count */}
        <Input
          label="Number of Guests"
          type="number"
          required
          min="1"
          placeholder="e.g., 50"
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
        />

        {/* Location */}
        <Input
          label="Address"
          required
          placeholder="e.g., 123 Main St"
          value={locationAddress}
          onChange={(e) => setLocationAddress(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-3">
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

        {/* Quoted Price */}
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

        {/* Deposit Amount */}
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

        {/* Special Requests */}
        <Textarea
          label="Special Requests"
          placeholder="Any additional details or special requests..."
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          rows={4}
        />

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {mode === 'create' ? 'Create Event' : 'Update Event'}
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
  )
}
