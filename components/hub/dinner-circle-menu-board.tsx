'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  getDinnerCircleMenuPollingState,
  lockDinnerCircleMenuSelections,
  type DinnerCircleMenuPollingState,
} from '@/lib/hub/menu-poll-actions'
import { removeVote, voteOnPoll } from '@/lib/hub/poll-actions'

type DinnerCircleMenuBoardProps = {
  groupId: string
  groupToken: string
  eventId: string
  profileToken: string | null
  currentProfileId: string | null
  isManager: boolean
}

type FinalSelectionDraft = Record<
  string,
  {
    optionId: string
    overrideReason: string
  }
>

type MenuCourse = DinnerCircleMenuPollingState['courses'][number]
type MenuOption = MenuCourse['options'][number]

const POLL_TYPE_LABELS = {
  single_choice: 'Single selection',
  multi_choice: 'Multi-select',
  ranked_choice: 'Ranked choice',
} as const

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getMetadataArray(metadata: Record<string, unknown> | null, key: string): string[] {
  const value = metadata?.[key]
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function getMetadataText(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function getLeadingStandardOption(course: MenuCourse) {
  return (
    course.options.find((option) => option.optionType === 'standard' && option.isLeading) ??
    course.options.find((option) => option.optionType === 'standard') ??
    null
  )
}

function getDefaultFinalOptionId(course: MenuCourse) {
  return course.lockedOptionId ?? getLeadingStandardOption(course)?.id ?? ''
}

function getDistributionWidth(course: MenuCourse, option: MenuOption) {
  if (course.pollType === 'ranked_choice') {
    const topScore = Math.max(...course.options.map((candidate) => candidate.score), 0)
    return topScore > 0 ? Math.max((option.score / topScore) * 100, 4) : 0
  }

  return course.totalResponses > 0 ? Math.max((option.responseCount / course.totalResponses) * 100, 4) : 0
}

function getDistributionLabel(course: MenuCourse, option: MenuOption) {
  if (course.pollType === 'ranked_choice') {
    const parts = [`${option.score} pts`, `${option.voteCount} ranked`]
    if (option.firstChoiceCount > 0) {
      parts.push(`${option.firstChoiceCount} top`)
    }
    if (option.averageRank !== null) {
      parts.push(`avg rank ${option.averageRank}`)
    }
    return parts.join(' | ')
  }

  if (course.totalResponses === 0) {
    return 'No responses yet'
  }

  const share = Math.round((option.responseCount / course.totalResponses) * 100)
  return `${option.responseCount} of ${course.totalResponses} guests (${share}%)`
}

export function DinnerCircleMenuBoard({
  groupId,
  groupToken,
  eventId,
  profileToken,
  currentProfileId,
  isManager,
}: DinnerCircleMenuBoardProps) {
  const [state, setState] = useState<DinnerCircleMenuPollingState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalSelections, setFinalSelections] = useState<FinalSelectionDraft>({})
  const [isVotePending, startVoteTransition] = useTransition()
  const [isLockPending, startLockTransition] = useTransition()

  const refreshState = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true)
      }

      try {
        const nextState = await getDinnerCircleMenuPollingState({
          groupId,
          groupToken,
          eventId,
          viewerProfileId: currentProfileId ?? null,
        })
        setState(nextState)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Dinner Circle menu polling')
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [currentProfileId, eventId, groupId, groupToken]
  )

  useEffect(() => {
    void refreshState(true)
  }, [refreshState])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshState(false)
    }, 15000)

    return () => window.clearInterval(timer)
  }, [refreshState])

  useEffect(() => {
    if (!state) {
      return
    }

    setFinalSelections((current) => {
      const next: FinalSelectionDraft = {}

      for (const course of state.courses) {
        const existing = current[course.pollId]
        const optionId = existing?.optionId || getDefaultFinalOptionId(course)

        next[course.pollId] = {
          optionId,
          overrideReason: existing?.overrideReason ?? course.lockReason ?? '',
        }
      }

      return next
    })
  }, [state])

  const selectionOptionsByPollId = useMemo(() => {
    const next = new Map<string, Array<{ value: string; label: string }>>()

    for (const course of state?.courses ?? []) {
      next.set(
        course.pollId,
        course.options
          .filter((option) => option.optionType === 'standard')
          .map((option) => ({
            value: option.id,
            label: option.label,
          }))
      )
    }

    return next
  }, [state])

  const handleVote = (course: MenuCourse, option: MenuOption) => {
    if (!profileToken || course.lockedOptionId || course.isClosed || isVotePending) {
      return
    }

    startVoteTransition(async () => {
      try {
        if (option.votedByMe) {
          await removeVote({
            pollId: course.pollId,
            optionId: option.id,
            profileToken,
          })
        } else {
          await voteOnPoll({
            pollId: course.pollId,
            optionId: option.id,
            profileToken,
          })
        }

        await refreshState(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update your menu vote')
      }
    })
  }

  const handleLockSelections = () => {
    if (!profileToken || !state || state.courses.length === 0) {
      return
    }

    startLockTransition(async () => {
      try {
        await lockDinnerCircleMenuSelections({
          eventId,
          profileToken,
          selections: state.courses.map((course) => ({
            pollId: course.pollId,
            optionId:
              finalSelections[course.pollId]?.optionId || getDefaultFinalOptionId(course) || null,
            overrideReason: finalSelections[course.pollId]?.overrideReason.trim() || null,
          })),
        })

        await refreshState(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to lock the final Dinner Circle menu')
      }
    })
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-400">
          Loading menu polling...
        </div>
      </div>
    )
  }

  if (!state || state.courses.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
          <h3 className="text-sm font-semibold text-stone-100">Menu</h3>
          <p className="mt-2 text-sm text-stone-400">
            No course-based menu polling has been published in this Dinner Circle yet.
          </p>
          {!profileToken && (
            <p className="mt-2 text-xs text-stone-500">
              Join the circle to vote when menu options go live.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-100">Dinner Circle Menu</h3>
              {state.isFullyLocked ? (
                <Badge variant="success">Locked</Badge>
              ) : (
                <Badge variant="info">Voting live</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-stone-400">
              Vote by course on canonical dishes only. Locked selections flow directly into the
              event menu, costing, and prep workflow.
            </p>
          </div>
          {isManager && !state.isFullyLocked && (
            <Button variant="primary" onClick={handleLockSelections} loading={isLockPending}>
              Lock final menu
            </Button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">
          <span>Current revision: {state.revisionId ? state.revisionId.slice(0, 8) : 'none'}</span>
          <span>Courses: {state.courses.length}</span>
          <span>Menu: {state.menuId ? state.menuId.slice(0, 8) : 'draft pending'}</span>
        </div>
      </div>

      {state.iterations.length > 0 && (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
          <h4 className="text-sm font-semibold text-stone-100">Iteration history</h4>
          <div className="mt-3 space-y-2">
            {state.iterations.map((iteration) => (
              <div
                key={iteration.revisionId}
                className="flex flex-col gap-2 rounded-xl border border-stone-800 bg-stone-950/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">
                      Revision {iteration.revisionId.slice(0, 8)}
                    </span>
                    {iteration.isCurrent && <Badge variant="info">Current</Badge>}
                    {iteration.lockedCourseCount === iteration.courseCount && iteration.courseCount > 0 && (
                      <Badge variant="success">Finalized</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{formatDateTime(iteration.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                  <span>{iteration.courseCount} course polls</span>
                  <span>{iteration.closedCourseCount} closed</span>
                  <span>{iteration.lockedCourseCount} locked</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.courses.map((course) => {
        const defaultSelection = getDefaultFinalOptionId(course)
        const selectedOptionId = finalSelections[course.pollId]?.optionId || defaultSelection

        return (
          <div
            key={course.pollId}
            className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-semibold text-stone-100">
                    {course.courseNumber ? `${course.courseNumber}. ` : ''}
                    {course.courseName ?? 'Course'}
                  </h4>
                  <Badge variant={course.lockedOptionId ? 'success' : 'default'}>
                    {POLL_TYPE_LABELS[course.pollType]}
                  </Badge>
                  {course.allowOptOut && <Badge variant="warning">Opt out enabled</Badge>}
                </div>
                <p className="mt-2 text-sm text-stone-300">{course.question}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                  <span>{course.totalResponses} responses</span>
                  {course.maxSelections ? <span>Cap: {course.maxSelections}</span> : null}
                  {course.lockedAt ? <span>Locked {formatDateTime(course.lockedAt)}</span> : null}
                </div>
              </div>
              {!profileToken && !course.lockedOptionId && (
                <p className="text-xs text-stone-500">Join the circle to submit menu selections.</p>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {course.options.map((option) => {
                const dietaryTags = getMetadataArray(option.metadata, 'dietary_tags')
                const allergenFlags = getMetadataArray(option.metadata, 'allergen_flags')
                const componentNames = getMetadataArray(option.metadata, 'component_names')
                const description = getMetadataText(option.metadata, 'description')
                const isSelectable = Boolean(profileToken) && !course.lockedOptionId && !course.isClosed
                const isSelection = option.optionType === 'standard'
                const isFinalSelection = course.lockedOptionId === option.id
                const isRecommendedFinal = selectedOptionId === option.id

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleVote(course, option)}
                    disabled={!isSelectable || isVotePending}
                    className={`relative w-full overflow-hidden rounded-xl border p-4 text-left transition ${
                      option.votedByMe
                        ? 'border-brand-500/70 bg-brand-500/10'
                        : 'border-stone-800 bg-stone-950/80'
                    } ${isSelectable ? 'hover:border-stone-700' : 'cursor-default'}`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 transition-all ${
                        option.optionType === 'opt_out' ? 'bg-amber-500/10' : 'bg-brand-500/10'
                      }`}
                      style={{ width: `${getDistributionWidth(course, option)}%` }}
                    />
                    <div className="relative">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-stone-100">{option.label}</span>
                            {option.votedByMe && (
                              <Badge variant="info">
                                {course.pollType === 'ranked_choice' && option.myRank
                                  ? `Your rank #${option.myRank}`
                                  : 'Selected'}
                              </Badge>
                            )}
                            {option.isLeading && !course.lockedOptionId && (
                              <Badge variant="default">Leading</Badge>
                            )}
                            {isFinalSelection && <Badge variant="success">Locked</Badge>}
                            {option.optionType === 'opt_out' && <Badge variant="warning">Opt out</Badge>}
                            {isManager && isRecommendedFinal && !course.lockedOptionId && isSelection && (
                              <Badge variant="info">Final pick</Badge>
                            )}
                          </div>
                          {description && (
                            <p className="mt-2 text-sm text-stone-400">{description}</p>
                          )}
                        </div>
                        <span className="text-xs text-stone-400">
                          {getDistributionLabel(course, option)}
                        </span>
                      </div>

                      {(dietaryTags.length > 0 || allergenFlags.length > 0 || componentNames.length > 0) && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {dietaryTags.map((tag) => (
                            <span
                              key={`${option.id}-dietary-${tag}`}
                              className="rounded-full bg-emerald-950/60 px-2 py-1 text-emerald-300"
                            >
                              {tag}
                            </span>
                          ))}
                          {allergenFlags.map((flag) => (
                            <span
                              key={`${option.id}-allergen-${flag}`}
                              className="rounded-full bg-red-950/60 px-2 py-1 text-red-300"
                            >
                              {flag}
                            </span>
                          ))}
                          {componentNames.slice(0, 3).map((component) => (
                            <span
                              key={`${option.id}-component-${component}`}
                              className="rounded-full bg-stone-800 px-2 py-1 text-stone-400"
                            >
                              {component}
                            </span>
                          ))}
                          {componentNames.length > 3 && (
                            <span className="rounded-full bg-stone-800 px-2 py-1 text-stone-500">
                              +{componentNames.length - 3} components
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {course.lockReason && (
              <div className="mt-4 rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
                Override reason: {course.lockReason}
              </div>
            )}

            {isManager && !course.lockedOptionId && (
              <div className="mt-4 grid gap-3 rounded-xl border border-stone-800 bg-stone-950/70 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Select
                  label="Final selection"
                  value={selectedOptionId}
                  options={selectionOptionsByPollId.get(course.pollId) ?? []}
                  onChange={(event) =>
                    setFinalSelections((current) => ({
                      ...current,
                      [course.pollId]: {
                        optionId: event.target.value,
                        overrideReason: current[course.pollId]?.overrideReason ?? '',
                      },
                    }))
                  }
                />
                <Textarea
                  label="Override reason"
                  value={finalSelections[course.pollId]?.overrideReason ?? ''}
                  onChange={(event) =>
                    setFinalSelections((current) => ({
                      ...current,
                      [course.pollId]: {
                        optionId: current[course.pollId]?.optionId || defaultSelection,
                        overrideReason: event.target.value,
                      },
                    }))
                  }
                  rows={3}
                  placeholder="Optional. Explain why the final dish differs from the live result."
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
