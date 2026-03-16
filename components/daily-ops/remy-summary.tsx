// RemySummary - Remy's conversational daily summary at the top of the Daily Ops page.

import { Bot } from '@/components/ui/icons'

type Props = {
  summary: string
  todayEventCount: number
  estimatedMinutes: number
}

export function RemySummary({ summary, todayEventCount, estimatedMinutes }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-stone-800 border border-stone-700 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-900">
        <Bot className="h-4 w-4 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-brand-600">Remy</span>
          {todayEventCount > 0 && (
            <span className="text-xs text-stone-400">
              {todayEventCount} event{todayEventCount !== 1 ? 's' : ''} today
            </span>
          )}
        </div>
        <p className="text-sm text-stone-300 leading-relaxed">{summary}</p>
        {estimatedMinutes > 0 && (
          <p className="text-xs text-stone-400 mt-2">
            Estimated total: ~
            {estimatedMinutes < 60
              ? `${estimatedMinutes} min`
              : `${Math.round((estimatedMinutes / 60) * 10) / 10} hours`}
          </p>
        )}
      </div>
    </div>
  )
}
