// Client Dietary Dashboard - comprehensive allergen/restriction view
// Safety-critical: never hides or minimizes allergen data.
// Sections: CRITICAL (Big 9), CAUTION (common), per-person breakdown,
// household matrix, dislikes, edit mode, print button.

'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  Check,
  Edit2,
  Printer,
  X,
  Plus,
  Trash2,
  Loader2,
  Info,
  Users,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HouseholdAllergenMatrix } from './household-allergen-matrix'
import { allergenShortName, ALL_ALLERGENS } from '@/lib/constants/allergens'
import {
  updateClientDietary,
  type ClientDietaryProfile,
  type AllergenMatrixEntry,
} from '@/lib/clients/dietary-dashboard-actions'

// ─── Props ───────────────────────────────────────────────────────────────────

interface DietaryDashboardProps {
  clientId: string
  profile: ClientDietaryProfile
  matrixData: {
    members: string[]
    matrix: AllergenMatrixEntry[]
  } | null
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DietaryDashboard({ clientId, profile, matrixData }: DietaryDashboardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Edit state
  const [editAllergies, setEditAllergies] = useState<string[]>(profile.client.allergies)
  const [editRestrictions, setEditRestrictions] = useState<string[]>(
    profile.client.dietaryRestrictions
  )
  const [editDislikes, setEditDislikes] = useState<string[]>(profile.client.dislikes)
  const [newAllergen, setNewAllergen] = useState('')
  const [newRestriction, setNewRestriction] = useState('')
  const [newDislike, setNewDislike] = useState('')

  const { householdSummary } = profile

  const handleStartEdit = useCallback(() => {
    setEditAllergies([...profile.client.allergies])
    setEditRestrictions([...profile.client.dietaryRestrictions])
    setEditDislikes([...profile.client.dislikes])
    setIsEditing(true)
  }, [profile.client])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(() => {
    const previous = {
      allergies: profile.client.allergies,
      dietaryRestrictions: profile.client.dietaryRestrictions,
      dislikes: profile.client.dislikes,
    }

    startTransition(async () => {
      try {
        await updateClientDietary(clientId, {
          allergies: editAllergies,
          dietaryRestrictions: editRestrictions,
          dislikes: editDislikes,
        })
        setIsEditing(false)
      } catch {
        // Rollback edit state to previous values
        setEditAllergies(previous.allergies)
        setEditRestrictions(previous.dietaryRestrictions)
        setEditDislikes(previous.dislikes)
        // Stay in edit mode so user sees the issue
      }
    })
  }, [clientId, editAllergies, editRestrictions, editDislikes, profile.client])

  const addItem = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    clearInput: (v: string) => void
  ) => {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
      clearInput('')
    }
  }

  const removeItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  const handlePrint = () => {
    window.print()
  }

  const lastUpdatedDate = profile.lastUpdated
    ? new Date(profile.lastUpdated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown'

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Dietary Profile</h2>
          <p className="text-xs text-zinc-500">Last updated: {lastUpdatedDate}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {!isEditing ? (
            <>
              <Button variant="ghost" onClick={handlePrint}>
                <Printer size={16} className="mr-1.5" />
                Print
              </Button>
              <Button variant="secondary" onClick={handleStartEdit}>
                <Edit2 size={16} className="mr-1.5" />
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} loading={isPending}>
                {isPending ? (
                  <Loader2 size={16} className="mr-1.5 animate-spin" />
                ) : (
                  <Check size={16} className="mr-1.5" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* CRITICAL - FDA Big 9 Section */}
      {householdSummary.criticalAllergens.length > 0 && (
        <Card className="border-red-500/30 bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <ShieldAlert size={18} weight="fill" />
              CRITICAL - FDA Big 9 Allergens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {householdSummary.criticalAllergens.map((allergen) => (
                <Badge key={allergen} variant="error">
                  <ShieldAlert size={12} weight="fill" className="mr-1" />
                  {allergenShortName(allergen)}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-red-400/70 mt-2">
              These allergens require mandatory labeling under US federal law (FALCPA + FASTER Act).
              Cross-contamination protocols required.
            </p>
          </CardContent>
        </Card>
      )}

      {/* CAUTION - Common Allergens Section */}
      {householdSummary.commonAllergens.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-400 flex items-center gap-2">
              <AlertTriangle size={18} />
              CAUTION - Additional Allergens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {householdSummary.commonAllergens.map((allergen) => (
                <Badge key={allergen} variant="warning">
                  {allergenShortName(allergen)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dietary Restrictions */}
      {householdSummary.allRestrictions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Info size={18} />
              Dietary Restrictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {householdSummary.allRestrictions.map((r) => (
                <Badge key={r} variant="info">
                  {r}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Person Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Users size={18} />
            Per-Person Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client */}
          <PersonBreakdown
            name={profile.client.name}
            label="Client"
            allergies={isEditing ? editAllergies : profile.client.allergies}
            restrictions={isEditing ? editRestrictions : profile.client.dietaryRestrictions}
            isEditing={isEditing}
            onRemoveAllergy={(i) => removeItem(editAllergies, setEditAllergies, i)}
            onRemoveRestriction={(i) => removeItem(editRestrictions, setEditRestrictions, i)}
          />

          {/* Guests */}
          {profile.guests.map((guest) => (
            <PersonBreakdown
              key={guest.name}
              name={guest.name}
              label={guest.relationship}
              allergies={guest.allergies}
              restrictions={guest.dietaryRestrictions}
              isEditing={false}
            />
          ))}

          {profile.guests.length === 0 && (
            <p className="text-xs text-zinc-500">No guest dietary data recorded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Mode: Add items */}
      {isEditing && (
        <Card className="border-brand-500/30 print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-brand-400">
              Edit Client Dietary Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Allergen */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Add Allergen</label>
              <div className="flex gap-2">
                <select
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200"
                >
                  <option value="">Select allergen...</option>
                  {ALL_ALLERGENS.filter((a) => !editAllergies.includes(a)).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  onClick={() =>
                    addItem(editAllergies, setEditAllergies, newAllergen, setNewAllergen)
                  }
                  disabled={!newAllergen}
                >
                  <Plus size={16} />
                </Button>
              </div>
              {/* Custom allergen input */}
              <input
                type="text"
                placeholder="Or type a custom allergen..."
                className="mt-1.5 w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addItem(editAllergies, setEditAllergies, e.currentTarget.value, () => {
                      e.currentTarget.value = ''
                    })
                  }
                }}
              />
            </div>

            {/* Add Restriction */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Add Dietary Restriction</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRestriction}
                  onChange={(e) => setNewRestriction(e.target.value)}
                  placeholder="e.g. Vegetarian, Keto, Halal..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addItem(
                        editRestrictions,
                        setEditRestrictions,
                        newRestriction,
                        setNewRestriction
                      )
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() =>
                    addItem(
                      editRestrictions,
                      setEditRestrictions,
                      newRestriction,
                      setNewRestriction
                    )
                  }
                  disabled={!newRestriction.trim()}
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            {/* Add Dislike */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">
                Add Dislike (preference, not safety)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDislike}
                  onChange={(e) => setNewDislike(e.target.value)}
                  placeholder="e.g. Cilantro, Olives..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addItem(editDislikes, setEditDislikes, newDislike, setNewDislike)
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() => addItem(editDislikes, setEditDislikes, newDislike, setNewDislike)}
                  disabled={!newDislike.trim()}
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            {/* Current dislikes */}
            {editDislikes.length > 0 && (
              <div>
                <p className="text-xs text-zinc-400 mb-1">Current dislikes:</p>
                <div className="flex flex-wrap gap-1.5">
                  {editDislikes.map((d, i) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-700 text-zinc-300"
                    >
                      {d}
                      <button
                        onClick={() => removeItem(editDislikes, setEditDislikes, i)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Household Matrix */}
      {matrixData && matrixData.matrix.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-300">
              Household Allergen Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HouseholdAllergenMatrix members={matrixData.members} matrix={matrixData.matrix} />
          </CardContent>
        </Card>
      )}

      {/* Dislikes (not safety, just preferences) */}
      {!isEditing && profile.client.dislikes.length > 0 && (
        <Card className="border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
              Dislikes (preferences, not safety)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.client.dislikes.map((d) => (
                <Badge key={d} variant="default">
                  {d}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              These are taste preferences. Accommodate when possible, but they are not safety
              concerns.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No allergens at all */}
      {householdSummary.allAllergens.length === 0 &&
        householdSummary.allRestrictions.length === 0 && (
          <Card className="border-green-500/20 bg-green-950/10">
            <CardContent className="py-6 text-center">
              <Check size={24} className="text-green-400 mx-auto mb-2" weight="bold" />
              <p className="text-sm text-green-400 font-medium">
                No allergens or restrictions recorded
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Always confirm directly with the client before cooking.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  )
}

// ─── PersonBreakdown Sub-component ───────────────────────────────────────────

function PersonBreakdown({
  name,
  label,
  allergies,
  restrictions,
  isEditing = false,
  onRemoveAllergy,
  onRemoveRestriction,
}: {
  name: string
  label: string
  allergies: string[]
  restrictions: string[]
  isEditing?: boolean
  onRemoveAllergy?: (index: number) => void
  onRemoveRestriction?: (index: number) => void
}) {
  const hasData = allergies.length > 0 || restrictions.length > 0

  return (
    <div className="border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-medium text-zinc-200">{name}</span>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{label}</span>
      </div>

      {!hasData && <p className="text-xs text-zinc-500">No allergens or restrictions.</p>}

      {allergies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {allergies.map((a, i) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20"
            >
              {allergenShortName(a)}
              {isEditing && onRemoveAllergy && (
                <button
                  onClick={() => onRemoveAllergy(i)}
                  className="text-red-400/60 hover:text-red-300"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {restrictions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {restrictions.map((r, i) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20"
            >
              {r}
              {isEditing && onRemoveRestriction && (
                <button
                  onClick={() => onRemoveRestriction(i)}
                  className="text-brand-400/60 hover:text-brand-300"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
