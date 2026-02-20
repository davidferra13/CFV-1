'use client'

// Event Debrief Client Component
// Multi-section fill-in-the-blanks form. Each section saves independently.
// Sections only appear when there are actual blanks to fill.

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EventPhotoGallery } from '@/components/events/event-photo-gallery'
import type { EventPhoto } from '@/lib/events/photo-actions'
import type { DebriefBlanks } from '@/lib/events/debrief-actions'
import {
  saveClientInsights,
  saveRecipeDebrief,
  saveDebriefReflection,
  completeDebrief,
  generateDebriefDraft,
} from '@/lib/events/debrief-actions'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  eventId: string
  blanks: DebriefBlanks
  initialPhotos: EventPhoto[]
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  subtitle,
  saved,
  children,
}: {
  icon: string
  title: string
  subtitle?: string
  saved?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl" aria-hidden="true">{icon}</span>
          <div>
            <span className="font-semibold text-stone-900">{title}</span>
            {subtitle && (
              <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
              Saved
            </span>
          )}
          <span className="text-stone-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-stone-100">
          {children}
        </div>
      )}
    </Card>
  )
}

// ─── Star rating input ────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          className={`text-2xl transition-colors ${
            n <= display ? 'text-amber-400' : 'text-stone-200'
          }`}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          &#9733;
        </button>
      ))}
    </div>
  )
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-700 rounded-full px-2.5 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="text-stone-400 hover:text-red-500 ml-0.5"
              aria-label={`Remove ${tag}`}
            >
              &#x2715;
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder={placeholder || 'Type and press Enter'}
          className="flex-1 text-sm border border-stone-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button type="button" size="sm" variant="secondary" onClick={commit}>
          Add
        </Button>
      </div>
    </div>
  )
}

// ─── Inline save feedback ─────────────────────────────────────────────────────

function SaveFeedback({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null
  const map = {
    saving: 'Saving...',
    saved: '✓ Saved',
    error: 'Failed to save — try again',
  }
  const colorMap = {
    saving: 'text-stone-500',
    saved: 'text-emerald-600',
    error: 'text-red-600',
  }
  return (
    <span className={`text-xs ${colorMap[state as keyof typeof colorMap]}`}>
      {map[state as keyof typeof map]}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventDebriefClient({ eventId, blanks, initialPhotos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Section: Photos ───────────────────────────────────────────────────────

  // ── Section: Recipes ──────────────────────────────────────────────────────
  const [recipeSaveStates, setRecipeSaveStates] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})
  const [recipeDrafts, setRecipeDrafts] = useState<Record<string, {
    notes: string
    method_detailed: string
    prep_time_minutes: string
    cook_time_minutes: string
  }>>(() => {
    const init: Record<string, { notes: string; method_detailed: string; prep_time_minutes: string; cook_time_minutes: string }> = {}
    for (const r of blanks.recipes) {
      init[r.id] = { notes: '', method_detailed: '', prep_time_minutes: '', cook_time_minutes: '' }
    }
    return init
  })

  const saveRecipe = useCallback(async (recipeId: string) => {
    setRecipeSaveStates((s) => ({ ...s, [recipeId]: 'saving' }))
    const draft = recipeDrafts[recipeId]
    const result = await saveRecipeDebrief(eventId, recipeId, {
      notes: draft.notes || undefined,
      method_detailed: draft.method_detailed || undefined,
      prep_time_minutes: draft.prep_time_minutes !== '' ? parseInt(draft.prep_time_minutes, 10) : undefined,
      cook_time_minutes: draft.cook_time_minutes !== '' ? parseInt(draft.cook_time_minutes, 10) : undefined,
    })
    setRecipeSaveStates((s) => ({ ...s, [recipeId]: result.success ? 'saved' : 'error' }))
    if (result.success) {
      setTimeout(
        () => setRecipeSaveStates((s) => ({ ...s, [recipeId]: 'idle' })),
        2000
      )
    }
  }, [eventId, recipeDrafts])

  // ── Section: Client insights ──────────────────────────────────────────────
  const [clientSaveState, setClientSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [milestones, setMilestones] = useState<{ type: string; date: string; description: string }[]>([])
  const [newMilestone, setNewMilestone] = useState({ type: 'birthday', date: '', description: '' })
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [preferredName, setPreferredName] = useState('')
  const [vibeNotes, setVibeNotes] = useState('')
  const [qaAnswers, setQaAnswers] = useState<Record<string, string>>({})

  const saveClient = async () => {
    if (!blanks.client) return
    setClientSaveState('saving')

    const data: Parameters<typeof saveClientInsights>[2] = {}
    if (blanks.client.missingMilestones && milestones.length > 0) {
      data.personal_milestones = milestones
    }
    if (blanks.client.missingDietaryInfo && (dietaryRestrictions.length > 0 || allergies.length > 0)) {
      data.dietary_restrictions = dietaryRestrictions
      data.allergies = allergies
    }
    if (blanks.client.missingPreferredName && preferredName.trim()) {
      data.preferred_name = preferredName.trim()
    }
    if (blanks.client.missingVibeNotes && vibeNotes.trim()) {
      data.vibe_notes = vibeNotes.trim()
    }
    const filledQA = Object.fromEntries(
      Object.entries(qaAnswers).filter(([, v]) => v.trim())
    )
    if (Object.keys(filledQA).length > 0) {
      data.fun_qa_answers = filledQA
    }

    const result = await saveClientInsights(eventId, blanks.client.id, data)
    setClientSaveState(result.success ? 'saved' : 'error')
  }

  // ── Section: Reflection ───────────────────────────────────────────────────
  const [reflectionSaveState, setReflectionSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [rating, setRating] = useState<number | null>(blanks.event.chefOutcomeRating ?? null)
  const [outcomeNotes, setOutcomeNotes] = useState(blanks.event.chefOutcomeNotes ?? '')
  const [draftState, setDraftState] = useState<'idle' | 'loading' | 'error'>('idle')

  const handleAIDraft = async () => {
    if (outcomeNotes.trim()) return // don't overwrite existing notes
    setDraftState('loading')
    const result = await generateDebriefDraft(eventId)
    if ('draft' in result) {
      setOutcomeNotes(result.draft)
      setDraftState('idle')
    } else {
      setDraftState('error')
      setTimeout(() => setDraftState('idle'), 3000)
    }
  }

  const saveReflection = async (patch: { chef_outcome_notes?: string; chef_outcome_rating?: number }) => {
    setReflectionSaveState('saving')
    const result = await saveDebriefReflection(eventId, patch)
    setReflectionSaveState(result.success ? 'saved' : 'error')
    setTimeout(() => setReflectionSaveState('idle'), 2000)
  }

  const handleStarChange = (v: number) => {
    setRating(v)
    saveReflection({ chef_outcome_rating: v })
  }

  // ── Complete debrief ──────────────────────────────────────────────────────
  const [completeError, setCompleteError] = useState<string | null>(null)
  const handleComplete = () => {
    startTransition(async () => {
      const result = await completeDebrief(eventId)
      if (result.success) {
        router.push(`/events/${eventId}`)
      } else {
        setCompleteError(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Section 1: Dish Gallery ─────────────────────────────────────────── */}
      <Section
        icon="📸"
        title="Dish Gallery"
        subtitle="Upload photos of what you plated tonight"
        saved={initialPhotos.length > 0}
      >
        <div className="mt-4">
          <EventPhotoGallery eventId={eventId} initialPhotos={initialPhotos} />
        </div>
      </Section>

      {/* ── Section 2: Recipe Notes ─────────────────────────────────────────── */}
      {blanks.recipes.length > 0 && (
        <Section
          icon="🍽️"
          title="Recipe Notes"
          subtitle={`${blanks.recipes.length} recipe${blanks.recipes.length !== 1 ? 's' : ''} with missing details`}
        >
          <div className="mt-4 space-y-6">
            {blanks.recipes.map((recipe) => {
              const draft = recipeDrafts[recipe.id] ?? { notes: '', method_detailed: '', prep_time_minutes: '', cook_time_minutes: '' }
              const saveState = recipeSaveStates[recipe.id] ?? 'idle'

              return (
                <div key={recipe.id} className="border border-stone-100 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-stone-900">{recipe.name}</p>
                      <p className="text-xs text-stone-400 capitalize">{recipe.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <SaveFeedback state={saveState} />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => saveRecipe(recipe.id)}
                        disabled={saveState === 'saving'}
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  {recipe.missingNotes && (
                    <div>
                      <label className="text-xs font-medium text-stone-500">Notes from tonight</label>
                      <textarea
                        rows={3}
                        value={draft.notes}
                        onChange={(e) =>
                          setRecipeDrafts((s) => ({
                            ...s,
                            [recipe.id]: { ...s[recipe.id], notes: e.target.value },
                          }))
                        }
                        placeholder="What worked, what surprised you, what you'd change..."
                        className="mt-1 w-full text-sm border border-stone-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                      />
                    </div>
                  )}

                  {recipe.missingDetailedMethod && (
                    <div>
                      <label className="text-xs font-medium text-stone-500">Detailed method</label>
                      <textarea
                        rows={4}
                        value={draft.method_detailed}
                        onChange={(e) =>
                          setRecipeDrafts((s) => ({
                            ...s,
                            [recipe.id]: { ...s[recipe.id], method_detailed: e.target.value },
                          }))
                        }
                        placeholder="Full step-by-step method..."
                        className="mt-1 w-full text-sm border border-stone-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                      />
                    </div>
                  )}

                  {recipe.missingTimes && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-stone-500">Prep time (min)</label>
                        <input
                          type="number"
                          min={0}
                          value={draft.prep_time_minutes}
                          onChange={(e) =>
                            setRecipeDrafts((s) => ({
                              ...s,
                              [recipe.id]: { ...s[recipe.id], prep_time_minutes: e.target.value },
                            }))
                          }
                          className="mt-1 w-full text-sm border border-stone-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-stone-500">Cook time (min)</label>
                        <input
                          type="number"
                          min={0}
                          value={draft.cook_time_minutes}
                          onChange={(e) =>
                            setRecipeDrafts((s) => ({
                              ...s,
                              [recipe.id]: { ...s[recipe.id], cook_time_minutes: e.target.value },
                            }))
                          }
                          className="mt-1 w-full text-sm border border-stone-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Section 3: Client Insights ──────────────────────────────────────── */}
      {blanks.client?.hasAnyBlanks && (
        <Section
          icon="👤"
          title="Client Insights"
          subtitle={`What did you learn about ${blanks.client.name} tonight?`}
          saved={clientSaveState === 'saved'}
        >
          <div className="mt-4 space-y-5">

            {blanks.client.missingMilestones && (
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Birthdays &amp; Anniversaries
                </label>
                <p className="text-xs text-stone-400 mt-0.5 mb-2">
                  Did you notice a calendar, get a hint, or learn about a special date?
                </p>

                {milestones.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-stone-50 rounded-md px-3 py-2">
                        <span>
                          <span className="font-medium capitalize">{m.type}</span>
                          {m.date && <span className="text-stone-500"> &middot; {m.date}</span>}
                          {m.description && <span className="text-stone-500"> &middot; {m.description}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMilestones((ms) => ms.filter((_, j) => j !== i))}
                          className="text-stone-300 hover:text-red-500 text-xs ml-2"
                        >
                          &#x2715;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newMilestone.type}
                    onChange={(e) => setNewMilestone((m) => ({ ...m, type: e.target.value }))}
                    className="text-sm border border-stone-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="birthday">Birthday</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="text"
                    value={newMilestone.date}
                    onChange={(e) => setNewMilestone((m) => ({ ...m, date: e.target.value }))}
                    placeholder="e.g. March 15"
                    className="text-sm border border-stone-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone((m) => ({ ...m, description: e.target.value }))}
                    placeholder="Note (optional)"
                    className="text-sm border border-stone-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => {
                    if (newMilestone.date || newMilestone.description) {
                      setMilestones((ms) => [...ms, { ...newMilestone }])
                      setNewMilestone({ type: 'birthday', date: '', description: '' })
                    }
                  }}
                >
                  Add milestone
                </Button>
              </div>
            )}

            {blanks.client.missingDietaryInfo && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Dietary Restrictions
                  </label>
                  <p className="text-xs text-stone-400 mt-0.5 mb-2">
                    Did anyone mention they don&#39;t eat something?
                  </p>
                  <TagInput
                    value={dietaryRestrictions}
                    onChange={setDietaryRestrictions}
                    placeholder="e.g. vegetarian, gluten-free..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Allergies
                  </label>
                  <p className="text-xs text-stone-400 mt-0.5 mb-2">
                    Any allergies that came up?
                  </p>
                  <TagInput
                    value={allergies}
                    onChange={setAllergies}
                    placeholder="e.g. shellfish, tree nuts..."
                  />
                </div>
              </div>
            )}

            {blanks.client.missingPreferredName && (
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Preferred Name / Nickname
                </label>
                <p className="text-xs text-stone-400 mt-0.5 mb-2">
                  What do they go by?
                </p>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g. Mike, Ellie..."
                  className="w-full text-sm border border-stone-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {blanks.client.missingVibeNotes && (
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Client Vibe
                </label>
                <p className="text-xs text-stone-400 mt-0.5 mb-2">
                  Personality, energy, how they interact &#8212; good for future reference.
                </p>
                <textarea
                  rows={3}
                  value={vibeNotes}
                  onChange={(e) => setVibeNotes(e.target.value)}
                  placeholder="e.g. Very relaxed, love chatting with the chef, ask lots of questions about the sourcing..."
                  className="w-full text-sm border border-stone-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            )}

            {blanks.client.missingFunQA.length > 0 && (
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Personality Notes
                </label>
                <p className="text-xs text-stone-400 mt-0.5 mb-3">
                  Did any of these come up in conversation? Answer what you can.
                </p>
                <div className="space-y-3">
                  {blanks.client.missingFunQA.slice(0, 4).map((q) => (
                    <div key={q.questionKey}>
                      <label className="text-xs text-stone-600 font-medium">
                        {q.emoji} {q.questionText}
                      </label>
                      <textarea
                        rows={2}
                        value={qaAnswers[q.questionKey] ?? ''}
                        onChange={(e) =>
                          setQaAnswers((a) => ({ ...a, [q.questionKey]: e.target.value }))
                        }
                        placeholder="Leave blank to skip"
                        className="mt-1 w-full text-sm border border-stone-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <SaveFeedback state={clientSaveState} />
              <Button onClick={saveClient} disabled={clientSaveState === 'saving'}>
                Save Client Insights
              </Button>
            </div>
          </div>
        </Section>
      )}

      {/* ── Section 4: Reflection ────────────────────────────────────────────── */}
      <Section
        icon="💭"
        title="How did it go?"
        subtitle="Your private reflection on tonight's dinner"
        saved={reflectionSaveState === 'saved'}
      >
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Overall rating
            </label>
            <div className="mt-2">
              <StarRating value={rating} onChange={handleStarChange} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Notes to self
              </label>
              {!outcomeNotes.trim() && (
                <button
                  type="button"
                  onClick={handleAIDraft}
                  disabled={draftState === 'loading'}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {draftState === 'loading' ? (
                    <>⏳ Drafting...</>
                  ) : draftState === 'error' ? (
                    <span className="text-red-500">Try again</span>
                  ) : (
                    <>✨ Draft with AI</>
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-0.5 mb-2">
              What stood out? What would you do differently next time?
            </p>
            <textarea
              rows={4}
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              onBlur={() => {
                if (outcomeNotes !== blanks.event.chefOutcomeNotes) {
                  saveReflection({ chef_outcome_notes: outcomeNotes })
                }
              }}
              placeholder="Timing was tight on the third course. The client loved the saffron. Remember to bring the hand blender next time..."
              className="w-full text-sm border border-stone-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <SaveFeedback state={reflectionSaveState} />
          </div>
        </div>
      </Section>

      {/* ── Complete debrief ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 pt-2">
        {completeError && (
          <p className="text-sm text-red-600">{completeError}</p>
        )}

        {blanks.event.debriefCompletedAt ? (
          <p className="text-sm text-green-700 font-medium">
            &#10003; Debrief marked complete. You can still edit any section above.
          </p>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? 'Saving...' : 'Complete Debrief'}
          </Button>
        )}

        <p className="text-xs text-stone-400 text-center max-w-sm">
          You can always come back and add more later.
        </p>
      </div>
    </div>
  )
}
