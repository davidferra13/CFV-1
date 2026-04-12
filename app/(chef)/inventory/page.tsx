// Inventory Landing Page
// Hub for inventory management: par alerts, navigation to sub-pages.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getParAlerts } from '@/lib/inventory/count-actions'
import { ParAlertPanel } from '@/components/inventory/par-alert-panel'
import { AutoReorderPanel } from '@/components/inventory/auto-reorder-panel'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Inventory' }

const SUB_PAGES = [
  {
    href: '/inventory/transactions',
    label: 'Transaction Ledger',
    description:
      'Every inventory movement in one append-only log - receiving, deductions, waste, transfers',
    icon: 'ledger',
  },
  {
    href: '/inventory/locations',
    label: 'Storage Locations',
    description: 'Manage fridges, freezers, pantries, and vehicles - see stock at each location',
    icon: 'location',
  },
  {
    href: '/inventory/purchase-orders',
    label: 'Purchase Orders',
    description: 'Create, submit, and receive POs - track every ingredient from order to shelf',
    icon: 'truck',
  },
  {
    href: '/inventory/procurement',
    label: 'Procurement Hub',
    description: 'Supplier directory plus purchase order workflow in one procurement center',
    icon: 'procurement',
  },
  {
    href: '/inventory/audits',
    label: 'Physical Audits',
    description: 'Run full, cycle, or spot count audits - verify stock levels match your records',
    icon: 'audit',
  },
  {
    href: '/inventory/counts',
    label: 'Inventory Counts',
    description: 'Update on-hand quantities and par levels for all tracked ingredients',
    icon: 'clipboard',
  },
  {
    href: '/inventory/waste',
    label: 'Waste Tracking',
    description: 'Log food waste, view cost by reason, and track trends over time',
    icon: 'trash',
  },
  {
    href: '/inventory/vendor-invoices',
    label: 'Vendor Invoices',
    description: 'Upload invoices, match line items to ingredients, and flag price changes',
    icon: 'receipt',
  },
  {
    href: '/inventory/food-cost',
    label: 'Food Cost Analysis',
    description: 'Theoretical vs actual food cost comparison across recent events',
    icon: 'calculator',
  },
  {
    href: '/inventory/staff-meals',
    label: 'Staff Meals',
    description: 'Log team meals, track ingredient usage, and monitor staff meal costs',
    icon: 'meal',
  },
  {
    href: '/inventory/expiry',
    label: 'Expiry Alerts',
    description: 'Batches expiring soon - act before food goes to waste',
    icon: 'clock',
  },
  {
    href: '/inventory/demand',
    label: 'Demand Forecast',
    description:
      'What ingredients do you need for upcoming events? See shortages before they happen',
    icon: 'forecast',
  },
  {
    href: '/inventory/reorder',
    label: 'Reorder Rules',
    description: 'Set par levels and reorder quantities per ingredient for auto-reorder',
    icon: 'reorder',
  },
]

const ICON_MAP: Record<string, string> = {
  ledger: '\uD83D\uDCD2',
  location: '\uD83D\uDCCD',
  truck: '\uD83D\uDE9A',
  pricetrend: '\uD83D\uDCC9',
  audit: '\uD83D\uDD0D',
  clipboard: '\uD83D\uDCCB',
  trash: '\uD83D\uDDD1\uFE0F',
  receipt: '\uD83E\uDDFE',
  calculator: '\uD83E\uDDEE',
  meal: '\uD83C\uDF7D\uFE0F',
  clock: '\u23F0',
  forecast: '\uD83D\uDCC8',
  procurement: '\uD83D\uDED2',
  reorder: '\uD83D\uDD04',
}

export default async function InventoryPage() {
  await requireChef()

  const parAlerts = await getParAlerts().catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Inventory</h1>
        <p className="text-stone-500 mt-1">
          Your complete inventory command center - track every ingredient in and out, manage
          purchase orders, run audits, and forecast demand.
        </p>
      </div>

      {/* Par Alerts - shown prominently when items are below par */}
      {(parAlerts as any[]).length > 0 && <ParAlertPanel alerts={parAlerts as any[]} />}

      {/* Auto-reorder from par shortfalls */}
      {(parAlerts as any[]).length > 0 && <AutoReorderPanel />}

      {/* Sub-page navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SUB_PAGES.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{ICON_MAP[page.icon] ?? ''}</span>
                <div>
                  <h2 className="font-semibold text-stone-100">{page.label}</h2>
                  <p className="text-sm text-stone-500 mt-0.5">{page.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {(parAlerts as any[]).length === 0 && (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-6 text-center">
          <p className="text-stone-500 text-sm">
            All inventory items are at or above par levels. Start by adding{' '}
            <Link href="/inventory/counts" className="text-brand-600 hover:underline">
              inventory counts
            </Link>{' '}
            if you haven&apos;t set up ingredient tracking yet.
          </p>
        </div>
      )}
    </div>
  )
}
