'use client'

// Vendor Delivery Timeline
// Vertical timeline showing deliveries sorted by time with status management.
// Used on the event detail page under the Ops tab.

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  addVendorDelivery,
  updateVendorDelivery,
  deleteVendorDelivery,
  markDeliveryArrived,
  markDeliveryComplete,
} from '@/lib/events/vendor-delivery-actions'
import type {
  VendorDelivery,
  DeliveryType,
  DeliveryStatus,
  AddDeliveryInput,
} from '@/lib/events/vendor-delivery-actions'
import { Truck, Plus, Phone, Clock, X, Check, AlertTriangle, Package } from '@/components/ui/icons'

type Props = {
  eventId: string
  deliveries: VendorDelivery[]
  vendors?: { id: string; name: string; contact_name: string | null; phone: string | null }[]
}

const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
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

const DELIVERY_TYPE_COLORS: Record<DeliveryType, string> = {
  food: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  equipment: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  rentals: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  flowers: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  av: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  linen: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  ice: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  beverage: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  other: 'bg-stone-500/20 text-stone-400 border-stone-500/30',
}

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info'; dotColor: string }
> = {
  scheduled: { label: 'Scheduled', variant: 'warning', dotColor: 'bg-yellow-400' },
  confirmed: { label: 'Confirmed', variant: 'info', dotColor: 'bg-blue-400' },
  arrived: { label: 'Arrived', variant: 'success', dotColor: 'bg-emerald-400' },
  completed: { label: 'Completed', variant: 'success', dotColor: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', variant: 'default', dotColor: 'bg-stone-500' },
  no_show: { label: 'No Show', variant: 'error', dotColor: 'bg-red-400' },
}

export function VendorDeliveryTimeline({
  eventId,
  deliveries: initialDeliveries,
  vendors = [],
}: Props) {
  const [deliveries, setDeliveries] = useState(initialDeliveries)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const pending = deliveries.filter(
    (d) => d.status === 'scheduled' || d.status === 'confirmed'
  ).length
  const arrived = deliveries.filter((d) => d.status === 'arrived').length
  const completed = deliveries.filter((d) => d.status === 'completed').length

  function handleStatusChange(deliveryId: string, newStatus: DeliveryStatus) {
    const previous = [...deliveries]
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: newStatus,
              actual_arrival_time:
                newStatus === 'arrived' ? new Date().toISOString() : d.actual_arrival_time,
            }
          : d
      )
    )

    startTransition(async () => {
      try {
        if (newStatus === 'arrived') {
          await markDeliveryArrived(deliveryId)
        } else if (newStatus === 'completed') {
          await markDeliveryComplete(deliveryId)
        } else {
          await updateVendorDelivery(deliveryId, { status: newStatus })
        }
      } catch (err) {
        console.error('[VendorDeliveryTimeline] Status update failed:', err)
        setDeliveries(previous)
      }
    })
  }

  function handleDelete(deliveryId: string) {
    const previous = [...deliveries]
    setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId))

    startTransition(async () => {
      try {
        await deleteVendorDelivery(deliveryId)
      } catch (err) {
        console.error('[VendorDeliveryTimeline] Delete failed:', err)
        setDeliveries(previous)
      }
    })
  }

  function handleAdd(input: AddDeliveryInput) {
    startTransition(async () => {
      try {
        const delivery = await addVendorDelivery(eventId, input)
        setDeliveries((prev) => {
          const updated = [...prev, delivery]
          updated.sort((a, b) => {
            if (!a.scheduled_time && !b.scheduled_time) return 0
            if (!a.scheduled_time) return 1
            if (!b.scheduled_time) return -1
            return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
          })
          return updated
        })
        setShowForm(false)
      } catch (err) {
        console.error('[VendorDeliveryTimeline] Add failed:', err)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-stone-400" />
            <CardTitle className="text-base">Vendor Deliveries</CardTitle>
            {deliveries.length > 0 && (
              <span className="text-xs text-stone-500">
                {completed}/{deliveries.length} complete
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {deliveries.length > 0 && (
          <div className="flex gap-3 mt-2">
            <MiniStat label="Pending" count={pending} color="text-yellow-400" />
            <MiniStat label="Arrived" count={arrived} color="text-blue-400" />
            <MiniStat label="Done" count={completed} color="text-emerald-400" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <AddDeliveryForm
            vendors={vendors}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            isPending={isPending}
          />
        )}

        {deliveries.length === 0 && !showForm ? (
          <p className="text-sm text-stone-500">No vendor deliveries scheduled for this event.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            {deliveries.length > 1 && (
              <div className="absolute left-3 top-3 bottom-3 w-px bg-stone-700" />
            )}

            <div className="space-y-4">
              {deliveries.map((delivery) => {
                const statusConfig = STATUS_CONFIG[delivery.status]
                const isExpanded = expandedId === delivery.id

                return (
                  <div key={delivery.id} className="relative pl-8">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-1.5 top-2 h-3 w-3 rounded-full border-2 border-stone-900 ${statusConfig.dotColor}`}
                    />

                    <div className="rounded-lg bg-stone-800/50 border border-stone-700/50 p-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-stone-200">
                              {delivery.vendor_name}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded border ${DELIVERY_TYPE_COLORS[delivery.delivery_type]}`}
                            >
                              {DELIVERY_TYPE_LABELS[delivery.delivery_type]}
                            </span>
                            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                          </div>

                          {/* Time */}
                          {delivery.scheduled_time && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-stone-400">
                              <Clock className="h-3 w-3" />
                              {formatTime(delivery.scheduled_time)}
                              {delivery.actual_arrival_time && (
                                <span className="text-emerald-400 ml-1">
                                  (arrived {formatTime(delivery.actual_arrival_time)})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Items */}
                          {delivery.items_description && (
                            <div className="flex items-start gap-1 mt-1 text-xs text-stone-400">
                              <Package className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{delivery.items_description}</span>
                            </div>
                          )}
                        </div>

                        {/* Expand toggle */}
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                          className="text-stone-500 hover:text-stone-300 text-xs"
                        >
                          {isExpanded ? 'Less' : 'More'}
                        </button>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-stone-700/50 space-y-2">
                          {(delivery.contact_name || delivery.contact_phone) && (
                            <div className="flex items-center gap-1 text-xs text-stone-400">
                              <Phone className="h-3 w-3" />
                              {delivery.contact_name}
                              {delivery.contact_phone && (
                                <a
                                  href={`tel:${delivery.contact_phone}`}
                                  className="text-brand-400 hover:underline ml-1"
                                >
                                  {delivery.contact_phone}
                                </a>
                              )}
                            </div>
                          )}

                          {delivery.special_instructions && (
                            <div className="flex items-start gap-1 text-xs text-stone-400">
                              <AlertTriangle className="h-3 w-3 mt-0.5 text-yellow-400 shrink-0" />
                              <span>{delivery.special_instructions}</span>
                            </div>
                          )}

                          {delivery.notes && (
                            <p className="text-xs text-stone-500">{delivery.notes}</p>
                          )}

                          {/* Status actions */}
                          <div className="flex items-center gap-2 pt-1">
                            {delivery.status === 'scheduled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(delivery.id, 'confirmed')}
                              >
                                Confirm
                              </Button>
                            )}
                            {(delivery.status === 'scheduled' ||
                              delivery.status === 'confirmed') && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStatusChange(delivery.id, 'arrived')}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark Arrived
                              </Button>
                            )}
                            {delivery.status === 'arrived' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStatusChange(delivery.id, 'completed')}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            )}
                            {delivery.status !== 'completed' && delivery.status !== 'cancelled' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(delivery.id, 'no_show')}
                                >
                                  No Show
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(delivery.id, 'cancelled')}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(delivery.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// MINI STAT
// ============================================

function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold ${color}`}>{count}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  )
}

// ============================================
// ADD DELIVERY FORM
// ============================================

function AddDeliveryForm({
  vendors,
  onSubmit,
  onCancel,
  isPending,
}: {
  vendors: { id: string; name: string; contact_name: string | null; phone: string | null }[]
  onSubmit: (input: AddDeliveryInput) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [vendorId, setVendorId] = useState<string>('')
  const [vendorName, setVendorName] = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('food')
  const [scheduledTime, setScheduledTime] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [items, setItems] = useState('')
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')

  function handleVendorSelect(id: string) {
    setVendorId(id)
    if (id) {
      const vendor = vendors.find((v) => v.id === id)
      if (vendor) {
        setVendorName(vendor.name)
        setContactName(vendor.contact_name ?? '')
        setContactPhone(vendor.phone ?? '')
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vendorName.trim()) return

    onSubmit({
      vendor_id: vendorId || null,
      vendor_name: vendorName.trim(),
      delivery_type: deliveryType,
      scheduled_time: scheduledTime || null,
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      items_description: items || null,
      special_instructions: instructions || null,
      notes: notes || null,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 p-3 rounded-lg bg-stone-800/80 border border-stone-700 space-y-3"
    >
      <h4 className="text-sm font-medium text-stone-200">Add Vendor Delivery</h4>

      {/* Vendor selection */}
      {vendors.length > 0 && (
        <div>
          <label className="text-xs text-stone-400 block mb-1">Select Vendor (optional)</label>
          <select
            value={vendorId}
            onChange={(e) => handleVendorSelect(e.target.value)}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
          >
            <option value="">One-off vendor (type name below)</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-400 block mb-1">Vendor Name *</label>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            required
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
            placeholder="Vendor name"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Delivery Type</label>
          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
          >
            {Object.entries(DELIVERY_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-400 block mb-1">Scheduled Time</label>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Contact Name</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
            placeholder="Driver / rep name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-400 block mb-1">Contact Phone</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
            placeholder="Phone number"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 block mb-1">Items Being Delivered</label>
          <input
            type="text"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
            placeholder="Tables, chairs, linens..."
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-stone-400 block mb-1">Special Instructions</label>
        <input
          type="text"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
          placeholder="Use loading dock, needs refrigeration..."
        />
      </div>

      <div>
        <label className="text-xs text-stone-400 block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-200"
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isPending || !vendorName.trim()}
        >
          {isPending ? 'Adding...' : 'Add Delivery'}
        </Button>
      </div>
    </form>
  )
}

// ============================================
// HELPERS
// ============================================

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}
