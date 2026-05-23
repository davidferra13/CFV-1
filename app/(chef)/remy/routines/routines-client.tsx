'use client'

import { useState, useTransition } from 'react'
import type {
  RemyRoutine,
  RoutineStatus,
  RoutineTriggerType,
  CreateRoutineInput,
  ConditionGroup,
  RoutineActionDef,
} from '@/lib/remy/routines/types'
import {
  createRoutine,
  updateRoutine,
  deleteRoutine,
  setRoutineStatus,
} from '@/lib/remy/routines/routine-actions'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: RoutineStatus }) {
  const styles: Record<RoutineStatus, string> = {
    active: 'bg-green-900/40 text-green-400 border-green-700/40',
    paused: 'bg-amber-900/40 text-amber-400 border-amber-700/40',
    archived: 'bg-stone-800 text-stone-500 border-stone-700/40',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}
    >
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Trigger badge
// ---------------------------------------------------------------------------

function TriggerBadge({ type }: { type: RoutineTriggerType }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-stone-800 text-stone-400 border border-stone-700/40">
      {type}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Condition preview
// ---------------------------------------------------------------------------

function ConditionPreview({ group }: { group: ConditionGroup }) {
  if (!group.conditions || group.conditions.length === 0) {
    return <span className="text-xs text-stone-500 italic">No conditions</span>
  }
  return (
    <span className="text-xs text-stone-400">
      {group.mode === 'all' ? 'ALL' : 'ANY'}:{' '}
      {group.conditions
        .map((c) => `${c.field} ${c.operator} ${JSON.stringify(c.value)}`)
        .join(', ')}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Create / Edit form
// ---------------------------------------------------------------------------

interface RoutineFormProps {
  initial?: RemyRoutine | null
  onDone: () => void
}

function RoutineForm({ initial, onDone }: RoutineFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [triggerType, setTriggerType] = useState<RoutineTriggerType>(
    initial?.trigger_type ?? 'signal'
  )
  const [triggerConfigJson, setTriggerConfigJson] = useState(
    initial?.trigger_config ? JSON.stringify(initial.trigger_config, null, 2) : '{}'
  )
  const [conditionsJson, setConditionsJson] = useState(
    initial?.condition_group
      ? JSON.stringify(initial.condition_group, null, 2)
      : '{"mode":"all","conditions":[]}'
  )
  const [actionsJson, setActionsJson] = useState(
    initial?.actions
      ? JSON.stringify(initial.actions, null, 2)
      : '[{"id":"a1","kind":"record_routine_event","label":"Log event","payload":{}}]'
  )
  const [approvalRequired, setApprovalRequired] = useState(initial?.approval_required ?? false)

  function handleSubmit() {
    setError(null)

    let triggerConfig: Record<string, unknown>
    let conditionGroup: ConditionGroup
    let actions: RoutineActionDef[]

    try {
      triggerConfig = JSON.parse(triggerConfigJson)
    } catch {
      setError('Trigger config is not valid JSON.')
      return
    }
    try {
      conditionGroup = JSON.parse(conditionsJson)
    } catch {
      setError('Conditions is not valid JSON.')
      return
    }
    try {
      actions = JSON.parse(actionsJson)
    } catch {
      setError('Actions is not valid JSON.')
      return
    }

    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    startTransition(async () => {
      try {
        if (initial) {
          await updateRoutine(initial.id, {
            name,
            description: description || null,
            trigger_type: triggerType,
            trigger_config: triggerConfig as any,
            condition_group: conditionGroup,
            actions,
            approval_required: approvalRequired,
          })
        } else {
          const input: CreateRoutineInput = {
            name,
            description: description || undefined,
            trigger_type: triggerType,
            trigger_config: triggerConfig as any,
            condition_group: conditionGroup,
            actions,
            approval_required: approvalRequired,
          }
          await createRoutine(input)
        }
        onDone()
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save routine.')
      }
    })
  }

  const triggerTypes: RoutineTriggerType[] = ['signal', 'event', 'schedule', 'manual', 'webhook']

  return (
    <div className="space-y-4 rounded-lg border border-stone-700/60 bg-stone-900/60 p-4">
      <h3 className="text-sm font-semibold text-stone-200">
        {initial ? 'Edit Routine' : 'New Routine'}
      </h3>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Name</label>
        <input
          type="text"
          className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={160}
          placeholder="e.g. Auto-review new inquiries"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Description</label>
        <input
          type="text"
          className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>

      {/* Trigger type */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Trigger Type</label>
        <select
          className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as RoutineTriggerType)}
        >
          {triggerTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Trigger config JSON */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">
          Trigger Config (JSON)
        </label>
        <textarea
          className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={3}
          value={triggerConfigJson}
          onChange={(e) => setTriggerConfigJson(e.target.value)}
        />
      </div>

      {/* Conditions JSON */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Conditions (JSON)</label>
        <textarea
          className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={4}
          value={conditionsJson}
          onChange={(e) => setConditionsJson(e.target.value)}
        />
      </div>

      {/* Actions JSON */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Actions (JSON)</label>
        <textarea
          className="w-full rounded bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={5}
          value={actionsJson}
          onChange={(e) => setActionsJson(e.target.value)}
        />
      </div>

      {/* Approval required */}
      <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
        <input
          type="checkbox"
          className="rounded bg-stone-800 border-stone-600"
          checked={approvalRequired}
          onChange={(e) => setApprovalRequired(e.target.checked)}
        />
        Require approval before execution
      </label>

      {/* Submit */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : initial ? 'Save Changes' : 'Create as Draft'}
        </button>
        <button
          onClick={onDone}
          className="px-4 py-2 text-sm font-medium rounded bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Routine row
// ---------------------------------------------------------------------------

interface RoutineRowProps {
  routine: RemyRoutine
  onEdit: (r: RemyRoutine) => void
  onRefresh: () => void
}

function RoutineRow({ routine, onEdit, onRefresh }: RoutineRowProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    setError(null)
    const next: RoutineStatus = routine.status === 'active' ? 'paused' : 'active'
    startTransition(async () => {
      try {
        await setRoutineStatus(routine.id, next)
        onRefresh()
      } catch (err: any) {
        setError(err?.message ?? 'Failed to toggle status.')
      }
    })
  }

  function handleDelete() {
    if (!confirm('Delete this routine permanently?')) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteRoutine(routine.id)
        onRefresh()
      } catch (err: any) {
        setError(err?.message ?? 'Failed to delete.')
      }
    })
  }

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      try {
        await setRoutineStatus(routine.id, 'archived')
        onRefresh()
      } catch (err: any) {
        setError(err?.message ?? 'Failed to archive.')
      }
    })
  }

  const lastUpdated = routine.updated_at ? new Date(routine.updated_at).toLocaleString() : null

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/40 p-4 space-y-2">
      {error && <div className="text-xs text-red-400 bg-red-900/20 rounded px-2 py-1">{error}</div>}

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-stone-100 truncate">{routine.name}</span>
            <StatusBadge status={routine.status} />
            <TriggerBadge type={routine.trigger_type} />
            {routine.approval_required && (
              <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">
                approval
              </span>
            )}
          </div>
          {routine.description && <p className="text-xs text-stone-400">{routine.description}</p>}
          <ConditionPreview group={routine.condition_group} />
          {lastUpdated && <p className="text-xs text-stone-500">Updated: {lastUpdated}</p>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {routine.status !== 'archived' && (
            <button
              onClick={handleToggle}
              disabled={isPending}
              className="px-2.5 py-1 text-xs rounded bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {routine.status === 'active' ? 'Pause' : 'Activate'}
            </button>
          )}
          <button
            onClick={() => onEdit(routine)}
            disabled={isPending}
            className="px-2.5 py-1 text-xs rounded bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            Edit
          </button>
          {routine.status !== 'archived' && (
            <button
              onClick={handleArchive}
              disabled={isPending}
              className="px-2.5 py-1 text-xs rounded bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              Archive
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-2.5 py-1 text-xs rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 disabled:opacity-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Actions preview */}
      <div className="flex flex-wrap gap-1.5">
        {routine.actions.map((a) => (
          <span
            key={a.id}
            className="text-xs bg-stone-800/80 text-stone-400 px-2 py-0.5 rounded border border-stone-700/40"
          >
            {a.kind}: {a.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface RoutinesClientProps {
  initialRoutines: RemyRoutine[]
}

export function RoutinesClient({ initialRoutines }: RoutinesClientProps) {
  const [routines, setRoutines] = useState<RemyRoutine[]>(initialRoutines)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RemyRoutine | null>(null)
  const [filterStatus, setFilterStatus] = useState<RoutineStatus | 'all'>('all')
  const [, startTransition] = useTransition()

  function refreshRoutines() {
    startTransition(async () => {
      try {
        const { listRoutines } = await import('@/lib/remy/routines/routine-actions')
        const fresh = await listRoutines({ limit: 100 })
        setRoutines(fresh)
      } catch {
        // keep current list on error
      }
    })
  }

  function handleFormDone() {
    setShowForm(false)
    setEditing(null)
    refreshRoutines()
  }

  function handleEdit(r: RemyRoutine) {
    setEditing(r)
    setShowForm(true)
  }

  const filtered =
    filterStatus === 'all' ? routines : routines.filter((r) => r.status === filterStatus)

  const counts = {
    all: routines.length,
    active: routines.filter((r) => r.status === 'active').length,
    paused: routines.filter((r) => r.status === 'paused').length,
    archived: routines.filter((r) => r.status === 'archived').length,
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-100">Routines</h1>
            <p className="text-sm text-stone-400 mt-1">
              Automated workflows Remy can run on your behalf. New routines start as drafts;
              activate when ready.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              className="px-4 py-2 text-sm font-medium rounded bg-brand-600 text-white hover:bg-brand-500 transition-colors shrink-0"
            >
              New Routine
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {(['all', 'active', 'paused', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === s
                  ? 'bg-brand-900/40 text-brand-400'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          ))}
        </div>

        {/* Create / Edit form */}
        {showForm && <RoutineForm initial={editing} onDone={handleFormDone} />}

        {/* Routine list */}
        {filtered.length === 0 && !showForm && (
          <div className="text-center py-12 text-stone-500">
            <p className="text-sm">
              No routines{filterStatus !== 'all' ? ` with status "${filterStatus}"` : ''}.
            </p>
            <p className="text-xs mt-1">Create one to automate Remy workflows.</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((r) => (
            <RoutineRow key={r.id} routine={r} onEdit={handleEdit} onRefresh={refreshRoutines} />
          ))}
        </div>
      </div>
    </div>
  )
}
