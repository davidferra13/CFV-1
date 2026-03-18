// Stage Conversion Funnel - visualizes how records progress through
// the inquiry pipeline and event pipeline with drop-off rates.

import type { StageConversionData } from '@/lib/analytics/stage-conversion'

interface Props {
  data: StageConversionData
}

export function StageConversionFunnel({ data }: Props) {
  return (
    <div className="space-y-8">
      <Funnel
        title="Inquiry Pipeline"
        stages={data.inquiryFunnel}
        totalStarted={data.inquiryTotalStarted}
        totalConverted={data.inquiryTotalConverted}
        overallRate={data.inquiryOverallConversionRate}
        convertedLabel="Confirmed"
      />
      <Funnel
        title="Event Pipeline"
        stages={data.eventFunnel}
        totalStarted={data.eventTotalStarted}
        totalConverted={data.eventTotalCompleted}
        overallRate={data.eventOverallCompletionRate}
        convertedLabel="Completed"
      />
    </div>
  )
}

function Funnel({
  title,
  stages,
  totalStarted,
  totalConverted,
  overallRate,
  convertedLabel,
}: {
  title: string
  stages: StageConversionData['inquiryFunnel']
  totalStarted: number
  totalConverted: number
  overallRate: number | null
  convertedLabel: string
}) {
  if (totalStarted === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-stone-300 mb-2">{title}</h3>
        <p className="text-xs text-stone-400">No data yet</p>
      </div>
    )
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-300">{title}</h3>
        {overallRate !== null && (
          <span className="text-xs text-stone-500">
            {convertedLabel} rate:{' '}
            <span className="font-semibold text-stone-100">{overallRate}%</span>
            <span className="text-stone-400 ml-1">
              ({totalConverted}/{totalStarted})
            </span>
          </span>
        )}
      </div>

      <div className="space-y-2">
        {stages.map((stage, idx) => {
          const barPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
          const isFirst = idx === 0
          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-stone-400 font-medium">{stage.label}</span>
                <div className="flex items-center gap-3">
                  {!isFirst && stage.conversionFromPrev !== null && (
                    <span
                      className={`text-xxs ${stage.conversionFromPrev >= 70 ? 'text-emerald-600' : stage.conversionFromPrev >= 40 ? 'text-amber-600' : 'text-red-500'}`}
                    >
                      ↓ {stage.conversionFromPrev}%
                    </span>
                  )}
                  <span className="font-semibold text-stone-100 w-8 text-right">{stage.count}</span>
                </div>
              </div>
              <div className="h-2.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stage.key === 'completed' || stage.key === 'confirmed'
                      ? 'bg-emerald-400'
                      : stage.key === 'in_progress' || stage.key === 'quoted'
                        ? 'bg-brand-400'
                        : 'bg-stone-300'
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
