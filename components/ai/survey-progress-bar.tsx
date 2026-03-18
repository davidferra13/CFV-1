'use client'

// Survey Progress Bar - Thin progress indicator shown in the mascot chat header
// during the "Get to Know You" survey. Shows answered/total and a colored bar.

import { SURVEY_TOTAL_QUESTIONS } from '@/lib/ai/remy-survey-constants'

interface SurveyProgressBarProps {
  answered: number
}

export function SurveyProgressBar({ answered }: SurveyProgressBarProps) {
  const pct = Math.round((answered / SURVEY_TOTAL_QUESTIONS) * 100)

  return (
    <div className="flex items-center gap-2 px-3 py-1 border-b border-stone-700 bg-stone-900/50">
      <div className="flex-1 h-1 rounded-full bg-stone-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xxs text-stone-400 tabular-nums whitespace-nowrap">
        {answered}/{SURVEY_TOTAL_QUESTIONS}
      </span>
    </div>
  )
}
