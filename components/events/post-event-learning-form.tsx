'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  saveChefOutcomeCapture,
  type EventOutcomeCaptureData,
  type ChefOutcomeDishInput,
} from '@/lib/post-event/learning-actions'
import {
  LEARNING_DISH_OUTCOME_STATUS_VALUES,
  LEARNING_ISSUE_FLAGS,
  LEARNING_PREP_ACCURACY_VALUES,
  LEARNING_TIME_ACCURACY_VALUES,
  type LearningDishOutcomeStatus,
  type LearningIssueFlag,
  type LearningPrepAccuracy,
  type LearningTimeAccuracy,
} from '@/lib/post-event/learning-logic'

type Props = {
  capture: EventOutcomeCaptureData
}

type EditableDishOutcomeStatus = Exclude<LearningDishOutcomeStatus, 'planned'>

type DishDraft = Omit<ChefOutcomeDishInput, 'outcomeStatus'> & {
  key: string
  outcomeStatus: EditableDishOutcomeStatus
  averageRating: number | null
  guestFeedbackCount: number
}

const STATUS_LABELS: Record<LearningDishOutcomeStatus, string> = {
  planned: 'Planned',
  planned_served: 'Served',
  substituted: 'Changed',
  removed: 'Skipped',
  added: 'Added',
}

const PREP_LABELS: Record<LearningPrepAccuracy, string> = {
  under: 'Under',
  on_target: 'On target',
  over: 'Over',
}

const TIME_LABELS: Record<LearningTimeAccuracy, string> = {
  ahead: 'Ahead',
  on_time: 'On time',
  behind: 'Behind',
}

const EDITABLE_DISH_OUTCOME_STATUS_VALUES = LEARNING_DISH_OUTCOME_STATUS_VALUES.filter(
  (status): status is EditableDishOutcomeStatus => status !== 'planned'
)

const REACTION_NOTE_SHORTCUTS = [
  'Guest response: no adverse response reported.',
  'Guest response: mild concern reported. Follow up with the client.',
  'Guest response: severe concern reported. Escalate follow-up and document details.',
  'Guest response: follow-up completed with client.',
] as const

function SegmentedButtons<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T | null
  options: readonly T[]
  labels: Record<T, string>
  onChange: (next: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'border-brand-500 bg-brand-950 text-brand-200'
                : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500'
            }`}
          >
            {labels[option]}
          </button>
        )
      })}
    </div>
  )
}

export function PostEventLearningForm({ capture }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [prepAccuracy, setPrepAccuracy] = useState<LearningPrepAccuracy | null>(
    capture.outcome.prepAccuracy
  )
  const [timeAccuracy, setTimeAccuracy] = useState<LearningTimeAccuracy | null>(
    capture.outcome.timeAccuracy
  )
  const [executionChangeNotes, setExecutionChangeNotes] = useState(
    capture.outcome.executionChangeNotes ?? ''
  )
  const [whatWentWell, setWhatWentWell] = useState(capture.outcome.whatWentWell ?? '')
  const [whatWentWrong, setWhatWentWrong] = useState(capture.outcome.whatWentWrong ?? '')
  const [chefNotes, setChefNotes] = useState(capture.outcome.chefNotes ?? '')
  const [dishes, setDishes] = useState<DishDraft[]>(
    capture.dishes.map((dish, index) => ({
      key: dish.rowId ?? `seed-${index}`,
      rowId: dish.rowId,
      menuDishId: dish.menuDishId,
      plannedName: dish.plannedName,
      actualName: dish.actualName ?? (dish.outcomeStatus === 'removed' ? '' : dish.plannedName),
      courseName: dish.courseName,
      outcomeStatus: dish.outcomeStatus === 'planned' ? 'planned_served' : dish.outcomeStatus,
      issueFlags: dish.issueFlags,
      chefNotes: dish.chefNotes ?? '',
      averageRating: dish.averageRating,
      guestFeedbackCount: dish.guestFeedbackCount,
    }))
  )

  function updateDish(key: string, patch: Partial<DishDraft>) {
    setDishes((current) =>
      current.map((dish) => {
        if (dish.key !== key) return dish
        const next = { ...dish, ...patch }
        if (next.outcomeStatus === 'removed') {
          next.actualName = ''
        } else if (!next.actualName) {
          next.actualName = next.plannedName
        }
        return next
      })
    )
  }

  function toggleIssueFlag(key: string, issueFlag: LearningIssueFlag) {
    setDishes((current) =>
      current.map((dish) => {
        if (dish.key !== key) return dish
        const currentFlags = new Set(dish.issueFlags ?? [])
        if (currentFlags.has(issueFlag)) currentFlags.delete(issueFlag)
        else currentFlags.add(issueFlag)
        return { ...dish, issueFlags: [...currentFlags] as LearningIssueFlag[] }
      })
    )
  }

  function addExtraDish() {
    setDishes((current) => [
      ...current,
      {
        key: `extra-${Date.now()}-${current.length}`,
        rowId: null,
        menuDishId: null,
        plannedName: 'Extra dish',
        actualName: '',
        courseName: '',
        outcomeStatus: 'added',
        issueFlags: [],
        chefNotes: '',
        averageRating: null,
        guestFeedbackCount: 0,
      },
    ])
  }

  function removeExtraDish(key: string) {
    setDishes((current) => current.filter((dish) => dish.key !== key))
  }

  function appendChefNote(line: string) {
    setChefNotes((current) => {
      const trimmed = current.trim()
      return trimmed ? `${trimmed}\n${line}` : line
    })
  }

  function handleSave() {
    startTransition(async () => {
      const payloadDishes = dishes
        .map((dish) => ({
          rowId: dish.rowId,
          menuDishId: dish.menuDishId,
          plannedName: dish.plannedName.trim(),
          actualName: dish.actualName?.trim() || null,
          courseName: dish.courseName?.trim() || null,
          outcomeStatus: dish.outcomeStatus,
          issueFlags: dish.issueFlags ?? [],
          chefNotes: dish.chefNotes?.trim() || null,
        }))
        .filter((dish) => dish.plannedName.length > 0)

      const result = await saveChefOutcomeCapture({
        eventId: capture.event.id,
        prepAccuracy,
        timeAccuracy,
        executionChangeNotes: executionChangeNotes.trim() || null,
        whatWentWell: whatWentWell.trim() || null,
        whatWentWrong: whatWentWrong.trim() || null,
        chefNotes: chefNotes.trim() || null,
        dishes: payloadDishes,
      })

      if (!result.success) {
        toast.error(result.error ?? 'Failed to save outcome capture.')
        return
      }

      toast.success('Outcome capture saved.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Success Score</p>
          <p className="mt-2 text-3xl font-semibold text-stone-100">
            {capture.outcome.successScore !== null ? `${capture.outcome.successScore}` : 'Pending'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Guest Responses</p>
          <p className="mt-2 text-3xl font-semibold text-stone-100">
            {capture.outcome.guestResponseCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Avg Overall</p>
          <p className="mt-2 text-3xl font-semibold text-stone-100">
            {capture.outcome.guestAvgOverall !== null
              ? `${capture.outcome.guestAvgOverall.toFixed(1)}/5`
              : 'Pending'}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-stone-100">Execution Truth</h2>
        <p className="mt-1 text-sm text-stone-400">
          Confirm what was actually served, where the plan drifted, and whether prep or timing ran
          off target.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-stone-300">Prep accuracy</p>
            <SegmentedButtons
              value={prepAccuracy}
              options={LEARNING_PREP_ACCURACY_VALUES}
              labels={PREP_LABELS}
              onChange={setPrepAccuracy}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-stone-300">Time accuracy</p>
            <SegmentedButtons
              value={timeAccuracy}
              options={LEARNING_TIME_ACCURACY_VALUES}
              labels={TIME_LABELS}
              onChange={setTimeAccuracy}
            />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-300">
              What changed during execution?
            </label>
            <textarea
              rows={3}
              value={executionChangeNotes}
              onChange={(event) => setExecutionChangeNotes(event.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              placeholder="Last-minute swaps, pacing changes, service adjustments..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-300">
                What went well?
              </label>
              <textarea
                rows={3}
                value={whatWentWell}
                onChange={(event) => setWhatWentWell(event.target.value)}
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                placeholder="Keep this specific."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-300">
                What went wrong?
              </label>
              <textarea
                rows={3}
                value={whatWentWrong}
                onChange={(event) => setWhatWentWrong(event.target.value)}
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                placeholder="Name the concrete miss."
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-300">Chef notes</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {REACTION_NOTE_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut}
                  type="button"
                  onClick={() => appendChefNote(shortcut)}
                  className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-200"
                >
                  {shortcut.replace('Guest response: ', '')}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={chefNotes}
              onChange={(event) => setChefNotes(event.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              placeholder="Anything upstream systems should remember."
            />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Dish Outcome Capture</h2>
            <p className="mt-1 text-sm text-stone-400">
              Defaults are fast. Only touch rows that changed or caused friction.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={addExtraDish}>
            Add Extra Dish
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          {dishes.map((dish) => {
            const isExtra = dish.outcomeStatus === 'added' && !dish.menuDishId
            return (
              <div
                key={dish.key}
                className="rounded-xl border border-stone-700 bg-stone-950/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-stone-100">{dish.plannedName}</p>
                    {dish.courseName && (
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                        {dish.courseName}
                      </p>
                    )}
                  </div>
                  {isExtra && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExtraDish(dish.key)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {isExtra && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={dish.plannedName}
                      onChange={(event) =>
                        updateDish(dish.key, { plannedName: event.target.value })
                      }
                      placeholder="Dish name"
                      className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                    />
                    <input
                      value={dish.courseName ?? ''}
                      onChange={(event) => updateDish(dish.key, { courseName: event.target.value })}
                      placeholder="Course"
                      className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-stone-300">Outcome</p>
                  <SegmentedButtons
                    value={dish.outcomeStatus}
                    options={EDITABLE_DISH_OUTCOME_STATUS_VALUES}
                    labels={STATUS_LABELS}
                    onChange={(next) => updateDish(dish.key, { outcomeStatus: next })}
                  />
                </div>

                {dish.outcomeStatus !== 'removed' && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-stone-300">
                      Actual dish served
                    </label>
                    <input
                      value={dish.actualName ?? ''}
                      onChange={(event) => updateDish(dish.key, { actualName: event.target.value })}
                      className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                      placeholder="Only change this if the served dish changed."
                    />
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-stone-300">Issue flags</p>
                  <div className="flex flex-wrap gap-2">
                    {LEARNING_ISSUE_FLAGS.map((issueFlag) => {
                      const active = (dish.issueFlags ?? []).includes(issueFlag)
                      return (
                        <button
                          key={issueFlag}
                          type="button"
                          onClick={() => toggleIssueFlag(dish.key, issueFlag)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            active
                              ? 'border-amber-500 bg-amber-950 text-amber-200'
                              : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500'
                          }`}
                        >
                          {issueFlag}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <textarea
                    rows={2}
                    value={dish.chefNotes ?? ''}
                    onChange={(event) => updateDish(dish.key, { chefNotes: event.target.value })}
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                    placeholder="Optional notes for this dish."
                  />
                  <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-400">
                    <p>Guest feedback: {dish.guestFeedbackCount}</p>
                    <p>
                      Avg rating:{' '}
                      {dish.averageRating !== null
                        ? `${dish.averageRating.toFixed(1)}/5`
                        : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/events/${capture.event.id}`)}
        >
          Back to Event
        </Button>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Outcome Capture'}
        </Button>
      </div>
    </div>
  )
}
