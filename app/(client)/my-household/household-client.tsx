'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Users2, AlertTriangle, X } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  addHouseholdMember,
  updateHouseholdMember,
  removeHouseholdMember,
} from '@/lib/household/client-household-actions'
import type { HouseholdMember } from '@/lib/household/client-household-actions'

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Kosher',
  'Halal',
  'Pescatarian',
  'Keto',
  'Paleo',
]

const RELATIONSHIP_OPTIONS = ['Spouse', 'Partner', 'Child', 'Parent', 'Sibling', 'Other']

type FormState = {
  display_name: string
  relationship: string
  age_group: string
  dietary_restrictions: string[]
  allergies: string[]
  notes: string
}

const EMPTY_FORM: FormState = {
  display_name: '',
  relationship: '',
  age_group: 'adult',
  dietary_restrictions: [],
  allergies: [],
  notes: '',
}

export function HouseholdClient({ initialMembers }: { initialMembers: HouseholdMember[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [allergyInput, setAllergyInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setAllergyInput('')
    setShowForm(true)
  }

  function openEdit(member: HouseholdMember) {
    setEditingId(member.id)
    setForm({
      display_name: member.display_name,
      relationship: member.relationship || '',
      age_group: member.age_group || 'adult',
      dietary_restrictions: member.dietary_restrictions || [],
      allergies: member.allergies || [],
      notes: member.notes || '',
    })
    setAllergyInput('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function toggleDietary(item: string) {
    setForm((prev) => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(item)
        ? prev.dietary_restrictions.filter((d) => d !== item)
        : [...prev.dietary_restrictions, item],
    }))
  }

  function addAllergy() {
    const trimmed = allergyInput.trim()
    if (trimmed && !form.allergies.includes(trimmed)) {
      setForm((prev) => ({ ...prev, allergies: [...prev.allergies, trimmed] }))
      setAllergyInput('')
    }
  }

  function removeAllergy(item: string) {
    setForm((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((a) => a !== item),
    }))
  }

  function handleSubmit() {
    if (!form.display_name.trim()) {
      toast.error('Name is required')
      return
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateHouseholdMember(editingId, form)
          toast.success(`Updated ${form.display_name}`)
        } else {
          await addHouseholdMember(form)
          toast.success(`Added ${form.display_name}`)
        }
        cancelForm()
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Something went wrong')
      }
    })
  }

  function handleRemove(member: HouseholdMember) {
    if (!confirm(`Remove ${member.display_name} from your household?`)) return

    startTransition(async () => {
      try {
        await removeHouseholdMember(member.id)
        toast.success(`Removed ${member.display_name}`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to remove')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <Card className="border-brand-600/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? 'Edit Member' : 'Add Household Member'}</CardTitle>
            <button
              type="button"
              onClick={cancelForm}
              className="text-stone-400 hover:text-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name + Relationship */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-stone-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                  className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="e.g. Sarah"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">Relationship</label>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm((p) => ({ ...p, relationship: e.target.value }))}
                  className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value="">Select...</option>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r} value={r.toLowerCase()}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dietary restrictions */}
            <div>
              <label className="block text-sm text-stone-400 mb-2">Dietary Restrictions</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((opt) => {
                  const active = form.dietary_restrictions.includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleDietary(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        active
                          ? 'bg-brand-600 text-white'
                          : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm text-stone-400 mb-2">Allergies</label>
              {form.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.allergies.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-950/50 text-red-300 border border-red-800/50"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => removeAllergy(a)}
                        className="hover:text-red-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addAllergy()
                    }
                  }}
                  className="flex-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="Type an allergy and press Enter"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-3 py-2 rounded-lg bg-stone-700 text-stone-300 text-sm hover:bg-stone-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-stone-400 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                placeholder="Any additional notes for the chef"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member cards */}
      {initialMembers.length === 0 && !showForm ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users2 className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-400">
              Add your household members so your chef knows everyone's dietary needs.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Member
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-100">{member.display_name}</h3>
                    {member.relationship && (
                      <Badge variant="info" className="mt-1">
                        {member.relationship}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(member)}
                      className="p-1.5 rounded text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(member)}
                      disabled={isPending}
                      className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dietary */}
                {member.dietary_restrictions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {member.dietary_restrictions.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded-full text-xs bg-stone-800 text-stone-300"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                {/* Allergies (red) */}
                {member.allergies?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {member.allergies.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-950/50 text-red-300 border border-red-800/50"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {member.notes && <p className="text-xs text-stone-500 mt-2">{member.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
