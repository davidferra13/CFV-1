'use client'

import { useState, useTransition } from 'react'
import {
  type MaintenanceEntry,
  type MaintenanceType,
  type CreateMaintenanceInput,
  createMaintenanceEntry,
  deleteMaintenanceEntry,
  getMaintenanceTypeLabel,
} from '@/lib/food-truck/vehicle-maintenance-actions'

// ---- Constants ----

const MAINTENANCE_TYPE_COLORS: Record<MaintenanceType, string> = {
  oil_change: 'bg-amber-500/20 text-amber-300',
  tire_rotation: 'bg-blue-500/20 text-blue-300',
  brake_service: 'bg-red-500/20 text-red-300',
  engine: 'bg-orange-500/20 text-orange-300',
  electrical: 'bg-yellow-500/20 text-yellow-300',
  body_work: 'bg-purple-500/20 text-purple-300',
  inspection: 'bg-green-500/20 text-green-300',
  cleaning: 'bg-cyan-500/20 text-cyan-300',
  other: 'bg-stone-500/20 text-stone-300',
}

const ALL_TYPES: MaintenanceType[] = [
  'oil_change',
  'tire_rotation',
  'brake_service',
  'engine',
  'electrical',
  'body_work',
  'inspection',
  'cleaning',
  'other',
]

// ---- Helpers ----

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function getDueUrgency(entry: MaintenanceEntry): 'overdue' | 'due_soon' | 'ok' | 'none' {
  if (!entry.next_due_date) return 'none'
  const days = daysUntil(entry.next_due_date)
  if (days < 0) return 'overdue'
  if (days <= 7) return 'due_soon'
  return 'ok'
}

// ---- Components ----

function DueBadge({ entry }: { entry: MaintenanceEntry }) {
  if (!entry.next_due_date) return null
  const days = daysUntil(entry.next_due_date)
  const urgency = getDueUrgency(entry)

  const styles = {
    overdue: 'bg-red-600/30 text-red-200 border-red-500/50',
    due_soon: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    ok: 'bg-green-500/20 text-green-300 border-green-500/40',
    none: '',
  }

  const label =
    days < 0 ? `Overdue by ${Math.abs(days)}d` : days === 0 ? 'Due today' : `Due in ${days}d`

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[urgency]}`}>{label}</span>
  )
}

function MaintenanceCard({
  entry,
  onDelete,
}: {
  entry: MaintenanceEntry
  onDelete: (id: string) => void
}) {
  const urgency = getDueUrgency(entry)
  const borderColor =
    urgency === 'overdue'
      ? 'border-red-500/30'
      : urgency === 'due_soon'
        ? 'border-yellow-500/30'
        : 'border-stone-700'

  return (
    <div className={`bg-stone-800 rounded-lg p-4 border ${borderColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-stone-100 font-medium">{entry.description}</h3>
          <p className="text-stone-400 text-sm">{entry.vehicle_name}</p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${MAINTENANCE_TYPE_COLORS[entry.maintenance_type]}`}
        >
          {getMaintenanceTypeLabel(entry.maintenance_type)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-stone-500">Date:</span>{' '}
          <span className="text-stone-300">{formatDate(entry.date_performed)}</span>
        </div>
        <div>
          <span className="text-stone-500">Cost:</span>{' '}
          <span className="text-stone-300">{formatCents(entry.cost_cents)}</span>
        </div>
        {entry.vendor_name && (
          <div>
            <span className="text-stone-500">Vendor:</span>{' '}
            <span className="text-stone-300">{entry.vendor_name}</span>
          </div>
        )}
        {entry.odometer_reading && (
          <div>
            <span className="text-stone-500">Odometer:</span>{' '}
            <span className="text-stone-300">{entry.odometer_reading.toLocaleString()} mi</span>
          </div>
        )}
        {entry.next_due_date && (
          <div>
            <span className="text-stone-500">Next Due:</span>{' '}
            <span className="text-stone-300">{formatDate(entry.next_due_date)}</span>
          </div>
        )}
        {entry.next_due_mileage && (
          <div>
            <span className="text-stone-500">Due at:</span>{' '}
            <span className="text-stone-300">{entry.next_due_mileage.toLocaleString()} mi</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <DueBadge entry={entry} />
        <button
          onClick={() => onDelete(entry.id)}
          className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function CostSummaryTable({
  costSummary,
}: {
  costSummary: { totalCents: number; byType: Record<MaintenanceType, number>; count: number }
}) {
  const entries = Object.entries(costSummary.byType)
    .filter(([, cents]) => cents > 0)
    .sort(([, a], [, b]) => b - a) as [MaintenanceType, number][]

  if (entries.length === 0) return null

  return (
    <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700">
      <h3 className="text-stone-300 text-sm font-medium mb-3">Cost Breakdown (This Year)</h3>
      <div className="space-y-2">
        {entries.map(([type, cents]) => (
          <div key={type} className="flex items-center justify-between text-sm">
            <span className="text-stone-400">
              {getMaintenanceTypeLabel(type as MaintenanceType)}
            </span>
            <span className="text-stone-200">{formatCents(cents)}</span>
          </div>
        ))}
        <div className="border-t border-stone-700 pt-2 flex items-center justify-between text-sm font-medium">
          <span className="text-stone-300">Total</span>
          <span className="text-stone-100">{formatCents(costSummary.totalCents)}</span>
        </div>
      </div>
    </div>
  )
}

function AddMaintenanceModal({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateMaintenanceInput) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<CreateMaintenanceInput>({
    vehicle_name: 'Primary Truck',
    maintenance_type: 'oil_change',
    description: '',
    date_performed: new Date().toISOString().split('T')[0],
    next_due_date: null,
    next_due_mileage: null,
    cost_cents: 0,
    vendor_name: '',
    odometer_reading: null,
    notes: '',
  })

  const [costDollars, setCostDollars] = useState('')

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim() || !form.date_performed) return
    onSubmit({
      ...form,
      cost_cents: costDollars ? Math.round(parseFloat(costDollars) * 100) : 0,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-800 border border-stone-700 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-100">Log Maintenance</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Vehicle</label>
              <input
                type="text"
                value={form.vehicle_name ?? 'Primary Truck'}
                onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Type *</label>
              <select
                value={form.maintenance_type}
                onChange={(e) =>
                  setForm({ ...form, maintenance_type: e.target.value as MaintenanceType })
                }
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getMaintenanceTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-400 mb-1">Description *</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Full synthetic oil change, 5W-30"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Date Performed *</label>
              <input
                type="date"
                required
                value={form.date_performed}
                onChange={(e) => setForm({ ...form, date_performed: e.target.value })}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costDollars}
                onChange={(e) => setCostDollars(e.target.value)}
                placeholder="0.00"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Vendor</label>
              <input
                type="text"
                value={form.vendor_name ?? ''}
                onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                placeholder="Jiffy Lube"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Odometer</label>
              <input
                type="number"
                min="0"
                value={form.odometer_reading ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    odometer_reading: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="45000"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Next Due Date</label>
              <input
                type="date"
                value={form.next_due_date ?? ''}
                onChange={(e) => setForm({ ...form, next_due_date: e.target.value || null })}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Next Due Mileage</label>
              <input
                type="number"
                min="0"
                value={form.next_due_mileage ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    next_due_mileage: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="48000"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-400 mb-1">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !form.description.trim() || !form.date_performed}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving...' : 'Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Main Component ----

type VehicleMaintenanceProps = {
  initialHistory: MaintenanceEntry[]
  initialUpcoming: MaintenanceEntry[]
  initialOverdue: MaintenanceEntry[]
  costSummary: { totalCents: number; byType: Record<MaintenanceType, number>; count: number }
  currentOdometer: { reading: number | null; asOf: string | null }
}

export default function VehicleMaintenance({
  initialHistory,
  initialUpcoming,
  initialOverdue,
  costSummary,
  currentOdometer,
}: VehicleMaintenanceProps) {
  const [history, setHistory] = useState(initialHistory)
  const [upcoming, setUpcoming] = useState(initialUpcoming)
  const [overdue, setOverdue] = useState(initialOverdue)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAdd = (data: CreateMaintenanceInput) => {
    const prevHistory = history
    const prevUpcoming = upcoming

    startTransition(async () => {
      try {
        setError(null)
        const entry = await createMaintenanceEntry(data)
        setHistory((prev) => [entry, ...prev])
        if (entry.next_due_date) {
          const days = daysUntil(entry.next_due_date)
          if (days >= 0) {
            setUpcoming((prev) =>
              [...prev, entry].sort(
                (a, b) =>
                  new Date(a.next_due_date!).getTime() - new Date(b.next_due_date!).getTime()
              )
            )
          }
        }
        setShowAddModal(false)
      } catch (err) {
        setHistory(prevHistory)
        setUpcoming(prevUpcoming)
        setError(err instanceof Error ? err.message : 'Failed to log maintenance')
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this maintenance entry?')) return
    const prevHistory = history
    const prevUpcoming = upcoming
    const prevOverdue = overdue

    startTransition(async () => {
      try {
        setError(null)
        setHistory((prev) => prev.filter((e) => e.id !== id))
        setUpcoming((prev) => prev.filter((e) => e.id !== id))
        setOverdue((prev) => prev.filter((e) => e.id !== id))
        await deleteMaintenanceEntry(id)
      } catch (err) {
        setHistory(prevHistory)
        setUpcoming(prevUpcoming)
        setOverdue(prevOverdue)
        setError(err instanceof Error ? err.message : 'Failed to delete entry')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700 flex-1 min-w-[160px]">
          <p className="text-stone-400 text-sm">Total Cost (This Year)</p>
          <p className="text-2xl font-bold text-stone-100">{formatCents(costSummary.totalCents)}</p>
          <p className="text-stone-500 text-xs">{costSummary.count} entries</p>
        </div>
        <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700 flex-1 min-w-[160px]">
          <p className="text-stone-400 text-sm">Current Odometer</p>
          <p className="text-2xl font-bold text-stone-100">
            {currentOdometer.reading
              ? `${currentOdometer.reading.toLocaleString()} mi`
              : 'Not recorded'}
          </p>
          {currentOdometer.asOf && (
            <p className="text-stone-500 text-xs">as of {formatDate(currentOdometer.asOf)}</p>
          )}
        </div>
        <div className="flex items-center">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors font-medium h-fit"
          >
            + Log Maintenance
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-red-300 mb-3 flex items-center gap-2">
            Overdue
            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
              {overdue.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {overdue.map((e) => (
              <MaintenanceCard key={e.id} entry={e} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
            Upcoming
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
              {upcoming.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((e) => (
              <MaintenanceCard key={e.id} entry={e} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      <CostSummaryTable costSummary={costSummary} />

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-stone-200 mb-3 flex items-center gap-2">
          History
          <span className="text-xs bg-stone-600/30 text-stone-400 px-2 py-0.5 rounded-full">
            {history.length}
          </span>
        </h2>
        {history.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((e) => (
              <MaintenanceCard key={e.id} entry={e} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-500">
            <p className="text-lg mb-2">No maintenance records yet</p>
            <p className="text-sm mb-4">
              Log oil changes, inspections, tire rotations, and repairs to stay on top of your
              truck's health.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
            >
              Log First Entry
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AddMaintenanceModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAdd}
        isPending={isPending}
      />
    </div>
  )
}
