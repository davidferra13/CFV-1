// Multi-Jurisdiction Sales Tax Dashboard - Track rates, filings, and liability by jurisdiction
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getTaxStats,
  getTaxJurisdictions,
  getTaxFilings,
  getUpcomingFilings,
} from '@/lib/finance/sales-tax-jurisdiction-actions'
import { SalesTaxDashboard } from '@/components/finance/sales-tax-dashboard'

export const metadata: Metadata = {
  title: 'Tax Jurisdictions | ChefFlow',
}

export default async function SalesTaxJurisdictionsPage() {
  await requireChef()

  const [stats, jurisdictions, filings, upcoming] = await Promise.all([
    getTaxStats(),
    getTaxJurisdictions(),
    getTaxFilings(),
    getUpcomingFilings(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/finance/sales-tax" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Sales Tax
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mt-1">Tax Jurisdictions & Filings</h1>
        <p className="text-stone-500 mt-1">
          Manage multiple tax jurisdictions, track combined rates, and generate filing summaries.
        </p>
      </div>

      <SalesTaxDashboard
        initialStats={stats}
        initialJurisdictions={jurisdictions}
        initialFilings={filings}
        upcomingDeadlines={upcoming}
      />
    </div>
  )
}
