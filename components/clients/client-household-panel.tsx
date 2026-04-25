'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClientHouseholdSummary, HouseholdMember } from '@/lib/hub/household-actions'

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
  { value: '', label: 'Age group' },
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

const RELATIONSHIP_LABEL: Record<string, string> = Object.fromEntries(
  RELATIONSHIPS.map((relationship) => [relationship.value, relationship.label])
)

type HouseholdDraft = {
  displayName: string
  relationship: string
  ageGroup: string
  allergies: string
  dietaryRestrictions: string
  dislikes: string
  favorites: string
  notes: string
}

type HouseholdMutationResult = {
  success: boolean
  member?: HouseholdMember
  error?: string
}

type HouseholdRemoveResult = {
  success: boolean
  error?: string
}

interface ClientHouseholdPanelProps {
  clientId: string
  household: ClientHouseholdSummary
}

function emptyDraft(): HouseholdDraft {
  return {
    displayName: '',
    relationship: 'partner',
    ageGroup: '',
    allergies: '',
    dietaryRestrictions: '',
    dislikes: '',
    favorites: '',
    notes: '',
  }
}

function draftFromMember(member: HouseholdMember): HouseholdDraft {
  return {
    displayName: member.display_name,
    relationship: member.relationship,
    ageGroup: member.age_group ?? '',
    allergies: member.allergies.join(', '),
    dietaryRestrictions: member.dietary_restrictions.join(', '),
    dislikes: member.dislikes.join(', '),
    favorites: member.favorites.join(', '),
    notes: member.notes ?? '',
  }
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function requestHouseholdMutation<T extends { success: boolean; error?: string }>(
  clientId: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  payload: Record<string, unknown>,
  fallbackError: string
): Promise<T> {
  const response = await fetch(`/api/clients/${clientId}/household`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = (await response.json().catch(() => null)) as T | null
  if (!result) {
    return { success: false, error: fallbackError } as T
  }

  if (!response.ok && !result.error) {
    return { ...result, success: false, error: fallbackError }
  }

  return result
}

function setListValue(current: string, item: string): string {
  const values = parseList(current)
  const exists = values.some((value) => value.toLowerCase() === item.toLowerCase())
  const next = exists
    ? values.filter((value) => value.toLowerCase() !== item.toLowerCase())
    : [...values, item]
  return next.join(', ')
}

function summarize(members: HouseholdMember[]) {
  const allergySet = new Set<string>()
  const dietarySet = new Set<string>()
  let adultCount = 0
  let childCount = 0

  for (const member of members) {
    for (const allergy of member.allergies ?? []) allergySet.add(allergy)
    for (const dietary of member.dietary_restrictions ?? []) dietarySet.add(dietary)
    if (['infant', 'toddler', 'child', 'teen'].includes(member.age_group ?? '')) {
      childCount++
    } else {
      adultCount++
    }
  }

  return {
    allAllergies: [...allergySet].sort(),
    allDietary: [...dietarySet].sort(),
    adultCount,
    childCount,
  }
}

export function ClientHouseholdPanel({ clientId, household }: ClientHouseholdPanelProps) {
  const [members, setMembers] = useState<HouseholdMember[]>(household.members)
  const [draft, setDraft] = useState<HouseholdDraft>(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { allAllergies, allDietary, adultCount, childCount } = summarize(members)
  const countParts: string[] = []
  if (adultCount > 0) countParts.push(`${adultCount} adult${adultCount !== 1 ? 's' : ''}`)
  if (childCount > 0) countParts.push(`${childCount} child${childCount !== 1 ? 'ren' : ''}`)

  const allergyAttribution = allAllergies.map((allergy) => {
    const whoHas = members
      .filter((member) =>
        member.allergies.some(
          (memberAllergy) => memberAllergy.toLowerCase() === allergy.toLowerCase()
        )
      )
      .map((member) => member.display_name)
    return whoHas.length > 0 ? `${allergy} (${whoHas.join(', ')})` : allergy
  })

  const startAdd = () => {
    setDraft(emptyDraft())
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  const startEdit = (member: HouseholdMember) => {
    setDraft(draftFromMember(member))
    setEditingId(member.id)
    setShowForm(true)
    setError(null)
  }

  const cancelForm = () => {
    setDraft(emptyDraft())
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  const updateDraft = (field: keyof HouseholdDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const submitDraft = () => {
    if (!draft.displayName.trim()) {
      setError('Name is required')
      return
    }

    const payload = {
      clientId,
      displayName: draft.displayName.trim(),
      relationship: draft.relationship as any,
      ageGroup: (draft.ageGroup || null) as any,
      allergies: parseList(draft.allergies),
      dietaryRestrictions: parseList(draft.dietaryRestrictions),
      dislikes: parseList(draft.dislikes),
      favorites: parseList(draft.favorites),
      notes: draft.notes.trim() || null,
    }

    const previous = members
    setError(null)
    setIsSaving(true)

    void (async () => {
      try {
        const result = editingId
          ? await requestHouseholdMutation<HouseholdMutationResult>(
              clientId,
              'PATCH',
              { ...payload, memberId: editingId },
              'Could not save household member'
            )
          : await requestHouseholdMutation<HouseholdMutationResult>(
              clientId,
              'POST',
              payload,
              'Could not save household member'
            )

        if (!result.success || !result.member) {
          setMembers(previous)
          setError(result.error ?? 'Could not save household member')
          return
        }

        setMembers((current) =>
          editingId
            ? current.map((member) => (member.id === editingId ? result.member! : member))
            : [...current, result.member!]
        )
        cancelForm()
      } catch {
        setMembers(previous)
        setError('Could not save household member')
      } finally {
        setIsSaving(false)
      }
    })()
  }

  const removeMember = (memberId: string) => {
    if (!window.confirm('Remove this household member?')) return

    const previous = members
    setMembers((current) => current.filter((member) => member.id !== memberId))
    setError(null)
    setIsSaving(true)

    void (async () => {
      try {
        const result = await requestHouseholdMutation<HouseholdRemoveResult>(
          clientId,
          'DELETE',
          { memberId },
          'Could not remove household member'
        )
        if (!result.success) {
          setMembers(previous)
          setError(result.error ?? 'Could not remove household member')
        }
      } catch {
        setMembers(previous)
        setError('Could not remove household member')
      } finally {
        setIsSaving(false)
      }
    })()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Household</CardTitle>
            <p className="mt-1 text-xs text-stone-500">
              {countParts.length > 0
                ? `${countParts.join(', ')} in household`
                : 'No household members recorded'}
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={startAdd}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-700"
            >
              Add Member
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-300">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 text-red-300 underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {allAllergies.length > 0 && (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3">
            <p className="mb-1.5 text-xs font-semibold text-amber-400">Household Allergies</p>
            <p className="text-sm text-amber-200">{allergyAttribution.join(', ')}</p>
          </div>
        )}

        {allDietary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allDietary.map((dietary) => (
              <Badge key={dietary} variant="info">
                {dietary}
              </Badge>
            ))}
          </div>
        )}

        {members.length === 0 && !showForm && (
          <div className="rounded-lg border border-stone-700 bg-stone-800/40 px-4 py-6 text-center">
            <p className="text-sm text-stone-300">No household members recorded yet.</p>
            <p className="mt-1 text-xs text-stone-500">
              Add family members, assistants, or house staff so residency menus account for each
              person.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-lg border border-stone-700 bg-stone-800/40 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">
                      {member.display_name}
                    </span>
                    <span className="text-xs text-stone-500">
                      {RELATIONSHIP_LABEL[member.relationship] ?? member.relationship}
                      {member.age_group ? ` (${member.age_group})` : ''}
                    </span>
                  </div>

                  {(member.allergies.length > 0 ||
                    member.dietary_restrictions.length > 0 ||
                    member.dislikes.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {member.allergies.map((allergy) => (
                        <span
                          key={allergy}
                          className="rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-400"
                        >
                          {allergy}
                        </span>
                      ))}
                      {member.dietary_restrictions.map((dietary) => (
                        <span
                          key={dietary}
                          className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-400"
                        >
                          {dietary}
                        </span>
                      ))}
                      {member.dislikes.map((dislike) => (
                        <span
                          key={dislike}
                          className="rounded-full bg-stone-700 px-2 py-0.5 text-[10px] text-stone-400"
                        >
                          Dislikes: {dislike}
                        </span>
                      ))}
                    </div>
                  )}

                  {member.favorites.length > 0 && (
                    <p className="mt-1 text-[10px] text-stone-500">
                      Favorites: {member.favorites.join(', ')}
                    </p>
                  )}

                  {member.notes && (
                    <p className="mt-1 text-xs italic text-stone-500">
                      {member.notes.length > 150
                        ? `${member.notes.slice(0, 150)}...`
                        : member.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(member)}
                    className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    disabled={isSaving}
                    className="text-xs text-red-400 underline underline-offset-2 hover:text-red-300 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="rounded-lg border border-stone-700 bg-stone-900/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-200">
                {editingId ? 'Edit Household Member' : 'Add Household Member'}
              </p>
              <button
                type="button"
                onClick={cancelForm}
                className="text-xs text-stone-500 hover:text-stone-300"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={draft.displayName}
                onChange={(event) => updateDraft('displayName', event.target.value)}
                placeholder="Name"
                maxLength={100}
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <select
                value={draft.relationship}
                onChange={(event) => updateDraft('relationship', event.target.value)}
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {RELATIONSHIPS.map((relationship) => (
                  <option key={relationship.value} value={relationship.value}>
                    {relationship.label}
                  </option>
                ))}
              </select>
              <select
                value={draft.ageGroup}
                onChange={(event) => updateDraft('ageGroup', event.target.value)}
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {AGE_GROUPS.map((ageGroup) => (
                  <option key={ageGroup.value} value={ageGroup.value}>
                    {ageGroup.label}
                  </option>
                ))}
              </select>
              <input
                value={draft.notes}
                onChange={(event) => updateDraft('notes', event.target.value)}
                placeholder="Notes"
                maxLength={500}
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-amber-400">Allergies</p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {COMMON_ALLERGIES.map((allergy) => {
                    const selected = parseList(draft.allergies).some(
                      (item) => item.toLowerCase() === allergy.toLowerCase()
                    )
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() =>
                          updateDraft('allergies', setListValue(draft.allergies, allergy))
                        }
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          selected
                            ? 'bg-amber-900/60 text-amber-300 ring-1 ring-amber-700'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                        }`}
                      >
                        {allergy}
                      </button>
                    )
                  })}
                </div>
                <input
                  value={draft.allergies}
                  onChange={(event) => updateDraft('allergies', event.target.value)}
                  placeholder="Other allergies, comma separated"
                  className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-emerald-400">Dietary Restrictions</p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {COMMON_DIETARY.map((dietary) => {
                    const selected = parseList(draft.dietaryRestrictions).some(
                      (item) => item.toLowerCase() === dietary.toLowerCase()
                    )
                    return (
                      <button
                        key={dietary}
                        type="button"
                        onClick={() =>
                          updateDraft(
                            'dietaryRestrictions',
                            setListValue(draft.dietaryRestrictions, dietary)
                          )
                        }
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          selected
                            ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-700'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                        }`}
                      >
                        {dietary}
                      </button>
                    )
                  })}
                </div>
                <input
                  value={draft.dietaryRestrictions}
                  onChange={(event) => updateDraft('dietaryRestrictions', event.target.value)}
                  placeholder="Other restrictions, comma separated"
                  className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={draft.dislikes}
                  onChange={(event) => updateDraft('dislikes', event.target.value)}
                  placeholder="Dislikes, comma separated"
                  className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  value={draft.favorites}
                  onChange={(event) => updateDraft('favorites', event.target.value)}
                  placeholder="Favorites, comma separated"
                  className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={submitDraft}
                disabled={!draft.displayName.trim() || isSaving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
