// PipelineRevenueForecast - Dashboard widget showing expected + best-case revenue
// from open inquiries and active events, weighted by stage probability.
import Link from 'next/link'
import { TrendingUp } from '@/components/ui/icons'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { PipelineRevenueForecast as ForecastData } from '@/lib/pipeline/forecast'

interface Props {
  forecast: ForecastData
}

export function PipelineRevenueForecast({ forecast }: Props) {
  const { expectedCents, bestCaseCents, stages } = forecast

  // Only show stages that have budget amounts attached
  const stagesWithAmount = stages.filter((s) => s.totalCents > 0)
  const hasData = stages.some((s) => s.count > 0)

  if (!hasData) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-stone-400" />
          <h3 className="font-semibold text-stone-100 text-sm">Pipeline Forecast</h3>
        </div>
        <p className="text-sm text-stone-500">No open inquiries or events in the pipeline.</p>
        <Link
          href="/inquiries"
          className="text-sm text-brand-600 hover:underline mt-2 inline-block"
        >
          View Pipeline →
        </Link>
      </Card>
    )
  }

  const totalCount = stages.reduce((sum, s) => sum + s.count, 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-stone-100 text-sm">Pipeline Forecast</h3>
        </div>
        <Link
          href="/inquiries"
          className="text-xs text-stone-500 hover:text-brand-600 transition-colors"
        >
          {totalCount} open →
        </Link>
      </div>

      {/* Main numbers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-950 rounded-lg p-3">
          <p className="text-xs text-emerald-700 font-medium mb-0.5">Expected</p>
          <p className="text-xl font-bold text-emerald-800">{formatCurrency(expectedCents)}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">probability-weighted</p>
        </div>
        <div className="bg-stone-800 rounded-lg p-3">
          <p className="text-xs text-stone-400 font-medium mb-0.5">Best Case</p>
          <p className="text-xl font-bold text-stone-200">{formatCurrency(bestCaseCents)}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">if all close</p>
        </div>
      </div>

      {/* Stage breakdown - only stages with budget */}
      {stagesWithAmount.length > 0 && (
        <div className="space-y-1.5">
          {stagesWithAmount.map((stage) => {
            const barWidth =
              bestCaseCents > 0 ? Math.round((stage.expectedCents / bestCaseCents) * 100) : 0
            return (
              <div key={stage.stage}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-stone-400">{stage.label}</span>
                  <span className="text-stone-500">
                    {formatCurrency(stage.expectedCents)}
                    <span className="text-stone-400 ml-1">
                      ({Math.round(stage.probability * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
