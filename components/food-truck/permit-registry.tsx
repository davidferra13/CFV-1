'use client'

import { useState, useTransition } from 'react'
import {
  type Permit,
  type PermitType,
  type PermitStatus,
  type CreatePermitInput,
  createPermit,
  updatePermit,
  deletePermit,
  renewPermit,
} from '@/lib/food-truck/permit-actions'

// ---- Constants ----

const PERMIT_TYPE_LABELS: Record<PermitType, string> = {
  health: 'Health',
  business: 'Business',
  fire: 'Fire',
  parking: 'Parking',
  vendor: 'Vendor',
  mobile_food: 'Mobile Food',
  other: 'Other',
}

const PERMIT_TYPE_COLORS: Record<PermitType, string> = {
  health: 'bg-red-500/20 text-red-300',
  business: 'bg-blue-500/20 text-blue-300',
  fire: 'bg-orange-500/20 text-orange-300',
  parking: 'bg-purple-500/20 text-purple-300',
  vendor: 'bg-green-500/20 text-green-300',
  mobile_food: 'bg-yellow-500/20 text-yellow-300',
  other: 'bg-stone-500/20 text-stone-300',
}

const STATUS_COLORS: Record<PermitStatus, string> = {
  active: 'bg-green-500/20 text-green-300',
  expired: 'bg-red-500/20 text-red-300',
  pending_renewal: 'bg-yellow-500/20 text-yellow-300',
  revoked: 'bg-stone-500/20 text-stone-400',
}

const STATUS_LABELS: Record<PermitStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  pending_renewal: 'Pending Renewal',
  revoked: 'Revoked',
}

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

function formatCents(cents: number | null): string {
  if (cents === null || cents === undefined) return 'N/A'
  return `$${(cents / 100).toFixed(2)}`
}

function getExpiryUrgency(permit: Permit): 'expired' | 'critical' | 'warning' | 'ok' {
  const days = daysUntil(permit.expiry_date)
  if (days < 0) return 'expired'
  if (days <= 7) return 'critical'
  if (days <= permit.renewal_lead_days) return 'warning'
  return 'ok'
}

// ---- Components ----

function ExpiryBadge({ permit }: { permit: Permit }) {
  const urgency = getExpiryUrgency(permit)
  const days = daysUntil(permit.expiry_date)

  const styles = {
    expired: 'bg-red-600/30 text-red-200 border-red-500/50',
    critical: 'bg-red-500/20 text-red-300 border-red-500/40',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    ok: 'bg-green-500/20 text-green-300 border-green-500/40',
  }

  const label =
    days < 0
      ? `Expired ${Math.abs(days)}d ago`
      : days === 0
        ? 'Expires today'
        : `${days}d remaining`

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[urgency]}`}>{label}</span>
  )
}

function PermitCard({
  permit,
  onRenew,
  onDelete,
}: {
  permit: Permit
  onRenew: (id: string) => void
  onDelete: (id: string) => void
}) {
  const urgency = getExpiryUrgency(permit)
  const borderColor =
    urgency === 'expired' || urgency === 'critical'
      ? 'border-red-500/30'
      : urgency === 'warning'
        ? 'border-yellow-500/30'
        : 'border-stone-700'

  return (
    <div className={`bg-stone-800 rounded-lg p-4 border ${borderColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-stone-100 font-medium truncate">{permit.name}</h3>
          {permit.issuing_authority && (
            <p className="text-stone-400 text-sm">{permit.issuing_authority}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${PERMIT_TYPE_COLORS[permit.permit_type]}`}
          >
            {PERMIT_TYPE_LABELS[permit.permit_type]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        {permit.permit_number && (
          <div>
            <span className="text-stone-500">Permit #:</span>{' '}
            <span className="text-stone-300">{permit.permit_number}</span>
          </div>
        )}
        <div>
          <span className="text-stone-500">Expires:</span>{' '}
          <span className="text-stone-300">{formatDate(permit.expiry_date)}</span>
        </div>
        {permit.issue_date && (
          <div>
            <span className="text-stone-500">Issued:</span>{' '}
            <span className="text-stone-300">{formatDate(permit.issue_date)}</span>
          </div>
        )}
        {permit.cost_cents !== null && (
          <div>
            <span className="text-stone-500">Cost:</span>{' '}
            <span className="text-stone-300">{formatCents(permit.cost_cents)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExpiryBadge permit={permit} />
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[permit.status]}`}>
            {STATUS_LABELS[permit.status]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onRenew(permit.id)}
            className="text-xs px-2 py-1 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 transition-colors"
          >
            Renew
          </button>
          <button
            onClick={() => onDelete(permit.id)}
            className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function CalendarStrip({ permits }: { permits: Permit[] }) {
  const upcoming = permits
    .filter((p) => p.status === 'active' && daysUntil(p.expiry_date) >= 0)
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
    .slice(0, 6)

  if (upcoming.length === 0) return null

  return (
    <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700">
      <h3 className="text-stone-300 text-sm font-medium mb-3">Upcoming Expirations</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {upcoming.map((p) => {
          const days = daysUntil(p.expiry_date)
          const urgency = getExpiryUrgency(p)
          const bg =
            urgency === 'critical'
              ? 'bg-red-500/10 border-red-500/30'
              : urgency === 'warning'
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-stone-700/50 border-stone-600'
          return (
            <div
              key={p.id}
              className={`flex-shrink-0 rounded-lg p-3 border ${bg} text-center min-w-[100px]`}
            >
              <div className="text-lg font-bold text-stone-100">{days}d</div>
              <div className="text-xs text-stone-400 truncate max-w-[90px]">{p.name}</div>
              <div className="text-xs text-stone-500 mt-1">{formatDate(p.expiry_date)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddPermitModal({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreatePermitInput) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<CreatePermitInput>({
    name: '',
    permit_type: 'health',
    issuing_authority: '',
    permit_number: '',
    issue_date: '',
    expiry_date: '',
    renewal_lead_days: 30,
    cost_cents: null,
    notes: '',
    document_url: '',
  })

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.expiry_date) return
    onSubmit({
      ...form,
      cost_cents: form.cost_cents ? Number(form.cost_cents) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-800 border border-stone-700 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-100">Add Permit</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1">Permit Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="City of Austin Health Permit"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Permit Type *</label>
              <select
                value={form.permit_type}
                onChange={(e) => setForm({ ...form, permit_type: e.target.value as PermitType })}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {Object.entries(PERMIT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Permit Number</label>
              <input
                type="text"
                value={form.permit_number ?? ''}
                onChange={(e) => setForm({ ...form, permit_number: e.target.value })}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-400 mb-1">Issuing Authority</label>
            <input
              type="text"
              value={form.issuing_authority ?? ''}
              onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })}
              placeholder="City Health Department"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Issue Date</label>
              <input
                type="date"
                value={form.issue_date ?? ''}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_cents ? (form.cost_cents / 100).toFixed(2) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cost_cents: e.target.value
                      ? Math.round(parseFloat(e.target.value) * 100)
                      : null,
                  })
                }
                placeholder="0.00"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Alert Days Before Expiry</label>
              <input
                type="number"
                min="1"
                value={form.renewal_lead_days ?? 30}
                onChange={(e) =>
                  setForm({ ...form, renewal_lead_days: parseInt(e.target.value) || 30 })
                }
                className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
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
              disabled={isPending || !form.name.trim() || !form.expiry_date}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Adding...' : 'Add Permit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RenewModal({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (newExpiryDate: string, newCostCents?: number | null) => void
  isPending: boolean
}) {
  const [newExpiry, setNewExpiry] = useState('')
  const [newCost, setNewCost] = useState('')

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExpiry) return
    onSubmit(newExpiry, newCost ? Math.round(parseFloat(newCost) * 100) : null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-800 border border-stone-700 rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Renew Permit</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1">New Expiry Date *</label>
            <input
              type="date"
              required
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1">Renewal Cost ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
              placeholder="0.00"
              className="w-full bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
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
              disabled={isPending || !newExpiry}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Renewing...' : 'Renew'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Main Component ----

type PermitRegistryProps = {
  initialPermits: Permit[]
  initialCostSummary: {
    totalCents: number
    byType: Record<PermitType, number>
    count: number
  }
}

export default function PermitRegistry({
  initialPermits,
  initialCostSummary,
}: PermitRegistryProps) {
  const [permits, setPermits] = useState(initialPermits)
  const [costSummary, setCostSummary] = useState(initialCostSummary)
  const [showAddModal, setShowAddModal] = useState(false)
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const expiringSoon = permits.filter(
    (p) =>
      p.status === 'active' &&
      daysUntil(p.expiry_date) >= 0 &&
      daysUntil(p.expiry_date) <= p.renewal_lead_days
  )
  const active = permits.filter(
    (p) => p.status === 'active' && daysUntil(p.expiry_date) > (p.renewal_lead_days ?? 30)
  )
  const expired = permits.filter(
    (p) => p.status === 'expired' || (p.status === 'active' && daysUntil(p.expiry_date) < 0)
  )

  const handleAdd = (data: CreatePermitInput) => {
    const previousPermits = permits
    const previousCost = costSummary

    startTransition(async () => {
      try {
        setError(null)
        const newPermit = await createPermit(data)
        setPermits((prev) =>
          [...prev, newPermit].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))
        )
        setCostSummary((prev) => ({
          totalCents: prev.totalCents + (data.cost_cents ?? 0),
          byType: {
            ...prev.byType,
            [data.permit_type]: (prev.byType[data.permit_type] ?? 0) + (data.cost_cents ?? 0),
          },
          count: prev.count + 1,
        }))
        setShowAddModal(false)
      } catch (err) {
        setPermits(previousPermits)
        setCostSummary(previousCost)
        setError(err instanceof Error ? err.message : 'Failed to add permit')
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this permit?')) return
    const previousPermits = permits

    startTransition(async () => {
      try {
        setError(null)
        setPermits((prev) => prev.filter((p) => p.id !== id))
        await deletePermit(id)
      } catch (err) {
        setPermits(previousPermits)
        setError(err instanceof Error ? err.message : 'Failed to delete permit')
      }
    })
  }

  const handleRenew = (newExpiryDate: string, newCostCents?: number | null) => {
    if (!renewingId) return
    const previousPermits = permits

    startTransition(async () => {
      try {
        setError(null)
        const renewed = await renewPermit(renewingId, newExpiryDate, newCostCents)
        setPermits((prev) =>
          prev
            .map((p) => (p.id === renewingId ? renewed : p))
            .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))
        )
        setRenewingId(null)
      } catch (err) {
        setPermits(previousPermits)
        setError(err instanceof Error ? err.message : 'Failed to renew permit')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Cost Summary */}
      <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-stone-400 text-sm">Annual Permit Costs</p>
            <p className="text-2xl font-bold text-stone-100">
              {formatCents(costSummary.totalCents)}
            </p>
            <p className="text-stone-500 text-xs">
              {costSummary.count} active permit{costSummary.count !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors font-medium"
          >
            + Add Permit
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Calendar Strip */}
      <CalendarStrip permits={permits} />

      {/* Expiring Soon */}
      {expiringSoon.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-yellow-300 mb-3 flex items-center gap-2">
            Expiring Soon
            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
              {expiringSoon.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {expiringSoon.map((p) => (
              <PermitCard key={p.id} permit={p} onRenew={setRenewingId} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-green-300 mb-3 flex items-center gap-2">
            Active
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
              {active.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((p) => (
              <PermitCard key={p.id} permit={p} onRenew={setRenewingId} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-red-300 mb-3 flex items-center gap-2">
            Expired
            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
              {expired.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {expired.map((p) => (
              <PermitCard key={p.id} permit={p} onRenew={setRenewingId} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {permits.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <p className="text-lg mb-2">No permits registered yet</p>
          <p className="text-sm mb-4">
            Add your health, business, parking, and vendor permits to track expirations and renewal
            deadlines.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
          >
            Add Your First Permit
          </button>
        </div>
      )}

      {/* Modals */}
      <AddPermitModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAdd}
        isPending={isPending}
      />

      <RenewModal
        open={renewingId !== null}
        onClose={() => setRenewingId(null)}
        onSubmit={handleRenew}
        isPending={isPending}
      />
    </div>
  )
}
