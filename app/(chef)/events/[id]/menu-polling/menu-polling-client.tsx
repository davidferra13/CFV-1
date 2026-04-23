'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  createDinnerCircleMenuPollIteration,
  type DinnerCircleMenuPollingState,
} from '@/lib/hub/menu-poll-actions'
import type { MenuPollType } from '@/lib/hub/menu-polling-core'

type CanonicalDishSummary = {
  id: string
  name: string
  course: string | null
  description: string | null
  dietary_tags: string[] | null
  allergen_flags: string[] | null
  linked_recipe_id: string | null
}

type DraftCourse = {
  id: string
  courseName: string
  question: string
  pollType: MenuPollType
  allowOptOut: boolean
  maxSelections: string
  dishIndexIds: string[]
  search: string
}

interface EventMenuPollingClientProps {
  eventId: string
  groupToken: string | null
  initialState: DinnerCircleMenuPollingState | null
  initialCourseCount: number
  dishes: CanonicalDishSummary[]
}

function createBlankCourse(): DraftCourse {
  return {
    id: crypto.randomUUID(),
    courseName: '',
    question: '',
    pollType: 'single_choice',
    allowOptOut: true,
    maxSelections: '',
    dishIndexIds: [],
    search: '',
  }
}

function buildInitialCourses(
  state: DinnerCircleMenuPollingState | null,
  initialCourseCount: number
): DraftCourse[] {
  if (state && state.courses.length > 0) {
    return state.courses.map((course) => ({
      id: course.pollId,
      courseName: course.courseName ?? '',
      question: course.question,
      pollType: course.pollType,
      allowOptOut: course.allowOptOut,
      maxSelections: course.maxSelections ? String(course.maxSelections) : '',
      dishIndexIds: course.options
        .filter((option) => option.optionType === 'standard' && option.dishIndexId)
        .map((option) => option.dishIndexId as string),
      search: '',
    }))
  }

  return Array.from({ length: Math.max(initialCourseCount, 1) }, () => createBlankCourse())
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function courseMatchScore(courseName: string, dish: CanonicalDishSummary) {
  const normalizedCourse = normalize(courseName)
  const normalizedDishCourse = normalize(dish.course)

  if (!normalizedCourse) return 0
  if (normalizedDishCourse === normalizedCourse) return 3
  if (
    normalizedDishCourse.includes(normalizedCourse) ||
    normalizedCourse.includes(normalizedDishCourse)
  ) {
    return 2
  }
  return 0
}

export function EventMenuPollingClient({
  eventId,
  groupToken,
  initialState,
  initialCourseCount,
  dishes,
}: EventMenuPollingClientProps) {
  const router = useRouter()
  const [courses, setCourses] = useState<DraftCourse[]>(
    buildInitialCourses(initialState, initialCourseCount)
  )
  const [isPending, startTransition] = useTransition()

  const dishesById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes])

  const liveSummary =
    initialState?.courses.length && initialState.isFullyLocked
      ? 'Final menu selections are already locked from Dinner Circle voting.'
      : initialState?.courses.length
        ? `${initialState.courses.length} course poll${initialState.courses.length === 1 ? '' : 's'} are currently live in the Dinner Circle. Publishing again will close the previous iteration and preserve it in history.`
        : 'No menu poll iteration is live yet. Publish one to collect structured guest input by course.'

  const updateCourse = (courseId: string, updates: Partial<DraftCourse>) => {
    setCourses((previous) =>
      previous.map((course) => (course.id === courseId ? { ...course, ...updates } : course))
    )
  }

  const toggleDishSelection = (courseId: string, dishId: string) => {
    setCourses((previous) =>
      previous.map((course) => {
        if (course.id !== courseId) return course
        const hasDish = course.dishIndexIds.includes(dishId)
        return {
          ...course,
          dishIndexIds: hasDish
            ? course.dishIndexIds.filter((candidate) => candidate !== dishId)
            : [...course.dishIndexIds, dishId],
        }
      })
    )
  }

  const addCourse = () => {
    setCourses((previous) => [...previous, createBlankCourse()])
  }

  const removeCourse = (courseId: string) => {
    setCourses((previous) =>
      previous.length > 1 ? previous.filter((course) => course.id !== courseId) : previous
    )
  }

  const handlePublish = () => {
    const validationError = validateDraftCourses(courses)
    if (validationError) {
      toast.error(validationError)
      return
    }

    startTransition(async () => {
      try {
        await createDinnerCircleMenuPollIteration({
          eventId,
          courses: courses.map((course, index) => {
            const maxSelections =
              course.pollType === 'single_choice'
                ? undefined
                : course.maxSelections.trim()
                  ? Number(course.maxSelections)
                  : undefined

            return {
              course_number: index + 1,
              course_name: course.courseName.trim(),
              question: course.question.trim() || undefined,
              poll_type: course.pollType,
              allow_opt_out: course.allowOptOut,
              max_selections: maxSelections,
              dish_index_ids: course.dishIndexIds,
            }
          }),
        })

        toast.success('Dinner Circle menu polling published.')
        router.refresh()
      } catch (publishError) {
        toast.error(
          publishError instanceof Error ? publishError.message : 'Failed to publish menu polls.'
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Current Dinner Circle state</h2>
            <p className="mt-2 text-sm text-stone-400">{liveSummary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {groupToken ? (
              <Link href={`/hub/g/${groupToken}`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">Open Dinner Circle</Button>
              </Link>
            ) : null}
            <Link href="/culinary/dish-index">
              <Button variant="secondary">Open Dish Index</Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Publish a menu poll iteration</h2>
            <p className="mt-1 text-sm text-stone-400">
              Build each course from canonical dishes only. Publishing posts course polls into the
              Dinner Circle feed and records a durable menu revision snapshot.
            </p>
          </div>
          <Button variant="secondary" onClick={addCourse}>
            Add course
          </Button>
        </div>

        <div className="mt-6 space-y-5">
          {courses.map((course, index) => {
            const selectedDishNames = course.dishIndexIds
              .map((dishId) => dishesById.get(dishId)?.name)
              .filter((value): value is string => Boolean(value))

            const visibleDishes = [...dishes]
              .filter((dish) => {
                const search = normalize(course.search)
                if (!search) return true

                const haystack = [
                  dish.name,
                  dish.course ?? '',
                  dish.description ?? '',
                  ...(dish.dietary_tags ?? []),
                  ...(dish.allergen_flags ?? []),
                ]
                  .join(' ')
                  .toLowerCase()

                return haystack.includes(search)
              })
              .sort((left, right) => {
                const scoreDiff =
                  courseMatchScore(course.courseName, right) - courseMatchScore(course.courseName, left)
                if (scoreDiff !== 0) return scoreDiff
                const courseDiff = normalize(left.course).localeCompare(normalize(right.course))
                if (courseDiff !== 0) return courseDiff
                return left.name.localeCompare(right.name)
              })

            return (
              <div
                key={course.id}
                className="rounded-2xl border border-stone-800 bg-stone-950/60 p-5"
              >
                <div className="flex flex-col gap-3 border-b border-stone-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                      Course {index + 1}
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-stone-100">
                      {course.courseName.trim() || `Untitled course ${index + 1}`}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCourse(course.id)}
                    disabled={courses.length <= 1}
                    className="text-sm text-stone-500 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove course
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                      Course name
                    </label>
                    <input
                      type="text"
                      value={course.courseName}
                      onChange={(event) =>
                        updateCourse(course.id, { courseName: event.target.value })
                      }
                      placeholder="Appetizer, Main, Dessert..."
                      className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                      Poll question
                    </label>
                    <input
                      type="text"
                      value={course.question}
                      onChange={(event) =>
                        updateCourse(course.id, { question: event.target.value })
                      }
                      placeholder="Optional. Defaults to a course-specific prompt."
                      className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                      Vote mode
                    </label>
                    <select
                      value={course.pollType}
                      onChange={(event) =>
                        updateCourse(course.id, {
                          pollType: event.target.value as MenuPollType,
                          maxSelections:
                            event.target.value === 'single_choice' ? '' : course.maxSelections,
                        })
                      }
                      className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="single_choice">Single choice</option>
                      <option value="multi_choice">Multi-select</option>
                      <option value="ranked_choice">Ranked choice</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                      Max selections
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={course.maxSelections}
                      onChange={(event) =>
                        updateCourse(course.id, { maxSelections: event.target.value })
                      }
                      disabled={course.pollType === 'single_choice'}
                      placeholder={course.pollType === 'single_choice' ? '1' : 'Optional'}
                      className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-brand-500 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-3 text-sm text-stone-300">
                    <input
                      type="checkbox"
                      checked={course.allowOptOut}
                      onChange={(event) =>
                        updateCourse(course.id, { allowOptOut: event.target.checked })
                      }
                      className="h-4 w-4 accent-[#e88f47]"
                    />
                    Allow guests to opt out of this course
                  </label>
                </div>

                <div className="mt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-stone-100">Canonical dish options</h4>
                      <p className="mt-1 text-xs text-stone-500">
                        Select at least two real dishes from the Dish Index. Existing recipe,
                        component, and costing relationships stay intact.
                      </p>
                    </div>
                    <input
                      type="search"
                      value={course.search}
                      onChange={(event) => updateCourse(course.id, { search: event.target.value })}
                      placeholder="Search dishes, tags, allergens..."
                      className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-brand-500 focus:outline-none sm:max-w-xs"
                    />
                  </div>

                  {selectedDishNames.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedDishNames.map((dishName) => (
                        <span
                          key={`${course.id}-${dishName}`}
                          className="rounded-full border border-brand-500/30 bg-brand-950/30 px-3 py-1 text-xs text-brand-200"
                        >
                          {dishName}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-stone-800 bg-stone-900/40 p-3">
                    {visibleDishes.length === 0 ? (
                      <p className="text-sm text-stone-500">
                        No canonical dishes match this search. Adjust the course name or search
                        terms, or add dishes to the Dish Index first.
                      </p>
                    ) : (
                      visibleDishes.map((dish) => {
                        const checked = course.dishIndexIds.includes(dish.id)
                        const matchScore = courseMatchScore(course.courseName, dish)

                        return (
                          <label
                            key={dish.id}
                            className={`block rounded-xl border p-3 ${
                              checked
                                ? 'border-brand-500/40 bg-brand-950/20'
                                : matchScore > 0
                                  ? 'border-stone-700 bg-stone-950/50'
                                  : 'border-stone-800 bg-stone-950/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDishSelection(course.id, dish.id)}
                                className="mt-1 h-4 w-4 accent-[#e88f47]"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium text-stone-100">
                                    {dish.name}
                                  </span>
                                  {dish.course && (
                                    <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
                                      {dish.course}
                                    </span>
                                  )}
                                  {matchScore > 0 && (
                                    <span className="rounded-full bg-amber-950/50 px-2 py-0.5 text-[11px] uppercase tracking-wide text-amber-300">
                                      Course match
                                    </span>
                                  )}
                                </div>
                                {dish.description && (
                                  <p className="mt-1 text-xs text-stone-400">{dish.description}</p>
                                )}
                                {(dish.dietary_tags?.length || dish.allergen_flags?.length) && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {(dish.dietary_tags ?? []).slice(0, 3).map((tag) => (
                                      <span
                                        key={`${dish.id}-diet-${tag}`}
                                        className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] text-stone-400"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {(dish.allergen_flags ?? []).slice(0, 2).map((flag) => (
                                      <span
                                        key={`${dish.id}-allergen-${flag}`}
                                        className="rounded-full border border-rose-900/50 px-2 py-0.5 text-[11px] text-rose-300"
                                      >
                                        {flag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-stone-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-400">
            Publishing closes any previous live menu poll iteration, posts the new course polls
            into Dinner Circle, and records the iteration in menu revision history.
          </p>
          <Button loading={isPending} onClick={handlePublish}>
            Publish Dinner Circle Polling
          </Button>
        </div>
      </Card>
    </div>
  )
}

function validateDraftCourses(courses: DraftCourse[]) {
  if (courses.length === 0) {
    return 'Add at least one course before publishing.'
  }

  for (let index = 0; index < courses.length; index += 1) {
    const course = courses[index]
    const courseLabel = `Course ${index + 1}`

    if (!course.courseName.trim()) {
      return `${courseLabel} needs a course name.`
    }

    if (course.dishIndexIds.length < 2) {
      return `${courseLabel} needs at least two canonical dish options.`
    }

    if (course.pollType !== 'single_choice' && course.maxSelections.trim()) {
      const maxSelections = Number(course.maxSelections)
      if (!Number.isInteger(maxSelections) || maxSelections < 1) {
        return `${courseLabel} has an invalid max selections value.`
      }

      if (maxSelections > course.dishIndexIds.length) {
        return `${courseLabel} cannot allow more selections than available dishes.`
      }
    }
  }

  return null
}
