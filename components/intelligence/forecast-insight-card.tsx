'use client'

type Props = {
  insights: string[]
}

export function ForecastInsightCard({ insights }: Props) {
  if (!insights.length) {
    return null
  }

  return (
    <div className="space-y-2">
      {insights.map((insight, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2.5"
        >
          <span className="mt-0.5 flex-shrink-0 text-xs text-stone-500">{i + 1}.</span>
          <p className="text-sm text-stone-300">{insight}</p>
        </div>
      ))}
    </div>
  )
}
