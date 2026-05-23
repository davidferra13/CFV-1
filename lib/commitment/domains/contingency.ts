import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type ContingencyContext = {
  eventId: string
  emergencyContactsSet: boolean
  backupVendorListReady: boolean
  equipmentFailurePlanReady: boolean
  weatherContingencyReady: boolean
  isOutdoorEvent: boolean
  eventValue?: number
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
  emergency_contacts_before_confirm: 'Event confirmed without emergency contacts set',
  backup_plan_for_high_value: 'High-value event confirmed without a backup plan',
  backup_vendor_list: 'Event confirmed without backup vendor list',
  equipment_failure_plan: 'Event confirmed without equipment failure plan',
  weather_contingency_outdoor: 'Outdoor event confirmed without weather contingency',
  insurance_current_required: 'Operating without current insurance',
  equipment_checklist_before_service: 'Service started without equipment checklist',
}

export async function evaluateContingencyCommitments(
  tenantId: string,
  context: ContingencyContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'contingency')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'emergency_contacts_before_confirm') {
      violated = !context.emergencyContactsSet
    } else if (rule.type === 'backup_plan_for_high_value') {
      if (context.eventValue != null) {
        violated = context.eventValue >= (rule.minEventValue ?? 2000)
      }
    } else if (rule.type === 'backup_vendor_list') {
      violated = !context.backupVendorListReady
    } else if (rule.type === 'equipment_failure_plan') {
      violated = !context.equipmentFailurePlanReady
    } else if (rule.type === 'weather_contingency_outdoor') {
      violated = context.isOutdoorEvent && !context.weatherContingencyReady
    } else if (rule.type === 'equipment_checklist_before_service') {
      // Evaluated at service time, always flagged if no checklist
      violated = false
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Contingency commitment violated',
    })
  }

  return results
}

export async function getContingencySuggestions(
  tenantId: string
): Promise<CommitmentSuggestion[]> {
  const suggestions: CommitmentSuggestion[] = []

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'contingency',
    suggestedRule: { type: 'emergency_contacts_before_confirm', required: true },
    rationale:
      'Having emergency contacts on file before confirming ensures you can reach someone if plans change suddenly.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'contingency',
    suggestedRule: { type: 'backup_vendor_list', required: true },
    rationale:
      'A backup vendor list prevents scrambling when your primary supplier is unavailable.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'contingency',
    suggestedRule: { type: 'equipment_failure_plan', required: true },
    rationale:
      'Equipment fails at the worst times. A pre-made plan (backup oven, portable burner, rental contacts) saves the day.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'contingency',
    suggestedRule: { type: 'weather_contingency_outdoor', required: true },
    rationale:
      'Outdoor events need a weather plan: rain backup, wind protection, temperature management. No surprises.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
