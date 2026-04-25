'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, Ticket } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type {
  PopUpConfig,
  PopUpMenuItemPlan,
  PopUpProductLibraryItem,
} from '@/components/events/pop-up-model'
import {
  addProductToPopUpAction,
  syncPopUpMenuItemToTicketTypeAction,
  updatePopUpConfigAction,
} from '@/components/events/pop-up-actions'
import type { PopUpOperatingSnapshot } from './pop-up-operating-panel'

type Props = {
  eventId: string
  config: PopUpConfig
  snapshot: PopUpOperatingSnapshot
  productLibrary: PopUpProductLibraryItem[]
  onConfigChange: (config: PopUpConfig) => void
}

const numberInputClass = 'min-w-[5.5rem]'

export function PopUpMenuPlanner({
  eventId,
  config,
  snapshot,
  productLibrary,
  onConfigChange,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState(productLibrary[0]?.id ?? '')

  const productOptions = useMemo(
    () =>
      productLibrary.map((product) => ({
        value: product.id,
        label: `${product.name}${product.unitCostCents !== null ? ' - costed' : ''}`,
      })),
    [productLibrary]
  )

  function updateItem(name: string, patch: Partial<PopUpMenuItemPlan>) {
    onConfigChange({
      ...config,
      menuItems: config.menuItems.map((item) =>
        item.name === name ? { ...item, ...patch } : item
      ),
    })
  }

  function saveMenu() {
    setStatus(null)
    startTransition(async () => {
      try {
        const result = await updatePopUpConfigAction({
          eventId,
          patch: { menuItems: config.menuItems },
        })
        onConfigChange(result.config)
        router.refresh()
        setStatus('Menu saved')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to save menu')
      }
    })
  }

  function addProduct() {
    if (!selectedProductId) return
    setStatus(null)
    startTransition(async () => {
      try {
        const result = await addProductToPopUpAction({
          eventId,
          dishIndexId: selectedProductId,
          plannedUnits: 24,
        })
        onConfigChange(result.config)
        router.refresh()
        setStatus('Product added')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to add product')
      }
    })
  }

  function syncTicket(itemName: string) {
    setStatus(null)
    startTransition(async () => {
      try {
        const result = await syncPopUpMenuItemToTicketTypeAction({ eventId, itemName })
        onConfigChange(result.config)
        router.refresh()
        setStatus('Ticket capacity synced')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to sync ticket type')
      }
    })
  }

  return (
    <section id="popup-menu" className="rounded-lg border border-stone-800 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Menu Planner</h3>
          <p className="mt-0.5 text-xs text-stone-400">
            Product library items become limited ticket inventory when synced.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            options={productOptions}
            className="sm:w-72"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addProduct}
            disabled={isPending}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
          <Button type="button" size="sm" onClick={saveMenu} disabled={isPending}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
      {status && <p className="mt-2 text-xs text-stone-400">{status}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="border-b border-stone-800 text-xs uppercase text-stone-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Sold</th>
              <th className="px-3 py-2 font-medium">Left</th>
              <th className="px-3 py-2 font-medium">Suggested</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Cost</th>
              <th className="px-3 py-2 font-medium">Margin</th>
              <th className="px-3 py-2 font-medium">Prep</th>
              <th className="py-2 pl-3 font-medium">Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {snapshot.menuItems.map((row) => {
              const plannedItem = config.menuItems.find((item) => item.name === row.name)
              return (
                <tr key={row.name} className="align-top">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-stone-100">{row.name}</p>
                    <p className="mt-1 max-w-xs text-xs leading-4 text-stone-500">
                      {row.forecastReason}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min={0}
                      value={plannedItem?.plannedUnits ?? row.plannedUnits}
                      onChange={(event) =>
                        updateItem(row.name, { plannedUnits: Number(event.target.value) })
                      }
                      className={numberInputClass}
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-stone-200">{row.soldUnits}</td>
                  <td className="px-3 py-3 tabular-nums text-stone-200">{row.remainingUnits}</td>
                  <td className="px-3 py-3 tabular-nums text-brand-300">{row.suggestedUnits}</td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={((plannedItem?.priceCents ?? row.priceCents) / 100).toFixed(2)}
                      onChange={(event) =>
                        updateItem(row.name, {
                          priceCents: Math.round(Number(event.target.value) * 100),
                        })
                      }
                      className={numberInputClass}
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-stone-300">
                    {row.unitCostCents === null
                      ? 'Missing'
                      : `$${(row.unitCostCents / 100).toFixed(2)}`}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-stone-300">
                    {row.marginPercent === null ? 'Missing' : `${row.marginPercent}%`}
                  </td>
                  <td className="px-3 py-3">
                    <Select
                      value={plannedItem?.productionStatus ?? row.productionStatus}
                      onChange={(event) =>
                        updateItem(row.name, { productionStatus: event.target.value as any })
                      }
                      options={[
                        { value: 'not_started', label: 'Not started' },
                        { value: 'prep_started', label: 'Prep started' },
                        { value: 'batched', label: 'Batched' },
                        { value: 'packed', label: 'Packed' },
                        { value: 'ready', label: 'Ready' },
                      ]}
                      className="min-w-[9rem]"
                    />
                  </td>
                  <td className="py-3 pl-3">
                    <Button
                      type="button"
                      variant={row.ticketTypeId ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => syncTicket(row.name)}
                      disabled={isPending}
                      tooltip="Sync ticket capacity"
                    >
                      <Ticket className="h-4 w-4" />
                      {row.ticketTypeId ? 'Update' : 'Create'}
                    </Button>
                  </td>
                </tr>
              )
            })}
            {snapshot.menuItems.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-sm text-stone-500">
                  Add products from the library to build this drop.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
