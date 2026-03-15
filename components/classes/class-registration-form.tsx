'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  registerForClass,
  type CookingClassRow,
  type ClassCapacityStatus,
} from '@/lib/classes/class-actions'

type ClassRegistrationFormProps = {
  classData: CookingClassRow
  capacity: ClassCapacityStatus
  onSuccess?: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function ClassRegistrationForm({
  classData,
  capacity,
  onSuccess,
}: ClassRegistrationFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [wasWaitlisted, setWasWaitlisted] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [allergies, setAllergies] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState('')
  const [notes, setNotes] = useState('')

  const deadlinePassed = classData.registration_deadline
    ? new Date(classData.registration_deadline) < new Date()
    : false

  function handleSubmit() {
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid email is required')
      return
    }

    const allergyList = allergies
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const restrictionList = dietaryRestrictions
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    startTransition(async () => {
      try {
        const reg = await registerForClass(classData.id, {
          attendee_name: name.trim(),
          attendee_email: email.trim(),
          allergies: allergyList.length > 0 ? allergyList : undefined,
          dietary_restrictions: restrictionList.length > 0 ? restrictionList : undefined,
          notes: notes.trim() || undefined,
        })
        setWasWaitlisted(reg.status === 'waitlisted')
        setSuccess(true)
        onSuccess?.()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Registration failed')
      }
    })
  }

  if (success) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">
          {wasWaitlisted ? 'Added to Waitlist' : 'Registration Confirmed'}
        </h2>
        <p className="text-gray-600">
          {wasWaitlisted
            ? 'The class is currently full. You have been added to the waitlist and will be notified if a spot opens up.'
            : `You are registered for "${classData.title}". See you there!`}
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Class summary */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold mb-1">{classData.title}</h2>
        <p className="text-sm text-gray-600">{formatDate(classData.class_date)}</p>
        <p className="text-sm text-gray-600">{classData.duration_minutes} minutes</p>
        {classData.location && <p className="text-sm text-gray-500">{classData.location}</p>}
        <p className="text-lg font-semibold mt-2">
          {formatPrice(classData.price_per_person_cents)} per person
        </p>

        <div className="mt-2 flex items-center gap-2">
          {capacity.isFull ? (
            <Badge variant="warning">Class Full - Waitlist Available</Badge>
          ) : (
            <Badge variant="success">{capacity.available} spots remaining</Badge>
          )}
        </div>
      </div>

      {deadlinePassed && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Registration deadline has passed.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!deadlinePassed && (
        <>
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium mb-1">Allergies</label>
            <Input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. peanuts, shellfish (comma-separated)"
            />
            <p className="text-xs text-gray-400 mt-1">Separate multiple allergies with commas</p>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label className="block text-sm font-medium mb-1">Dietary Restrictions</label>
            <Input
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="e.g. vegetarian, gluten-free (comma-separated)"
            />
            <p className="text-xs text-gray-400 mt-1">Separate multiple restrictions with commas</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else we should know?"
              rows={2}
            />
          </div>

          {/* Submit */}
          <Button variant="primary" onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? 'Registering...' : capacity.isFull ? 'Join Waitlist' : 'Register'}
          </Button>

          {capacity.isFull && (
            <p className="text-sm text-amber-600 text-center">
              This class is full. Submitting will add you to the waitlist.
            </p>
          )}
        </>
      )}
    </Card>
  )
}
