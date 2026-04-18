// Event Creation Wizard - Multi-step wizard for creating events
// Steps: Client Selection -> Event Details -> Dietary & Notes -> Review & Create
'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { TagInput } from '@/components/ui/tag-input'
import { createEvent, type CreateEventInput } from '@/lib/events/actions'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'

type Client = {
  id: string
  full_name: string
  email: string
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
}

type EventCreationWizardProps = {
  clients: Client[]
}

type WizardStep = 1 | 2 | 3 | 4

const SERVICE_STYLE_OPTIONS = [
  { value: 'plated', label: 'Plated' },
  { value: 'family_style', label: 'Family Style' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'tasting_menu', label: 'Tasting Menu' },
  { value: 'other', label: 'Other' },
]

const STEP_LABELS = ['Client', 'Details', 'Dietary & Notes', 'Review']

const COMMON_DIETARY_SUGGESTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Kosher',
  'Halal',
  'Keto',
  'Paleo',
  'Pescatarian',
]

const COMMON_ALLERGY_SUGGESTIONS = [
  'Peanuts',
  'Tree Nuts',
  'Shellfish',
  'Fish',
  'Eggs',
  'Milk',
  'Soy',
  'Wheat',
  'Sesame',
]

export function EventCreationWizard({ clients }: EventCreationWizardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<WizardStep>(1)
  const [error, setError] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')

  // Form state
  const [clientId, setClientId] = useState('')
  const [occasion, setOccasion] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [serveTime, setServeTime] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [serviceStyle, setServiceStyle] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [locationState, setLocationState] = useState('')
  const [locationZip, setLocationZip] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [specialRequests, setSpecialRequests] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')

  // Derived
  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId])

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients
    const q = clientSearch.toLowerCase()
    return clients.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    )
  }, [clients, clientSearch])

  // When a client is selected, pre-fill their dietary info
  const handleClientSelect = (id: string) => {
    setClientId(id)
    const client = clients.find((c) => c.id === id)
    if (client) {
      if (client.dietary_restrictions?.length) {
        setDietaryRestrictions(client.dietary_restrictions)
      }
      if (client.allergies?.length) {
        setAllergies(client.allergies)
      }
    }
  }

  // Step validation
  const validateStep = (s: WizardStep): boolean => {
    setError(null)
    switch (s) {
      case 1:
        if (!clientId) {
          setError('Please select a client')
          return false
        }
        return true
      case 2:
        if (!eventDate) {
          setError('Event date is required')
          return false
        }
        if (!serveTime) {
          setError('Serve time is required')
          return false
        }
        if (!guestCount || parseInt(guestCount) <= 0) {
          setError('Guest count must be a positive number')
          return false
        }
        if (!locationAddress) {
          setError('Address is required')
          return false
        }
        if (!locationCity) {
          setError('City is required')
          return false
        }
        if (!locationZip) {
          setError('ZIP code is required')
          return false
        }
        return true
      case 3:
        // No required fields on step 3
        return true
      case 4:
        return true
      default:
        return true
    }
  }

  const goNext = () => {
    if (validateStep(step)) {
      setStep((step + 1) as WizardStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goBack = () => {
    setError(null)
    setStep((step - 1) as WizardStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCreate = () => {
    setError(null)

    const guestCountNum = parseInt(guestCount)
    const eventDateStr = eventDate // already YYYY-MM-DD from date input

    // Budget is optional; use max as the quoted price if provided
    const quotedPriceCents = budgetMax ? parseCurrencyToCents(budgetMax) : undefined

    const input: CreateEventInput = {
      client_id: clientId,
      event_date: eventDateStr,
      serve_time: serveTime,
      guest_count: guestCountNum,
      location_address: locationAddress,
      location_city: locationCity,
      location_state: locationState || undefined,
      location_zip: locationZip,
      occasion: occasion || undefined,
      service_style: (serviceStyle as CreateEventInput['service_style']) || undefined,
      quoted_price_cents: quotedPriceCents,
      dietary_restrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,
      allergies: allergies.length > 0 ? allergies : undefined,
      special_requests: specialRequests || undefined,
    }

    startTransition(async () => {
      try {
        const result = await createEvent(input)
        if (result.success && result.event) {
          trackEvent(ANALYTICS_EVENTS.EVENT_CREATED, {
            source: 'chef_event_creation_wizard',
            guest_count: guestCountNum,
            has_budget_min: Boolean(budgetMin),
            has_budget_max: Boolean(budgetMax),
            has_service_style: Boolean(serviceStyle),
          })
          toast.success('Event created successfully')
          router.push(`/events/${result.event.id}`)
        } else {
          throw new Error('Failed to create event')
        }
      } catch (err) {
        console.error('[EventCreationWizard] Create failed:', err)
        const message =
          err instanceof Error ? err.message : 'An error occurred while creating the event'
        setError(message)
        toast.error(message)
      }
    })
  }

  // Format cents as dollars for display
  const formatDollars = (val: string): string => {
    if (!val) return 'Not set'
    const cents = parseCurrencyToCents(val)
    return formatCurrency(cents)
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as WizardStep
          const isActive = step === stepNum
          const isCompleted = step > stepNum
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-brand-600 text-white'
                        : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {isCompleted ? '\u2713' : stepNum}
                </div>
                <span
                  className={`text-sm font-medium truncate ${
                    isActive ? 'text-stone-900' : isCompleted ? 'text-green-700' : 'text-stone-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-stone-200 min-w-4" />}
            </div>
          )
        })}
      </div>

      <Card className="p-6">
        {error && (
          <Alert variant="error" title="Error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Step 1: Client Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Select a Client</h2>
              <p className="text-sm text-stone-500 mt-1">Choose the client for this event</p>
            </div>

            <Input
              label="Search clients"
              placeholder="Search by name or email..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />

            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <p className="text-sm">No clients found.</p>
                <p className="text-xs mt-1">Add a client from the Clients page first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleClientSelect(client.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      clientId === client.id
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="font-medium text-stone-900 text-sm">{client.full_name}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{client.email}</div>
                    {client.dietary_restrictions?.length || client.allergies?.length ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {client.dietary_restrictions?.map((d) => (
                          <span
                            key={d}
                            className="inline-block text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded"
                          >
                            {d}
                          </span>
                        ))}
                        {client.allergies?.map((a) => (
                          <span
                            key={a}
                            className="inline-block text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            )}

            {selectedClient && (
              <Alert variant="info" title="Selected client">
                {selectedClient.full_name} ({selectedClient.email})
              </Alert>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="primary" onClick={goNext}>
                Continue
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Event Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Event Details</h2>
              <p className="text-sm text-stone-500 mt-1">Enter the core details for this event</p>
            </div>

            <Input
              label="Occasion / Event Title"
              placeholder="e.g., Wedding Reception, Corporate Dinner, Birthday"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Event Date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <Input
                label="Serve Time"
                type="time"
                required
                value={serveTime}
                onChange={(e) => setServeTime(e.target.value)}
                helperText="When food should be served"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Number of Guests"
                type="number"
                required
                min="1"
                placeholder="e.g., 12"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
              <Select
                label="Service Style"
                options={SERVICE_STYLE_OPTIONS}
                value={serviceStyle}
                onChange={(e) => setServiceStyle(e.target.value)}
              />
            </div>

            <AddressAutocomplete
              label="Address"
              required
              placeholder="e.g., 123 Main St"
              value={locationAddress}
              onChange={(val) => setLocationAddress(val)}
              onPlaceSelect={(data) => {
                setLocationAddress(data.address)
                setLocationCity(data.city)
                setLocationState(data.state)
                setLocationZip(data.zip)
              }}
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
              <Button type="button" variant="primary" onClick={goNext}>
                Continue
              </Button>
              <Button type="button" variant="secondary" onClick={goBack}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Dietary & Notes */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Dietary & Notes</h2>
              <p className="text-sm text-stone-500 mt-1">
                Add dietary requirements, allergies, and any special notes
              </p>
            </div>

            <TagInput
              label="Dietary Restrictions"
              value={dietaryRestrictions}
              onChange={setDietaryRestrictions}
              placeholder="Type and press Enter (e.g., Vegetarian)"
              suggestions={COMMON_DIETARY_SUGGESTIONS}
              helperText={
                selectedClient?.dietary_restrictions?.length
                  ? `Pre-filled from ${selectedClient.full_name}'s profile`
                  : undefined
              }
            />

            <TagInput
              label="Allergies"
              value={allergies}
              onChange={setAllergies}
              placeholder="Type and press Enter (e.g., Peanuts)"
              suggestions={COMMON_ALLERGY_SUGGESTIONS}
              helperText={
                selectedClient?.allergies?.length
                  ? `Pre-filled from ${selectedClient.full_name}'s profile`
                  : undefined
              }
            />

            <Textarea
              label="Special Requests"
              placeholder="Any additional details, requests, or notes for this event..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={4}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Budget Min ($)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 1500.00"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                helperText="Optional lower bound"
              />
              <Input
                label="Budget Max ($)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 3000.00"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                helperText="Used as the quoted price if set"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="primary" onClick={goNext}>
                Review
              </Button>
              <Button type="button" variant="secondary" onClick={goBack}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Create */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Review & Create</h2>
              <p className="text-sm text-stone-500 mt-1">
                Confirm the details below, then create the event
              </p>
            </div>

            {/* Client summary */}
            <div className="rounded-lg border border-stone-200 p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-2">Client</h3>
              <p className="text-sm text-stone-900">{selectedClient?.full_name}</p>
              <p className="text-xs text-stone-500">{selectedClient?.email}</p>
            </div>

            {/* Event details summary */}
            <div className="rounded-lg border border-stone-200 p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-2">Event Details</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-stone-500">Occasion</dt>
                <dd className="text-stone-900">{occasion || 'Not specified'}</dd>

                <dt className="text-stone-500">Date</dt>
                <dd className="text-stone-900">{eventDate || 'Not set'}</dd>

                <dt className="text-stone-500">Serve Time</dt>
                <dd className="text-stone-900">{serveTime || 'Not set'}</dd>

                <dt className="text-stone-500">Guests</dt>
                <dd className="text-stone-900">{guestCount}</dd>

                <dt className="text-stone-500">Service Style</dt>
                <dd className="text-stone-900">
                  {SERVICE_STYLE_OPTIONS.find((o) => o.value === serviceStyle)?.label ||
                    'Not specified'}
                </dd>

                <dt className="text-stone-500">Location</dt>
                <dd className="text-stone-900">
                  {locationAddress}, {locationCity}
                  {locationState ? `, ${locationState}` : ''} {locationZip}
                </dd>
              </dl>
            </div>

            {/* Dietary & notes summary */}
            <div className="rounded-lg border border-stone-200 p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-2">Dietary & Notes</h3>

              {dietaryRestrictions.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-stone-500">Dietary Restrictions: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dietaryRestrictions.map((d) => (
                      <span
                        key={d}
                        className="inline-block text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {allergies.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-stone-500">Allergies: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {allergies.map((a) => (
                      <span
                        key={a}
                        className="inline-block text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {specialRequests && (
                <div className="mb-2">
                  <span className="text-xs text-stone-500">Special Requests: </span>
                  <p className="text-sm text-stone-900 mt-0.5">{specialRequests}</p>
                </div>
              )}

              {(budgetMin || budgetMax) && (
                <div>
                  <span className="text-xs text-stone-500">Budget: </span>
                  <span className="text-sm text-stone-900">
                    {budgetMin && budgetMax
                      ? `${formatDollars(budgetMin)} - ${formatDollars(budgetMax)}`
                      : budgetMax
                        ? `Up to ${formatDollars(budgetMax)}`
                        : `From ${formatDollars(budgetMin)}`}
                  </span>
                </div>
              )}

              {!dietaryRestrictions.length &&
                !allergies.length &&
                !specialRequests &&
                !budgetMin &&
                !budgetMax && (
                  <p className="text-sm text-stone-400">No dietary info or notes added</p>
                )}
            </div>

            <Alert variant="info" title="Status">
              This event will be created in <strong>draft</strong> status. You can propose it to the
              client after adding pricing and a menu.
            </Alert>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleCreate}
                loading={isPending}
                disabled={isPending}
              >
                Create Event
              </Button>
              <Button type="button" variant="secondary" onClick={goBack} disabled={isPending}>
                Back
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
