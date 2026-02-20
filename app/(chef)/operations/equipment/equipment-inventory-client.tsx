'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  createEquipmentItem, logMaintenance, retireEquipmentItem,
  logRental, deleteRental,
  type CreateEquipmentInput, type RentalInput
}  from '@/lib/equipment/actions'
import { EQUIPMENT_CATEGORIES } from '@/lib/equipment/constants'
import { format, addDays, isBefore } from 'date-fns'

type EquipmentItem = {
  id: string; name: string; category: string
  purchase_date: string | null; purchase_price_cents: number | null
  maintenance_interval_days: number | null; last_maintained_at: string | null
  notes: string | null
}

type Rental = {
  id: string; equipment_name: string; vendor_name: string | null
  rental_date: string; cost_cents: number; event_id: string | null; notes: string | null
}

type Props = {
  inventory: EquipmentItem[]
  overdueItems: EquipmentItem[]
  recentRentals: Rental[]
}

const CATEGORY_LABELS: Record<string, string> = {
  cookware: 'Cookware', knives: 'Knives', smallwares: 'Smallwares',
  appliances: 'Appliances', serving: 'Serving', transport: 'Transport',
  linen: 'Linen', other: 'Other',
}

function getMaintenanceStatus(item: EquipmentItem): 'overdue' | 'due_soon' | 'ok' | 'none' {
  if (!item.maintenance_interval_days) return 'none'
  if (!item.last_maintained_at) return 'overdue'
  const nextDue = addDays(new Date(item.last_maintained_at), item.maintenance_interval_days)
  const today = new Date()
  if (isBefore(nextDue, today)) return 'overdue'
  if (isBefore(nextDue, addDays(today, 30))) return 'due_soon'
  return 'ok'
}

export function EquipmentInventoryClient({ inventory, overdueItems, recentRentals }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'owned' | 'rentals'>('owned')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showRentalForm, setShowRentalForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newItem, setNewItem] = useState<Partial<CreateEquipmentInput & { price_dollars: string }>>({ category: 'other' })
  const [newRental, setNewRental] = useState<Partial<RentalInput & { cost_dollars: string }>>({ rental_date: format(new Date(), 'yyyy-MM-dd') })

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await createEquipmentItem({
        name: newItem.name!,
        category: newItem.category as CreateEquipmentInput['category'] ?? 'other',
        purchase_date: newItem.purchase_date ?? undefined,
        purchase_price_cents: newItem.price_dollars
          ? Math.round(parseFloat(newItem.price_dollars) * 100) : undefined,
        maintenance_interval_days: newItem.maintenance_interval_days ?? undefined,
        notes: newItem.notes ?? undefined,
      })
      setShowAddForm(false)
      setNewItem({ category: 'other' })
      router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleLogMaintenance(id: string) {
    setLoading(true)
    try { await logMaintenance(id); router.refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleAddRental(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await logRental({
        equipment_name: newRental.equipment_name!,
        vendor_name: newRental.vendor_name ?? undefined,
        rental_date: newRental.rental_date!,
        return_date: newRental.return_date ?? undefined,
        cost_cents: Math.round(parseFloat(newRental.cost_dollars || '0') * 100),
        notes: newRental.notes ?? undefined,
      })
      setShowRentalForm(false)
      setNewRental({ rental_date: format(new Date(), 'yyyy-MM-dd') })
      router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {/* Maintenance alerts */}
      {overdueItems.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">
            {overdueItems.length} item{overdueItems.length !== 1 ? 's' : ''} due for maintenance:
          </p>
          <ul className="mt-1 text-sm text-amber-700">
            {overdueItems.map((item) => <li key={item.id}>• {item.name}</li>)}
          </ul>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-stone-200">
        {(['owned', 'rentals'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-amber-600 text-amber-700' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t === 'owned' ? `Owned (${inventory.length})` : `Rentals (${recentRentals.length})`}
          </button>
        ))}
      </div>

      {/* Owned inventory */}
      {tab === 'owned' && (
        <div className="space-y-3">
          {inventory.length === 0 && <p className="text-sm text-stone-500">No equipment added yet.</p>}
          {inventory.map((item) => {
            const mStatus = getMaintenanceStatus(item)
            return (
              <Card key={item.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-900">{item.name}</span>
                        <Badge variant="default">{CATEGORY_LABELS[item.category] ?? item.category}</Badge>
                        {mStatus === 'overdue' && <Badge variant="error">Maintenance Overdue</Badge>}
                        {mStatus === 'due_soon' && <Badge variant="warning">Due Soon</Badge>}
                      </div>
                      {item.notes && <p className="mt-0.5 text-xs text-stone-400">{item.notes}</p>}
                    </div>
                    {mStatus !== 'none' && (
                      <Button size="sm" variant="secondary" onClick={() => handleLogMaintenance(item.id)} disabled={loading}>
                        Log Maintenance
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {!showAddForm ? (
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>+ Add Equipment</Button>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Add Equipment</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddItem} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Name</label>
                      <Input value={newItem.name ?? ''} onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="12-inch carbon steel pan" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
                      <select value={newItem.category} onChange={(e) => setNewItem(p => ({ ...p, category: e.target.value as CreateEquipmentInput['category'] }))} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                        {EQUIPMENT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Purchase price ($)</label>
                      <Input type="number" min="0" step="0.01" value={newItem.price_dollars ?? ''} onChange={(e) => setNewItem(p => ({ ...p, price_dollars: e.target.value }))} placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Maintenance every (days)</label>
                      <Input type="number" min="1" value={newItem.maintenance_interval_days ?? ''} onChange={(e) => setNewItem(p => ({ ...p, maintenance_interval_days: parseInt(e.target.value) || undefined }))} placeholder="365" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
                    <Input value={newItem.notes ?? ''} onChange={(e) => setNewItem(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={loading}>{loading ? 'Adding…' : 'Add Item'}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Rentals */}
      {tab === 'rentals' && (
        <div className="space-y-3">
          {recentRentals.length === 0 && <p className="text-sm text-stone-500">No rentals logged yet.</p>}
          {recentRentals.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-stone-900">{r.equipment_name}</span>
                {r.vendor_name && <span className="text-stone-400 ml-2">from {r.vendor_name}</span>}
                <p className="text-xs text-stone-500 mt-0.5">{r.rental_date} · ${(r.cost_cents / 100).toFixed(2)}</p>
              </div>
            </div>
          ))}
          {!showRentalForm ? (
            <Button variant="secondary" size="sm" onClick={() => setShowRentalForm(true)}>+ Log Rental</Button>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Log Rental</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddRental} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Item rented</label>
                      <Input value={newRental.equipment_name ?? ''} onChange={(e) => setNewRental(p => ({ ...p, equipment_name: e.target.value }))} placeholder="Induction burner" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Vendor</label>
                      <Input value={newRental.vendor_name ?? ''} onChange={(e) => setNewRental(p => ({ ...p, vendor_name: e.target.value }))} placeholder="Party rental co." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Rental date</label>
                      <Input type="date" value={newRental.rental_date} onChange={(e) => setNewRental(p => ({ ...p, rental_date: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Cost ($)</label>
                      <Input type="number" min="0" step="0.01" value={newRental.cost_dollars ?? ''} onChange={(e) => setNewRental(p => ({ ...p, cost_dollars: e.target.value }))} placeholder="0.00" required />
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={loading}>{loading ? 'Logging…' : 'Log Rental'}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowRentalForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
