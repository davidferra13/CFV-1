'use client'

import { useState, useTransition } from 'react'
import type { HouseholdMember } from '@/lib/hub/household-actions'
import { addHouseholdMember, removeHouseholdMember } from '@/lib/hub/household-actions'

const RELATIONSHIPS = [
  { value: 'partner', label: 'Partner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'house_manager', label: 'House Manager' },
  { value: 'nanny', label: 'Nanny' },
  { value: 'other', label: 'Other' },
] as const

const AGE_GROUPS = [
  { value: 'infant', label: 'Infant' },
  { value: 'toddler', label: 'Toddler' },
  { value: 'child', label: 'Child' },
  { value: 'teen', label: 'Teen' },
  { value: 'adult', label: 'Adult' },
] as const

const COMMON_ALLERGIES = [
  'Peanuts',
  'Tree Nuts',
  'Milk',
  'Eggs',
  'Wheat',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
]

const COMMON_DIETARY = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Kosher',
  'Halal',
  'Pescatarian',
]

interface HouseholdEditorProps {
  profileToken: string
  initialMembers: HouseholdMember[]
}

export function HouseholdEditor({ profileToken, initialMembers }: HouseholdEditorProps) {
  const [members, setMembers] = useState<HouseholdMember[]>(initialMembers)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState<string>('partner')
  const [ageGroup, setAgeGroup] = useState<string>('')
  const [allergies, setAllergies] = useState<string[]>([])
  const [dietary, setDietary] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setName('')
    setRelationship('partner')
    setAgeGroup('')
    setAllergies([])
    setDietary([])
    setNotes('')
    setShowForm(false)
    setError(null)
  }

  const toggleArrayItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((a) => a !== item) : [...arr, item])
  }

  const handleAdd = () => {
    if (!name.trim()) return

    startTransition(async () => {
      try {
        const result = await addHouseholdMember({
          profileToken,
          displayName: name.trim(),
          relationship: relationship as any,
          ageGroup: (ageGroup || null) as any,
          allergies,
          dietaryRestrictions: dietary,
          notes: notes.trim() || null,
        })
        if (result.success && result.member) {
          setMembers((prev) => [...prev, result.member!])
          resetForm()
        } else {
          setError(result.error ?? 'Failed to add')
        }
      } catch {
        setError('Failed to add household member')
      }
    })
  }

  const handleRemove = (memberId: string) => {
    const previous = [...members]
    setMembers((prev) => prev.filter((m) => m.id !== memberId))

    startTransition(async () => {
      try {
        const result = await removeHouseholdMember({ memberId, profileToken })
        if (!result.success) {
          setMembers(previous)
          setError(result.error ?? 'Failed to remove')
        }
      } catch {
        setMembers(previous)
        setError('Failed to remove household member')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-200">My Household</h4>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-stone-800 px-3 py-1 text-xs text-stone-400 hover:bg-stone-700 hover:text-stone-200"
          >
            + Add Member
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-300">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Existing members */}
      {members.length === 0 && !showForm && (
        <p className="text-xs text-stone-600">
          Add family members so the chef knows everyone's dietary needs.
        </p>
      )}

      {members.map((member) => (
        <div key={member.id} className="rounded-xl border border-stone-800 bg-stone-900/50 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-stone-200">{member.display_name}</p>
              <p className="text-xs text-stone-500 capitalize">
                {member.relationship.replace('_', ' ')}
                {member.age_group ? ` (${member.age_group})` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(member.id)}
              disabled={isPending}
              className="rounded p-1 text-stone-600 hover:text-red-400 disabled:opacity-50"
              title="Remove"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Dietary pills */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {member.allergies.map((a) => (
              <span
                key={a}
                className="rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-400"
              >
                ⚠ {a}
              </span>
            ))}
            {member.dietary_restrictions.map((d) => (
              <span
                key={d}
                className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-400"
              >
                {d}
              </span>
            ))}
            {member.dislikes.map((d) => (
              <span
                key={d}
                className="rounded-full bg-stone-700 px-2 py-0.5 text-[10px] text-stone-400"
              >
                Dislikes: {d}
              </span>
            ))}
          </div>

          {member.notes && <p className="mt-1 text-xs text-stone-500 italic">{member.notes}</p>}
        </div>
      ))}

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-stone-700 bg-stone-800/80 p-4 space-y-3">
          <h5 className="text-xs font-semibold text-stone-300">Add Household Member</h5>

          {/* Name */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-lg bg-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            maxLength={100}
            autoFocus
          />

          {/* Relationship + Age */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="rounded-lg bg-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="rounded-lg bg-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            >
              <option value="">Age group (optional)</option>
              {AGE_GROUPS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Allergies */}
          <div>
            <p className="mb-1 text-xs font-medium text-amber-400">Allergies</p>
            <div className="flex flex-wrap gap-1">
              {COMMON_ALLERGIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleArrayItem(allergies, setAllergies, a)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    allergies.includes(a)
                      ? 'bg-amber-900/60 text-amber-300 ring-1 ring-amber-700'
                      : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary */}
          <div>
            <p className="mb-1 text-xs font-medium text-emerald-400">Dietary Restrictions</p>
            <div className="flex flex-wrap gap-1">
              {COMMON_DIETARY.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleArrayItem(dietary, setDietary, d)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    dietary.includes(d)
                      ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-700'
                      : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (e.g., picky eater, only eats plain pasta)"
            className="w-full rounded-lg bg-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            maxLength={500}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || isPending}
              className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-stone-700 px-4 py-2 text-sm text-stone-400 hover:bg-stone-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
