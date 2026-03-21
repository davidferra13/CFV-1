'use client'

// SubstitutionManager - Add and manage personal ingredient substitutions.
// Chef can add their own substitutions beyond the system defaults.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { addSubstitution, deleteSubstitution } from '@/lib/ingredients/substitution-actions'
import type { Substitution } from '@/lib/ingredients/substitution-actions'
import { useRouter } from 'next/navigation'

interface SubstitutionManagerProps {
  personal: Substitution[]
}

export function SubstitutionManager({ personal }: SubstitutionManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [original, setOriginal] = useState('')
  const [substitute, setSubstitute] = useState('')
  const [ratio, setRatio] = useState('')
  const [notes, setNotes] = useState('')
  const [dietarySafeFor, setDietarySafeFor] = useState('')

  const handleAdd = () => {
    if (!original.trim() || !substitute.trim() || !ratio.trim()) {
      setError('Original, substitute, and ratio are all required')
      return
    }

    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        const result = await addSubstitution({
          original: original.trim(),
          substitute: substitute.trim(),
          ratio: ratio.trim(),
          notes: notes.trim() || undefined,
          dietarySafeFor: dietarySafeFor
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        })

        if (!result.success) {
          setError(result.error ?? 'Failed to add substitution')
          return
        }

        setSuccess(`Added: ${substitute} as substitute for ${original}`)
        setOriginal('')
        setSubstitute('')
        setRatio('')
        setNotes('')
        setDietarySafeFor('')
        setShowForm(false)
        router.refresh()
      } catch (err) {
        console.error('[SubstitutionManager] Add failed:', err)
        setError('Failed to save substitution')
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete substitution "${name}"?`)) return

    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteSubstitution(id)
        if (!result.success) {
          setError(result.error ?? 'Failed to delete')
          return
        }
        router.refresh()
      } catch (err) {
        console.error('[SubstitutionManager] Delete failed:', err)
        setError('Failed to delete substitution')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Feedback messages */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-xs text-emerald-300">{success}</p>
        </div>
      )}

      {/* Personal substitutions list */}
      {personal.length > 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 divide-y divide-stone-700">
          {personal.map((sub) => (
            <div key={sub.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-300">
                    {sub.original} → {sub.substitute}
                  </span>
                  <Badge variant="info">Personal</Badge>
                </div>
                <span className="text-xs text-stone-500 font-mono bg-stone-900 px-1.5 py-0.5 rounded inline-block">
                  {sub.ratio}
                </span>
                {sub.notes && <p className="text-xs text-stone-400">{sub.notes}</p>}
                {sub.dietary_safe_for && sub.dietary_safe_for.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sub.dietary_safe_for.map((diet) => (
                      <Badge key={diet} variant="success">
                        {diet}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => handleDelete(sub.id, `${sub.original} → ${sub.substitute}`)}
                disabled={isPending}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 text-center">
          <p className="text-sm text-stone-400">No personal substitutions yet.</p>
          <p className="text-xs text-stone-500 mt-1">
            Add your own when you discover a great swap.
          </p>
        </div>
      )}

      {/* Add form toggle */}
      {!showForm ? (
        <Button variant="secondary" onClick={() => setShowForm(true)}>
          + Add Personal Substitution
        </Button>
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-3">
          <h4 className="text-sm font-medium text-stone-200">Add Substitution</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Original Ingredient *</label>
              <input
                type="text"
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder="e.g., Heavy Cream"
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Substitute *</label>
              <input
                type="text"
                value={substitute}
                onChange={(e) => setSubstitute(e.target.value)}
                placeholder="e.g., Coconut Cream"
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Ratio *</label>
            <input
              type="text"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              placeholder="e.g., 1:1 or 3/4 cup per 1 cup"
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="When to use this substitute, any flavor differences..."
              rows={2}
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">
              Dietary Tags (comma-separated)
            </label>
            <input
              type="text"
              value={dietarySafeFor}
              onChange={(e) => setDietarySafeFor(e.target.value)}
              placeholder="e.g., vegan, dairy-free, gluten-free"
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="primary" onClick={handleAdd} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Substitution'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                setError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
