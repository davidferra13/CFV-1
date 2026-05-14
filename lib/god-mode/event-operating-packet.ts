import type { PieCartPlan } from '@/lib/chef-ops/pie-cart'

export type EventPacketAudience = 'chef' | 'client' | 'guest' | 'staff' | 'admin' | 'remy'

export interface EventOperatingPacketInput {
  eventId: string
  tenantId: string
  title: string
  pieCart?: PieCartPlan | null
  quote?: {
    quotedTotalCents: number
    targetMarginPercent: number
    projectedCostCents: number
  } | null
  safety?: {
    allergyConfirmed: boolean
    dietaryUnknownCount: number
  }
  automation?: {
    drafted: number
    failed: number
    scheduled: number
    needsApproval: number
  }
}

export interface EventOperatingPacket {
  eventId: string
  tenantId: string
  title: string
  readiness: 'ready' | 'needs_review' | 'blocked'
  money: {
    quotedTotalCents: number | null
    projectedCostCents: number | null
    marginProtected: boolean
    warnings: string[]
  }
  procurement: {
    ready: boolean
    totalCents: number | null
    nextActions: string[]
  }
  safety: {
    ready: boolean
    warnings: string[]
  }
  automation: {
    ready: boolean
    nextAction: string
  }
  missingFacts: string[]
}

export function buildEventOperatingPacket(input: EventOperatingPacketInput): EventOperatingPacket {
  const missingFacts: string[] = []
  const moneyWarnings: string[] = []
  const safetyWarnings: string[] = []

  if (!input.quote) missingFacts.push('quote_truth_missing')
  if (!input.pieCart) missingFacts.push('pie_cart_missing')
  if (!input.safety?.allergyConfirmed) safetyWarnings.push('allergy_confirmation_needed')
  if ((input.safety?.dietaryUnknownCount ?? 0) > 0)
    safetyWarnings.push('dietary_profiles_incomplete')

  const projectedCostCents = input.quote?.projectedCostCents ?? input.pieCart?.totalCents ?? null
  const quotedTotalCents = input.quote?.quotedTotalCents ?? null
  const actualMargin =
    quotedTotalCents && projectedCostCents
      ? ((quotedTotalCents - projectedCostCents) / quotedTotalCents) * 100
      : null
  const marginProtected =
    actualMargin !== null && input.quote ? actualMargin >= input.quote.targetMarginPercent : false

  if (input.quote && !marginProtected) moneyWarnings.push('target_margin_not_protected')

  const automationBlocked =
    (input.automation?.failed ?? 0) > 0 || (input.automation?.needsApproval ?? 0) > 0
  const blocked =
    missingFacts.length > 0 ||
    safetyWarnings.length > 0 ||
    moneyWarnings.length > 0 ||
    input.pieCart?.readiness === 'low_confidence'

  return {
    eventId: input.eventId,
    tenantId: input.tenantId,
    title: input.title,
    readiness: blocked ? 'blocked' : automationBlocked ? 'needs_review' : 'ready',
    money: {
      quotedTotalCents,
      projectedCostCents,
      marginProtected,
      warnings: moneyWarnings,
    },
    procurement: {
      ready: Boolean(input.pieCart && input.pieCart.readiness === 'ready_to_shop'),
      totalCents: input.pieCart?.totalCents ?? null,
      nextActions: input.pieCart?.nextActions ?? ['create_pie_cart'],
    },
    safety: {
      ready: safetyWarnings.length === 0,
      warnings: safetyWarnings,
    },
    automation: {
      ready: !automationBlocked,
      nextAction:
        (input.automation?.needsApproval ?? 0) > 0
          ? 'review_automation_approval_gate'
          : (input.automation?.failed ?? 0) > 0
            ? 'repair_failed_automation'
            : 'continue_scheduled_automation',
    },
    missingFacts,
  }
}

export function shapeEventOperatingPacketForAudience(
  packet: EventOperatingPacket,
  audience: EventPacketAudience
) {
  if (audience === 'chef' || audience === 'admin' || audience === 'remy') return packet

  return {
    eventId: packet.eventId,
    title: packet.title,
    readiness: packet.readiness,
    procurement: {
      ready: packet.procurement.ready,
      nextActions: packet.procurement.nextActions,
    },
    safety: packet.safety,
    automation: {
      ready: packet.automation.ready,
      nextAction: packet.automation.nextAction,
    },
    missingFacts: packet.missingFacts.filter((fact) => !fact.includes('quote')),
  }
}
