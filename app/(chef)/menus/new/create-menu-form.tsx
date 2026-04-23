'use client'

// CreateMenuForm - Multi-step menu creation wizard
//
// Step 1: Menu metadata (name, description, cuisine, scene type, service style, guest count)
// Step 2: Course builder (starts with 1 course, add as many as needed)
// Step 3: Breakdown panel (post-submit analysis with recipe matching + cost)

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { SaveStateBadge } from '@/components/ui/save-state-badge'
import { DraftRestorePrompt } from '@/components/ui/draft-restore-prompt'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { MenuBreakdownPanel } from '@/components/menus/menu-breakdown-panel'
import { MenuAISuggestionsPanel } from '@/components/menus/menu-ai-suggestions-panel'
import { createMenuWithCourses } from '@/lib/menus/actions'
import { useDurableDraft } from '@/lib/drafts/use-durable-draft'
import { useUnsavedChangesGuard } from '@/lib/navigation/use-unsaved-changes-guard'
import { useIdempotentMutation } from '@/lib/offline/use-idempotent-mutation'
import { ValidationError } from '@/lib/errors/app-error'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'

// ─── Constants ────────────────────────────────────────────────────────────────

const SCENE_TYPES = [
  'Intimate Dinner',
  'Corporate Event',
  'Wedding',
  'Birthday/Celebration',
  'Holiday Dinner',
  'Outdoor/Garden',
  'Cocktail Reception',
  'Brunch',
  'Other',
]

const CUISINE_SUGGESTIONS = [
  'American',
  'Italian',
  'French',
  'Japanese',
  'Mediterranean',
  'Mexican',
  'Indian',
  'Thai',
  'Chinese',
  'Greek',
  'Spanish',
  'Middle Eastern',
  'Farm-to-Table',
  'Modern American',
  'Seasonal Local',
  'New American',
  'Pan-Asian',
  'Latin',
  'Nordic',
  'Fusion',
]

const COURSE_LABEL_SUGGESTIONS = [
  'Amuse-Bouche',
  'Canapés',
  'First Course',
  'Soup',
  'Salad',
  'Intermezzo',
  'Fish Course',
  'Main Course',
  'Cheese Course',
  'Pre-Dessert',
  'Dessert',
  'Petit Fours',
]

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'metadata' | 'courses' | 'breakdown'

type CourseRow = {
  localId: string
  label: string
  dishName: string
  description: string
}

type DraftData = {
  name: string
  description: string
  cuisine_type: string
  scene_type: string
  service_style: string
  guest_count: string
  notes: string
  season: string
  target_date: string
  courses: CourseRow[]
}

// Stable initial course ID avoids SSR/client hydration mismatch from crypto.randomUUID()
const INITIAL_COURSE: CourseRow = {
  localId: 'course-init-0',
  label: '',
  dishName: '',
  description: '',
}

function makeCourse(): CourseRow {
  // Only called client-side (after mount) so UUID is safe here
  return { localId: crypto.randomUUID(), label: '', dishName: '', description: '' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateMenuForm({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('metadata')
  const [error, setError] = useState('')

  // Metadata fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [sceneType, setSceneType] = useState('')
  const [serviceStyle, setServiceStyle] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [notes, setNotes] = useState('')
  const [season, setSeason] = useState('')
  const [targetDate, setTargetDate] = useState('')

  // Courses - use stable initial value to avoid hydration mismatch
  const [courses, setCourses] = useState<CourseRow[]>([INITIAL_COURSE])

  // Post-submit data for breakdown
  const [createdMenuId, setCreatedMenuId] = useState<string | null>(null)
  const [createdDishes, setCreatedDishes] = useState<any[]>([])

  const currentFormData = useMemo<DraftData>(
    () => ({
      name,
      description,
      cuisine_type: cuisineType,
      scene_type: sceneType,
      service_style: serviceStyle,
      guest_count: guestCount,
      notes,
      season,
      target_date: targetDate,
      courses,
    }),
    [
      name,
      description,
      cuisineType,
      sceneType,
      serviceStyle,
      guestCount,
      notes,
      season,
      targetDate,
      courses,
    ]
  )

  const initialFormData = useMemo<DraftData>(
    () => ({
      name: '',
      description: '',
      cuisine_type: '',
      scene_type: '',
      service_style: '',
      guest_count: '',
      notes: '',
      season: '',
      target_date: '',
      courses: [INITIAL_COURSE],
    }),
    []
  )

  const [committedFormData, setCommittedFormData] = useState<DraftData>(initialFormData)

  const createMutation = useIdempotentMutation<any, any>('menus/create-with-courses', {
    mutation: (input: any) => createMenuWithCourses(input.menuInput, input.courses) as any,
  })

  const durableDraft = useDurableDraft<DraftData>('menu-create-form', null, {
    schemaVersion: 2,
    tenantId,
    defaultData: initialFormData,
    debounceMs: 700,
  })

  const isDirty = useMemo(
    () => JSON.stringify(currentFormData) !== JSON.stringify(committedFormData),
    [committedFormData, currentFormData]
  )

  const unsavedGuard = useUnsavedChangesGuard({
    isDirty: isDirty && step !== 'breakdown',
    onSaveDraft: () => durableDraft.persistDraft(currentFormData, { immediate: true }),
    canSaveDraft: true,
    saveState: createMutation.saveState,
  })

  useEffect(() => {
    if (!isDirty || step === 'breakdown') return
    void durableDraft.persistDraft(currentFormData)
    if (createMutation.saveState.status === 'SAVED') {
      createMutation.markUnsaved()
    }
  }, [createMutation, currentFormData, durableDraft, isDirty, step])

  const applyFormData = (data: DraftData) => {
    setName(data.name)
    setDescription(data.description)
    setCuisineType(data.cuisine_type)
    setSceneType(data.scene_type ?? '')
    setServiceStyle(data.service_style)
    setGuestCount(data.guest_count ?? '')
    setNotes(data.notes ?? '')
    setSeason((data as any).season ?? '')
    setTargetDate((data as any).target_date ?? '')
    setCourses(
      Array.isArray(data.courses) && data.courses.length > 0 ? data.courses : [makeCourse()]
    )
  }

  // ─── Course manipulation ─────────────────────────────────────────────────

  function addCourse() {
    setCourses((prev) => [...prev, makeCourse()])
  }

  function removeCourse(localId: string) {
    setCourses((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((c) => c.localId !== localId)
    })
  }

  function updateCourse(localId: string, field: keyof Omit<CourseRow, 'localId'>, value: string) {
    setCourses((prev) => prev.map((c) => (c.localId === localId ? { ...c, [field]: value } : c)))
  }

  function moveCourse(index: number, direction: 'up' | 'down') {
    setCourses((prev) => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    setError('')

    if (!name.trim()) {
      setStep('metadata')
      setError('Menu name is required')
      return
    }

    startTransition(async () => {
      try {
        await durableDraft.persistDraft(currentFormData, { immediate: true })

        const mutationResult = await createMutation.mutate({
          menuInput: {
            name: name.trim(),
            description: description || undefined,
            cuisine_type: cuisineType || undefined,
            scene_type: sceneType || undefined,
            service_style: serviceStyle ? (serviceStyle as any) : undefined,
            target_guest_count: guestCount ? parseInt(guestCount, 10) : undefined,
            notes: notes || undefined,
            season: season ? (season as any) : undefined,
            target_date: targetDate || undefined,
          },
          courses: courses.map((c) => ({
            course_label: c.label || 'Course',
            dish_name: c.dishName || undefined,
            description: c.description || undefined,
          })),
        })

        if (mutationResult.queued) return

        const result = mutationResult.result as any

        if (result?.menu?.id) {
          // If any course failed to persist, block advancement and surface the failures.
          // Showing "Menu Created" with 0 persisted dishes is a spec violation.
          const courseErrors: string[] = result.courseErrors ?? []
          const expectedCourses = courses.filter((c) => c.label?.trim()).length
          const persistedCount = (result.dishes ?? []).length
          if (courseErrors.length > 0 || (expectedCourses > 0 && persistedCount === 0)) {
            const summary =
              courseErrors.length > 0
                ? `Some courses failed to save: ${courseErrors.join('; ')}`
                : 'Courses were not saved. Please try again.'
            throw new Error(summary)
          }
          setCreatedMenuId(result.menu.id)
          setCreatedDishes(result.dishes ?? [])
          setCommittedFormData(currentFormData)
          await durableDraft.clearDraft()
          setStep('breakdown')
        } else {
          throw new Error('Failed to create menu')
        }
      } catch (err: unknown) {
        const uiError = mapErrorToUI(err)
        setError(uiError.message)
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (step === 'breakdown' && createdMenuId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Menu Created</CardTitle>
        </CardHeader>
        <CardContent>
          <MenuBreakdownPanel
            menuId={createdMenuId}
            menuName={name}
            sceneType={sceneType || null}
            cuisineType={cuisineType || null}
            serviceStyle={serviceStyle || null}
            guestCount={guestCount ? parseInt(guestCount, 10) : null}
            dishes={createdDishes.map((d: any, i: number) => ({
              id: d.id,
              course_number: d.course_number ?? i + 1,
              course_name: d.course_name ?? courses[i]?.label ?? `Course ${i + 1}`,
              name: d.name ?? courses[i]?.dishName ?? null,
              dietary_tags: d.dietary_tags ?? [],
            }))}
            onOpenEditor={() => router.push(`/menus/${createdMenuId}/editor`)}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => step === 'courses' && setStep('metadata')}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            step === 'metadata'
              ? 'text-stone-100 font-medium'
              : 'text-stone-400 hover:text-stone-200 cursor-pointer'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 'metadata' ? 'bg-brand-500 text-white' : 'bg-stone-700 text-stone-400'
            }`}
          >
            1
          </span>
          Menu Details
        </button>
        <span className="text-stone-700 text-xs">--</span>
        <span
          className={`flex items-center gap-1.5 text-sm ${
            step === 'courses' ? 'text-stone-100 font-medium' : 'text-stone-600'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 'courses' ? 'bg-brand-500 text-white' : 'bg-stone-700 text-stone-600'
            }`}
          >
            2
          </span>
          Courses
        </span>
      </div>

      <div className="flex justify-end">
        <SaveStateBadge state={createMutation.saveState} onRetry={createMutation.retryLast} />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* ── Step 1: Metadata ── */}
      {step === 'metadata' && (
        <Card>
          <CardHeader>
            <CardTitle>Menu Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Menu Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Summer BBQ Menu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => void durableDraft.persistDraft(currentFormData, { immediate: true })}
                placeholder="Describe this menu..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Cuisine Type
                </label>
                <Input
                  type="text"
                  list="cuisine-suggestions"
                  value={cuisineType}
                  onChange={(e) => setCuisineType(e.target.value)}
                  placeholder="e.g., Italian, French"
                />
                <datalist id="cuisine-suggestions">
                  {CUISINE_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Scene</label>
                <select
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-md text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={sceneType}
                  onChange={(e) => setSceneType(e.target.value)}
                  aria-label="Scene type"
                >
                  <option value="">Select scene (optional)</option>
                  {SCENE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Service Style
                </label>
                <select
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-md text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={serviceStyle}
                  onChange={(e) => setServiceStyle(e.target.value)}
                  aria-label="Service style"
                >
                  <option value="">Select style (optional)</option>
                  <option value="plated">Plated</option>
                  <option value="family_style">Family Style</option>
                  <option value="buffet">Buffet</option>
                  <option value="cocktail">Cocktail / Passed</option>
                  <option value="stations">Stations</option>
                  <option value="tasting_menu">Tasting Menu</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Guest Count</label>
                <Input
                  type="number"
                  min="1"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  placeholder="e.g., 12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Season</label>
                <select
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-md text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  aria-label="Season"
                >
                  <option value="">Select season (optional)</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Target Date</label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  title="Target date for this menu"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this menu..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Courses ── */}
      {step === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Course builder - left */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Add Your Courses</CardTitle>
                <p className="text-sm text-stone-400 mt-1">
                  Every served item counts as a course. Start with one and add more as needed.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {courses.map((course, index) => (
                  <div
                    key={course.localId}
                    className="p-3 bg-stone-800/50 rounded-lg border border-stone-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                        Course {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveCourse(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-stone-600 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Move course up"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCourse(index, 'down')}
                          disabled={index === courses.length - 1}
                          className="p-1 text-stone-600 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Move course down"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCourse(course.localId)}
                          disabled={courses.length <= 1}
                          className="p-1 text-stone-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-1"
                          aria-label="Remove course"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Course Label</label>
                        <Input
                          type="text"
                          list={`course-labels-${course.localId}`}
                          value={course.label}
                          onChange={(e) => updateCourse(course.localId, 'label', e.target.value)}
                          placeholder="e.g., Main Course"
                          className="text-sm"
                        />
                        <datalist id={`course-labels-${course.localId}`}>
                          {COURSE_LABEL_SUGGESTIONS.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Dish Name</label>
                        <Input
                          type="text"
                          value={course.dishName}
                          onChange={(e) => updateCourse(course.localId, 'dishName', e.target.value)}
                          placeholder="e.g., Duck Breast"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-stone-500 mb-1">
                        Description (optional)
                      </label>
                      <Input
                        type="text"
                        value={course.description}
                        onChange={(e) =>
                          updateCourse(course.localId, 'description', e.target.value)
                        }
                        placeholder="Brief description..."
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCourse}
                  className="w-full py-2 px-4 border border-dashed border-stone-600 rounded-lg text-sm text-stone-400 hover:text-stone-200 hover:border-stone-400 transition-colors"
                >
                  + Add Course
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Live preview + AI suggestions - right */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Menu Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <p className="text-sm font-medium text-stone-200">{name || 'Untitled Menu'}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {[
                        courses.length > 0
                          ? `${courses.length} course${courses.length !== 1 ? 's' : ''}`
                          : null,
                        serviceStyle || null,
                        cuisineType || null,
                        sceneType || null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No details yet'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {courses.map((c, i) => (
                      <div key={c.localId} className="flex items-start gap-2 py-1 text-sm">
                        <span className="text-xs font-mono text-stone-600 w-4 flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          {c.label || c.dishName ? (
                            <>
                              {c.label && <span className="text-xs text-stone-500">{c.label}</span>}
                              {c.label && c.dishName && (
                                <span className="text-xs text-stone-700 mx-1">-</span>
                              )}
                              {c.dishName && <span className="text-stone-200">{c.dishName}</span>}
                            </>
                          ) : (
                            <span className="text-stone-700 italic text-xs">Empty course</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <MenuAISuggestionsPanel
                context={{
                  sceneType: sceneType || undefined,
                  cuisineType: cuisineType || undefined,
                  serviceStyle: serviceStyle || undefined,
                  guestCount: guestCount ? parseInt(guestCount, 10) : undefined,
                  season: season || undefined,
                  notes: notes || undefined,
                }}
                onApply={(newCourses) => setCourses(newCourses)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation buttons ── */}
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (step === 'metadata') {
              unsavedGuard.requestNavigation(() => router.back())
            } else {
              setStep('metadata')
            }
          }}
          disabled={isPending}
        >
          {step === 'metadata' ? 'Cancel' : 'Back'}
        </Button>

        {step === 'metadata' ? (
          <Button
            type="button"
            onClick={() => {
              if (!name.trim()) {
                setError('Menu name is required')
                return
              }
              setError('')
              setStep('courses')
            }}
          >
            Next: Add Courses
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} loading={isPending}>
            {isPending
              ? 'Creating...'
              : `Create Menu (${courses.length} course${courses.length !== 1 ? 's' : ''})`}
          </Button>
        )}
      </div>

      <DraftRestorePrompt
        open={durableDraft.showRestorePrompt}
        lastSavedAt={durableDraft.pendingDraft?.lastSavedAt ?? durableDraft.lastSavedAt}
        onRestore={() => {
          const restored = durableDraft.restoreDraft()
          if (restored) {
            applyFormData(restored)
          }
        }}
        onDiscard={() => void durableDraft.discardDraft()}
      />

      <UnsavedChangesDialog
        open={unsavedGuard.open}
        canSaveDraft={unsavedGuard.canSaveDraft}
        onStay={unsavedGuard.onStay}
        onLeave={unsavedGuard.onLeave}
        onSaveDraftAndLeave={() => void unsavedGuard.onSaveDraftAndLeave()}
      />
    </div>
  )
}
