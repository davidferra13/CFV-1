'use client'

// Event Vendor Panel
// Displays vendor assignments and delivery schedule for a specific event.
// Designed to be embedded in the event detail page.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  assignVendorToEvent,
  removeVendorFromEvent,
  addVendorDelivery,
  updateDeliveryStatus,
  removeVendorDelivery,
} from '@/lib/vendors/event-vendor-actions'
import { listVendors } from '@/lib/vendors/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { format } from 'date-fns'

// ---- Types ----

type Vendor = {
  id: string
  name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
}

type VendorAssignment = {
  id: string
  vendor_id: string
  event_id: string
  notes: string | null
  amount_cents: number | null
  created_at: string
  vendor: Vendor
}

type VendorDelivery = {
  id: string
  event_id: string
  vendor_id: string | null
  vendor_name: string
  delivery_type: string
  scheduled_time: string | null
  actual_arrival_time: string | null
  contact_name: string | null
  contact_phone: string | null
  items_description: string | null
  special_instructions: string | null
  status: string
  notes: string | null
  vendor?: Vendor | null
}

// ---- Label maps ----

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  food: 'Food',
  equipment: 'Equipment',
  rentals: 'Rentals',
  flowers: 'Flowers',
  av: 'A/V',
  linen: 'Linen',
  ice: 'Ice',
  beverage: 'Beverage',
  other: 'Other',
}

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

const DELIVERY_STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  scheduled: 'default',
  confirmed: 'info',
  arrived: 'warning',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['arrived', 'cancelled'],
  arrived: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
}

// ---- Props ----

type Props = {
  eventId: string
  assignments: VendorAssignment[]
  deliveries: VendorDelivery[]
}

// ---- Main Component ----

export function EventVendorPanel({ eventId, assignments, deliveries }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)

  function refresh() {
    router.refresh()
  }

  function handleRemoveAssignment(assignmentId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await removeVendorFromEvent(assignmentId)
        refresh()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleStatusUpdate(deliveryId: string, status: string) {
    setError(null)
    startTransition(async () => {
      try {
        await updateDeliveryStatus({ deliveryId, status: status as any })
        refresh()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleRemoveDelivery(deliveryId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await removeVendorDelivery(deliveryId)
        refresh()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Vendor Coordination</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowDeliveryForm(true)
              setShowAssignForm(false)
              setError(null)
            }}
          >
            + Delivery
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowAssignForm(true)
              setShowDeliveryForm(false)
              setError(null)
            }}
          >
            + Assign Vendor
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Assign vendor form */}
        {showAssignForm && (
          <AssignVendorForm
            eventId={eventId}
            onSuccess={() => {
              setShowAssignForm(false)
              refresh()
            }}
            onCancel={() => setShowAssignForm(false)}
            onError={setError}
          />
        )}

        {/* Add delivery form */}
        {showDeliveryForm && (
          <AddDeliveryForm
            eventId={eventId}
            assignments={assignments}
            onSuccess={() => {
              setShowDeliveryForm(false)
              refresh()
            }}
            onCancel={() => setShowDeliveryForm(false)}
            onError={setError}
          />
        )}

        {/* Assigned Vendors */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
            Assigned Vendors
          </p>
          {assignments.length === 0 ? (
            <p className="text-sm text-stone-500">
              No vendors assigned yet. Assign vendors who are providing services for this event.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <VendorAssignmentRow
                  key={a.id}
                  assignment={a}
                  isPending={isPending}
                  onRemove={() => handleRemoveAssignment(a.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delivery Schedule */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
            Delivery Schedule
          </p>
          {deliveries.length === 0 ? (
            <p className="text-sm text-stone-500">
              No deliveries scheduled. Add deliveries to track vendor drop-offs for this event.
            </p>
          ) : (
            <div className="space-y-2">
              {deliveries.map((d) => (
                <DeliveryRow
                  key={d.id}
                  delivery={d}
                  isPending={isPending}
                  onStatusUpdate={(status) => handleStatusUpdate(d.id, status)}
                  onRemove={() => handleRemoveDelivery(d.id)}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Vendor Assignment Row ----

function VendorAssignmentRow({
  assignment,
  isPending,
  onRemove,
}: {
  assignment: VendorAssignment
  isPending: boolean
  onRemove: () => void
}) {
  const vendor = assignment.vendor

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-stone-700 flex items-center justify-center text-sm font-medium text-stone-400 flex-shrink-0">
          {vendor.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-100 truncate">{vendor.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {vendor.contact_name && (
              <span className="text-xs text-stone-500">{vendor.contact_name}</span>
            )}
            {vendor.phone && (
              <span className="text-xs text-stone-500">{vendor.phone}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {assignment.amount_cents != null && (
            <span className="text-xs text-stone-300 font-medium">
              ${(assignment.amount_cents / 100).toFixed(2)}
            </span>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-400 px-1.5 py-0.5 rounded"
            title="Remove vendor"
          >
            Remove
          </button>
        </div>
      </div>
      {assignment.notes && (
        <p className="text-xs text-stone-500 italic mt-1.5 pl-12">{assignment.notes}</p>
      )}
    </div>
  )
}

// ---- Delivery Row ----

function DeliveryRow({
  delivery,
  isPending,
  onStatusUpdate,
  onRemove,
}: {
  delivery: VendorDelivery
  isPending: boolean
  onStatusUpdate: (status: string) => void
  onRemove: () => void
}) {
  const nextStatuses = STATUS_TRANSITIONS[delivery.status] || []

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-stone-100 truncate">
              {delivery.vendor_name}
            </p>
            <Badge variant={DELIVERY_STATUS_VARIANTS[delivery.status] || 'default'}>
              {DELIVERY_STATUS_LABELS[delivery.status] || delivery.status}
            </Badge>
            <Badge variant="default">
              {DELIVERY_TYPE_LABELS[delivery.delivery_type] || delivery.delivery_type}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500">
            {delivery.scheduled_time && (
              <span>
                Scheduled: {format(new Date(delivery.scheduled_time), 'MMM d, h:mm a')}
              </span>
            )}
            {delivery.actual_arrival_time && (
              <span>
                Arrived: {format(new Date(delivery.actual_arrival_time), 'h:mm a')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {nextStatuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatusUpdate(s)}
              disabled={isPending}
              className="text-xs rounded border border-stone-600 bg-stone-800 px-2 py-0.5 text-stone-300 hover:bg-stone-700 transition-colors"
            >
              {DELIVERY_STATUS_LABELS[s]}
            </button>
          ))}
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-400 px-1.5 py-0.5 rounded ml-1"
            title="Remove delivery"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Detail rows */}
      {(delivery.items_description || delivery.contact_name || delivery.special_instructions) && (
        <div className="pl-0 text-xs text-stone-500 space-y-0.5">
          {delivery.items_description && <p>Items: {delivery.items_description}</p>}
          {delivery.contact_name && (
            <p>
              Contact: {delivery.contact_name}
              {delivery.contact_phone && ` (${delivery.contact_phone})`}
            </p>
          )}
          {delivery.special_instructions && (
            <p>Instructions: {delivery.special_instructions}</p>
          )}
          {delivery.notes && <p className="italic">{delivery.notes}</p>}
        </div>
      )}
    </div>
  )
}

// ---- Assign Vendor Form ----

function AssignVendorForm({
  eventId,
  onSuccess,
  onCancel,
  onError,
}: {
  eventId: string
  onSuccess: () => void
  onCancel: () => void
  onError: (msg: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [notes, setNotes] = useState('')
  const [amountCents, setAmountCents] = useState('')

  // Load vendors on mount
  if (!loaded) {
    setLoaded(true)
    listVendors(true)
      .then((v: any[]) => setVendors(v))
      .catch(() => onError('Failed to load vendors'))
  }

  function handleAssign() {
    if (!selectedVendorId) return
    onError('')
    startTransition(async () => {
      try {
        const cents = amountCents ? Math.round(parseFloat(amountCents) * 100) : undefined
        await assignVendorToEvent({
          eventId,
          vendorId: selectedVendorId,
          notes: notes || undefined,
          amountCents: cents,
        })
        onSuccess()
      } catch (err: any) {
        onError(err.message)
      }
    })
  }

  return (
    <div className="rounded-lg border border-brand-700 bg-brand-950/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-stone-200">Assign Vendor to Event</p>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1">Vendor</label>
        <select
          value={selectedVendorId}
          onChange={(e) => setSelectedVendorId(e.target.value)}
          className="w-full rounded-md border border-stone-600 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Select a vendor...</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.contact_name ? ` (${v.contact_name})` : ''}
            </option>
          ))}
        </select>
        {vendors.length === 0 && loaded && (
          <p className="text-xs text-stone-500 mt-1">
            No vendors found. Add vendors in the Vendors section first.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1">
          Agreed amount (optional)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amountCents}
          onChange={(e) => setAmountCents(e.target.value)}
          placeholder="e.g. 250.00"
          className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Providing all floral arrangements"
          className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleAssign}
          loading={isPending}
          disabled={!selectedVendorId}
        >
          {isPending ? 'Assigning...' : 'Assign Vendor'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ---- Add Delivery Form ----

function AddDeliveryForm({
  eventId,
  assignments,
  onSuccess,
  onCancel,
  onError,
}: {
  eventId: string
  assignments: VendorAssignment[]
  onSuccess: () => void
  onCancel: () => void
  onError: (msg: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [vendorSource, setVendorSource] = useState<'assigned' | 'custom'>('assigned')
  const [selectedAssignment, setSelectedAssignment] = useState('')
  const [customVendorName, setCustomVendorName] = useState('')
  const [deliveryType, setDeliveryType] = useState('food')
  const [scheduledTime, setScheduledTime] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [itemsDescription, setItemsDescription] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit() {
    let vendorName = ''
    let vendorId: string | null = null

    if (vendorSource === 'assigned' && selectedAssignment) {
      const found = assignments.find((a) => a.id === selectedAssignment)
      if (found) {
        vendorName = found.vendor.name
        vendorId = found.vendor_id
      }
    } else if (vendorSource === 'custom' && customVendorName.trim()) {
      vendorName = customVendorName.trim()
    }

    if (!vendorName) {
      onError('Please select or enter a vendor name')
      return
    }

    onError('')
    startTransition(async () => {
      try {
        await addVendorDelivery({
          eventId,
          vendorId,
          vendorName,
          deliveryType: deliveryType as any,
          scheduledTime: scheduledTime || undefined,
          contactName: contactName || undefined,
          contactPhone: contactPhone || undefined,
          itemsDescription: itemsDescription || undefined,
          specialInstructions: specialInstructions || undefined,
          notes: notes || undefined,
        })
        onSuccess()
      } catch (err: any) {
        onError(err.message)
      }
    })
  }

  return (
    <div className="rounded-lg border border-brand-700 bg-brand-950/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-stone-200">Schedule Delivery</p>

      {/* Vendor source toggle */}
      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1">Vendor</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setVendorSource('assigned')}
            className={`text-xs rounded px-2 py-1 border transition-colors ${
              vendorSource === 'assigned'
                ? 'border-brand-500 bg-brand-950 text-brand-300'
                : 'border-stone-600 bg-stone-900 text-stone-400 hover:bg-stone-800'
            }`}
          >
            From assigned
          </button>
          <button
            type="button"
            onClick={() => setVendorSource('custom')}
            className={`text-xs rounded px-2 py-1 border transition-colors ${
              vendorSource === 'custom'
                ? 'border-brand-500 bg-brand-950 text-brand-300'
                : 'border-stone-600 bg-stone-900 text-stone-400 hover:bg-stone-800'
            }`}
          >
            Custom name
          </button>
        </div>

        {vendorSource === 'assigned' ? (
          <select
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            className="w-full rounded-md border border-stone-600 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select assigned vendor...</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.vendor.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={customVendorName}
            onChange={(e) => setCustomVendorName(e.target.value)}
            placeholder="Enter vendor name"
            className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">Delivery type</label>
          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            className="w-full rounded-md border border-stone-600 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {Object.entries(DELIVERY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">Scheduled time</label>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">
            Contact name (optional)
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Driver or rep name"
            className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">
            Contact phone (optional)
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="555-123-4567"
            className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1">
          Items description (optional)
        </label>
        <input
          type="text"
          value={itemsDescription}
          onChange={(e) => setItemsDescription(e.target.value)}
          placeholder="e.g. 20 lbs salmon, 5 lbs butter, mixed greens"
          className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1">
          Special instructions (optional)
        </label>
        <input
          type="text"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="e.g. Use service entrance, ask for John"
          className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={isPending}
        >
          {isPending ? 'Scheduling...' : 'Schedule Delivery'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
