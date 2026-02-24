import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getCashFlowForecast } from '@/lib/finance/cash-flow-actions'
import { CashFlowChart } from '@/components/finance/cash-flow-chart'

export const metadata: Metadata = { title: 'Cash Flow Forecast - ChefFlow' }

export default async function CashFlowPage() {
  await requireChef()

  const forecast = await getCashFlowForecast(30).catch(() => null)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Cash Flow Forecast</h1>
        <p className="text-stone-500 mt-1">Projected income and expenses over the next 30 days</p>
      </div>

      {forecast ? (
        <CashFlowChart initialForecast={forecast} />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Cash flow forecast is not available at this time.
          </p>
        </div>
      )}
    </div>
  )
}
