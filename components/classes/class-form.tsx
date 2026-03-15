'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  createClass,
  updateClass,
  type CookingClassRow,
  type CreateClassInput,
} from '@/lib/classes/class-actions'

type ClassFormProps = {
  existingClass?: CookingClassRow
  menus?: { id: string; name: string }[]
  onSuccess?: () => void
}

const SKILL_LEVELS = [
  { value: '', label: 'Select skill level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all_levels', label: 'All Levels' },
]

export function ClassForm({ existingClass, menus, onSuccess }: ClassFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(existingClass?.title ?? '')
  const [description, setDescription] = useState(existingClass?.description ?? '')
  const [classDate, setClassDate] = useState(
    existingClass?.class_date ? existingClass.class_date.slice(0, 16) : ''
  )
  const [durationMinutes, setDurationMinutes] = useState(existingClass?.duration_minutes ?? 120)
  const [maxCapacity, setMaxCapacity] = useState(existingClass?.max_capacity ?? 10)
  const [pricePerPersonDollars, setPricePerPersonDollars] = useState(
    existingClass ? (existingClass.price_per_person_cents / 100).toFixed(2) : ''
  )
  const [location, setLocation] = useState(existingClass?.location ?? '')
  const [menuId, setMenuId] = useState(existingClass?.menu_id ?? '')
  const [skillLevel, setSkillLevel] = useState(existingClass?.skill_level ?? '')
  const [cuisineType, setCuisineType] = useState(existingClass?.cuisine_type ?? '')
  const [whatToBring, setWhatToBring] = useState<string[]>(existingClass?.what_to_bring ?? [])
  const [whatIncluded, setWhatIncluded] = useState<string[]>(existingClass?.what_included ?? [])
  const [registrationDeadline, setRegistrationDeadline] = useState(
    existingClass?.registration_deadline ? existingClass.registration_deadline.slice(0, 16) : ''
  )
  const [newBringItem, setNewBringItem] = useState('')
  const [newIncludedItem, setNewIncludedItem] = useState('')

  const isEditing = !!existingClass

  function addItem(
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    setCurrent: (v: string) => void
  ) {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
      setCurrent('')
    }
  }

  function removeItem(list: string[], setList: (v: string[]) => void, index: number) {
    setList(list.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!classDate) {
      setError('Date and time are required')
      return
    }
    const priceCents = Math.round(parseFloat(pricePerPersonDollars) * 100)
    if (isNaN(priceCents) || priceCents <= 0) {
      setError('Price per person must be greater than $0')
      return
    }

    const input: CreateClassInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      class_date: new Date(classDate).toISOString(),
      duration_minutes: durationMinutes,
      max_capacity: maxCapacity,
      price_per_person_cents: priceCents,
      location: location.trim() || undefined,
      menu_id: menuId || undefined,
      skill_level: skillLevel || undefined,
      cuisine_type: cuisineType.trim() || undefined,
      what_to_bring: whatToBring.length > 0 ? whatToBring : undefined,
      what_included: whatIncluded.length > 0 ? whatIncluded : undefined,
      registration_deadline: registrationDeadline
        ? new Date(registrationDeadline).toISOString()
        : undefined,
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateClass(existingClass.id, input)
        } else {
          await createClass(input)
        }
        onSuccess?.()
        router.push('/classes')
        router.refresh()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong'
        setError(message)
      }
    })
  }

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">
        {isEditing ? 'Edit Cooking Class' : 'Create Cooking Class'}
      </h2>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Italian Pasta Making"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What students will learn..."
          rows={3}
        />
      </div>

      {/* Date + Duration row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date & Time *</label>
          <Input
            type="datetime-local"
            value={classDate}
            onChange={(e) => setClassDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
          <Input
            type="number"
            min={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 120)}
          />
        </div>
      </div>

      {/* Capacity + Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Max Capacity</label>
          <Input
            type="number"
            min={1}
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 10)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price Per Person ($) *</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={pricePerPersonDollars}
            onChange={(e) => setPricePerPersonDollars(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium mb-1">Location</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Address or venue name"
        />
      </div>

      {/* Cuisine + Skill Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Cuisine Type</label>
          <Input
            value={cuisineType}
            onChange={(e) => setCuisineType(e.target.value)}
            placeholder="e.g. Italian, Thai, French"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Skill Level</label>
          <Select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>
            {SKILL_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Menu Assignment */}
      {menus && menus.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Menu (optional)</label>
          <Select value={menuId} onChange={(e) => setMenuId(e.target.value)}>
            <option value="">No menu assigned</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* What to Bring */}
      <div>
        <label className="block text-sm font-medium mb-1">What to Bring</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newBringItem}
            onChange={(e) => setNewBringItem(e.target.value)}
            placeholder="e.g. Apron"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem(whatToBring, setWhatToBring, newBringItem, setNewBringItem)
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => addItem(whatToBring, setWhatToBring, newBringItem, setNewBringItem)}
          >
            Add
          </Button>
        </div>
        {whatToBring.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {whatToBring.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeItem(whatToBring, setWhatToBring, i)}
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* What's Included */}
      <div>
        <label className="block text-sm font-medium mb-1">What&apos;s Included</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newIncludedItem}
            onChange={(e) => setNewIncludedItem(e.target.value)}
            placeholder="e.g. All ingredients"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem(whatIncluded, setWhatIncluded, newIncludedItem, setNewIncludedItem)
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              addItem(whatIncluded, setWhatIncluded, newIncludedItem, setNewIncludedItem)
            }
          >
            Add
          </Button>
        </div>
        {whatIncluded.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {whatIncluded.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeItem(whatIncluded, setWhatIncluded, i)}
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Registration Deadline */}
      <div>
        <label className="block text-sm font-medium mb-1">Registration Deadline</label>
        <Input
          type="datetime-local"
          value={registrationDeadline}
          onChange={(e) => setRegistrationDeadline(e.target.value)}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Class'}
        </Button>
      </div>
    </Card>
  )
}
