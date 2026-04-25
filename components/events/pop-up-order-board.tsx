'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ShoppingCart } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createManualPopUpOrderAction } from './pop-up-actions'
import type { PopUpOrderSource } from './pop-up-model'
import type { PopUpOperatingSnapshot } from './pop-up-operating-panel'

type Props = {
  eventId: string
  snapshot: PopUpOperatingSnapshot
}

const MANUAL_SOURCES: { value: PopUpOrderSource; label: string }[] = [
  { value: 'dm', label: 'DM' },
  { value: 'comment', label: 'Comment' },
  { value: 'word_of_mouth', label: 'Word of mouth' },
  { value: 'form', label: 'Form' },
  { value: 'walkup', label: 'Walk-up' },
  { value: 'comp', label: 'Comp' },
]

export function PopUpOrderBoard({ eventId, snapshot }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)
  const firstSellable = snapshot.menuItems.find(
    (item) => item.ticketTypeId && item.remainingUnits > 0
  )
  const [ticketTypeId, setTicketTypeId] = useState(firstSellable?.ticketTypeId ?? '')
  const [source, setSource] = useState<PopUpOrderSource>('dm')

  const ticketOptions = useMemo(
    () =>
      snapshot.menuItems
        .filter((item) => item.ticketTypeId)
        .map((item) => ({
          value: item.ticketTypeId!,
          label: `${item.name} (${item.remainingUnits} left)`,
        })),
    [snapshot.menuItems]
  )

  const selectedItem = snapshot.menuItems.find((item) => item.ticketTypeId === ticketTypeId)
  const paidDefault = selectedItem?.priceCents ?? 0
  const itemSourceRows = snapshot.menuItems.map((item) => ({
    ...item,
    sourceCounts: snapshot.orderRows
      .filter((row) => row.ticketTypeId === item.ticketTypeId)
      .reduce<Record<string, number>>((acc, row) => {
        acc[row.source] = (acc[row.source] ?? 0) + row.quantity
        return acc
      }, {}),
  }))

  function submit(formData: FormData) {
    setStatus(null)
    const quantity = Number(formData.get('quantity') ?? 1)
    const paidCents = Math.round(Number(formData.get('paidDollars') ?? 0) * 100)
    startTransition(async () => {
      try {
        await createManualPopUpOrderAction({
          eventId,
          ticketTypeId,
          buyerName: String(formData.get('buyerName') ?? ''),
          buyerEmail: String(formData.get('buyerEmail') ?? ''),
          quantity,
          paidCents,
          source,
          notes: String(formData.get('notes') ?? ''),
        })
        router.refresh()
        setStatus('Manual order added')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to add order')
      }
    })
  }

  return (
    <section id="popup-orders" className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-stone-800 p-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-brand-300" />
          <h3 className="text-sm font-semibold text-stone-100">Order Board</h3>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-stone-800 text-xs uppercase text-stone-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Sold</th>
                <th className="px-3 py-2 font-medium">Remaining</th>
                <th className="px-3 py-2 font-medium">Sell-through</th>
                <th className="py-2 pl-3 font-medium">Sources</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {itemSourceRows.map((item) => (
                <tr key={item.name}>
                  <td className="py-3 pr-3 font-medium text-stone-100">{item.name}</td>
                  <td className="px-3 py-3 tabular-nums text-stone-200">{item.soldUnits}</td>
                  <td className="px-3 py-3 tabular-nums text-stone-200">{item.remainingUnits}</td>
                  <td className="px-3 py-3 tabular-nums text-stone-200">
                    {item.sellThroughPercent}%
                  </td>
                  <td className="py-3 pl-3">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(item.sourceCounts).map(([sourceName, count]) => (
                        <span
                          key={sourceName}
                          className="rounded-full border border-stone-700 px-2 py-1 text-xs text-stone-300"
                        >
                          {sourceName}: {count}
                        </span>
                      ))}
                      {Object.keys(item.sourceCounts).length === 0 && (
                        <span className="text-xs text-stone-500">No orders yet</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form action={submit} className="rounded-lg border border-stone-800 p-4">
        <h3 className="text-sm font-semibold text-stone-100">Manual Order</h3>
        <div className="mt-4 grid gap-3">
          <Select
            label="Item"
            value={ticketTypeId}
            onChange={(event) => setTicketTypeId(event.target.value)}
            options={ticketOptions}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="buyerName" label="Buyer" required />
            <Input name="buyerEmail" label="Email" type="email" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input name="quantity" label="Qty" type="number" min={1} defaultValue={1} required />
            <Input
              name="paidDollars"
              label="Paid"
              type="number"
              min={0}
              step={0.01}
              defaultValue={(paidDefault / 100).toFixed(2)}
            />
            <Select
              label="Source"
              value={source}
              onChange={(event) => setSource(event.target.value as PopUpOrderSource)}
              options={MANUAL_SOURCES}
            />
          </div>
          <Textarea name="notes" label="Notes" rows={3} />
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !ticketTypeId || (selectedItem?.remainingUnits ?? 0) <= 0}
            loading={isPending}
          >
            <Plus className="h-4 w-4" />
            Add Order
          </Button>
          {status && <p className="text-xs text-stone-400">{status}</p>}
        </div>
      </form>
    </section>
  )
}
