// Dashboard Reputation Score Card - aggregate reputation from reviews, testimonials, surveys, mentions

import { getAggregateReputationScore } from '@/lib/reputation/reputation-score-actions'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import type { AggregateReputationScore } from '@/lib/reputation/reputation-score-actions'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/ReputationScore] ${label} failed:`, err)
    return fallback
  }
}

// ─── Source labels ──────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  internalReviews: 'Reviews',
  guestTestimonials: 'Testimonials',
  externalReviews: 'External',
  surveys: 'Surveys',
  mentionSentiment: 'Mentions',
}

// ─── Color helpers ─────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 4.0) return '#4ade80' // emerald-400
  if (score >= 3.0) return '#fbbf24' // amber-400
  return '#f87171' // red-400
}

function scoreColorClass(score: number): string {
  if (score >= 4.0) return 'text-emerald-400'
  if (score >= 3.0) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBgClass(score: number): string {
  if (score >= 4.0) return 'bg-emerald-400'
  if (score >= 3.0) return 'bg-amber-400'
  return 'bg-red-400'
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30',
  medium: 'bg-amber-950/40 text-amber-400 border-amber-800/30',
  low: 'bg-stone-800 text-stone-400 border-stone-700',
}

// ─── Main Card ─────────────────────────────────────────────────

export async function ReputationScoreCard() {
  const data = await safe('reputation', getAggregateReputationScore, null)

  if (!data || data.totalDataPoints === 0) return null

  const color = scoreColor(data.overallScore)

  // Build active sources (count > 0) for breakdown bars
  const activeSources = buildActiveSources(data)

  return (
    <WidgetCardShell widgetId="reputation_score" title="Reputation" size="md" href="/analytics">
      <div className="space-y-3">
        {/* Top row: score circle + breakdown bars */}
        <div className="flex items-start gap-4">
          {/* Score circle */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-2"
            style={{
              color,
              borderColor: `${color}40`,
              backgroundColor: `${color}15`,
            }}
          >
            <span className="text-lg font-bold leading-none">{data.overallScore.toFixed(1)}</span>
          </div>

          {/* Breakdown bars */}
          <div className="flex-1 space-y-1.5 pt-0.5">
            {activeSources.map(({ key, label, value, maxValue }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-20 text-xs text-stone-500 shrink-0 truncate">{label}</span>
                <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBgClass(value)}`}
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  />
                </div>
                <span className={`w-7 text-right text-xs tabular-nums ${scoreColorClass(value)}`}>
                  {value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: confidence badge + data points */}
        <div className="flex items-center justify-between border-t border-stone-800 pt-2">
          <span
            className={`text-xxs font-medium px-2 py-0.5 rounded-full border ${CONFIDENCE_STYLES[data.confidence]}`}
          >
            {data.confidence} confidence
          </span>
          <span className="text-xs text-stone-500">
            {data.totalDataPoints} data point{data.totalDataPoints !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </WidgetCardShell>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────

export function ReputationScoreSkeleton() {
  return (
    <div
      className="col-span-1 sm:col-span-2 rounded-2xl overflow-hidden animate-pulse"
      style={{
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(120,113,108,0.06)',
      }}
    >
      <div className="px-4 pt-3.5 pb-1 flex items-center gap-2.5">
        <div className="w-4 h-4 loading-bone loading-bone-muted" />
        <div className="h-3 w-24 loading-bone loading-bone-muted" />
      </div>
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full loading-bone loading-bone-muted shrink-0" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-2 w-full loading-bone loading-bone-muted rounded" />
            <div className="h-2 w-4/5 loading-bone loading-bone-muted rounded" />
            <div className="h-2 w-3/4 loading-bone loading-bone-muted rounded" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-800/50">
          <div className="h-4 w-24 loading-bone loading-bone-muted rounded-full" />
          <div className="h-3 w-16 loading-bone loading-bone-muted rounded" />
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────

type ActiveSource = {
  key: string
  label: string
  value: number
  maxValue: number
}

function buildActiveSources(data: AggregateReputationScore): ActiveSource[] {
  const sources: ActiveSource[] = []
  const maxValue = 5

  const { breakdown } = data

  if (breakdown.internalReviews.count > 0) {
    sources.push({
      key: 'internalReviews',
      label: SOURCE_LABELS.internalReviews,
      value: breakdown.internalReviews.avg,
      maxValue,
    })
  }
  if (breakdown.guestTestimonials.count > 0) {
    sources.push({
      key: 'guestTestimonials',
      label: SOURCE_LABELS.guestTestimonials,
      value: breakdown.guestTestimonials.avg,
      maxValue,
    })
  }
  if (breakdown.externalReviews.count > 0) {
    sources.push({
      key: 'externalReviews',
      label: SOURCE_LABELS.externalReviews,
      value: breakdown.externalReviews.avg,
      maxValue,
    })
  }
  if (breakdown.surveys.count > 0) {
    sources.push({
      key: 'surveys',
      label: SOURCE_LABELS.surveys,
      value: breakdown.surveys.avg,
      maxValue,
    })
  }
  if (breakdown.mentionSentiment.count > 0) {
    sources.push({
      key: 'mentionSentiment',
      label: SOURCE_LABELS.mentionSentiment,
      value: breakdown.mentionSentiment.positiveRate * 5,
      maxValue,
    })
  }

  return sources
}
