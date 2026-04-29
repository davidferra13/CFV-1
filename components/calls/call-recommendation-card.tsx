import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { CallRecommendation } from '@/lib/calls/recommendations'

type CallRecommendationCardProps = {
  recommendation: CallRecommendation
  href: string
  phoneHref?: string | null
  compact?: boolean
}

const urgencyClasses: Record<CallRecommendation['urgency'], string> = {
  now: 'border-amber-700/60 bg-amber-950/50 text-amber-100',
  soon: 'border-brand-700/50 bg-brand-950/40 text-brand-100',
  normal: 'border-stone-700 bg-stone-900 text-stone-200',
}

const interventionActionLabels: Record<CallRecommendation['interventionAction'], string> = {
  call_now: 'Call now',
  call_today: 'Call today',
  schedule_call: 'Schedule call',
  ai_can_handle: 'AI can handle',
  no_action: 'No action',
}

export function CallRecommendationCard({
  recommendation,
  href,
  phoneHref,
  compact = false,
}: CallRecommendationCardProps) {
  return (
    <div
      className={`rounded-lg border ${urgencyClasses[recommendation.urgency]} ${
        compact ? 'px-3 py-3' : 'p-4'
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">{recommendation.label}</p>
          <p className="mt-1 text-sm opacity-80">{recommendation.reason}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-current/20 px-2 py-0.5 font-medium">
              {interventionActionLabels[recommendation.interventionAction]}
            </span>
            <span className="opacity-75">Human score {recommendation.interventionScore}/100</span>
          </div>
          {!compact && recommendation.reasonTrace.length > 0 && (
            <div className="mt-3 space-y-1 text-xs opacity-80">
              {recommendation.reasonTrace.slice(0, 3).map((item) => (
                <p key={item.signal}>
                  <span className="font-medium">{item.signal.replace(/_/g, ' ')}:</span>{' '}
                  {item.detail}
                </p>
              ))}
              <p>
                <span className="font-medium">Risk:</span> {recommendation.noCallRisk}
              </p>
              <p>
                <span className="font-medium">Target outcome:</span>{' '}
                {recommendation.idealOutcome}
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {phoneHref && (
            <a href={phoneHref}>
              <Button variant="secondary" size="sm">
                Call Now
              </Button>
            </a>
          )}
          <Link href={href}>
            <Button variant="primary" size="sm">
              Schedule Call
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
