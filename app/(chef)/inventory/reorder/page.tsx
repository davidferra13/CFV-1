// Smart Reorder Triggers - Monitor inventory levels, generate POs automatically.
// Two views: Alerts (items below par) and Settings (configure per-ingredient thresholds).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { checkReorderPoints, getReorderSettings } from '@/lib/vendors/reorder-actions'
import { listVendors } from '@/lib/vendors/actions'
import { ReorderAlerts } from '@/components/vendors/reorder-alerts'
import { ReorderSettings } from '@/components/vendors/reorder-settings'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Smart Reorder - ChefFlow' }

export default async function ReorderPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireChef()

  const tab = searchParams.tab === 'settings' ? 'settings' : 'alerts'

  const [alerts, settings, vendors] = await Promise.all([
    checkReorderPoints(),
    getReorderSettings(),
    listVendors(),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/inventory" className="hover:text-stone-300">
          Inventory
        </Link>
        <span>/</span>
        <span className="text-stone-300">Smart Reorder</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Smart Reorder</h1>
          <p className="mt-1 text-sm text-stone-500">
            Monitor inventory levels and auto-generate purchase orders when stock drops below par.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/purchase-orders">
            <Button variant="secondary" size="sm">
              Purchase Orders
            </Button>
          </Link>
          <Link href="/vendors">
            <Button variant="secondary" size="sm">
              Vendors
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-stone-700">
        <Link
          href="/inventory/reorder"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'alerts'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-stone-400 hover:text-stone-300'
          }`}
        >
          Alerts
          {alerts.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 font-medium">
              {alerts.length}
            </span>
          )}
        </Link>
        <Link
          href="/inventory/reorder?tab=settings"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'settings'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-stone-400 hover:text-stone-300'
          }`}
        >
          Settings
          <span className="ml-2 text-xs text-stone-500">({settings.length})</span>
        </Link>
      </div>

      {/* Tab content */}
      {tab === 'alerts' ? (
        <ReorderAlerts alerts={alerts} />
      ) : (
        <ReorderSettings
          settings={settings}
          vendors={vendors.map((v: any) => ({ id: v.id, name: v.name }))}
        />
      )}
    </div>
  )
}
