'use client'

// BookingFlow - Multi-step Calendly-style booking experience.
// Steps: 1. Select Service -> 2. Pick Date -> 3. Pick Time -> 4. Your Details -> 5. Confirm -> 6. Success
// Zero friction: no account required, auto timezone detection, mobile-first.

import { useState, useCallback } from 'react'
import { ServiceSelector } from '@/components/booking/service-selector'
import { BookingDatePicker } from '@/components/booking/date-picker'
import { TimeSlots } from '@/components/booking/time-slots'
import { BookingDetailsForm } from '@/components/booking/booking-details-form'
import { BookingConfirmation } from '@/components/booking/booking-confirmation'
import type { PublicEventType } from '@/lib/booking/event-types-actions'
import type { BookingConfig } from '@/app/book/[chefSlug]/booking-page-client'

type BookingStep = 'service' | 'date' | 'time' | 'details' | 'confirm' | 'success'

type Props = {
  chefSlug: string
  chefName: string
  eventTypes: PublicEventType[]
  bookingConfig: BookingConfig
}

export type BookingFormData = {
  fullName: string
  email: string
  phone: string
  guestCount: number
  dietaryNotes: string
  message: string
  occasion: string
  address: string
}

export function BookingFlow({ chefSlug, chefName, eventTypes, bookingConfig }: Props) {
  const [step, setStep] = useState<BookingStep>(eventTypes.length > 0 ? 'service' : 'date')
  const [selectedEventType, setSelectedEventType] = useState<PublicEventType | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [formData, setFormData] = useState<BookingFormData | null>(null)

  const hasEventTypes = eventTypes.length > 0

  const handleServiceSelect = useCallback((eventType: PublicEventType) => {
    setSelectedEventType(eventType)
    setSelectedDate(null)
    setSelectedTime(null)
    setStep('date')
  }, [])

  const handleDateSelect = useCallback(
    (date: string) => {
      setSelectedDate(date)
      setSelectedTime(null)
      if (hasEventTypes && selectedEventType) {
        setStep('time')
      } else {
        // Legacy mode: no event types, skip time selection
        setStep('details')
      }
    },
    [hasEventTypes, selectedEventType]
  )

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time)
    setStep('details')
  }, [])

  const handleDetailsSubmit = useCallback((data: BookingFormData) => {
    setFormData(data)
    setStep('confirm')
  }, [])

  const handleConfirmed = useCallback(() => {
    setStep('success')
  }, [])

  const goBack = useCallback(() => {
    switch (step) {
      case 'date':
        if (hasEventTypes) setStep('service')
        break
      case 'time':
        setStep('date')
        break
      case 'details':
        if (hasEventTypes && selectedEventType) {
          setStep('time')
        } else {
          setStep('date')
        }
        break
      case 'confirm':
        setStep('details')
        break
    }
  }, [step, hasEventTypes, selectedEventType])

  // Step progress indicator
  const steps = hasEventTypes
    ? ['Service', 'Date', 'Time', 'Details', 'Confirm']
    : ['Date', 'Details', 'Confirm']

  const currentStepIndex = hasEventTypes
    ? ['service', 'date', 'time', 'details', 'confirm'].indexOf(step)
    : ['date', 'details', 'confirm'].indexOf(step)

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      {step !== 'success' && (
        <div className="flex items-center justify-center gap-2">
          {steps.map((label, i) => {
            const isActive = i === currentStepIndex
            const isCompleted = i < currentStepIndex
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`h-px w-6 sm:w-10 ${isCompleted ? 'bg-green-500' : 'bg-stone-700'}`}
                  />
                )}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-stone-700 text-stone-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 hidden sm:block ${
                      isActive ? 'text-stone-200' : 'text-stone-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Step content */}
      {step === 'service' && (
        <ServiceSelector eventTypes={eventTypes} onSelect={handleServiceSelect} />
      )}

      {step === 'date' && (
        <BookingDatePicker
          chefSlug={chefSlug}
          onSelectDate={handleDateSelect}
          onBack={hasEventTypes ? goBack : undefined}
          selectedEventType={selectedEventType}
        />
      )}

      {step === 'time' && selectedDate && selectedEventType && (
        <TimeSlots
          chefSlug={chefSlug}
          date={selectedDate}
          eventType={selectedEventType}
          onSelectTime={handleTimeSelect}
          onBack={goBack}
        />
      )}

      {step === 'details' && selectedDate && (
        <BookingDetailsForm
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          selectedEventType={selectedEventType}
          initialData={formData}
          onSubmit={handleDetailsSubmit}
          onBack={goBack}
        />
      )}

      {step === 'confirm' && selectedDate && formData && (
        <BookingConfirmation
          chefSlug={chefSlug}
          chefName={chefName}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          selectedEventType={selectedEventType}
          formData={formData}
          bookingConfig={bookingConfig}
          onConfirmed={handleConfirmed}
          onBack={goBack}
        />
      )}

      {step === 'success' && (
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-600 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-stone-100">
            {bookingConfig.bookingModel === 'instant_book'
              ? 'Booking Confirmed!'
              : 'Request Submitted!'}
          </h2>
          <p className="text-stone-400 max-w-sm mx-auto">
            {bookingConfig.bookingModel === 'instant_book'
              ? 'Your deposit has been processed and your event is booked. Check your email for confirmation details.'
              : 'Your booking request has been submitted. Expect a response within 24 hours.'}
          </p>
          <p className="text-sm text-stone-500">
            A confirmation has been sent to your email address.
          </p>
        </div>
      )}
    </div>
  )
}
