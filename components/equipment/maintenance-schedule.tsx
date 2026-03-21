'use client'

import { useState, useTransition } from 'react'
import {
  getMaintenanceSchedule,
  logMaintenance,
  type EquipmentMaintenanceStatus,
  type LogMaintenanceInput,
  type MaintenanceType,
} from '@/lib/equipment/maintenance-actions'

const STATUS_COLORS: Record<EquipmentMaintenanceStatus['status'], string> = {
  overdue: 'bg-red-100 text-red-800 border-red-200',
  due_soon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ok: 'bg-green-100 text-green-800 border-green-200',
  no_schedule: 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUS_LABELS: Record<EquipmentMaintenanceStatus['status'], string> = {
  overdue: 'Overdue',
  due_soon: 'Due Soon',
  ok: 'Up to Date',
  no_schedule: 'No Schedule',
}

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'routine', label: 'Routine' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
]

interface MaintenanceScheduleProps {
  initialSchedule: EquipmentMaintenanceStatus[]
}

export default function MaintenanceSchedule({ initialSchedule }: MaintenanceScheduleProps) {
  const [schedule, setSchedule] = useState<EquipmentMaintenanceStatus[]>(initialSchedule)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [logFormId, setLogFormId] = useState<string | null>(null)

  // Log form state
  const [formType, setFormType] = useState<MaintenanceType>('routine')
  const [formNotes, setFormNotes] = useState('')
  const [formCost, setFormCost] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formPerformedBy, setFormPerformedBy] = useState('')

  const resetForm = () => {
    setLogFormId(null)
    setFormType('routine')
    setFormNotes('')
    setFormCost('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormPerformedBy('')
  }

  const handleLogMaintenance = (equipmentId: string) => {
    const costCents = Math.round(parseFloat(formCost || '0') * 100)
    const previousSchedule = schedule
    setError(null)

    startTransition(async () => {
      try {
        await logMaintenance(equipmentId, {
          maintenanceType: formType,
          notes: formNotes || undefined,
          costCents,
          performedAt: new Date(formDate).toISOString(),
          performedBy: formPerformedBy || undefined,
        })
        // Refresh the schedule
        const updated = await getMaintenanceSchedule()
        setSchedule(updated)
        resetForm()
      } catch (err) {
        setSchedule(previousSchedule)
        setError(err instanceof Error ? err.message : 'Failed to log maintenance')
      }
    })
  }

  const overdueCount = schedule.filter((s) => s.status === 'overdue').length
  const dueSoonCount = schedule.filter((s) => s.status === 'due_soon').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Maintenance Schedule</h2>
        <div className="flex gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
              {overdueCount} overdue
            </span>
          )}
          {dueSoonCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
              {dueSoonCount} due soon
            </span>
          )}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {schedule.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">
          No equipment with maintenance schedules. Set a maintenance interval on your equipment to
          start tracking.
        </p>
      )}

      <div className="space-y-2">
        {schedule.map((item) => (
          <div key={item.id} className="rounded-md border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                  {item.calibrationRequired && (
                    <span className="inline-flex items-center rounded-full bg-brand-100 border border-brand-200 px-2 py-0.5 text-xs font-medium text-brand-800">
                      Calibration
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500 space-x-3">
                  <span className="capitalize">{item.category}</span>
                  {item.maintenanceIntervalDays && (
                    <span>Every {item.maintenanceIntervalDays} days</span>
                  )}
                  {item.lastMaintainedAt && (
                    <span>Last: {new Date(item.lastMaintainedAt).toLocaleDateString()}</span>
                  )}
                  {item.nextMaintenanceDue && (
                    <span>
                      Next: {new Date(item.nextMaintenanceDue).toLocaleDateString()}
                      {item.daysUntilDue !== null && (
                        <>
                          {' '}
                          (
                          {item.daysUntilDue <= 0
                            ? `${Math.abs(item.daysUntilDue)} days overdue`
                            : `in ${item.daysUntilDue} days`}
                          )
                        </>
                      )}
                    </span>
                  )}
                  {!item.lastMaintainedAt && item.maintenanceIntervalDays && (
                    <span className="text-red-600">Never maintained</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (logFormId === item.id) {
                    resetForm()
                  } else {
                    resetForm()
                    setLogFormId(item.id)
                    if (item.calibrationRequired) {
                      setFormType('calibration')
                    }
                  }
                }}
                className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
              >
                Log Maintenance
              </button>
            </div>

            {/* Log maintenance form */}
            {logFormId === item.id && (
              <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as MaintenanceType)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    >
                      {MAINTENANCE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cost ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formCost}
                      onChange={(e) => setFormCost(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Performed By
                    </label>
                    <input
                      type="text"
                      placeholder="Name or vendor"
                      value={formPerformedBy}
                      onChange={(e) => setFormPerformedBy(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      placeholder="What was done..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLogMaintenance(item.id)}
                    disabled={isPending}
                    className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
