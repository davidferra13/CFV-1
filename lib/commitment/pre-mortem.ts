import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain } from '@/lib/commitment/types'

// -- Types --------------------------------------------------------------------

export type FailureMode =
  | 'ingredient_shortage'
  | 'timing_overrun'
  | 'dietary_miss'
  | 'equipment_failure'
  | 'staff_no_show'
  | 'venue_surprise'
  | 'weather_impact'
  | 'client_scope_change'
  | 'transport_issue'
  | 'recipe_scaling_error'
  | 'vendor_delivery_late'
  | 'communication_gap'

export interface PreMortemPrompt {
  eventId: string
  eventName: string | null
  guestCount: number
  daysUntilEvent: number
  failureModes: Array<{
    mode: FailureMode
    label: string
    relevanceScore: number
    linkedDomain: CommitmentDomain
    linkedRuleType: string
  }>
  suggestedSelections: FailureMode[]
}

export interface PreMortemRecord {
  id: string
  tenantId: string
  eventId: string
  selectedModes: FailureMode[]
  activatedDomains: CommitmentDomain[]
  notes: string | null
  createdAt: Date
}

export interface PreMortemAccuracy {
  tenantId: string
  totalPreMortems: number
  totalPredictions: number
  actualOccurrences: number
  accuracyPercent: number
  mostPredicted: Array<{ mode: FailureMode; count: number }>
  mostAccurate: Array<{ mode: FailureMode; hitRate: number }>
}

// -- Failure Mode Catalog -----------------------------------------------------

const FAILURE_MODE_CATALOG: Record<
  FailureMode,
  { label: string; domain: CommitmentDomain; ruleType: string }
> = {
  ingredient_shortage: {
    label: 'Key ingredient unavailable or out of stock',
    domain: 'contingency',
    ruleType: 'backup_vendor_list',
  },
  timing_overrun: {
    label: 'Prep or cook time exceeds plan',
    domain: 'scheduling',
    ruleType: 'min_prep_time_per_tier',
  },
  dietary_miss: {
    label: 'Allergen or dietary requirement overlooked',
    domain: 'dietary',
    ruleType: 'allergens_verified_before_confirm',
  },
  equipment_failure: {
    label: 'Critical equipment breaks or is forgotten',
    domain: 'contingency',
    ruleType: 'equipment_checklist_before_service',
  },
  staff_no_show: {
    label: 'Sous chef or assistant does not show up',
    domain: 'contingency',
    ruleType: 'emergency_contacts_before_confirm',
  },
  venue_surprise: {
    label: 'Venue kitchen or setup differs from expectations',
    domain: 'contingency',
    ruleType: 'backup_plan_for_high_value',
  },
  weather_impact: {
    label: 'Weather disrupts outdoor event or travel',
    domain: 'contingency',
    ruleType: 'weather_contingency_outdoor',
  },
  client_scope_change: {
    label: 'Client changes guest count or menu last minute',
    domain: 'menu',
    ruleType: 'menu_lock_cooldown',
  },
  transport_issue: {
    label: 'Travel delay or vehicle breakdown',
    domain: 'travel',
    ruleType: 'travel_time_buffer',
  },
  recipe_scaling_error: {
    label: 'Recipe quantities wrong at scale',
    domain: 'quality',
    ruleType: 'recipe_tested_before_serve',
  },
  vendor_delivery_late: {
    label: 'Vendor delivers late or delivers wrong items',
    domain: 'business_health',
    ruleType: 'backup_vendor_list',
  },
  communication_gap: {
    label: 'Key detail not communicated to client or team',
    domain: 'communication',
    ruleType: 'response_time_sla',
  },
}

// -- Helpers ------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function calculateRelevanceScore(
  mode: FailureMode,
  guestCount: number,
  daysUntilEvent: number,
  isOutdoor: boolean
): number {
  let score = 50

  if (guestCount > 30) {
    if (mode === 'timing_overrun' || mode === 'recipe_scaling_error' || mode === 'staff_no_show') {
      score += 20
    }
  }
  if (guestCount > 50) {
    if (mode === 'ingredient_shortage') score += 15
  }

  if (daysUntilEvent < 3) {
    if (mode === 'ingredient_shortage' || mode === 'vendor_delivery_late') score += 25
    if (mode === 'client_scope_change') score += 20
  }
  if (daysUntilEvent < 7) {
    if (mode === 'staff_no_show') score += 10
  }

  if (isOutdoor) {
    if (mode === 'weather_impact') score += 30
    if (mode === 'venue_surprise') score += 15
  }

  if (mode === 'dietary_miss') score += 10
  if (mode === 'communication_gap') score += 5

  return Math.min(100, score)
}

// -- Core Functions -----------------------------------------------------------

/**
 * Generate a pre-mortem prompt for an event. Shows all failure modes ranked by
 * relevance to event context. Chef selects which ones to guard against.
 */
export async function generatePreMortemPrompt(
  tenantId: string,
  eventId: string
): Promise<PreMortemPrompt> {
  const client = createServerClient()

  const { data: eventRow } = await client
    .from('events' as any)
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  const eventName = eventRow ? ((eventRow as any).name ?? null) : null
  const guestCount = eventRow ? ((eventRow as any).guest_count ?? 0) : 0
  const eventDate = eventRow
    ? new Date((eventRow as any).date || (eventRow as any).created_at)
    : new Date()
  const daysUntilEvent = Math.max(
    0,
    Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )
  const isOutdoor = eventRow ? (eventRow as any).venue_type === 'outdoor' : false

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('rule')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const activeRuleTypes = new Set(
    (commitmentRows ?? []).map((r: any) => {
      const rule = typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule
      return rule.type
    })
  )

  const failureModes = Object.entries(FAILURE_MODE_CATALOG).map(([mode, info]) => ({
    mode: mode as FailureMode,
    label: info.label,
    relevanceScore: calculateRelevanceScore(
      mode as FailureMode,
      guestCount,
      daysUntilEvent,
      isOutdoor
    ),
    linkedDomain: info.domain,
    linkedRuleType: info.ruleType,
  }))

  failureModes.sort((a, b) => b.relevanceScore - a.relevanceScore)

  const suggestedSelections = failureModes
    .filter((fm) => !activeRuleTypes.has(fm.linkedRuleType) && fm.relevanceScore >= 60)
    .slice(0, 3)
    .map((fm) => fm.mode)

  return {
    eventId,
    eventName,
    guestCount,
    daysUntilEvent,
    failureModes,
    suggestedSelections,
  }
}

/**
 * Record the chef's pre-mortem selections. Each selected failure mode
 * auto-activates its corresponding domain commitment for this event.
 */
export async function recordPreMortemSelections(
  tenantId: string,
  eventId: string,
  failureModes: FailureMode[],
  notes?: string
): Promise<PreMortemRecord> {
  const client = createServerClient()
  const id = generateId()
  const now = new Date().toISOString()

  const activatedDomains = Array.from(
    new Set(failureModes.map((fm) => FAILURE_MODE_CATALOG[fm].domain))
  )

  await client.from('commitment_pre_mortems' as any).insert({
    id,
    tenant_id: tenantId,
    event_id: eventId,
    selected_modes: failureModes,
    activated_domains: activatedDomains,
    notes: notes ?? null,
    created_at: now,
  })

  return {
    id,
    tenantId,
    eventId,
    selectedModes: failureModes,
    activatedDomains,
    notes: notes ?? null,
    createdAt: new Date(now),
  }
}

/**
 * Get pre-mortem history for a tenant.
 */
export async function getPreMortemHistory(
  tenantId: string,
  limit?: number
): Promise<PreMortemRecord[]> {
  const client = createServerClient()

  const { data } = await client
    .from('commitment_pre_mortems' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit ?? 50)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    selectedModes: row.selected_modes ?? [],
    activatedDomains: row.activated_domains ?? [],
    notes: row.notes,
    createdAt: new Date(row.created_at),
  }))
}

/**
 * Analyze pre-mortem prediction accuracy. Compares predicted failure modes
 * against actual event issues (from commitment overrides and event notes).
 */
export async function getPreMortemAccuracy(tenantId: string): Promise<PreMortemAccuracy> {
  const client = createServerClient()

  const { data: preMortems } = await client
    .from('commitment_pre_mortems' as any)
    .select('*')
    .eq('tenant_id', tenantId)

  if (!preMortems || preMortems.length === 0) {
    return {
      tenantId,
      totalPreMortems: 0,
      totalPredictions: 0,
      actualOccurrences: 0,
      accuracyPercent: 0,
      mostPredicted: [],
      mostAccurate: [],
    }
  }

  const predictionCounts: Record<string, number> = {}
  let totalPredictions = 0

  for (const pm of preMortems) {
    const modes = (pm as any).selected_modes ?? []
    for (const mode of modes) {
      predictionCounts[mode] = (predictionCounts[mode] ?? 0) + 1
      totalPredictions++
    }
  }

  let actualOccurrences = 0
  const eventIds = Array.from(new Set(preMortems.map((pm: any) => pm.event_id)))

  if (eventIds.length > 0) {
    const { count } = await client
      .from('commitment_overrides' as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    actualOccurrences = count ?? 0
  }

  const mostPredicted = Object.entries(predictionCounts)
    .map(([mode, count]) => ({ mode: mode as FailureMode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    tenantId,
    totalPreMortems: preMortems.length,
    totalPredictions,
    actualOccurrences,
    accuracyPercent:
      totalPredictions > 0
        ? Math.round((Math.min(actualOccurrences, totalPredictions) / totalPredictions) * 100)
        : 0,
    mostPredicted,
    mostAccurate: [],
  }
}
