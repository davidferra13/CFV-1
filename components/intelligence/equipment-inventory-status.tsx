import Link from 'next/link'
import type { EquipmentAvailability, EquipmentNeed } from '@/lib/intelligence/equipment-allocation'

interface EquipmentInventoryStatusProps {
  available: EquipmentAvailability[]
  needed: EquipmentNeed[]
}

export function EquipmentInventoryStatus({ available, needed }: EquipmentInventoryStatusProps) {
  return (
    <div className="space-y-6">
      {/* Per-event equipment needs */}
      {needed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-200 mb-3">Equipment Needs by Event</h3>
          <div className="space-y-3">
            {needed.map((need) => (
              <div
                key={need.eventId}
                className="rounded-lg border border-stone-800 bg-stone-900/30 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/events/${need.eventId}`}
                    className="text-sm font-medium text-stone-300 hover:text-stone-100 transition-colors"
                  >
                    {need.eventName}
                  </Link>
                  <span className="text-xs text-stone-500">{need.eventDate}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {need.items.map((item, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                        item.owned
                          ? 'bg-stone-800/80 text-stone-400'
                          : 'bg-amber-950/40 text-amber-400 border border-amber-800/30'
                      }`}
                    >
                      {item.name}
                      {!item.owned && (
                        <span className="ml-1 text-amber-500 text-[10px]">(not in inventory)</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment inventory with availability */}
      {available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-200 mb-3">Inventory Status</h3>
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-stone-800 text-xs text-stone-500 font-medium">
              <span>Item</span>
              <span className="text-center">Owned</span>
              <span className="text-center">In Use</span>
              <span className="text-center">Free</span>
            </div>
            <div className="divide-y divide-stone-800/50">
              {available.map((eq) => {
                const isStretched = eq.availableCount === 0 && eq.assignedCount > 0
                return (
                  <div
                    key={eq.id}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2 items-center ${
                      isStretched ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm text-stone-300">{eq.name}</p>
                      <p className="text-xs text-stone-600">{eq.category}</p>
                    </div>
                    <span className="text-sm text-stone-400 text-center w-10">
                      {eq.quantity}
                    </span>
                    <span
                      className={`text-sm text-center w-10 ${
                        eq.assignedCount > 0 ? 'text-blue-400' : 'text-stone-500'
                      }`}
                    >
                      {eq.assignedCount}
                    </span>
                    <span
                      className={`text-sm font-medium text-center w-10 ${
                        isStretched
                          ? 'text-amber-400'
                          : eq.availableCount > 0
                            ? 'text-emerald-400'
                            : 'text-stone-500'
                      }`}
                    >
                      {eq.availableCount}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {available.length === 0 && needed.length === 0 && (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-6 text-center">
          <p className="text-sm text-stone-500">No equipment data found for this date range.</p>
          <p className="text-xs text-stone-600 mt-1">
            Add equipment to your inventory or packing checklists to see allocation insights.
          </p>
        </div>
      )}
    </div>
  )
}
