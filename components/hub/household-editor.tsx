'use client'

import { useState, useTransition } from 'react'
import type { HouseholdMember } from '@/lib/hub/household-actions'
import {
  addHouseholdMember,
  removeHouseholdMember,
  updateHouseholdMember,
} from '@/lib/hub/household-actions'

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

interface FormState {
  name: string
  relationship: string
  ageGroup: string
  allergies: string[]
  dietary: string[]
  dislikes: string[]
  favorites: string[]
  notes: string
}

function emptyForm(): FormState {
  return {
    name: '',
    relationship: 'partner',
    ageGroup: '',
    allergies: [],
    dietary: [],
    dislikes: [],
    favorites: [],
    notes: '',
  }
}

function formFromMember(member: HouseholdMember): FormState {
  return {
    name: member.display_name,
    relationship: member.relationship,
    ageGroup: member.age_group ?? '',
    allergies: [...member.allergies],
    dietary: [...member.dietary_restrictions],
    dislikes: [...member.dislikes],
    favorites: [...member.favorites],
    notes: member.notes ?? '',
  }
}

interface HouseholdEditorProps {
  profileToken: string
  initialMembers: HouseholdMember[]
}

export function HouseholdEditor({ profileToken, initialMembers }: HouseholdEditorProps) {
  const [members, setMembers] = useState<HouseholdMember[]>(initialMembers)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const resetForm = () => {
    setForm(emptyForm())
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  const startAdd = () => {
    setForm(emptyForm())
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  const startEdit = (member: HouseholdMember) => {
    setForm(formFromMember(member))
    setEditingId(member.id)
    setShowForm(true)
    setError(null)
  }

  const toggleArrayItem = (field: keyof FormState, item: string) => {
    setForm((prev) => {
      const arr = prev[field] as string[]
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter((a) => a !== item) : [...arr, item],
      }
    })
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return

    const previous = [...members]

    if (editingId) {
      // Optimistic update for edit
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? {
                ...m,
                display_name: form.name.trim(),
                relationship: form.relationship,
                age_group: form.ageGroup || null,
                allergies: form.allergies,
                dietary_restrictions: form.dietary,
                dislikes: form.dislikes,
                favorites: form.favorites,
                notes: form.notes.trim() || null,
              }
            : m
        )
      )
    }

    startTransition(async () => {
      try {
        if (editingId) {
          const result = await updateHouseholdMember({
            memberId: editingId,
            profileToken,
            displayName: form.name.trim(),
            relationship: form.relationship as any,
            ageGroup: (form.ageGroup || null) as any,
            allergies: form.allergies,
            dietaryRestrictions: form.dietary,
            dislikes: form.dislikes,
            favorites: form.favorites,
            notes: form.notes.trim() || null,
          })
          if (result.success) {
            resetForm()
          } else {
            setMembers(previous)
            setError(result.error ?? 'Failed to update')
          }
        } else {
          const result = await addHouseholdMember({
            profileToken,
            displayName: form.name.trim(),
            relationship: form.relationship as any,
            ageGroup: (form.ageGroup || null) as any,
            allergies: form.allergies,
            dietaryRestrictions: form.dietary,
            dislikes: form.dislikes,
            favorites: form.favorites,
            notes: form.notes.trim() || null,
          })
          if (result.success && result.member) {
            setMembers((prev) => [...prev, result.member!])
            resetForm()
          } else {
            setError(result.error ?? 'Failed to add')
          }
        }
      } catch {
        setMembers(previous)
        setError(editingId ? 'Failed to update household member' : 'Failed to add household member')
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
            onClick={startAdd}
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(member)}
                disabled={isPending || (showForm && editingId === member.id)}
                className="text-xs text-stone-400 hover:text-stone-200 disabled:opacity-50"
                title="Edit"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zM16.862 4.487L19.5 7.125"
                  />
                </svg>
              </button>
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
                className="rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] text-red-400"
              >
                Dislikes: {d}
              </span>
            ))}
            {member.favorites.map((f) => (
              <span
                key={f}
                className="rounded-full bg-blue-900/30 px-2 py-0.5 text-[10px] text-blue-400"
              >
                Loves: {f}
              </span>
            ))}
          </div>

          {member.notes && <p className="mt-1 text-xs text-stone-500 italic">{member.notes}</p>}
        </div>
      ))}

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-stone-700 bg-stone-800/80 p-4 space-y-3">
          <h5 className="text-xs font-semibold text-stone-300">
            {editingId ? 'Edit Household Member' : 'Add Household Member'}
          </h5>

          {/* Name */}
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            className="w-full rounded-lg bg-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            maxLength={100}
            autoFocus
          />

          {/* Relationship + Age */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.relationship}
              onChange={(e) => setForm((prev) => ({ ...prev, relationship: e.target.value }))}
              className="rounded-lg bg-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select
              value={form.ageGroup}
              onChange={(e) => setForm((prev) => ({ ...prev, ageGroup: e.target.value }))}
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
                  onClick={() => toggleArrayItem('allergies', a)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    form.allergies.includes(a)
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
                  onClick={() => toggleArrayItem('dietary', d)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    form.dietary.includes(d)
                      ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-700'
                      : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Dislikes */}
          <ChipInput
            label="Dislikes"
            labelColor="text-red-400"
            chipBg="bg-red-900/30"
            chipText="text-red-400"
            items={form.dislikes}
            onChange={(dislikes) => setForm((prev) => ({ ...prev, dislikes }))}
            placeholder="Type a dislike and press Enter"
          />

          {/* Favorites */}
          <ChipInput
            label="Favorites"
            labelColor="text-blue-400"
            chipBg="bg-blue-900/30"
            chipText="text-blue-400"
            items={form.favorites}
            onChange={(favorites) => setForm((prev) => ({ ...prev, favorites }))}
            placeholder="Type a favorite and press Enter"
          />

          {/* Notes */}
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes (e.g., picky eater, only eats plain pasta)"
            className="w-full rounded-lg bg-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            maxLength={500}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!form.name.trim() || isPending}
              className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editingId ? 'Save' : 'Add'}
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

// ---------------------------------------------------------------------------
// ChipInput: free-text chip input for dislikes/favorites
// ---------------------------------------------------------------------------

function ChipInput({
  label,
  labelColor,
  chipBg,
  chipText,
  items,
  onChange,
  placeholder,
}: {
  label: string
  labelColor: string
  chipBg: string
  chipText: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const [inputValue, setInputValue] = useState('')

  const addItem = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (items.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('')
      return
    }
    onChange([...items, trimmed])
    setInputValue('')
  }

  const removeItem = (item: string) => {
    onChange(items.filter((i) => i !== item))
  }

  return (
    <div>
      <p className={`mb-1 text-xs font-medium ${labelColor}`}>{label}</p>
      {items.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {items.map((item) => (
            <span
              key={item}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${chipBg} ${chipText}`}
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="ml-0.5 opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addItem()
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg bg-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
        maxLength={100}
      />
    </div>
  )
}
