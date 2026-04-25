'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Save, TrendingDown, TrendingUp } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updatePopUpConfigAction } from './pop-up-actions'
import type { PopUpCloseoutItem, PopUpConfig } from './pop-up-model'
import type { PopUpOperatingSnapshot } from './pop-up-operating-panel'

type Props = {
  eventId: string
  eventStatus: string
  config: PopUpConfig
  snapshot: PopUpOperatingSnapshot
  onConfigChange: (config: PopUpConfig) => void
}

export function PopUpCloseoutPanel({
  eventId,
  eventStatus,
  config,
  snapshot,
  onConfigChange,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isAvailable =
    eventStatus === 'completed' || config.stage === 'closed' || config.stage === 'analyzed'
  const initialItems = useMemo(
    () =>
      snapshot.menuItems.map((item) => {
        const existing = config.closeout?.itemResults.find((entry) => entry.name === item.name)
        return (
          existing ?? {
            name: item.name,
            plannedUnits: item.plannedUnits,
            producedUnits: item.producedUnits || item.plannedUnits,
            soldUnits: item.soldUnits,
            wastedUnits: Math.max(0, (item.producedUnits || item.plannedUnits) - item.soldUnits),
            soldOutAt: null,
            revenueCents: item.soldUnits * item.priceCents,
            estimatedCostCents:
              item.unitCostCents === null ? 0 : item.unitCostCents * item.plannedUnits,
            notes: '',
          }
        )
      }),
    [config.closeout?.itemResults, snapshot.menuItems]
  )
  const [items, setItems] = useState<PopUpCloseoutItem[]>(initialItems)
  const [notes, setNotes] = useState(config.closeout?.overallNotes ?? '')
  const [nextIdeas, setNextIdeas] = useState(config.closeout?.nextDropIdeas ?? '')
  const [status, setStatus] = useState<string | null>(null)

  const producedUnits = items.reduce((sum, item) => sum + item.producedUnits, 0)
  const soldUnits = items.reduce((sum, item) => sum + item.soldUnits, 0)
  const wastedUnits = items.reduce((sum, item) => sum + item.wastedUnits, 0)
  const sellThrough = producedUnits > 0 ? Math.round((soldUnits / producedUnits) * 100) : 0

  function updateItem(name: string, patch: Partial<PopUpCloseoutItem>) {
    setItems((current) =>
      current.map((item) => (item.name === name ? { ...item, ...patch } : item))
    )
  }

  function save() {
    setStatus(null)
    startTransition(async () => {
      try {
        const result = await updatePopUpConfigAction({
          eventId,
          patch: {
            stage: config.stage === 'closed' ? 'closed' : config.stage,
            closeout: {
              itemResults: items,
              overallNotes: notes,
              nextDropIdeas: nextIdeas,
            },
          },
        })
        onConfigChange(result.config)
        router.refresh()
        setStatus('Closeout saved')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to save closeout')
      }
    })
  }

  return (
    <section id="popup-closeout" className="rounded-lg border border-stone-800 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Closeout</h3>
          <p className="mt-0.5 text-xs text-stone-400">
            Capture item performance after production and sales settle.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-[24rem]">
          <Metric
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Sell-through"
            value={`${sellThrough}%`}
          />
          <Metric
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label="Waste"
            value={wastedUnits}
          />
          <Metric label="Sold" value={soldUnits} />
        </div>
      </div>

      {!isAvailable && (
        <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-400">
          Closeout opens when the event is completed or the pop-up stage is closed.
        </div>
      )}

      <div className={isAvailable ? 'mt-4 space-y-4' : 'mt-4 space-y-4 opacity-60'}>
        <div className="overflow-x-auto">
          <table className="min-w-[940px] w-full text-left text-sm">
            <thead className="border-b border-stone-800 text-xs uppercase text-stone-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Produced</th>
                <th className="px-3 py-2 font-medium">Sold</th>
                <th className="px-3 py-2 font-medium">Wasted</th>
                <th className="px-3 py-2 font-medium">Sold out</th>
                <th className="px-3 py-2 font-medium">Revenue</th>
                <th className="py-2 pl-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {items.map((item) => (
                <tr key={item.name}>
                  <td className="py-3 pr-3 font-medium text-stone-100">{item.name}</td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min={0}
                      value={item.producedUnits}
                      disabled={!isAvailable}
                      onChange={(event) =>
                        updateItem(item.name, { producedUnits: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min={0}
                      value={item.soldUnits}
                      disabled={!isAvailable}
                      onChange={(event) =>
                        updateItem(item.name, { soldUnits: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min={0}
                      value={item.wastedUnits}
                      disabled={!isAvailable}
                      onChange={(event) =>
                        updateItem(item.name, { wastedUnits: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="time"
                      value={item.soldOutAt ?? ''}
                      disabled={!isAvailable}
                      onChange={(event) => updateItem(item.name, { soldOutAt: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={(item.revenueCents / 100).toFixed(2)}
                      disabled={!isAvailable}
                      onChange={(event) =>
                        updateItem(item.name, {
                          revenueCents: Math.round(Number(event.target.value) * 100),
                        })
                      }
                    />
                  </td>
                  <td className="py-3 pl-3">
                    <Input
                      value={item.notes ?? ''}
                      disabled={!isAvailable}
                      onChange={(event) => updateItem(item.name, { notes: event.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Textarea
            label="Overall notes"
            rows={3}
            value={notes}
            disabled={!isAvailable}
            onChange={(event) => setNotes(event.target.value)}
          />
          <Textarea
            label="Next drop ideas"
            rows={3}
            value={nextIdeas}
            disabled={!isAvailable}
            onChange={(event) => setNextIdeas(event.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={!isAvailable || isPending}
          loading={isPending}
        >
          <Save className="h-4 w-4" />
          Save Closeout
        </Button>
        {status && <p className="text-xs text-stone-400">{status}</p>}
      </div>
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-stone-800 px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] uppercase text-stone-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 tabular-nums text-base font-semibold text-stone-100">{value}</p>
    </div>
  )
}
