'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DOMAIN_LABELS, type CommitmentDomain } from '@/lib/commitment/types'

interface FrictionBannerProps {
  ruleDescription: string
  commitmentDomain: CommitmentDomain
  onDismiss: () => void
  onViewDetails: () => void
}

export function FrictionBanner({
  ruleDescription,
  commitmentDomain,
  onDismiss,
  onViewDetails,
}: FrictionBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-l-4 border-amber-500/40 border-l-amber-500 bg-amber-950/20 px-4 py-3">
      <svg
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="warning">{DOMAIN_LABELS[commitmentDomain]}</Badge>
        </div>
        <p className="text-sm text-stone-300">{ruleDescription}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button variant="secondary" size="sm" onClick={onViewDetails}>
          View Commitment
        </Button>
      </div>
    </div>
  )
}
