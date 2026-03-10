'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Truck, Check, X, Package } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import {
  addEquipmentRental,
  deleteEquipmentRental,
  markRentalConfirmed,
  markRentalReturned,
  type EquipmentRental,
  type RentalStatus,
} from '@/lib/events/equipment-rental-actions'

const STATUS_STYLES: Record<RentalStatus, { bg: string; text: string; label: string }> = {
  needed: { bg: 'bg-amber-900/30', text: 'text-amber-400', label: 'Needed' },
  confirmed: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Confirmed' },
  picked_up: { bg: 'bg-purple-900/30', text: 'text-purple-400', label: 'Picked Up' },
  returned: { bg: 'bg-green-900/30', text: 'text-green-400', label: 'Returned' },
  cancelled: { bg: 'bg-stone-800', text: 'text-stone-500', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: RentalStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

type Props = {
  eventId: string
  initialRentals: EquipmentRental[]
}

export function EquipmentRentalPanel({ eventId, initialRentals }: Props) {
  const [rentals, setRentals] = useState<EquipmentRental[]>(initialRentals)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState('')
  const [vendor, setVendor] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [totalCost, setTotalCost] = useState('')
  const [neededDate, setNeededDate] = useState('')
  const [notes, setNotes] = useState('')

  function resetForm() {
    setName('')
    setVendor('')
    setQuantity('1')
    setTotalCost('')
    setNeededDate('')
    setNotes('')
    setShowForm(false)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const costCents = totalCost ? Math.round(parseFloat(totalCost) * 100) : undefined

    const previous = rentals
    startTransition(async () => {
      try {
        const rental = await addEquipmentRental(eventId, {
          name: name.trim(),
          vendor: vendor.trim() || undefined,
          quantity: parseInt(quantity) || 1,
          totalCostCents: isNaN(costCents as number) ? undefined : costCents,
          neededDate: neededDate || undefined,
          notes: notes.trim() || undefined,
        })
        setRentals((prev) => [...prev, rental])
        resetForm()
        toast.success('Rental added')
      } catch (err) {
        setRentals(previous)
        toast.error('Failed to add rental')
      }
    })
  }

  function handleConfirm(rentalId: string) {
    const previous = rentals
    setRentals((prev) =>
      prev.map((r) => (r.id === rentalId ? { ...r, status: 'confirmed' as RentalStatus } : r))
    )
    startTransition(async () => {
      try {
        await markRentalConfirmed(rentalId)
      } catch (err) {
        setRentals(previous)
        toast.error('Failed to confirm rental')
      }
    })
  }

  function handleReturn(rentalId: string) {
    const previous = rentals
    setRentals((prev) =>
      prev.map((r) => (r.id === rentalId ? { ...r, status: 'returned' as RentalStatus } : r))
    )
    startTransition(async () => {
      try {
        await markRentalReturned(rentalId)
      } catch (err) {
        setRentals(previous)
        toast.error('Failed to mark returned')
      }
    })
  }

  function handleDelete(rentalId: string) {
    const previous = rentals
    setRentals((prev) => prev.filter((r) => r.id !== rentalId))
    startTransition(async () => {
      try {
        await deleteEquipmentRental(rentalId)
        toast.success('Rental removed')
      } catch (err) {
        setRentals(previous)
        toast.error('Failed to remove rental')
      }
    })
  }

  const totalCostCents = rentals.reduce((s, r) => s + (r.total_cost_cents || 0), 0)
  const activeRentals = rentals.filter((r) => r.status !== 'cancelled' && r.status !== 'returned')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-stone-400" />
          <CardTitle as="h3">Equipment Rentals</CardTitle>
          {activeRentals.length > 0 && (
            <span className="text-xs text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full">
              {activeRentals.length}
            </span>
          )}
        </div>
        {totalCostCents > 0 && (
          <span className="text-sm text-stone-300 font-medium">
            Total: {formatCurrency(totalCostCents)}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Rental list */}
        {rentals.length === 0 && !showForm ? (
          <p className="text-sm text-stone-500">No equipment rentals for this event.</p>
        ) : (
          <div className="space-y-2">
            {rentals.map((rental) => (
              <div
                key={rental.id}
                className="flex items-start justify-between gap-3 p-3 bg-stone-800/40 rounded-lg group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-200">{rental.name}</span>
                    <StatusBadge status={rental.status as RentalStatus} />
                    {rental.quantity > 1 && (
                      <span className="text-xs text-stone-400">x{rental.quantity}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-400 flex-wrap">
                    {rental.vendor && <span>Vendor: {rental.vendor}</span>}
                    {rental.total_cost_cents != null && rental.total_cost_cents > 0 && (
                      <span>{formatCurrency(rental.total_cost_cents)}</span>
                    )}
                    {rental.needed_date && <span>Needed: {rental.needed_date}</span>}
                  </div>
                  {rental.notes && <p className="text-xs text-stone-500 mt-1">{rental.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {rental.status === 'needed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfirm(rental.id)}
                      disabled={isPending}
                      title="Mark confirmed"
                    >
                      <Check className="w-4 h-4 text-blue-400" />
                    </Button>
                  )}
                  {(rental.status === 'confirmed' || rental.status === 'picked_up') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReturn(rental.id)}
                      disabled={isPending}
                      title="Mark returned"
                    >
                      <Package className="w-4 h-4 text-green-400" />
                    </Button>
                  )}
                  {rental.status !== 'returned' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rental.id)}
                      disabled={isPending}
                      title="Remove"
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add rental form */}
        {showForm ? (
          <form onSubmit={handleAdd} className="space-y-3 border border-stone-700 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400 mb-1 block">Equipment Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chafing dishes"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 mb-1 block">Vendor</label>
                <Input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. ABC Rentals"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 mb-1 block">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 mb-1 block">Total Cost ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 mb-1 block">Date Needed</label>
                <Input
                  type="date"
                  value={neededDate}
                  onChange={(e) => setNeededDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 mb-1 block">Notes</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special requirements..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
                Add Rental
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Add Rental
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
