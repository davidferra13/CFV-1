import type { ResumeItem } from '@/lib/activity/chef-types'
import type { ResumeTrail } from '@/lib/resume-trails/types'
import { deriveResumeTrails } from '@/lib/resume-trails/derive'
import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const SOURCE_ICON: Record<ResumeTrail['source']['kind'], string> = {
  event: 'calendar',
  menu: 'document',
  inquiry: 'lightning',
  quote: 'document',
  note: 'document',
  recipe: 'document',
  client_profile: 'document',
  vendor: 'document',
  system: 'document',
}

function tierForTrail(trail: ResumeTrail): RailTier {
  if (trail.evidenceLabel === 'stale') return 'p3'
  if (trail.nextActionKind === 'follow_up') return 'p1'
  if (trail.nextActionKind === 'complete' || trail.nextActionKind === 'verify') return 'p2'
  return 'p3'
}

function trailToRailItem(trail: ResumeTrail): GodModeResolvedItem {
  return {
    definitionId: `chef.resume_${trail.source.kind}`,
    tier: tierForTrail(trail),
    label: trail.title,
    context: trail.nextAction,
    destination: trail.route,
    icon: SOURCE_ICON[trail.source.kind],
    loopState: trail.evidenceLabel === 'stale' ? 'stale' : 'active',
    sourceKind:
      trail.source.kind === 'note'
        ? 'client_profile'
        : trail.source.kind === 'client_profile'
          ? 'client_profile'
          : trail.source.kind,
    evidenceLabel: trail.evidenceLabel,
    confidence: trail.evidenceLabel === 'unknown' ? null : 0.8,
    proofHref: trail.route,
    nextAction: trail.nextAction,
    resumeContext: {
      lastAction: trail.lastAction,
      timestamp: trail.timestamp,
      sourceRoute: trail.route,
      nextStep: trail.nextAction,
    },
    data: {
      sourceId: trail.source.id,
      sourceKind: trail.source.kind,
      rank: trail.rank,
    },
    score: trail.rank,
  }
}

export function resolveResumeTrailItems(items: ResumeItem[], now: Date): GodModeResolvedItem[] {
  return deriveResumeTrails(items, { now, limit: 6 }).map(trailToRailItem)
}

export async function resolveResumeTrails(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { getResumeItems } = await import('@/lib/activity/resume')

  try {
    const items = await getResumeItems()
    return resolveResumeTrailItems(items, ctx.now)
  } catch (err) {
    console.error('[resume-resolver] Query failed:', err)
    return []
  }
}
