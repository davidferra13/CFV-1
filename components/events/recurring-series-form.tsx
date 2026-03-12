// Recurring Series Form
// Client-side form for creating a recurring event series.
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { RecurrencePicker } from '@/components/events/recurrence-picker'
import { createRecurringSeries } from '@/lib/booking/recurring-actions'
import { parseCurrencyToCents } from '@/lib/utils/currency'
import { toast } from 'sonner'
import type { RecurrenceRule } from '@/lib/booking/recurrence-engine'

type Client = {
  id: string
  full_name: string
  email: string
}

type RecurringSeriesFormProps = {
  tenantId: string
  clients: Client[]
}

export function RecurringSeriesForm({ tenantId, clients }: RecurringSeriesFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [occasion, setOccasion] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [locationState, setLocationState] = useState('')
  const [locationZip, setLocationZip] = useState('')
  const [pricePerSession, setPricePerSession] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientId) {
      setError('Please select a client')
      return
    }
    if (!title.trim()) {
      setError('Please enter a series title')
      return
    }
    if (!startDate || !endDate) {
      setError('Please set both start and end dates')
      return
    }
    if (!recurrenceRule) {
      setError('Please configure the recurrence pattern')
      return
    }

    startTransition(async () => {
      try {
        const result = await createRecurringSeries({
          client_id: clientId,
          title: title.trim(),
          start_date: startDate,
          end_date: endDate,
          recurrence_rule: recurrenceRule,
          guest_count: guestCount ? parseInt(guestCount) : undefined,
          location_address: locationAddress || undefined,
          location_city: locationCity || undefined,
          location_state: locationState || undefined,
          location_zip: locationZip || undefined,
          occasion: occasion || undefined,
          quoted_price_per_session_cents: pricePerSession
            ? parseCurrencyToCents(pricePerSession)
            : undefined,
          deposit_amount_cents: depositAmount ? parseCurrencyToCents(depositAmount) : undefined,
          special_requests: specialRequests || undefined,
        })

        if (result.success) {
          toast.success(`Created ${result.eventCount} recurring events`)
          router.push('/events')
        } else {
          setError(result.error || 'Failed to create recurring series')
          toast.error(result.error || 'Failed to create recurring series')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create recurring series'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Series Details</h2>

        <Select
          label="Client"
          required
          options={clients.map((c) => ({
            value: c.id,
            label: `${c.full_name} (${c.email})`,
          }))}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />

        <Input
          label="Series title"
          required
          placeholder="e.g., Weekly dinner for the Smiths"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Input
          label="Occasion label"
          placeholder="e.g., Family dinner, Meal prep"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start date"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End date"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <Input
          label="Guest count"
          type="number"
          min={1}
          placeholder="Number of guests per session"
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Recurrence Pattern</h2>
        <RecurrencePicker startDate={startDate} endDate={endDate} onChange={setRecurrenceRule} />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Location</h2>

        <Input
          label="Address"
          placeholder="123 Main St"
          value={locationAddress}
          onChange={(e) => setLocationAddress(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="City"
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
          />
          <Input
            label="State"
            value={locationState}
            onChange={(e) => setLocationState(e.target.value)}
          />
          <Input label="ZIP" value={locationZip} onChange={(e) => setLocationZip(e.target.value)} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Pricing</h2>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Price per session ($)"
            placeholder="0.00"
            value={pricePerSession}
            onChange={(e) => setPricePerSession(e.target.value)}
          />
          <Input
            label="Deposit ($)"
            placeholder="0.00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Notes</h2>
        <Textarea
          label="Special requests or notes"
          placeholder="Any additional details for all sessions in this series"
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          rows={3}
        />
      </Card>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={isPending} className="flex-1">
          {isPending ? 'Creating...' : 'Create Recurring Series'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/events/new')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
