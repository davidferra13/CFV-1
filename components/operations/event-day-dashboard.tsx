'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { EventDayDashboard, ServiceIssue } from '@/lib/operations/event-day-actions'
import { logServiceIssue, toggleChecklistItem } from '@/lib/operations/event-day-actions'

const PHASE_COLORS: Record<string, { active: string; completed: string; pending: string }> = {
  arrival: { active: 'bg-orange-500', completed: 'bg-orange-800', pending: 'bg-stone-700' },
  setup: { active: 'bg-blue-500', completed: 'bg-blue-800', pending: 'bg-stone-700' },
  prep: { active: 'bg-brand-500', completed: 'bg-brand-800', pending: 'bg-stone-700' },
  service: { active: 'bg-emerald-500', completed: 'bg-emerald-800', pending: 'bg-stone-700' },
  breakdown: { active: 'bg-amber-500', completed: 'bg-amber-800', pending: 'bg-stone-700' },
  depart: { active: 'bg-purple-500', completed: 'bg-purple-800', pending: 'bg-stone-700' },
}

// -- Phase Timeline -----------------------------------------------------------
function PhaseTimeline({ phases }: { phases: EventDayDashboard['phases'] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle as="h3" className="text-sm text-stone-300">
          Event Day Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1">
          {phases.map((phase) => {
            const colors = PHASE_COLORS[phase.phase]
            const colorClass =
              phase.status === 'completed'
                ? colors.completed
                : phase.status === 'active'
                  ? colors.active
                  : colors.pending
            return (
              <div key={phase.phase} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`h-2 w-full rounded-full ${colorClass} ${phase.status === 'active' ? 'animate-pulse' : ''}`}
                />
                <span
                  className={`text-[10px] ${phase.status === 'active' ? 'text-stone-100 font-semibold' : 'text-stone-500'}`}
                >
                  {phase.label}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// -- Phase Checklist ----------------------------------------------------------
function PhaseChecklist({
  checklist,
  eventId,
}: {
  checklist: EventDayDashboard['checklist']
  eventId: string
}) {
  const [items, setItems] = useState(checklist)
  const [, startTransition] = useTransition()

  const phases = ['arrival', 'setup', 'prep', 'service', 'breakdown', 'depart'] as const

  function handleToggle(itemId: string, completed: boolean) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, completed, completedAt: completed ? new Date().toISOString() : null }
          : item
      )
    )
    startTransition(async () => {
      const result = await toggleChecklistItem({ eventId, itemId, completed })
      if (!result.success) {
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, completed: !completed } : item))
        )
        toast.error('Failed to update checklist')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle as="h3" className="text-sm text-stone-300">
          Phase Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phases.map((phase) => {
          const phaseItems = items.filter((item) => item.phase === phase)
          if (phaseItems.length === 0) return null
          const completedCount = phaseItems.filter((i) => i.completed).length
          return (
            <div key={phase}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-stone-400 uppercase">{phase}</span>
                <span className="text-[10px] text-stone-500">
                  {completedCount}/{phaseItems.length}
                </span>
              </div>
              <div className="space-y-1">
                {phaseItems.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => handleToggle(item.id, e.target.checked)}
                      className="rounded border-stone-600 bg-stone-700 text-brand-500 focus:ring-brand-500/20"
                    />
                    <span
                      className={`text-sm ${item.completed ? 'text-stone-500 line-through' : 'text-stone-300'}`}
                    >
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// -- Staff Station Grid -------------------------------------------------------
function StaffStationGrid({
  staffAssignments,
  stationGroups,
}: {
  staffAssignments: EventDayDashboard['staffAssignments']
  stationGroups: EventDayDashboard['stationGroups']
}) {
  if (staffAssignments.length === 0 && stationGroups.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle as="h3" className="text-sm text-stone-300">
          Staff &amp; Stations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stationGroups.map((group) => {
            const stationStaff = staffAssignments.filter((s) => s.stationId === group.stationId)
            return (
              <div key={group.stationId} className="rounded-lg border border-stone-600 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-stone-200">{group.stationName}</span>
                  <span className="text-xs text-stone-500">{group.totalEstimatedMinutes}m</span>
                </div>
                {stationStaff.length > 0 && (
                  <div className="mb-2">
                    {stationStaff.map((s) => (
                      <div key={s.staffId} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-stone-400">{s.staffName}</span>
                        {s.role && <Badge className="text-[10px] px-1">{s.role}</Badge>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.dishes.map((dish) => (
                    <p key={dish.id} className="text-xs text-stone-400">
                      C{dish.courseNumber}: {dish.name}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {staffAssignments.filter((s) => !s.stationId).length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-700">
            <span className="text-xs text-stone-500">Unassigned:</span>
            {staffAssignments
              .filter((s) => !s.stationId)
              .map((s) => (
                <span key={s.staffId} className="text-xs text-stone-400 ml-2">
                  {s.staffName}
                </span>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// -- Issue Log ----------------------------------------------------------------
function IssueLog({ issues: initialIssues, eventId }: { issues: ServiceIssue[]; eventId: string }) {
  const [issues, setIssues] = useState(initialIssues)
  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!description.trim()) return
    startTransition(async () => {
      const result = await logServiceIssue({ eventId, description: description.trim(), severity })
      if (result.success) {
        setIssues((prev) => [
          {
            id: Date.now().toString(),
            eventId,
            description: description.trim(),
            severity,
            resolvedAt: null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
        setDescription('')
        setShowForm(false)
        toast.success('Issue logged')
      } else {
        toast.error(result.error ?? 'Failed to log issue')
      }
    })
  }

  const severityColors = {
    low: 'text-stone-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle as="h3" className="text-sm text-stone-300">
          Issue Log
        </CardTitle>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Log Issue'}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-3 space-y-2 p-3 rounded-lg bg-stone-900 border border-stone-600">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened?"
              className="w-full rounded bg-stone-800 border-stone-600 text-stone-200 text-sm p-2 resize-none"
              rows={2}
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={`text-xs px-2 py-1 rounded border ${
                      severity === s ? 'border-stone-400 bg-stone-700' : 'border-stone-700'
                    } ${severityColors[s]}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={handleSubmit} disabled={isPending || !description.trim()}>
                Log
              </Button>
            </div>
          </div>
        )}
        {issues.length === 0 ? (
          <p className="text-xs text-stone-500 text-center py-2">No issues logged</p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-2 text-sm">
                <span className={`text-xs font-medium ${severityColors[issue.severity]}`}>
                  {issue.severity.toUpperCase()}
                </span>
                <span className="text-stone-300 flex-1">{issue.description}</span>
                <span className="text-[10px] text-stone-600 shrink-0">
                  {new Date(issue.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// -- Main Dashboard Component -------------------------------------------------
export function EventDayDashboardView({ data }: { data: EventDayDashboard }) {
  return (
    <div className="space-y-4">
      <PhaseTimeline phases={data.phases} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PhaseChecklist checklist={data.checklist} eventId={data.event.id} />
        <div className="space-y-4">
          <StaffStationGrid
            staffAssignments={data.staffAssignments}
            stationGroups={data.stationGroups}
          />
          <IssueLog issues={data.issues} eventId={data.event.id} />
        </div>
      </div>
    </div>
  )
}
