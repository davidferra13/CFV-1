import Link from 'next/link'
import { AlertTriangle, Package, RefreshCw, Truck } from '@/components/ui/icons'

export type InventoryBlindSpot = {
  id: string
  label: string
  count: number | null
  href: string
  description: string
}

type InventoryBlindSpotsPanelProps = {
  spots: InventoryBlindSpot[]
}

const ICONS = {
  parLevels: AlertTriangle,
  vendorLinks: Truck,
  expiryDates: RefreshCw,
  lotNumbers: Package,
}

export function InventoryBlindSpotsPanel({ spots }: InventoryBlindSpotsPanelProps) {
  const hasFailure = spots.some((spot) => spot.count === null)
  const activeSpots = spots.filter((spot) => (spot.count ?? 0) > 0)

  if (activeSpots.length === 0 && !hasFailure) {
    return (
      <section className="mt-5 rounded-xl border border-stone-800 bg-stone-900/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="section-label mb-1">Inventory Blind Spots</div>
            <p className="text-sm text-stone-400">
              Core inventory metadata is covered for tracked counts and active batches.
            </p>
          </div>
          <Link
            href="/ops/inventory"
            className="text-xs font-medium text-brand-400 hover:text-brand-300"
          >
            Inventory Status
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="section-label">Inventory Blind Spots</div>
          <p className="mt-1 text-xs text-stone-500">
            Real gaps in tracked inventory metadata that can weaken reorder, expiry, and lot
            controls.
          </p>
        </div>
        <Link
          href="/ops/inventory"
          className="text-xs font-medium text-brand-400 hover:text-brand-300"
        >
          Inventory Status
        </Link>
      </div>

      {hasFailure && (
        <p className="mb-2 text-xs text-amber-500">
          Some inventory checks could not be loaded. Review inventory pages directly.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {spots.map((spot) => {
          const Icon = ICONS[spot.id as keyof typeof ICONS] ?? Package
          const count = spot.count
          const isActive = (count ?? 0) > 0

          return (
            <Link
              key={spot.id}
              href={spot.href}
              className={`rounded-xl border p-4 transition-colors ${
                isActive
                  ? 'border-amber-900/60 bg-amber-950/20 hover:border-amber-700'
                  : count === null
                    ? 'border-stone-700 bg-stone-900 hover:border-stone-600'
                    : 'border-stone-800 bg-stone-900/50 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-800">
                  <Icon className="h-4 w-4 text-stone-300" />
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-semibold ${
                      isActive ? 'text-amber-300' : 'text-stone-300'
                    }`}
                  >
                    {count === null ? '!' : count}
                  </p>
                  <p className="text-xxs text-stone-500">{count === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-stone-200">{spot.label}</h3>
              <p className="mt-1 text-xs text-stone-500">{spot.description}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
