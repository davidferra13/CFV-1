// Reorder Settings Page
// Configure per-ingredient par levels and reorder quantities for auto-reorder.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getReorderSettings } from '@/lib/inventory/reorder-settings-actions'
import { getVendors } from '@/lib/vendors/vendor-actions'
import { ReorderSettingsClient } from './reorder-settings-client'

export const metadata: Metadata = { title: 'Reorder Rules' }

export default async function ReorderSettingsPage() {
  await requireChef()

  const [settings, vendors] = await Promise.all([
    getReorderSettings().catch(() => []),
    getVendors().catch(() => []),
  ])

  const vendorList = vendors.map((v: any) => ({ id: v.id, name: v.name }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Reorder Rules</h1>
        <p className="text-stone-500 mt-1">
          Set par levels and reorder quantities per ingredient. The auto-reorder system uses these
          when generating draft purchase orders from demand shortfalls.
        </p>
      </div>

      <div className="rounded-lg border border-stone-800 bg-stone-900/40 px-4 py-3 text-sm text-stone-400">
        <strong className="text-stone-300">How it works:</strong> when current stock falls below a
        par level, auto-reorder suggests a draft PO using the reorder quantity. If no reorder
        quantity is set, it uses the deficit amount instead.{' '}
        <Link href="/inventory/demand" className="text-brand-400 hover:text-brand-300">
          View demand forecast
        </Link>{' '}
        to see current shortfalls.
      </div>

      <ReorderSettingsClient initialSettings={settings} vendors={vendorList} />
    </div>
  )
}
