// DOP View Component — shows Default Operating Procedure status
// Server component.

import type { DOPSchedule, DOPPhase, DOPTask } from '@/lib/scheduling/types'
import { getDOPProgress } from '@/lib/scheduling/dop'

const PHASE_LABELS: Record<string, string> = {
  atBooking: 'At Booking',
  dayBefore: 'Day Before',
  morningOf: 'Morning Of',
  preDeparture: 'Pre-Departure',
  postService: 'Post-Service',
}

const STATUS_COLORS: Record<string, string> = {
  complete: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  upcoming: 'bg-brand-100 text-brand-800',
  not_applicable: 'bg-stone-100 text-stone-500',
}

function TaskRow({ task }: { task: DOPTask }) {
  return (
    <div className={`flex items-start gap-3 py-2 ${task.isOverdue ? 'bg-red-50 -mx-2 px-2 rounded' : ''}`}>
      <span className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded flex items-center justify-center text-xs ${
        task.isComplete
          ? 'bg-green-100 text-green-600'
          : task.isOverdue
            ? 'bg-red-100 text-red-600'
            : 'bg-stone-100 text-stone-400'
      }`}>
        {task.isComplete ? '\u2713' : task.isOverdue ? '!' : '\u00B7'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${task.isComplete ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
            {task.label}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
            task.category === 'documents' ? 'bg-purple-50 text-purple-700' :
            task.category === 'shopping' ? 'bg-green-50 text-green-700' :
            task.category === 'prep' ? 'bg-brand-50 text-brand-700' :
            task.category === 'packing' ? 'bg-yellow-50 text-yellow-700' :
            task.category === 'reset' ? 'bg-orange-50 text-orange-700' :
            'bg-stone-50 text-stone-700'
          }`}>
            {task.category}
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">{task.description}</p>
      </div>
    </div>
  )
}

function PhaseSection({ name, phase }: { name: string; phase: DOPPhase }) {
  if (phase.status === 'not_applicable') return null

  return (
    <div className="border border-stone-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-900">
          {PHASE_LABELS[name] || name}
          {phase.date && (
            <span className="ml-2 text-xs font-normal text-stone-500">{phase.date}</span>
          )}
        </h3>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[phase.status]}`}>
          {phase.status}
        </span>
      </div>
      <div className="space-y-1">
        {phase.tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

export function DOPView({ schedule }: { schedule: DOPSchedule }) {
  const progress = getDOPProgress(schedule)

  return (
    <div className="space-y-4">
      {/* Compression Warning */}
      {schedule.isCompressed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm font-medium text-amber-900">
            Compressed timeline — {schedule.leadTimeDays <= 0 ? 'same-day' : `${schedule.leadTimeDays} day${schedule.leadTimeDays === 1 ? '' : 's'}`} notice
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Standard day-before procedures may not apply. Shopping and prep run back to back.
          </p>
        </div>
      )}

      {/* Override Notes */}
      {schedule.overrides.length > 0 && (
        <div className="space-y-1">
          {schedule.overrides.map((override, i) => (
            <p key={i} className="text-xs text-stone-500 italic">{override}</p>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-stone-50 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-stone-700">DOP Progress</span>
          <span className="text-sm text-stone-500">{progress.completed} / {progress.total} tasks</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2">
          <div
            className="bg-brand-600 h-2 rounded-full transition-all"
            style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      <PhaseSection name="atBooking" phase={schedule.schedule.atBooking} />
      <PhaseSection name="dayBefore" phase={schedule.schedule.dayBefore} />
      <PhaseSection name="morningOf" phase={schedule.schedule.morningOf} />
      <PhaseSection name="preDeparture" phase={schedule.schedule.preDeparture} />
      <PhaseSection name="postService" phase={schedule.schedule.postService} />
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
      <div className="flex-1 bg-stone-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percent === 100 ? 'bg-green-500' : percent >= 50 ? 'bg-brand-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm text-stone-600 whitespace-nowrap">{completed}/{total} tasks</span>
    </div>
  )
}
