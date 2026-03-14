import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getSalesTaxSummary,
  getSalesTaxRemittances,
  getUnremittedEventTax,
  getSalesTaxSettings,
} from '@/lib/finance/sales-tax-actions'
import { SalesTaxPanel } from '@/components/finance/sales-tax-panel'
import { Badge } from '@/components/ui/badge'
import { Settings } from 'lucide-react'

export const metadata: Metadata = { title: 'Sales Tax — ChefFlow' }

export default async function SalesTaxPage() {
  await requireChef()

  const [settings, summary, unremitted, remittances] = await Promise.all([
    getSalesTaxSettings().catch(() => null),
    getSalesTaxSummary().catch(() => ({
      collectedCents: 0,
      remittedCents: 0,
      outstandingCents: 0,
      eventCount: 0,
      remittedEventCount: 0,
      pendingEventCount: 0,
      exemptEventCount: 0,
    })),
    getUnremittedEventTax().catch(() => []),
    getSalesTaxRemittances().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Finance
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Sales Tax</h1>
          <p className="text-stone-500 mt-1">
            Track sales tax collected, outstanding, and remitted to state authorities.
          </p>
        </div>
        <Link
          href="/finance/sales-tax/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg px-3 py-2 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Sales Tax Settings
        </Link>
      </div>

      {!settings?.enabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3">
          <p className="text-sm text-amber-800">
            Sales tax collection is <strong>disabled</strong>.{' '}
            <Link href="/finance/sales-tax/settings" className="underline hover:text-amber-900">
              Enable it in Settings →
            </Link>
          </p>
        </div>
      )}

      {settings?.enabled && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="bg-stone-800 rounded-full px-3 py-1 text-stone-400">
            State: <strong>{settings.state ?? '—'}</strong>
          </span>
          <span className="bg-stone-800 rounded-full px-3 py-1 text-stone-400">
            Combined Rate:{' '}
            <strong>{((settings.stateRateBps + settings.localRateBps) / 100).toFixed(2)}%</strong>
          </span>
          <span className="bg-stone-800 rounded-full px-3 py-1 text-stone-400">
            Filing: <strong className="capitalize">{settings.filingFrequency}</strong>
          </span>
          {settings.registrationNumber && (
            <span className="bg-stone-800 rounded-full px-3 py-1 text-stone-400">
              Reg #: <strong className="font-mono">{settings.registrationNumber}</strong>
            </span>
          )}
        </div>
      )}

      <SalesTaxPanel summary={summary} unremittedEvents={unremitted} remittances={remittances} />

      <div className="pt-2">
        <Link
          href="/finance/sales-tax/remittances"
          className="text-sm text-brand-600 hover:underline"
        >
          View full remittance history →
        </Link>
      </div>
    </div>
  )
}
