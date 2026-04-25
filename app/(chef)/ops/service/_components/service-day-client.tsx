'use client'

// ServiceDayClient - Interactive service day management.
// Link menus, record sales, update covers, view sales breakdown.

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateServiceDay,
  addServiceMenu,
  removeServiceMenu,
  transitionServiceDay,
} from '@/lib/restaurant/service-day-actions'
import { recordSale } from '@/lib/restaurant/sales-actions'
import { generatePrepRequirements } from '@/lib/restaurant/prep-generation-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ServiceDay } from '@/lib/restaurant/service-day-actions'

export function ServiceDayClient({
  serviceDay,
  menus,
  sales,
  availableMenus,
}: {
  serviceDay: ServiceDay
  menus: any[]
  sales: any[]
  availableMenus: Array<{ id: string; name: string; status: string }>
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [covers, setCovers] = useState(String(serviceDay.expected_covers || ''))
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showRecordSale, setShowRecordSale] = useState(false)
  const [saleItemId, setSaleItemId] = useState('')
  const [saleQty, setSaleQty] = useState('1')
  const [saleRevenue, setSaleRevenue] = useState('')

  // Flatten menu items from linked menus for the sale form
  const allMenuItems = menus.flatMap(
    (m: any) =>
      m.menus?.menu_items?.map((mi: any) => ({
        id: mi.id,
        name: mi.name,
        price_cents: mi.price_cents,
      })) || []
  )

  function handleUpdateCovers() {
    startTransition(async () => {
      try {
        const result = await updateServiceDay(serviceDay.id, {
          expected_covers: covers ? parseInt(covers) : undefined,
        })
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Covers updated')
        router.refresh()
      } catch {
        toast.error('Update failed')
      }
    })
  }

  function handleAddMenu(menuId: string) {
    startTransition(async () => {
      try {
        const result = await addServiceMenu(serviceDay.id, menuId)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Menu linked')
        setShowAddMenu(false)
        router.refresh()
      } catch {
        toast.error('Failed to link menu')
      }
    })
  }

  function handleRemoveMenu(menuId: string) {
    startTransition(async () => {
      try {
        await removeServiceMenu(serviceDay.id, menuId)
        toast.success('Menu removed')
        router.refresh()
      } catch {
        toast.error('Failed to remove menu')
      }
    })
  }

  function handleGeneratePrep() {
    startTransition(async () => {
      try {
        const result = await generatePrepRequirements(serviceDay.id)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(`Generated ${result.generated} prep items`)
        router.refresh()
      } catch {
        toast.error('Prep generation failed')
      }
    })
  }

  function handleRecordSale() {
    if (!saleItemId) return
    startTransition(async () => {
      try {
        const result = await recordSale({
          service_day_id: serviceDay.id,
          menu_item_id: saleItemId,
          quantity_sold: parseInt(saleQty) || 1,
          revenue_cents: saleRevenue ? Math.round(parseFloat(saleRevenue) * 100) : 0,
        })
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Sale recorded')
        setSaleItemId('')
        setSaleQty('1')
        setSaleRevenue('')
        setShowRecordSale(false)
        router.refresh()
      } catch {
        toast.error('Failed to record sale')
      }
    })
  }

  const totalRevenue = sales.reduce((s: number, r: any) => s + (r.revenue_cents || 0), 0)
  const totalSold = sales.reduce((s: number, r: any) => s + (r.quantity_sold || 0), 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Service Config */}
      <div className="space-y-6">
        {/* Status + Covers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-400">Status</span>
              <Badge
                variant={
                  serviceDay.status === 'active'
                    ? 'success'
                    : serviceDay.status === 'closed'
                      ? 'default'
                      : 'info'
                }
              >
                {serviceDay.status}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-400 shrink-0">Expected Covers</span>
              <input
                type="number"
                value={covers}
                onChange={(e) => setCovers(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-stone-900 border border-stone-700 text-stone-200"
              />
              <Button variant="ghost" onClick={handleUpdateCovers} disabled={isPending}>
                Save
              </Button>
            </div>

            {serviceDay.opened_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Opened</span>
                <span className="text-stone-300">
                  {new Date(serviceDay.opened_at).toLocaleTimeString()}
                </span>
              </div>
            )}
            {serviceDay.closed_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Closed</span>
                <span className="text-stone-300">
                  {new Date(serviceDay.closed_at).toLocaleTimeString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Menus */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Menus</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleGeneratePrep}
                  disabled={isPending || menus.length === 0}
                >
                  Generate Prep
                </Button>
                <Button variant="ghost" onClick={() => setShowAddMenu(!showAddMenu)}>
                  {showAddMenu ? 'Cancel' : 'Link Menu'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {menus.length === 0 ? (
              <p className="text-sm text-stone-500">
                No menus linked. Add a menu to auto-generate prep requirements.
              </p>
            ) : (
              menus.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-stone-900/40"
                >
                  <span className="text-sm text-stone-200">{m.menus?.name || 'Untitled'}</span>
                  <Button
                    variant="ghost"
                    onClick={() => handleRemoveMenu(m.menu_id)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}

            {showAddMenu && availableMenus.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-800">
                <p className="text-xs text-stone-500">Available menus:</p>
                {availableMenus.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-stone-800/40"
                  >
                    <span className="text-sm text-stone-300">{m.name}</span>
                    <Button
                      variant="ghost"
                      onClick={() => handleAddMenu(m.id)}
                      disabled={isPending}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Sales */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sales Today</CardTitle>
              <Button variant="ghost" onClick={() => setShowRecordSale(!showRecordSale)}>
                {showRecordSale ? 'Cancel' : 'Record Sale'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-stone-900/60 text-center">
                <p className="text-xs text-stone-500">Revenue</p>
                <p className="text-xl font-bold text-stone-100 tabular-nums">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-stone-900/60 text-center">
                <p className="text-xs text-stone-500">Items Sold</p>
                <p className="text-xl font-bold text-stone-100 tabular-nums">{totalSold}</p>
              </div>
            </div>

            {/* Record Sale Form */}
            {showRecordSale && (
              <div className="space-y-3 p-3 rounded-lg border border-stone-700 bg-stone-900/80">
                <select
                  value={saleItemId}
                  onChange={(e) => {
                    setSaleItemId(e.target.value)
                    const item = allMenuItems.find((i: any) => i.id === e.target.value)
                    if (item?.price_cents) setSaleRevenue(String(item.price_cents / 100))
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-stone-800 border border-stone-700 text-stone-200"
                >
                  <option value="">Select menu item</option>
                  {allMenuItems.map((mi: any) => (
                    <option key={mi.id} value={mi.id}>
                      {mi.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={saleQty}
                    onChange={(e) => setSaleQty(e.target.value)}
                    placeholder="Qty"
                    className="w-20 px-3 py-2 text-sm rounded-lg bg-stone-800 border border-stone-700 text-stone-200"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={saleRevenue}
                    onChange={(e) => setSaleRevenue(e.target.value)}
                    placeholder="Revenue $"
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-stone-800 border border-stone-700 text-stone-200"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleRecordSale}
                  disabled={isPending || !saleItemId}
                  className="w-full"
                >
                  {isPending ? 'Recording...' : 'Record'}
                </Button>
              </div>
            )}

            {/* Sales List */}
            {sales.length > 0 ? (
              <div className="space-y-1.5">
                {sales.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-stone-300">{s.menu_items?.name || 'Unknown'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-stone-500 tabular-nums">{s.quantity_sold}x</span>
                      <span className="text-stone-200 tabular-nums">
                        {formatCurrency(s.revenue_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No sales recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
