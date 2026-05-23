import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type MenuIntegrityContext = {
  eventId: string
  hoursSinceLastLock?: number
  revisionCount: number
  daysBeforeEvent?: number
  hasNewDishes: boolean
  allRecipesLinked: boolean
  menuCosted: boolean
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    futureSelfletter: row.future_self_letter,
    seasonalProfile: row.seasonal_profile,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function calculateFrictionTier(overrides: any[]): FrictionTier {
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000

  const in30 = overrides.filter((o) => new Date(o.created_at).getTime() > thirtyDaysAgo).length
  const in60 = overrides.filter((o) => new Date(o.created_at).getTime() > sixtyDaysAgo).length
  const in90 = overrides.filter((o) => new Date(o.created_at).getTime() > ninetyDaysAgo).length

  if (in90 >= 8) return 5
  if (in90 >= 5) return 4
  if (in60 >= 3) return 3
  if (in30 >= 2) return 2
  return 1
}

function countOverridesInWindow(overrides: any[]): {
  last30: number
  last60: number
  last90: number
} {
  const now = Date.now()
  return {
    last30: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 30 * 24 * 60 * 60 * 1000
    ).length,
    last60: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 60 * 24 * 60 * 60 * 1000
    ).length,
    last90: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 90 * 24 * 60 * 60 * 1000
    ).length,
  }
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  menu_lock_cooldown: 'Menu unlocked before cooldown period elapsed',
  max_menu_revisions: 'Menu revision count exceeds your committed cap',
  no_new_dishes_within: 'New dish added too close to event date',
  recipe_required_before_lock: 'Menu locked without all recipes linked',
}

export async function evaluateMenuIntegrityCommitments(
  tenantId: string,
  context: MenuIntegrityContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'menu')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'menu_lock_cooldown') {
      if (context.hoursSinceLastLock != null) {
        violated = context.hoursSinceLastLock < (rule.hours ?? 24)
      }
    } else if (rule.type === 'max_menu_revisions') {
      violated = context.revisionCount > (rule.limit ?? 5)
    } else if (rule.type === 'no_new_dishes_within') {
      if (context.hasNewDishes && context.daysBeforeEvent != null) {
        violated = context.daysBeforeEvent <= (rule.days ?? 3)
      }
    } else if (rule.type === 'recipe_required_before_lock') {
      violated = !context.allRecipesLinked
    }

    if (!violated) continue

    const { data: overrideRows } = await client
      .from('commitment_overrides' as any)
      .select('*')
      .eq('commitment_id', commitment.id)
      .order('created_at', { ascending: false })

    const overrides = overrideRows || []
    const tier = calculateFrictionTier(overrides)

    results.push({
      blocked: false,
      tier,
      commitment,
      streakAtRisk: commitment.currentStreak > 0 ? commitment.currentStreak : null,
      overridesInWindow: countOverridesInWindow(overrides),
      hasConsequenceCorrelation: false,
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Menu integrity commitment violated',
    })
  }

  return results
}

export async function getMenuIntegritySuggestions(
  tenantId: string
): Promise<CommitmentSuggestion[]> {
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Check for events with high revision counts
  const { data: events } = await client
    .from('events' as any)
    .select('id, menu_revision_count')
    .eq('tenant_id', tenantId)
    .gte('created_at', ninetyDaysAgo.toISOString())

  if (events && events.length > 0) {
    const highRevisionEvents = events.filter((e: any) => (e.menu_revision_count ?? 0) > 5)

    if (highRevisionEvents.length >= 2) {
      suggestions.push({
        id: generateId(),
        tenantId,
        domain: 'menu',
        suggestedRule: { type: 'max_menu_revisions', limit: 5 },
        rationale: `${highRevisionEvents.length} events had more than 5 menu revisions. A cap prevents scope creep and protects prep time.`,
        evidence: { highRevisionCount: highRevisionEvents.length },
        status: 'pending',
        respondedAt: null,
        dismissedReason: null,
        createdAt: new Date(),
      })
    }
  }

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'menu',
    suggestedRule: { type: 'menu_lock_cooldown', hours: 24 },
    rationale:
      'A 24-hour cooldown after locking a menu prevents impulsive last-minute changes that disrupt prep.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
