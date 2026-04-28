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
