'use client'

import { AlertTriangle, Package } from '@/components/ui/icons'
import type { PopUpOperatingSnapshot } from './pop-up-operating-panel'

type Props = {
  snapshot: PopUpOperatingSnapshot
}

function statusLabel(value: string) {
  return value.replace(/_/g, ' ')
}

export function PopUpProductionBoard({ snapshot }: Props) {
  const warnings = [...snapshot.production.batchWarnings, ...snapshot.production.locationWarnings]

  return (
    <section id="popup-production" className="rounded-lg border border-stone-800 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-brand-300" />
          <h3 className="text-sm font-semibold text-stone-100">Production Board</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-[24rem]">
          <Metric label="Planned" value={snapshot.production.totalPlannedUnits} />
          <Metric label="Sold" value={snapshot.production.totalSoldUnits} />
          <Metric label="Remaining" value={snapshot.production.totalRemainingUnits} />
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 grid gap-2">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="flex items-start gap-2 rounded-lg border border-amber-800 bg-amber-950/25 px-3 py-2 text-xs text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[820px] w-full text-left text-sm">
          <thead className="border-b border-stone-800 text-xs uppercase text-stone-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Sold</th>
              <th className="px-3 py-2 font-medium">Produced</th>
              <th className="px-3 py-2 font-medium">Batch</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="py-2 pl-3 font-medium">Needs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {snapshot.menuItems.map((item) => (
              <tr key={item.name}>
                <td className="py-3 pr-3 font-medium text-stone-100">{item.name}</td>
                <td className="px-3 py-3 tabular-nums text-stone-200">{item.plannedUnits}</td>
                <td className="px-3 py-3 tabular-nums text-stone-200">{item.soldUnits}</td>
                <td className="px-3 py-3 tabular-nums text-stone-200">{item.producedUnits}</td>
                <td className="px-3 py-3 text-stone-300">
                  {item.batchSize
                    ? `${Math.ceil(item.plannedUnits / item.batchSize)} x ${item.batchSize}`
                    : 'Set batch'}
                </td>
                <td className="px-3 py-3 capitalize text-stone-300">
                  {statusLabel(item.productionStatus)}
                </td>
                <td className="py-3 pl-3">
                  <div className="flex flex-wrap gap-1.5">
                    {item.equipmentNeeded.map((equipment) => (
                      <span
                        key={equipment}
                        className="rounded-full border border-stone-700 px-2 py-1 text-xs text-stone-300"
                      >
                        {equipment}
                      </span>
                    ))}
                    {item.unitCostCents === null && (
                      <span className="rounded-full border border-amber-800 px-2 py-1 text-xs text-amber-300">
                        missing cost
                      </span>
                    )}
                    {!item.recipeId && (
                      <span className="rounded-full border border-amber-800 px-2 py-1 text-xs text-amber-300">
                        missing recipe
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-800 px-3 py-2">
      <p className="text-[11px] uppercase text-stone-500">{label}</p>
      <p className="mt-1 tabular-nums text-base font-semibold text-stone-100">{value}</p>
    </div>
  )
}
