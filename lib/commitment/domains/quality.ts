import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type QualityContext = {
  eventId: string
  recipeTested: boolean
  platingStandardsDocumented: boolean
  ingredientGrade: string | null
  isUnderTimePressure: boolean
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

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F']

const RULE_DESCRIPTIONS: Record<string, string> = {
  recipe_tested_before_serve: 'Recipe served to clients without prior testing',
  plating_standards_documented: 'Plating standards not documented for this dish',
  ingredient_quality_floor: 'Ingredient grade below your committed minimum',
  no_shortcuts_under_pressure: 'Quality shortcut taken under time pressure',
}

export async function evaluateQualityCommitments(
  tenantId: string,
  context: QualityContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'quality')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'recipe_tested_before_serve') {
      violated = !context.recipeTested
    } else if (rule.type === 'plating_standards_documented') {
      violated = !context.platingStandardsDocumented
    } else if (rule.type === 'ingredient_quality_floor') {
      if (context.ingredientGrade) {
        const minIdx = GRADE_ORDER.indexOf(rule.minGrade ?? 'C')
        const actualIdx = GRADE_ORDER.indexOf(context.ingredientGrade)
        violated = actualIdx > minIdx
      }
    } else if (rule.type === 'no_shortcuts_under_pressure') {
      violated = context.isUnderTimePressure
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Quality commitment violated',
    })
  }

  return results
}

export async function getQualitySuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const suggestions: CommitmentSuggestion[] = []

  // Quality domain suggests baseline standards for all chefs
  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'quality',
    suggestedRule: { type: 'recipe_tested_before_serve', required: true },
    rationale:
      'Testing every recipe before serving to clients prevents surprises and protects your reputation.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'quality',
    suggestedRule: { type: 'ingredient_quality_floor', minGrade: 'B' },
    rationale:
      'Setting a minimum ingredient grade of B ensures consistent quality across all events.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
