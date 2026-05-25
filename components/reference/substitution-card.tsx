import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SubstitutionRule } from '@/lib/reference/types'
import { REASON_LABELS, QUALITY_LABELS } from '@/lib/reference/substitutions'
import { ArrowRight } from '@/components/ui/icons'

const QUALITY_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  none: 'success',
  minor: 'success',
  moderate: 'warning',
  significant: 'error',
}

const CONFIDENCE_COLORS: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  verified: 'success',
  common: 'info',
  experimental: 'warning',
}

export function SubstitutionCard({ rule }: { rule: SubstitutionRule }) {
  return (
    <Card>
      <CardContent className="py-4">
        {/* Source -> Target */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium text-stone-200">{rule.sourceIngredient}</span>
          <ArrowRight className="w-4 h-4 text-stone-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-brand-400">{rule.targetIngredient}</span>
        </div>

        {/* Ratio */}
        <div className="mb-3">
          <span className="text-xs font-medium text-stone-400">Ratio: </span>
          <span className="text-xs text-stone-200">{rule.ratio}</span>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {rule.reasons.map((r) => (
            <Badge key={r} variant="default">
              {REASON_LABELS[r]}
            </Badge>
          ))}
          <Badge variant={QUALITY_COLORS[rule.qualityImpact] ?? 'default'}>
            {QUALITY_LABELS[rule.qualityImpact]}
          </Badge>
          <Badge variant={CONFIDENCE_COLORS[rule.confidence] ?? 'default'}>{rule.confidence}</Badge>
        </div>

        {/* Behavior notes */}
        <p className="text-xs text-stone-400 mb-2">{rule.behaviorNotes}</p>

        {/* Cuisine context */}
        {rule.cuisineContext && (
          <p className="text-xs text-stone-500 mb-2">
            <span className="font-medium text-stone-400">Best for: </span>
            {rule.cuisineContext}
          </p>
        )}

        {/* Limitations */}
        {rule.limitations && (
          <p className="text-xs text-orange-400/80">
            <span className="font-medium">Limitations: </span>
            {rule.limitations}
          </p>
        )}

        {/* Sources */}
        {rule.sources.length > 0 && (
          <p className="text-xs text-stone-600 mt-2">Source: {rule.sources.join(', ')}</p>
        )}
      </CardContent>
    </Card>
  )
}
