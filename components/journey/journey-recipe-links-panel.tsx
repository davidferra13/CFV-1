'use client'

import { FormEvent, useMemo, useState, useTransition } from 'react'
import { CheckCircle2, Pencil, Plus, Repeat, Star, Trash2 } from 'lucide-react'
import {
  createChefJourneyRecipeLink,
  deleteChefJourneyRecipeLink,
  updateChefJourneyRecipeLink,
} from '@/lib/journey/actions'
import type { ChefJourneyEntry, ChefJourneyRecipeLink } from '@/lib/journey/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDisplayDate } from './helpers'

type RecipeOption = {
  id: string
  name: string
}

type RecipeLinkFormState = {
  entry_id: string
  recipe_id: string
  adaptation_notes: string
  outcome_notes: string
  outcome_rating: string
  first_tested_on: string
  would_repeat: boolean
}

const EMPTY_FORM: RecipeLinkFormState = {
  entry_id: '',
  recipe_id: '',
  adaptation_notes: '',
  outcome_notes: '',
  outcome_rating: '',
  first_tested_on: '',
  would_repeat: true,
}

function buildForm(link: ChefJourneyRecipeLink): RecipeLinkFormState {
  return {
    entry_id: link.entry_id || '',
    recipe_id: link.recipe_id,
    adaptation_notes: link.adaptation_notes,
    outcome_notes: link.outcome_notes,
    outcome_rating: link.outcome_rating !== null ? String(link.outcome_rating) : '',
    first_tested_on: link.first_tested_on || '',
    would_repeat: link.would_repeat,
  }
}

function sortRecipeLinks(items: ChefJourneyRecipeLink[]): ChefJourneyRecipeLink[] {
  return [...items].sort((a, b) => {
    const aDate = a.first_tested_on || ''
    const bDate = b.first_tested_on || ''
    const dateCompare = bDate.localeCompare(aDate)
    if (dateCompare !== 0) return dateCompare
    return b.created_at.localeCompare(a.created_at)
  })
}

function ratingLabel(value: number | null): string {
  if (value === null) return 'Not rated'
  return `${value}/5`
}

export function JourneyRecipeLinksPanel({
  journeyId,
  initialRecipeLinks,
  entries,
  recipeOptions,
  onRecipeLinksChange,
}: {
  journeyId: string
  initialRecipeLinks: ChefJourneyRecipeLink[]
  entries: ChefJourneyEntry[]
  recipeOptions: RecipeOption[]
  onRecipeLinksChange?: (recipeLinks: ChefJourneyRecipeLink[]) => void
}) {
  const [recipeLinks, setRecipeLinks] = useState<ChefJourneyRecipeLink[]>(
    sortRecipeLinks(initialRecipeLinks)
  )
  const [form, setForm] = useState<RecipeLinkFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(initialRecipeLinks.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const entryOptions = useMemo(
    () =>
      entries
        .map((entry) => ({
          id: entry.id,
          label: `${formatDisplayDate(entry.entry_date)} - ${entry.title}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [entries]
  )

  const entryLookup = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of entryOptions) map.set(option.id, option.label)
    return map
  }, [entryOptions])

  const recipeLookup = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of recipeOptions) map.set(option.id, option.name)
    return map
  }, [recipeOptions])

  const repeatCount = useMemo(
    () => recipeLinks.filter((link) => link.would_repeat).length,
    [recipeLinks]
  )
  const averageRating = useMemo(() => {
    const ratings = recipeLinks
      .map((link) => link.outcome_rating)
      .filter((rating): rating is number => rating !== null)
    if (ratings.length === 0) return null
    const total = ratings.reduce((sum, rating) => sum + rating, 0)
    return (total / ratings.length).toFixed(1)
  }, [recipeLinks])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        if (!form.recipe_id) {
          setError('Choose a recipe to link')
          return
        }

        const payload = {
          entry_id: form.entry_id || null,
          recipe_id: form.recipe_id,
          adaptation_notes: form.adaptation_notes,
          outcome_notes: form.outcome_notes,
          outcome_rating: form.outcome_rating ? Number(form.outcome_rating) : null,
          first_tested_on: form.first_tested_on || null,
          would_repeat: form.would_repeat,
        } as const

        if (editingId) {
          const result = await updateChefJourneyRecipeLink(editingId, payload)
          setRecipeLinks((prev) => {
            const next = sortRecipeLinks(
              prev.map((item) => (item.id === result.recipeLink.id ? result.recipeLink : item))
            )
            onRecipeLinksChange?.(next)
            return next
          })
        } else {
          const result = await createChefJourneyRecipeLink({
            journey_id: journeyId,
            ...payload,
          })
          setRecipeLinks((prev) => {
            const next = sortRecipeLinks([result.recipeLink, ...prev])
            onRecipeLinksChange?.(next)
            return next
          })
        }

        resetForm()
      } catch (linkError) {
        setError(linkError instanceof Error ? linkError.message : 'Failed to save recipe link')
      }
    })
  }

  const handleEdit = (link: ChefJourneyRecipeLink) => {
    setError(null)
    setEditingId(link.id)
    setForm(buildForm(link))
    setShowForm(true)
  }

  const handleDelete = (link: ChefJourneyRecipeLink) => {
    const confirmed = window.confirm('Delete this recipe progression record?')
    if (!confirmed) return

    setError(null)
    startTransition(async () => {
      try {
        await deleteChefJourneyRecipeLink(link.id)
        setRecipeLinks((prev) => {
          const next = prev.filter((existing) => existing.id !== link.id)
          onRecipeLinksChange?.(next)
          return next
        })
      } catch (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError.message : 'Failed to delete recipe link'
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {repeatCount}/{recipeLinks.length} marked worth repeating
          {averageRating ? ` | Avg rating ${averageRating}/5` : ''}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditingId(null)
            setForm(EMPTY_FORM)
            setShowForm((prev) => !prev)
          }}
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Hide Recipe Form' : 'Link Recipe'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-stone-700 rounded-lg p-4 space-y-4 bg-stone-800/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Recipe</label>
              <select
                value={form.recipe_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, recipe_id: event.target.value }))
                }
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
                required
              >
                <option value="">Select recipe</option>
                {recipeOptions.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Linked Entry (optional)
              </label>
              <select
                value={form.entry_id}
                onChange={(event) => setForm((prev) => ({ ...prev, entry_id: event.target.value }))}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {entryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="First Tested On"
              type="date"
              value={form.first_tested_on}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, first_tested_on: event.target.value }))
              }
            />
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Outcome Rating
              </label>
              <select
                value={form.outcome_rating}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, outcome_rating: event.target.value }))
                }
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value="">Not rated</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Needs work</option>
                <option value="3">3 - Solid</option>
                <option value="4">4 - Strong</option>
                <option value="5">5 - Exceptional</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Textarea
              label="Adaptation Notes"
              value={form.adaptation_notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, adaptation_notes: event.target.value }))
              }
              rows={3}
              placeholder="What changed from the original recipe?"
            />
            <Textarea
              label="Outcome Notes"
              value={form.outcome_notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, outcome_notes: event.target.value }))
              }
              rows={3}
              placeholder="How did service, flavor, and execution go?"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={form.would_repeat}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, would_repeat: event.target.checked }))
              }
              className="rounded border-stone-600"
            />
            I would repeat this recipe variation
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-950 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : editingId ? 'Update Link' : 'Link Recipe'}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {recipeLinks.length === 0 ? (
          <div className="border border-dashed border-stone-600 rounded-lg p-8 text-center text-sm text-stone-400">
            No recipe progression yet. Link recipes and rate how each adaptation performed.
          </div>
        ) : (
          recipeLinks.map((link) => (
            <div key={link.id} className="border border-stone-700 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={link.would_repeat ? 'success' : 'warning'}>
                      <Repeat className="w-3 h-3 mr-1" />
                      {link.would_repeat ? 'Repeat' : 'Rework'}
                    </Badge>
                    <Badge
                      variant={
                        link.outcome_rating && link.outcome_rating >= 4 ? 'success' : 'default'
                      }
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {ratingLabel(link.outcome_rating)}
                    </Badge>
                    {link.first_tested_on && (
                      <span className="text-xs text-stone-500">
                        Tested {formatDisplayDate(link.first_tested_on)}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-stone-100">
                    {link.recipe_name || recipeLookup.get(link.recipe_id) || 'Recipe'}
                  </p>
                  {link.entry_id && (
                    <p className="text-xs text-stone-500">
                      From entry: {entryLookup.get(link.entry_id) || 'Entry'}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(link)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-950"
                    onClick={() => handleDelete(link)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {link.adaptation_notes && (
                <div className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-stone-500">
                    Adaptation Notes
                  </p>
                  <p className="text-sm text-stone-300 mt-1 whitespace-pre-wrap">
                    {link.adaptation_notes}
                  </p>
                </div>
              )}

              {link.outcome_notes && (
                <div className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-stone-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Outcome Notes
                  </p>
                  <p className="text-sm text-stone-300 mt-1 whitespace-pre-wrap">
                    {link.outcome_notes}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
