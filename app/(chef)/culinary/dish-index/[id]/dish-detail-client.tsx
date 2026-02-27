'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DISH_COURSE_LABELS,
  ROTATION_STATUSES,
  ROTATION_STATUS_LABELS,
  ROTATION_STATUS_COLORS,
  PREP_COMPLEXITIES,
  PLATING_DIFFICULTIES,
  SEASONS,
  type DishCourse,
  type RotationStatus,
} from '@/lib/menus/dish-index-constants'
import {
  updateDishIndexEntry,
  linkRecipeToDish,
  unlinkRecipeFromDish,
  archiveDish,
  addDishFeedback,
} from '@/lib/menus/dish-index-actions'

interface DishDetailClientProps {
  dish: Record<string, unknown>
  appearances: Array<Record<string, unknown>>
  feedback: Array<Record<string, unknown>>
  pairings: Array<{ dish: unknown; count: number }>
  recipes: Array<{ id: string; name: string; category: string }>
}

export function DishDetailClient({
  dish,
  appearances,
  feedback,
  pairings,
  recipes,
}: DishDetailClientProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [showRecipeLink, setShowRecipeLink] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState('')

  // Edit state
  const [editData, setEditData] = useState({
    rotation_status: dish.rotation_status as string,
    prep_complexity: (dish.prep_complexity as string) || '',
    plating_difficulty: (dish.plating_difficulty as string) || '',
    is_signature: dish.is_signature as boolean,
    can_prep_ahead: dish.can_prep_ahead as boolean | null,
    notes: (dish.notes as string) || '',
    season_affinity: (dish.season_affinity as string[]) || [],
  })

  // Feedback state
  const [feedbackData, setFeedbackData] = useState({
    rating: 5,
    client_reaction: '',
    execution_notes: '',
    would_serve_again: true,
  })

  const handleSave = useCallback(async () => {
    await updateDishIndexEntry(dish.id as string, editData)
    setEditing(false)
    router.refresh()
  }, [dish.id, editData, router])

  const handleLinkRecipe = useCallback(
    async (recipeId: string) => {
      await linkRecipeToDish(dish.id as string, recipeId)
      setShowRecipeLink(false)
      router.refresh()
    },
    [dish.id, router]
  )

  const handleUnlinkRecipe = useCallback(async () => {
    await unlinkRecipeFromDish(dish.id as string)
    router.refresh()
  }, [dish.id, router])

  const handleArchive = useCallback(async () => {
    await archiveDish(dish.id as string)
    router.push('/culinary/dish-index')
  }, [dish.id, router])

  const handleAddFeedback = useCallback(async () => {
    await addDishFeedback({
      dish_id: dish.id as string,
      ...feedbackData,
    })
    setShowFeedbackForm(false)
    setFeedbackData({
      rating: 5,
      client_reaction: '',
      execution_notes: '',
      would_serve_again: true,
    })
    router.refresh()
  }, [dish.id, feedbackData, router])

  const filteredRecipes = recipes.filter(
    (r) => !recipeSearch || r.name.toLowerCase().includes(recipeSearch.toLowerCase())
  )

  const courseLabel =
    DISH_COURSE_LABELS[dish.course as string as DishCourse] || (dish.course as string)
  const rotationColor =
    ROTATION_STATUS_COLORS[dish.rotation_status as string as RotationStatus] || ''
  const avgRating =
    feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + (f.rating as number), 0) / feedback.length).toFixed(1)
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/culinary/dish-index" className="text-stone-500 hover:text-stone-400 text-sm">
            Dish Index
          </Link>
          <span className="text-stone-700">/</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              {(dish.is_signature as boolean) && <span className="text-brand-400 text-xl">★</span>}
              <h1 className="text-3xl font-bold text-stone-100">{dish.name as string}</h1>
            </div>
            {dish.description && (
              <p className="text-stone-400 mt-1">{dish.description as string}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-medium bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
                {courseLabel}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rotationColor}`}>
                {ROTATION_STATUS_LABELS[dish.rotation_status as string as RotationStatus]}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit'}
            </Button>
            <Button variant="danger" size="sm" onClick={handleArchive}>
              Archive
            </Button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-stone-200">{dish.times_served as number}</p>
          <p className="text-xs text-stone-500">Times Served</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-stone-200">{avgRating || '—'}</p>
          <p className="text-xs text-stone-500">Avg Rating</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-sm font-medium text-stone-300">
            {dish.first_served
              ? new Date(dish.first_served as string).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </p>
          <p className="text-xs text-stone-500">First Served</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-sm font-medium text-stone-300">
            {dish.last_served
              ? new Date(dish.last_served as string).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </p>
          <p className="text-xs text-stone-500">Last Served</p>
        </Card>
      </div>

      {/* Edit panel */}
      {editing && (
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-stone-300">Edit Dish Properties</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Rotation Status</label>
              <select
                value={editData.rotation_status}
                onChange={(e) => setEditData({ ...editData, rotation_status: e.target.value })}
                className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-300"
              >
                {ROTATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ROTATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Prep Complexity</label>
              <select
                value={editData.prep_complexity}
                onChange={(e) => setEditData({ ...editData, prep_complexity: e.target.value })}
                className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-300"
              >
                <option value="">Not set</option>
                {PREP_COMPLEXITIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Plating Difficulty</label>
              <select
                value={editData.plating_difficulty}
                onChange={(e) => setEditData({ ...editData, plating_difficulty: e.target.value })}
                className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-300"
              >
                <option value="">Not set</option>
                {PLATING_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-stone-400">
                <input
                  type="checkbox"
                  checked={editData.is_signature}
                  onChange={(e) => setEditData({ ...editData, is_signature: e.target.checked })}
                  className="rounded"
                />
                Signature Dish
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-400">
                <input
                  type="checkbox"
                  checked={editData.can_prep_ahead ?? false}
                  onChange={(e) => setEditData({ ...editData, can_prep_ahead: e.target.checked })}
                  className="rounded"
                />
                Can Prep Ahead
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Season Affinity</label>
            <div className="flex gap-2">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const current = editData.season_affinity
                    setEditData({
                      ...editData,
                      season_affinity: current.includes(s)
                        ? current.filter((x) => x !== s)
                        : [...current, s],
                    })
                  }}
                  className={`text-xs px-3 py-1 rounded-full capitalize ${
                    editData.season_affinity.includes(s)
                      ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/50'
                      : 'bg-stone-800 text-stone-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Notes</label>
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-300 h-20 resize-y"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </Card>
      )}

      {/* Linked recipe */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Linked Recipe</h3>
        {dish.linked_recipe_id ? (
          <div className="flex items-center justify-between">
            <Link
              href={`/culinary/recipes/${(dish.recipes as { id: string })?.id || dish.linked_recipe_id}`}
              className="text-brand-400 hover:underline text-sm"
            >
              {(dish.recipes as { name: string })?.name || 'View Recipe'}
            </Link>
            <Button size="sm" variant="secondary" onClick={handleUnlinkRecipe}>
              Unlink
            </Button>
          </div>
        ) : (
          <div>
            {showRecipeLink ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Search recipes..."
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-200"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredRecipes.slice(0, 20).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleLinkRecipe(r.id)}
                      className="w-full text-left px-2 py-1.5 text-sm text-stone-300 hover:bg-stone-800 rounded"
                    >
                      {r.name}
                      <span className="text-stone-600 ml-2 text-xs">{r.category}</span>
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="secondary" onClick={() => setShowRecipeLink(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowRecipeLink(true)}>
                  Link Existing Recipe
                </Button>
                <Link href="/culinary/recipes/new">
                  <Button size="sm" variant="secondary">
                    Create New Recipe
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Appearance history */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-stone-300 mb-3">
          Appearance History ({appearances.length})
        </h3>
        {appearances.length === 0 ? (
          <p className="text-sm text-stone-600">No recorded appearances</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {appearances.map((a) => (
              <div
                key={a.id as string}
                className="flex items-center justify-between py-1.5 border-b border-stone-800 last:border-0"
              >
                <div>
                  {a.client_name && (
                    <span className="text-sm text-stone-300">{a.client_name as string}</span>
                  )}
                  {a.event_type && (
                    <span className="text-xs text-stone-600 ml-2">{a.event_type as string}</span>
                  )}
                  {a.variation_notes && (
                    <p className="text-xs text-stone-500 italic">{a.variation_notes as string}</p>
                  )}
                </div>
                <span className="text-xs text-stone-600">
                  {a.event_date ? new Date(a.event_date as string).toLocaleDateString() : 'No date'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pairings */}
      {pairings.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Common Pairings</h3>
          <div className="space-y-1">
            {pairings.map((p, i) => {
              const pairedDish = p.dish as Record<string, unknown> | null
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-1 border-b border-stone-800 last:border-0"
                >
                  <span className="text-sm text-stone-400">
                    {pairedDish ? (pairedDish.name as string) : 'Unknown'}
                  </span>
                  <span className="text-xs text-stone-600">{p.count}x together</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Feedback */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-300">Feedback ({feedback.length})</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
          >
            + Add Feedback
          </Button>
        </div>
        {showFeedbackForm && (
          <div className="mb-4 p-3 bg-stone-900/50 rounded-lg space-y-2">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-stone-500 block mb-1">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFeedbackData({ ...feedbackData, rating: n })}
                      className={`text-lg ${n <= feedbackData.rating ? 'text-brand-400' : 'text-stone-700'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-400">
                <input
                  type="checkbox"
                  checked={feedbackData.would_serve_again}
                  onChange={(e) =>
                    setFeedbackData({ ...feedbackData, would_serve_again: e.target.checked })
                  }
                  className="rounded"
                />
                Would serve again
              </label>
            </div>
            <input
              type="text"
              value={feedbackData.client_reaction}
              onChange={(e) =>
                setFeedbackData({ ...feedbackData, client_reaction: e.target.value })
              }
              placeholder="Client reaction (e.g., 'loved it', 'asked for seconds')"
              className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-300"
            />
            <input
              type="text"
              value={feedbackData.execution_notes}
              onChange={(e) =>
                setFeedbackData({ ...feedbackData, execution_notes: e.target.value })
              }
              placeholder="Execution notes (e.g., 'plating was perfect', 'slightly overcooked')"
              className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-300"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAddFeedback}>
                Save Feedback
              </Button>
            </div>
          </div>
        )}
        {feedback.length > 0 && (
          <div className="space-y-2">
            {feedback.map((f) => (
              <div key={f.id as string} className="py-2 border-b border-stone-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-brand-400">
                    {'★'.repeat(f.rating as number)}
                    {'☆'.repeat(5 - (f.rating as number))}
                  </span>
                  {f.would_serve_again === false && (
                    <span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded">
                      Would not serve again
                    </span>
                  )}
                </div>
                {f.client_reaction && (
                  <p className="text-xs text-stone-400 mt-1">
                    Client: {f.client_reaction as string}
                  </p>
                )}
                {f.execution_notes && (
                  <p className="text-xs text-stone-500 mt-0.5">{f.execution_notes as string}</p>
                )}
                <p className="text-[10px] text-stone-700 mt-1">
                  {new Date(f.created_at as string).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
