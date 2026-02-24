// Inventory Landing Page
// Hub for inventory management: par alerts, navigation to sub-pages.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getParAlerts } from '@/lib/inventory/count-actions'
import { ParAlertPanel } from '@/components/inventory/par-alert-panel'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Inventory - ChefFlow' }

const SUB_PAGES = [
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
]

const ICON_MAP: Record<string, string> = {
  clipboard: '\uD83D\uDCCB',
  trash: '\uD83D\uDDD1\uFE0F',
  receipt: '\uD83E\uDDFE',
  calculator: '\uD83E\uDDEE',
}

export default async function InventoryPage() {
  await requireChef()

  const parAlerts = await getParAlerts().catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Inventory</h1>
        <p className="text-stone-500 mt-1">
          Track ingredient levels, log waste, manage vendor invoices, and analyze food costs.
        </p>
      </div>

      {/* Par Alerts — shown prominently when items are below par */}
      {(parAlerts as any[]).length > 0 && <ParAlertPanel alerts={parAlerts as any[]} />}

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
            if you haven't set up ingredient tracking yet.
          </p>
        </div>
      )}
    </div>
  )
}
