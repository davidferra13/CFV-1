// DOP View Component — shows Default Operating Procedure status
// Server component. Passes eventId + manual completion keys to client
// DOPTaskCheckbox for tasks that can't be auto-detected.

import type { DOPSchedule, DOPPhase, DOPTask } from '@/lib/scheduling/types'
import { getDOPProgress } from '@/lib/scheduling/dop'
import { DOPTaskCheckbox } from '@/components/scheduling/dop-task-checkbox'

const PHASE_LABELS: Record<string, string> = {
  atBooking: 'At Booking',
  dayBefore: 'Day Before',
  morningOf: 'Morning Of',
  preDeparture: 'Pre-Departure',
  postService: 'Post-Service',
}

const STATUS_COLORS: Record<string, string> = {
  complete: 'bg-green-900 text-green-200',
  pending: 'bg-yellow-900 text-yellow-200',
  overdue: 'bg-red-900 text-red-200',
  upcoming: 'bg-brand-900 text-brand-300',
  not_applicable: 'bg-stone-800 text-stone-500',
}

type TaskRowProps = {
  task: DOPTask
  eventId?: string
  manualCompletionKeys?: Set<string>
}

function TaskRow({ task, eventId, manualCompletionKeys }: TaskRowProps) {
  // A task is "manually completable" if: it's not already auto-complete and we have an eventId
  const isManuallyComplete = manualCompletionKeys?.has(task.id) ?? false
  const isComplete = task.isComplete || isManuallyComplete
  const canToggle = !task.isComplete && !!eventId

  return (
    <div
      className={`flex items-start gap-3 py-2 ${task.isOverdue && !isComplete ? 'bg-red-950 -mx-2 px-2 rounded' : ''}`}
    >
      {canToggle ? (
        <DOPTaskCheckbox eventId={eventId!} taskKey={task.id} initialChecked={isManuallyComplete} />
      ) : (
        <span
          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded flex items-center justify-center text-xs ${
            isComplete
              ? 'bg-green-900 text-emerald-600'
              : task.isOverdue
                ? 'bg-red-900 text-red-600'
                : 'bg-stone-800 text-stone-300'
          }`}
        >
          {isComplete ? '\u2713' : task.isOverdue ? '!' : '\u00B7'}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${isComplete ? 'text-stone-500 line-through' : 'text-stone-100'}`}
          >
            {task.label}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              task.category === 'documents'
                ? 'bg-purple-950 text-purple-200'
                : task.category === 'shopping'
                  ? 'bg-green-950 text-green-200'
                  : task.category === 'prep'
                    ? 'bg-brand-950 text-brand-400'
                    : task.category === 'packing'
                      ? 'bg-yellow-950 text-yellow-200'
                      : task.category === 'reset'
                        ? 'bg-orange-950 text-orange-200'
                        : 'bg-stone-800 text-stone-300'
            }`}
          >
            {task.category}
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">{task.description}</p>
      </div>
    </div>
  )
}

type PhaseSectionProps = {
  name: string
  phase: DOPPhase
  eventId?: string
  manualCompletionKeys?: Set<string>
}

function PhaseSection({ name, phase, eventId, manualCompletionKeys }: PhaseSectionProps) {
  if (phase.status === 'not_applicable') return null

  return (
    <div className="border border-stone-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-100">
          {PHASE_LABELS[name] || name}
          {phase.date && (
            <span className="ml-2 text-xs font-normal text-stone-500">{phase.date}</span>
          )}
        </h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[phase.status]}`}
        >
          {phase.status}
        </span>
      </div>
      <div className="space-y-1">
        {phase.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            eventId={eventId}
            manualCompletionKeys={manualCompletionKeys}
          />
        ))}
      </div>
    </div>
  )
}

type DOPViewProps = {
  schedule: DOPSchedule
  eventId?: string
  manualCompletionKeys?: Set<string>
}

export function DOPView({ schedule, eventId, manualCompletionKeys }: DOPViewProps) {
  const progress = getDOPProgress(schedule)
  const manualCount = manualCompletionKeys?.size ?? 0
  const totalCompleted = progress.completed + manualCount

  // Tailwind progress width mapping (0, 10, 20 … 100)
  const pct = progress.total > 0 ? Math.round((totalCompleted / progress.total) * 100) : 0
  const progressWidthClass =
    pct >= 100
      ? 'w-full'
      : pct >= 90
        ? 'w-11/12'
        : pct >= 80
          ? 'w-4/5'
          : pct >= 70
            ? 'w-3/4'
            : pct >= 60
              ? 'w-3/5'
              : pct >= 50
                ? 'w-1/2'
                : pct >= 40
                  ? 'w-2/5'
                  : pct >= 30
                    ? 'w-1/3'
                    : pct >= 20
                      ? 'w-1/5'
                      : pct >= 10
                        ? 'w-1/12'
                        : 'w-0'

  return (
    <div className="space-y-4">
      {/* Compression Warning */}
      {schedule.isCompressed && (
        <div className="bg-amber-950 border border-amber-200 rounded-lg p-3">
          <p className="text-sm font-medium text-amber-900">
            Compressed timeline -{' '}
            {schedule.leadTimeDays <= 0
              ? 'same-day'
              : `${schedule.leadTimeDays} day${schedule.leadTimeDays === 1 ? '' : 's'}`}{' '}
            notice
          </p>
          <p className="text-xs text-amber-200 mt-1">
            Standard day-before procedures may not apply. Shopping and prep run back to back.
          </p>
        </div>
      )}

      {/* Override Notes */}
      {schedule.overrides.length > 0 && (
        <div className="space-y-1">
          {schedule.overrides.map((override, i) => (
            <p key={i} className="text-xs text-stone-500 italic">
              {override}
            </p>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-stone-800 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-stone-300">DOP Progress</span>
          <span className="text-sm text-stone-500">
            {totalCompleted} / {progress.total} tasks
          </span>
        </div>
        <div className="w-full bg-stone-700 rounded-full h-2">
          <div className={`bg-brand-600 h-2 rounded-full transition-all ${progressWidthClass}`} />
        </div>
        {manualCount > 0 && (
          <p className="text-xs text-stone-300 mt-1">{manualCount} manually confirmed</p>
        )}
      </div>

      {/* Phases */}
      <PhaseSection
        name="atBooking"
        phase={schedule.schedule.atBooking}
        eventId={eventId}
        manualCompletionKeys={manualCompletionKeys}
      />
      <PhaseSection
        name="dayBefore"
        phase={schedule.schedule.dayBefore}
        eventId={eventId}
        manualCompletionKeys={manualCompletionKeys}
      />
      <PhaseSection
        name="morningOf"
        phase={schedule.schedule.morningOf}
        eventId={eventId}
        manualCompletionKeys={manualCompletionKeys}
      />
      <PhaseSection
        name="preDeparture"
        phase={schedule.schedule.preDeparture}
        eventId={eventId}
        manualCompletionKeys={manualCompletionKeys}
      />
      <PhaseSection
        name="postService"
        phase={schedule.schedule.postService}
        eventId={eventId}
        manualCompletionKeys={manualCompletionKeys}
      />
    </div>
  )
}

/**
 * Compact DOP progress bar for embedding in event detail.
 */
export function DOPProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-stone-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percent === 100 ? 'bg-green-500' : percent >= 50 ? 'bg-brand-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm text-stone-300 whitespace-nowrap">
        {completed}/{total} tasks
      </span>
    </div>
  )
}
