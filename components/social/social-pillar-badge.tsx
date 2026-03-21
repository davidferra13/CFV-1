import type { SocialPillar } from '@/lib/social/types'
import { SOCIAL_PILLAR_LABELS } from '@/lib/social/types'

const PILLAR_STYLES: Record<SocialPillar, string> = {
  recipe: 'bg-emerald-950 text-emerald-700 ring-1 ring-inset ring-emerald-800',
  behind_scenes: 'bg-amber-950 text-amber-700 ring-1 ring-inset ring-amber-800',
  education: 'bg-brand-950 text-brand-700 ring-1 ring-inset ring-brand-800',
  social_proof: 'bg-violet-950 text-violet-700 ring-1 ring-inset ring-violet-200',
  offers: 'bg-orange-950 text-orange-700 ring-1 ring-inset ring-orange-200',
  seasonal: 'bg-rose-950 text-rose-700 ring-1 ring-inset ring-rose-200',
}

export function SocialPillarBadge({
  pillar,
  className = '',
}: {
  pillar: SocialPillar
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PILLAR_STYLES[pillar]} ${className}`}
    >
      {SOCIAL_PILLAR_LABELS[pillar]}
    </span>
  )
}

export function getPillarColor(pillar: SocialPillar): string {
  const map: Record<SocialPillar, string> = {
    recipe: '#10b981',
    behind_scenes: '#f59e0b',
    education: '#b15c26',
    social_proof: '#8b5cf6',
    offers: '#f97316',
    seasonal: '#f43f5e',
  }
  return map[pillar]
}
