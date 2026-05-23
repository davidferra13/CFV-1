import { Archive, CheckCircle, Pause, Play, Shield } from '@/components/ui/icons'
import {
  activateRemyRoutineFromForm,
  archiveRemyRoutineFromForm,
  pauseRemyRoutineFromForm,
  proposeRemyRoutineFromForm,
} from '@/lib/ai/remy-routine-form-actions'
import type {
  RemyRoutine,
  RemyRoutineExecutionAuditEntry,
  RemyRoutineMatchAuditEntry,
} from '@/lib/ai/remy-routines-types'

const triggerOptions = ['signal', 'event', 'schedule', 'manual', 'webhook'] as const
const actionOptions = [
  'record_routine_event',
  'queue_review',
  'create_notification_draft',
  'create_task_draft',
] as const

function statusLabel(status: RemyRoutine['status']): string {
  if (status === 'paused') return 'draft'
  return status
}

function statusClass(status: RemyRoutine['status']): string {
  switch (status) {
    case 'active':
      return 'border-emerald-800 bg-emerald-950/40 text-emerald-200'
    case 'paused':
      return 'border-amber-800 bg-amber-950/40 text-amber-200'
    case 'archived':
      return 'border-stone-700 bg-stone-900 text-stone-300'
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function RemyRoutineControlPanel({
  routines,
  matchAudit,
  executionAudit,
}: {
  routines: RemyRoutine[]
  matchAudit: RemyRoutineMatchAuditEntry[]
  executionAudit: RemyRoutineExecutionAuditEntry[]
}) {
  const active = routines.filter((routine) => routine.status === 'active')
  const drafts = routines.filter((routine) => routine.status === 'paused')
  const archived = routines.filter((routine) => routine.status === 'archived')

  return (
    <section className="space-y-6 border-t border-stone-800 pt-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-brand-300">
          <Shield className="h-4 w-4" />
          <h2 className="text-lg font-semibold text-stone-100">Remy Routines</h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-stone-400">
          Routines are tenant-scoped workflow data, not filesystem skills. New proposals stay as
          drafts until a chef activates them, and every runtime match or execution writes audit
          rows.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Active routines" value={active.length} />
        <Metric label="Draft proposals" value={drafts.length} />
        <Metric label="Archived" value={archived.length} />
      </div>

      <form
        action={proposeRemyRoutineFromForm}
        className="grid gap-4 rounded-lg border border-stone-800 bg-stone-900 p-4"
      >
        <div>
          <h3 className="text-base font-semibold text-stone-100">Draft Routine Proposal</h3>
          <p className="mt-1 text-sm text-stone-400">
            This creates a paused draft. Activation is a separate chef action.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs text-stone-400">
            Name
            <input
              name="name"
              required
              maxLength={160}
              className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              placeholder="Friday deposit follow-up"
            />
          </label>
          <label className="grid gap-1 text-xs text-stone-400">
            Trigger
            <select
              name="triggerType"
              defaultValue="signal"
              className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              {triggerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-stone-400">
            Condition path
            <input
              name="conditionPath"
              maxLength={160}
              className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              placeholder="data.message"
            />
          </label>
          <label className="grid gap-1 text-xs text-stone-400">
            Condition contains
            <input
              name="conditionValue"
              maxLength={160}
              className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              placeholder="deposit"
            />
          </label>
          <label className="grid gap-1 text-xs text-stone-400">
            Draft action
            <select
              name="actionKind"
              defaultValue="queue_review"
              className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            >
              {actionOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-stone-400">
            Action label
            <input
              name="actionLabel"
              maxLength={160}
              className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              placeholder="Queue deposit review"
            />
          </label>
        </div>
        <label className="grid gap-1 text-xs text-stone-400">
          Notes for chef review
          <textarea
            name="payloadNote"
            maxLength={500}
            rows={3}
            className="min-h-20 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            placeholder="Summarize the bounded draft Remy should prepare."
          />
        </label>
        <button className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500">
          <CheckCircle className="h-4 w-4" />
          Create draft
        </button>
      </form>

      <div className="grid gap-3">
        {routines.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-800 p-4 text-sm text-stone-500">
            No Remy routines have been created for this tenant.
          </div>
        ) : (
          routines.map((routine) => <RoutineRow key={routine.id} routine={routine} />)
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AuditList title="Recent Matches" rows={matchAudit} />
        <AuditList title="Execution and Version Audit" rows={executionAudit} />
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-100">{value}</p>
    </div>
  )
}

function RoutineRow({ routine }: { routine: RemyRoutine }) {
  return (
    <article className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusClass(
                routine.status
              )}`}
            >
              {statusLabel(routine.status)}
            </span>
            <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
              {routine.triggerType}
            </span>
            {routine.approvalRequired ? (
              <span className="rounded-full border border-amber-800 px-2 py-0.5 text-[11px] text-amber-200">
                approval required
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-base font-semibold text-stone-100">{routine.name}</h3>
          {routine.description ? (
            <p className="mt-1 text-sm leading-6 text-stone-400">{routine.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-stone-500">
            Updated {formatDateTime(routine.updatedAt)} by {routine.updatedByAuthUserId ?? 'system'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {routine.actions.map((action) => (
              <span
                key={action.id}
                className="rounded-full border border-stone-700 px-2 py-1 text-xs text-stone-300"
              >
                {action.kind.replaceAll('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {routine.status !== 'active' ? (
            <form action={activateRemyRoutineFromForm}>
              <input type="hidden" name="routineId" value={routine.id} />
              <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-800 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40">
                <Play className="h-4 w-4" />
                Activate
              </button>
            </form>
          ) : (
            <form action={pauseRemyRoutineFromForm}>
              <input type="hidden" name="routineId" value={routine.id} />
              <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-800 px-3 py-2 text-sm text-amber-200 hover:bg-amber-950/40">
                <Pause className="h-4 w-4" />
                Pause
              </button>
            </form>
          )}
          {routine.status !== 'archived' ? (
            <form action={archiveRemyRoutineFromForm}>
              <input type="hidden" name="routineId" value={routine.id} />
              <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800">
                <Archive className="h-4 w-4" />
                Archive
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function AuditList({
  title,
  rows,
}: {
  title: string
  rows: Array<RemyRoutineMatchAuditEntry | RemyRoutineExecutionAuditEntry>
}) {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <h3 className="text-base font-semibold text-stone-100">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-800 p-3 text-sm text-stone-500">
            No audit rows visible.
          </p>
        ) : (
          rows.slice(0, 8).map((row) => (
            <div key={row.id} className="rounded-md border border-stone-800 bg-stone-950 p-3">
              <p className="text-xs text-stone-500">{formatDateTime(row.createdAt)}</p>
              <p className="mt-1 text-sm text-stone-200">
                {'status' in row ? row.status : row.matched ? 'matched' : 'skipped'}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                {'errorMessage' in row ? (row.errorMessage ?? 'Recorded audit event.') : row.reason}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
