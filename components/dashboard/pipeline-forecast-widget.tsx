// Pipeline Revenue Forecast Widget - shows weighted pipeline value

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

interface ForecastStage {
  stage: string
  label: string
  count: number
  totalCents: number
  expectedCents: number
  probability: number
}

interface PipelineRevenueForecast {
  expectedCents: number
  bestCaseCents: number
  stages: ForecastStage[]
  computedAt: string
}

interface Props {
  forecast: PipelineRevenueForecast
}

export function PipelineForecastWidget({ forecast }: Props) {
  if (forecast.stages.length === 0 && forecast.expectedCents === 0) return null

  const activeStages = forecast.stages.filter((s) => s.count > 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Pipeline Forecast</CardTitle>
          <Link
            href="/prospecting"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            Pipeline <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-stone-500">Expected Revenue</p>
            <p className="text-lg font-bold text-brand-400">
              {formatCurrency(forecast.expectedCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Best Case</p>
            <p className="text-lg font-bold text-stone-300">
              {formatCurrency(forecast.bestCaseCents)}
            </p>
          </div>
        </div>

        {activeStages.length > 0 && (
          <div className="space-y-2">
            {activeStages.map((stage) => (
              <div key={stage.stage} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: `hsl(${Math.round(stage.probability * 120)}, 70%, 50%)`,
                    }}
                  />
                  <span className="text-stone-400 truncate">{stage.label}</span>
                  <span className="text-xs text-stone-600">({stage.count})</span>
                </div>
                <span className="font-medium text-stone-200 shrink-0 ml-2">
                  {formatCurrency(stage.expectedCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
