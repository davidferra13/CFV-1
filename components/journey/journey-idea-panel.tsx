'use client'

import { FormEvent, useMemo, useState, useTransition } from 'react'
import { Lightbulb, Pencil, Plus, Trash2 } from '@/components/ui/icons'
import {
  createChefJourneyIdea,
  deleteChefJourneyIdea,
  updateChefJourneyIdea,
} from '@/lib/journey/actions'
import type {
  ChefJourneyEntry,
  ChefJourneyIdea,
  ChefJourneyIdeaArea,
  ChefJourneyIdeaStatus,
} from '@/lib/journey/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDisplayDate } from './helpers'

type RecipeOption = {
  id: string
  name: string
}

type IdeaFormState = {
  source_entry_id: string
  title: string
  concept_notes: string
  application_area: ChefJourneyIdeaArea
  status: ChefJourneyIdeaStatus
  priority: number
  expected_impact: string
  test_plan: string
  first_test_date: string
  adopted_on: string
  adopted_recipe_id: string
}

const STATUS_LABELS: Record<ChefJourneyIdeaStatus, string> = {
  backlog: 'Backlog',
  testing: 'Testing',
  adopted: 'Adopted',
  parked: 'Parked',
}

const STATUS_VARIANTS: Record<ChefJourneyIdeaStatus, 'default' | 'info' | 'success' | 'warning'> = {
  backlog: 'default',
  testing: 'info',
  adopted: 'success',
  parked: 'warning',
}

const AREA_LABELS: Record<ChefJourneyIdeaArea, string> = {
  menu: 'Menu',
  technique: 'Technique',
  service: 'Service',
  sourcing: 'Sourcing',
  team: 'Team',
  operations: 'Operations',
}

const EMPTY_FORM: IdeaFormState = {
  source_entry_id: '',
  title: '',
  concept_notes: '',
  application_area: 'menu',
  status: 'backlog',
  priority: 3,
  expected_impact: '',
  test_plan: '',
  first_test_date: '',
  adopted_on: '',
  adopted_recipe_id: '',
}

function buildForm(idea: ChefJourneyIdea): IdeaFormState {
  return {
    source_entry_id: idea.source_entry_id || '',
    title: idea.title,
    concept_notes: idea.concept_notes,
    application_area: idea.application_area,
    status: idea.status,
    priority: idea.priority,
    expected_impact: idea.expected_impact,
    test_plan: idea.test_plan,
    first_test_date: idea.first_test_date || '',
    adopted_on: idea.adopted_on || '',
    adopted_recipe_id: idea.adopted_recipe_id || '',
  }
}

function sortIdeas(ideas: ChefJourneyIdea[]): ChefJourneyIdea[] {
  return [...ideas].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return b.updated_at.localeCompare(a.updated_at)
  })
}

export function JourneyIdeaPanel({
  journeyId,
  initialIdeas,
  entries,
  recipeOptions,
  onIdeasChange,
}: {
  journeyId: string
  initialIdeas: ChefJourneyIdea[]
  entries: ChefJourneyEntry[]
  recipeOptions: RecipeOption[]
  onIdeasChange?: (ideas: ChefJourneyIdea[]) => void
}) {
  const [ideas, setIdeas] = useState<ChefJourneyIdea[]>(sortIdeas(initialIdeas))
  const [form, setForm] = useState<IdeaFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(initialIdeas.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingIdea, setDeletingIdea] = useState<ChefJourneyIdea | null>(null)

  const adoptedCount = useMemo(
    () => ideas.filter((idea) => idea.status === 'adopted').length,
    [ideas]
  )

  const entryOptions = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        label: `${formatDisplayDate(entry.entry_date)} - ${entry.title}`,
      })),
    [entries]
  )

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
        if (editingId) {
          const result = await updateChefJourneyIdea(editingId, {
            source_entry_id: form.source_entry_id || null,
            title: form.title,
            concept_notes: form.concept_notes,
            application_area: form.application_area,
            status: form.status,
            priority: form.priority,
            expected_impact: form.expected_impact,
            test_plan: form.test_plan,
            first_test_date: form.first_test_date || null,
            adopted_on: form.adopted_on || null,
            adopted_recipe_id: form.adopted_recipe_id || null,
          })

          setIdeas((prev) => {
            const next = sortIdeas(
              prev.map((idea) => (idea.id === result.idea.id ? result.idea : idea))
            )
            onIdeasChange?.(next)
            return next
          })
        } else {
          const result = await createChefJourneyIdea({
            journey_id: journeyId,
            source_entry_id: form.source_entry_id || null,
            title: form.title,
            concept_notes: form.concept_notes,
            application_area: form.application_area,
            status: form.status,
            priority: form.priority,
            expected_impact: form.expected_impact,
            test_plan: form.test_plan,
            first_test_date: form.first_test_date || null,
            adopted_on: form.adopted_on || null,
            adopted_recipe_id: form.adopted_recipe_id || null,
          })

          setIdeas((prev) => {
            const next = sortIdeas([result.idea, ...prev])
            onIdeasChange?.(next)
            return next
          })
        }

        resetForm()
      } catch (ideaError) {
        setError(ideaError instanceof Error ? ideaError.message : 'Failed to save journal idea')
      }
    })
  }

  const handleEdit = (idea: ChefJourneyIdea) => {
    setError(null)
    setEditingId(idea.id)
    setForm(buildForm(idea))
    setShowForm(true)
  }

  const handleDelete = (idea: ChefJourneyIdea) => {
    setDeletingIdea(idea)
  }

  const handleConfirmDelete = () => {
    if (!deletingIdea) return
    const idea = deletingIdea
    setDeletingIdea(null)

    setError(null)
    startTransition(async () => {
      try {
        await deleteChefJourneyIdea(idea.id)
        setIdeas((prev) => {
          const next = prev.filter((item) => item.id !== idea.id)
          onIdeasChange?.(next)
          return next
        })
      } catch (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError.message : 'Failed to delete journal idea'
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {adoptedCount}/{ideas.length} ideas adopted
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
          {showForm ? 'Hide Idea Form' : 'Add Idea'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-stone-700 rounded-lg p-4 space-y-4 bg-stone-800/50"
        >
          <Input
            label="Idea Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Area</label>
              <select
                value={form.application_area}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    application_area: event.target.value as ChefJourneyIdeaArea,
                  }))
                }
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                {Object.entries(AREA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as ChefJourneyIdeaStatus,
                  }))
                }
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, priority: Number(event.target.value) }))
                }
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value={1}>1 - Highest</option>
                <option value={2}>2 - High</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4 - Low</option>
                <option value={5}>5 - Someday</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Linked Entry (optional)
              </label>
              <select
                value={form.source_entry_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, source_entry_id: event.target.value }))
                }
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
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Linked Recipe (optional)
              </label>
              <select
                value={form.adopted_recipe_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, adopted_recipe_id: event.target.value }))
                }
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {recipeOptions.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Textarea
            label="Concept Notes"
            value={form.concept_notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, concept_notes: event.target.value }))
            }
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Textarea
              label="Expected Impact"
              value={form.expected_impact}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, expected_impact: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="Test Plan"
              value={form.test_plan}
              onChange={(event) => setForm((prev) => ({ ...prev, test_plan: event.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="First Test Date"
              type="date"
              value={form.first_test_date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, first_test_date: event.target.value }))
              }
            />
            <Input
              label="Adopted On"
              type="date"
              value={form.adopted_on}
              onChange={(event) => setForm((prev) => ({ ...prev, adopted_on: event.target.value }))}
            />
          </div>

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
              {isPending ? 'Saving...' : editingId ? 'Update Idea' : 'Add Idea'}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {ideas.length === 0 ? (
          <div className="border border-dashed border-stone-600 rounded-lg p-8 text-center text-sm text-stone-400">
            No ideas yet. Add your first post-trip idea.
          </div>
        ) : (
          ideas.map((idea) => (
            <div key={idea.id} className="border border-stone-700 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[idea.status]}>
                      {STATUS_LABELS[idea.status]}
                    </Badge>
                    <span className="text-xs rounded-full border border-stone-700 bg-stone-800 px-2 py-0.5 text-stone-400">
                      {AREA_LABELS[idea.application_area]}
                    </span>
                    <span className="text-xs rounded-full border border-stone-700 bg-stone-800 px-2 py-0.5 text-stone-400">
                      Priority {idea.priority}
                    </span>
                  </div>
                  <p className="font-semibold text-stone-100">{idea.title}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(idea)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-950"
                    onClick={() => handleDelete(idea)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {idea.concept_notes && (
                <p className="text-sm text-stone-300 whitespace-pre-wrap">{idea.concept_notes}</p>
              )}

              {idea.expected_impact && (
                <div className="rounded-md bg-stone-800 border border-stone-700 p-2.5 text-sm">
                  <p className="text-[11px] uppercase tracking-wide text-stone-500 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Expected Impact
                  </p>
                  <p className="text-stone-200 mt-1">{idea.expected_impact}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                <span>Created: {formatDisplayDate(idea.created_at)}</span>
                {idea.first_test_date && (
                  <span>First Test: {formatDisplayDate(idea.first_test_date)}</span>
                )}
                {idea.adopted_on && <span>Adopted: {formatDisplayDate(idea.adopted_on)}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={!!deletingIdea}
        title={`Delete idea "${deletingIdea?.title}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingIdea(null)}
      />
    </div>
  )
}
