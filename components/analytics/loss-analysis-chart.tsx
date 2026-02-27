'use client'

const REASON_LABELS: Record<string, string> = {
  price_too_high: 'Price Too High',
  chose_another_chef: 'Chose Another Chef',
  date_not_available: 'Date Not Available',
  cuisine_not_right_fit: 'Cuisine Not Right Fit',
  client_lost_interest: 'Client Lost Interest',
  other: 'Other',
}

export function LossAnalysisChart({ data }: { data: Array<{ reason: string; count: number }> }) {
  if (data.length === 0)
    return <p className="text-sm text-stone-500">No lost quote data recorded yet.</p>

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
        const barWidth = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0
        return (
          <div key={d.reason}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-stone-300">{REASON_LABELS[d.reason] ?? d.reason}</span>
              <span className="text-stone-500">
                {d.count} ({pct}%)
              </span>
            </div>
            <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
