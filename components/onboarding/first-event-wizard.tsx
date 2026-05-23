// FirstEventWizard - 5-step guided flow to create a chef's first event.
// Steps: Client -> Event -> Menu -> Pricing -> Review & Launch.
// Creates everything in one server action call at the end.

'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WizardStep } from '@/components/onboarding/wizard-step'
import { Card, CardContent } from '@/components/ui/card'
import { Check, Users, CalendarDays, UtensilsCrossed, DollarSign, Sparkles } from '@/components/ui/icons'
import { createFirstEvent, type FirstEventInput } from '@/lib/onboarding/first-event-actions'

type Step = 1 | 2 | 3 | 4 | 5
const TOTAL_STEPS = 5
const STEP_LABELS = ['Client', 'Event', 'Menu', 'Price', 'Review']
const STEP_ICONS = [Users, CalendarDays, UtensilsCrossed, DollarSign, Sparkles]

function ProgressBar({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as Step
        const Icon = STEP_ICONS[i]
        const isComplete = stepNum < current
        const isCurrent = stepNum === current
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={`
                flex items-center justify-center h-9 w-9 rounded-full text-sm font-medium transition-colors
                ${isComplete ? 'bg-green-600 text-white' : ''}
                ${isCurrent ? 'bg-brand-600 text-white ring-2 ring-brand-400/50' : ''}
                ${!isComplete && !isCurrent ? 'bg-stone-800 text-stone-500' : ''}
              `}
            >
              {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span
              className={`text-xs ${isCurrent ? 'text-stone-200 font-medium' : 'text-stone-500'}`}
            >
              {label}
            </span>
            {i < TOTAL_STEPS - 1 && (
              <div
                className={`hidden sm:block absolute h-0.5 w-full top-[18px] left-1/2 -z-10 ${
                  isComplete ? 'bg-green-600' : 'bg-stone-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-300">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        required={required}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FirstEventWizard() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [guestCount, setGuestCount] = useState('4')
  const [occasion, setOccasion] = useState('')
  const [serviceStyle, setServiceStyle] = useState('')

  const [menuName, setMenuName] = useState('')
  const [dishes, setDishes] = useState<{ name: string; course: string }[]>([
    { name: '', course: 'Appetizer' },
    { name: '', course: 'Main' },
    { name: '', course: 'Dessert' },
  ])

  const [pricingModel, setPricingModel] = useState('per_person')
  const [pricePerPerson, setPricePerPerson] = useState('')
  const [flatRate, setFlatRate] = useState('')

  const goNext = useCallback(() => {
    setError(null)
    if (step < TOTAL_STEPS) setStep((s) => (s + 1) as Step)
  }, [step])

  const goBack = useCallback(() => {
    setError(null)
    if (step > 1) setStep((s) => (s - 1) as Step)
  }, [step])

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 1:
        return clientName.trim().length > 0
      case 2:
        return eventDate.length > 0
      case 3:
        return menuName.trim().length > 0
      case 4:
        return true // pricing is optional
      case 5:
        return true
      default:
        return false
    }
  }, [step, clientName, eventDate, menuName])

  const addDish = useCallback(() => {
    setDishes((prev) => [...prev, { name: '', course: 'Main' }])
  }, [])

  const updateDish = useCallback((index: number, field: 'name' | 'course', value: string) => {
    setDishes((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)))
  }, [])

  const removeDish = useCallback((index: number) => {
    setDishes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = useCallback(() => {
    setError(null)
    const parsedGuestCount = parseInt(guestCount, 10) || 1
    const input: FirstEventInput = {
      client_name: clientName.trim(),
      client_email: clientEmail.trim() || undefined,
      client_phone: clientPhone.trim() || undefined,
      event_date: eventDate,
      event_location: eventLocation.trim() || undefined,
      guest_count: parsedGuestCount,
      occasion: occasion.trim() || undefined,
      service_style: serviceStyle
        ? (serviceStyle as FirstEventInput['service_style'])
        : undefined,
      menu_name: menuName.trim() || `Menu for ${clientName.trim()}`,
      dishes: dishes.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), course: d.course })),
      pricing_model: pricingModel as 'per_person' | 'flat_rate' | undefined,
      price_per_person_cents: pricingModel === 'per_person' && pricePerPerson
        ? Math.round(parseFloat(pricePerPerson) * 100)
        : undefined,
      flat_rate_cents: pricingModel === 'flat_rate' && flatRate
        ? Math.round(parseFloat(flatRate) * 100)
        : undefined,
    }

    startTransition(async () => {
      try {
        const result = await createFirstEvent(input)
        if (result.success) {
          router.push(`/events/${result.eventId}`)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Something went wrong. Please try again.')
        console.error('[first-event-wizard] Submit error:', err)
      }
    })
  }, [
    clientName, clientEmail, clientPhone, eventDate, eventLocation,
    guestCount, occasion, serviceStyle, menuName, dishes,
    pricingModel, pricePerPerson, flatRate, router, startTransition,
  ])

  const computedTotal = (() => {
    const guests = parseInt(guestCount, 10) || 1
    if (pricingModel === 'per_person' && pricePerPerson) {
      return (parseFloat(pricePerPerson) * guests).toFixed(2)
    }
    if (pricingModel === 'flat_rate' && flatRate) {
      return parseFloat(flatRate).toFixed(2)
    }
    return null
  })()

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressBar current={step} />

      {error && (
        <div className="mb-4 rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-6 sm:p-8">
          {/* Step 1: Client */}
          {step === 1 && (
            <WizardStep
              title="Who is this event for?"
              description="Add the client you will be cooking for. You can add more details later."
              onNext={goNext}
              nextDisabled={!canProceed()}
              showBack={false}
            >
              <InputField
                label="Client Name"
                value={clientName}
                onChange={setClientName}
                placeholder="e.g. Sarah Johnson"
                required
              />
              <InputField
                label="Email"
                value={clientEmail}
                onChange={setClientEmail}
                placeholder="sarah@example.com"
                type="email"
              />
              <InputField
                label="Phone"
                value={clientPhone}
                onChange={setClientPhone}
                placeholder="(555) 123-4567"
                type="tel"
              />
            </WizardStep>
          )}

          {/* Step 2: Event */}
          {step === 2 && (
            <WizardStep
              title="When and where?"
              description="Set up the basics for this event. Everything can be changed later."
              onNext={goNext}
              onBack={goBack}
              nextDisabled={!canProceed()}
            >
              <InputField
                label="Event Date"
                value={eventDate}
                onChange={setEventDate}
                type="date"
                required
              />
              <InputField
                label="Location"
                value={eventLocation}
                onChange={setEventLocation}
                placeholder="Client's home, venue address, etc."
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Guest Count"
                  value={guestCount}
                  onChange={setGuestCount}
                  type="number"
                />
                <InputField
                  label="Occasion"
                  value={occasion}
                  onChange={setOccasion}
                  placeholder="Birthday, dinner party..."
                />
              </div>
              <SelectField
                label="Service Style"
                value={serviceStyle}
                onChange={setServiceStyle}
                options={[
                  { value: '', label: 'Choose a style...' },
                  { value: 'plated', label: 'Plated' },
                  { value: 'family_style', label: 'Family Style' },
                  { value: 'buffet', label: 'Buffet' },
                  { value: 'cocktail', label: 'Cocktail' },
                  { value: 'tasting_menu', label: 'Tasting Menu' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </WizardStep>
          )}

          {/* Step 3: Menu */}
          {step === 3 && (
            <WizardStep
              title="What are you cooking?"
              description="Add your dishes. Start simple; you can refine your menu anytime."
              onNext={goNext}
              onBack={goBack}
              nextDisabled={!canProceed()}
              showSkip
              onSkip={goNext}
            >
              <InputField
                label="Menu Name"
                value={menuName}
                onChange={setMenuName}
                placeholder={`Menu for ${clientName || 'client'}`}
                required
              />
              <div className="space-y-3">
                <span className="text-sm font-medium text-stone-300">Dishes</span>
                {dishes.map((dish, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input
                        value={dish.name}
                        onChange={(e) => updateDish(i, 'name', e.target.value)}
                        placeholder="Dish name"
                        className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <select
                      value={dish.course}
                      onChange={(e) => updateDish(i, 'course', e.target.value)}
                      className="rounded-lg border border-stone-700 bg-stone-800 px-2 py-2 text-sm text-stone-100 focus:border-brand-500 outline-none w-28"
                    >
                      <option value="Appetizer">Appetizer</option>
                      <option value="Soup">Soup</option>
                      <option value="Salad">Salad</option>
                      <option value="Main">Main</option>
                      <option value="Side">Side</option>
                      <option value="Dessert">Dessert</option>
                    </select>
                    {dishes.length > 1 && (
                      <button
                        onClick={() => removeDish(i)}
                        className="text-stone-500 hover:text-red-400 px-2 py-2 text-sm"
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addDish}
                  type="button"
                  className="text-sm text-brand-400 hover:text-brand-300 font-medium"
                >
                  + Add another dish
                </button>
              </div>
            </WizardStep>
          )}

          {/* Step 4: Pricing */}
          {step === 4 && (
            <WizardStep
              title="Set your price"
              description="How much will you charge? You can always adjust this later."
              onNext={goNext}
              onBack={goBack}
              showSkip
              onSkip={goNext}
            >
              <SelectField
                label="Pricing Model"
                value={pricingModel}
                onChange={setPricingModel}
                options={[
                  { value: 'per_person', label: 'Per Person' },
                  { value: 'flat_rate', label: 'Flat Rate' },
                ]}
              />
              {pricingModel === 'per_person' && (
                <div className="space-y-2">
                  <InputField
                    label="Price Per Person ($)"
                    value={pricePerPerson}
                    onChange={setPricePerPerson}
                    placeholder="125.00"
                    type="number"
                  />
                  {computedTotal && (
                    <p className="text-sm text-stone-400">
                      {guestCount} guests x ${pricePerPerson} = <span className="text-stone-200 font-medium">${computedTotal}</span>
                    </p>
                  )}
                </div>
              )}
              {pricingModel === 'flat_rate' && (
                <InputField
                  label="Total Price ($)"
                  value={flatRate}
                  onChange={setFlatRate}
                  placeholder="500.00"
                  type="number"
                />
              )}
            </WizardStep>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <WizardStep
              title="Review and create"
              description="Everything look good? Hit create and you are off to the races."
              onNext={handleSubmit}
              onBack={goBack}
              nextLabel="Create Event"
              isSubmitting={isPending}
            >
              <div className="space-y-4">
                <ReviewSection label="Client" value={clientName} detail={clientEmail || clientPhone || undefined} />
                <ReviewSection
                  label="Event"
                  value={`${new Date(eventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
                  detail={[
                    `${guestCount} guests`,
                    occasion,
                    eventLocation,
                  ]
                    .filter(Boolean)
                    .join(' / ')}
                />
                <ReviewSection
                  label="Menu"
                  value={menuName || `Menu for ${clientName}`}
                  detail={
                    dishes.filter((d) => d.name.trim()).length > 0
                      ? dishes
                          .filter((d) => d.name.trim())
                          .map((d) => `${d.name} (${d.course})`)
                          .join(', ')
                      : 'No dishes added yet'
                  }
                />
                {computedTotal && (
                  <ReviewSection
                    label="Price"
                    value={`$${computedTotal}`}
                    detail={
                      pricingModel === 'per_person'
                        ? `$${pricePerPerson}/person x ${guestCount} guests`
                        : 'Flat rate'
                    }
                  />
                )}
              </div>
            </WizardStep>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReviewSection({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-stone-800 last:border-0">
      <div>
        <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-stone-200 font-medium mt-0.5">{value}</p>
        {detail && <p className="text-xs text-stone-400 mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}
