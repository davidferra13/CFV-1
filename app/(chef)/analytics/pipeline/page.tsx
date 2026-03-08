// Pipeline Forecast — Revenue pipeline analysis
// Projects future revenue based on active inquiries, quotes, and confirmed events

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPipelineRevenueForecast } from '@/lib/analytics/pipeline-forecast-actions'
import { StaticCSVDownloadButton } from '@/components/exports/static-csv-download-button'

const PipelineForecast = dynamic(
  () => import('@/components/analytics/pipeline-forecast').then((m) => m.PipelineForecast),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

export const metadata: Metadata = { title: 'Pipeline Forecast - ChefFlow' }

export default async function PipelineForecastPage() {
  await requireChef()

  let pipelineData: Awaited<ReturnType<typeof getPipelineRevenueForecast>> | null = null
  try {
    pipelineData = await getPipelineRevenueForecast()
  } catch {
    pipelineData = null
  }
  const exportRows =
    pipelineData?.stages.map((stage) => [
      stage.status,
      stage.eventCount,
      stage.totalValueCents,
      stage.weight,
      stage.weightedValueCents,
    ]) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Pipeline Forecast</h1>
          <p className="text-stone-400 mt-1">
            Projected revenue from your active inquiries, pending quotes, and confirmed bookings.
          </p>
        </div>
        {pipelineData && (
          <StaticCSVDownloadButton
            headers={[
              'status',
              'event_count',
              'total_value_cents',
              'weight',
              'weighted_value_cents',
            ]}
            rows={exportRows}
            filename="pipeline-forecast.csv"
          />
        )}
      </div>

      {pipelineData ? (
        <PipelineForecast
          pipeline={pipelineData.stages.map((s) => ({
            status: s.status,
            count: s.eventCount,
            totalCents: s.totalValueCents,
            weightedCents: s.weightedValueCents,
          }))}
        />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No pipeline data available. As inquiries and quotes come in, your forecast will appear
            here.
          </p>
        </div>
      )}
    </div>
  )
}
