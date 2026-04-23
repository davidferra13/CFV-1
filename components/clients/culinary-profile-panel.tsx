// Culinary Profile Intelligence Panel
// Chef-facing: renders CP-Engine vector guidance on the client detail page.
// Server component. Fails closed (renders nothing if no data).

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProposalProfileGuidance } from '@/lib/clients/client-profile-chef-workflow'

interface CulinaryProfilePanelProps {
  guidance: ProposalProfileGuidance
  clientName: string
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = score >= 0.75 ? 'bg-emerald-500' : score >= 0.5 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-stone-800">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-stone-400">{pct}%</span>
    </div>
  )
}

function TagList({
  items,
  variant,
}: {
  items: string[]
  variant: 'success' | 'error' | 'default' | 'warning'
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant={variant}>
          {item}
        </Badge>
      ))}
    </div>
  )
}

export function CulinaryProfilePanel({ guidance, clientName }: CulinaryProfilePanelProps) {
  const hasVetoes = guidance.hardVetoes.length > 0
  const hasLikes = guidance.strongLikes.length > 0
  const hasNovelty = guidance.noveltyOpportunities.length > 0
  const hasAmbiguities = guidance.ambiguities.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Culinary Profile Intelligence</CardTitle>
          {guidance.confidenceScore != null && (
            <span className="text-xs text-stone-500">
              {guidance.confidenceScore >= 0.75
                ? 'High confidence'
                : guidance.confidenceScore >= 0.5
                  ? 'Moderate confidence'
                  : 'Low confidence'}
            </span>
          )}
        </div>
        {guidance.confidenceScore != null && <ConfidenceBar score={guidance.confidenceScore} />}
        {guidance.confidenceSummary && (
          <p className="text-xs text-stone-500 mt-1">{guidance.confidenceSummary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context row */}
        <div className="flex flex-wrap gap-3 text-sm">
          {guidance.serviceDepth && (
            <div>
              <span className="text-stone-500">Preferred service: </span>
              <span className="text-stone-200">{guidance.serviceDepth}</span>
            </div>
          )}
          {guidance.emotionalState && guidance.emotionalState !== 'Unknown' && (
            <div>
              <span className="text-stone-500">Recent mood: </span>
              <span className="text-stone-200">{guidance.emotionalState}</span>
            </div>
          )}
        </div>

        {/* Hard vetoes */}
        {hasVetoes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1.5">
              Hard vetoes
            </p>
            <TagList items={guidance.hardVetoes} variant="error" />
          </div>
        )}

        {/* Strong likes */}
        {hasLikes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
              Strong likes
            </p>
            <TagList items={guidance.strongLikes} variant="success" />
          </div>
        )}

        {/* Novelty opportunities */}
        {hasNovelty && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
              Novelty opportunities
            </p>
            <TagList items={guidance.noveltyOpportunities} variant="default" />
          </div>
        )}

        {/* Open ambiguities */}
        {hasAmbiguities && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
              Needs clarification
            </p>
            <div className="space-y-2">
              {guidance.ambiguities.map((a) => (
                <div
                  key={a.title}
                  className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2"
                >
                  <p className="text-sm text-stone-200">{a.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{a.question}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasVetoes && !hasLikes && !hasNovelty && !hasAmbiguities && (
          <p className="text-sm text-stone-500">
            Not enough data yet. Profile intelligence builds as {clientName} books events and
            provides feedback.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
