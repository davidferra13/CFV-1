'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  createDinnerCircleMenuPollIteration,
  type DinnerCircleMenuPollingState,
} from '@/lib/hub/menu-poll-actions'

type CanonicalDishOption = {
  id: string
  name: string
  course: string | null
  description: string | null
  dietary_tags: string[] | null
  allergen_flags: string[] | null
  linked_recipe_id: string | null
}

type CourseDraft = {
  id: string
  courseName: string
  question: string
  pollType: 'single_choice' | 'multi_choice' | 'ranked_choice'
  allowOptOut: boolean
  maxSelections: string
  dishIds: string[]
  dishSearch: string
  courseFilter: string
}

type DinnerCircleMenuPollComposerProps = {
  eventId: string
  circleUrl: string | null
  dishes: CanonicalDishOption[]
  currentState: DinnerCircleMenuPollingState | null
}

const POLL_TYPE_OPTIONS = [
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multi_choice', label: 'Multi-select' },
  { value: 'ranked_choice', label: 'Ranked choice' },
] as const

function createEmptyCourseDraft(defaultCourse = ''): CourseDraft {
  return {
    id: crypto.randomUUID(),
    courseName: defaultCourse,
    question: '',
    pollType: 'single_choice',
    allowOptOut: true,
    maxSelections: '',
    dishIds: [],
    dishSearch: '',
    courseFilter: defaultCourse,
  }
}

function buildDraftsFromState(currentState: DinnerCircleMenuPollingState | null) {
  if (!currentState || currentState.courses.length === 0) {
    return [createEmptyCourseDraft()]
  }

  return currentState.courses.map((course) => ({
    id: crypto.randomUUID(),
    courseName: course.courseName ?? `Course ${course.courseNumber ?? 1}`,
    question: course.question,
    pollType: course.pollType,
    allowOptOut: course.allowOptOut,
    maxSelections: course.maxSelections ? String(course.maxSelections) : '',
    dishIds: course.options
      .filter((option) => option.optionType === 'standard' && option.dishIndexId)
      .map((option) => option.dishIndexId!) as string[],
    dishSearch: '',
    courseFilter: course.courseName ?? '',
  }))
}

export function DinnerCircleMenuPollComposer({
  eventId,
  circleUrl,
  dishes,
  currentState,
}: DinnerCircleMenuPollComposerProps) {
  const [courses, setCourses] = useState(() => buildDraftsFromState(currentState))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const availableCourses = Array.from(
    new Set(
      dishes.map((dish) => dish.course?.trim()).filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right))

  const publishLabel =
    currentState?.courses.length && currentState.isFullyLocked
      ? 'Publish another iteration'
      : currentState?.courses.length
        ? 'Publish next iteration'
        : 'Publish Dinner Circle menu options'

  const updateCourse = (courseId: string, updater: (course: CourseDraft) => CourseDraft) => {
    setCourses((current) =>
      current.map((course) => (course.id === courseId ? updater(course) : course))
    )
  }

  const toggleDish = (courseId: string, dishId: string) => {
    updateCourse(courseId, (course) => ({
      ...course,
      dishIds: course.dishIds.includes(dishId)
        ? course.dishIds.filter((candidate) => candidate !== dishId)
        : [...course.dishIds, dishId],
    }))
  }

  const handlePublish = () => {
    const normalizedCourses = courses.map((course, index) => ({
      course_number: index + 1,
      course_name: course.courseName.trim(),
      question: course.question.trim() || undefined,
      poll_type: course.pollType,
      allow_opt_out: course.allowOptOut,
      max_selections:
        course.pollType === 'single_choice'
          ? undefined
          : (() => {
              const parsed = Number(course.maxSelections)
              if (!Number.isFinite(parsed) || parsed <= 0) {
                return undefined
              }
              return Math.min(parsed, course.dishIds.length)
            })(),
      dish_index_ids: Array.from(new Set(course.dishIds)),
    }))

    for (const course of normalizedCourses) {
      if (!course.course_name) {
        setError('Each course needs a name before publishing.')
        return
      }

      if (course.dish_index_ids.length < 2) {
        setError(`Select at least two canonical dishes for ${course.course_name}.`)
        return
      }
    }

    setError(null)
    startTransition(async () => {
      try {
        await createDinnerCircleMenuPollIteration({
          eventId,
          courses: normalizedCourses,
        })
        window.location.reload()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to publish Dinner Circle menu polling'
        )
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-stone-100">Dinner Circle menu polling</h2>
              {currentState?.isFullyLocked ? (
                <Badge variant="success">Final menu locked</Badge>
              ) : currentState?.courses.length ? (
                <Badge variant="info">Iteration live</Badge>
              ) : (
                <Badge variant="default">Not published</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-stone-400">
              Publish course-based Dinner Circle polls from canonical dishes only. Locked winners
              materialize directly into the event menu with no manual translation step.
            </p>
          </div>
          {circleUrl ? (
            <Button variant="secondary" href={circleUrl} target="_blank">
              Open Dinner Circle
            </Button>
          ) : null}
        </div>

        {currentState?.iterations?.length ? (
          <div className="mt-4 space-y-2">
            {currentState.iterations.map((iteration) => (
              <div
                key={iteration.revisionId}
                className="flex flex-col gap-2 rounded-xl border border-stone-800 bg-stone-900/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">
                      Revision {iteration.revisionId.slice(0, 8)}
                    </span>
                    {iteration.isCurrent && <Badge variant="info">Current</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {new Date(iteration.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                  <span>{iteration.courseCount} course polls</span>
                  <span>{iteration.lockedCourseCount} locked</span>
                  <span>{iteration.closedCourseCount} closed</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {dishes.length === 0 ? (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-200">
            No canonical dishes are available yet. Add dishes to the dish index before publishing
            Dinner Circle menu polling.
          </p>
        </div>
      ) : null}

      {courses.map((course, index) => {
        const filteredDishes = dishes
          .filter((dish) => {
            const matchesCourseFilter =
              !course.courseFilter ||
              (dish.course ?? '').toLowerCase() === course.courseFilter.toLowerCase()
            const matchesSearch =
              !course.dishSearch ||
              dish.name.toLowerCase().includes(course.dishSearch.toLowerCase()) ||
              (dish.description ?? '').toLowerCase().includes(course.dishSearch.toLowerCase())
            return matchesCourseFilter && matchesSearch
          })
          .slice(0, 18)

        return (
          <div key={course.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-100">Course {index + 1}</h3>
                <p className="mt-1 text-sm text-stone-500">
                  {course.dishIds.length} dish option{course.dishIds.length === 1 ? '' : 's'}{' '}
                  selected
                </p>
              </div>
              {courses.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setCourses((current) => current.filter((entry) => entry.id !== course.id))
                  }
                >
                  Remove course
                </Button>
              )}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Input
                value={course.courseName}
                onChange={(event) =>
                  updateCourse(course.id, (current) => ({
                    ...current,
                    courseName: event.target.value,
                  }))
                }
                placeholder="Course name"
              />
              <Input
                value={course.question}
                onChange={(event) =>
                  updateCourse(course.id, (current) => ({
                    ...current,
                    question: event.target.value,
                  }))
                }
                placeholder="Optional Dinner Circle prompt"
              />
              <Select
                value={course.pollType}
                options={POLL_TYPE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(event) =>
                  updateCourse(course.id, (current) => ({
                    ...current,
                    pollType: event.target.value as CourseDraft['pollType'],
                    maxSelections:
                      event.target.value === 'single_choice' ? '' : current.maxSelections || '2',
                  }))
                }
              />
              <Select
                value={course.courseFilter}
                options={availableCourses.map((value) => ({ value, label: value }))}
                onChange={(event) =>
                  updateCourse(course.id, (current) => ({
                    ...current,
                    courseFilter: event.target.value,
                    courseName: current.courseName || event.target.value,
                  }))
                }
              />
              {course.pollType !== 'single_choice' ? (
                <Input
                  type="number"
                  min={1}
                  max={course.dishIds.length || 10}
                  value={course.maxSelections}
                  onChange={(event) =>
                    updateCourse(course.id, (current) => ({
                      ...current,
                      maxSelections: event.target.value,
                    }))
                  }
                  placeholder="Max guest selections"
                />
              ) : (
                <div className="rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-500">
                  Guests will select exactly one option in this course.
                </div>
              )}
              <label className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={course.allowOptOut}
                  onChange={(event) =>
                    updateCourse(course.id, (current) => ({
                      ...current,
                      allowOptOut: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#e88f47]"
                />
                Allow guests to opt out of this course
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/60 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-stone-100">Canonical dish options</h4>
                  <p className="mt-1 text-xs text-stone-500">
                    Only dishes with a linked recipe or canonical components can be published.
                  </p>
                </div>
                <Input
                  value={course.dishSearch}
                  onChange={(event) =>
                    updateCourse(course.id, (current) => ({
                      ...current,
                      dishSearch: event.target.value,
                    }))
                  }
                  placeholder="Search dishes"
                  className="lg:max-w-xs"
                />
              </div>

              {course.dishIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.dishIds.map((dishId) => {
                    const dish = dishes.find((candidate) => candidate.id === dishId)
                    if (!dish) {
                      return null
                    }

                    return (
                      <button
                        key={dish.id}
                        type="button"
                        onClick={() => toggleDish(course.id, dish.id)}
                        className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-xs text-brand-200"
                      >
                        {dish.name} ×
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 grid gap-3">
                {filteredDishes.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    No canonical dishes match this course filter. Adjust the filter or search.
                  </p>
                ) : (
                  filteredDishes.map((dish) => {
                    const isSelected = course.dishIds.includes(dish.id)
                    return (
                      <button
                        key={dish.id}
                        type="button"
                        onClick={() => toggleDish(course.id, dish.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-brand-500/50 bg-brand-500/10'
                            : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-stone-100">
                                {dish.name}
                              </span>
                              {dish.course ? <Badge variant="default">{dish.course}</Badge> : null}
                              {dish.linked_recipe_id ? (
                                <Badge variant="success">Recipe linked</Badge>
                              ) : (
                                <Badge variant="info">Component-backed</Badge>
                              )}
                            </div>
                            {dish.description && (
                              <p className="mt-1 text-xs text-stone-500">{dish.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {(dish.dietary_tags ?? []).slice(0, 3).map((tag) => (
                                <span
                                  key={`${dish.id}-${tag}`}
                                  className="rounded-full bg-emerald-950/60 px-2 py-1 text-[11px] text-emerald-300"
                                >
                                  {tag}
                                </span>
                              ))}
                              {(dish.allergen_flags ?? []).slice(0, 3).map((flag) => (
                                <span
                                  key={`${dish.id}-${flag}`}
                                  className="rounded-full bg-red-950/60 px-2 py-1 text-[11px] text-red-300"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-stone-400">
                            {isSelected ? 'Selected' : 'Add to course'}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )
      })}

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="secondary"
          onClick={() =>
            setCourses((current) => [
              ...current,
              createEmptyCourseDraft(availableCourses[current.length] ?? ''),
            ])
          }
        >
          Add course
        </Button>
        <Button
          variant="primary"
          onClick={handlePublish}
          loading={isPending}
          disabled={dishes.length === 0}
        >
          {publishLabel}
        </Button>
      </div>
    </div>
  )
}
