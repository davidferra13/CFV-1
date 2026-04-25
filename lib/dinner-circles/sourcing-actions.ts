'use server'

import { revalidatePath } from 'next/cache'
import { requireChef, requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getDinnerCircleConfig, normalizeDinnerCircleConfig } from './event-circle'
import type {
  DinnerCircleAvailabilityItem,
  DinnerCircleConfig,
  DinnerCircleIngredientStatus,
  DinnerCircleSourcingEvent,
  DinnerCircleSubstitutionProposal,
} from './types'

async function assertEventOwner(db: any, eventId: string, tenantId: string) {
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()
  if (!event) throw new Error('Event not found')
}

async function upsertCircleConfig(
  db: any,
  eventId: string,
  tenantId: string,
  config: DinnerCircleConfig
) {
  const { data: existing } = await db
    .from('event_share_settings')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('event_share_settings')
      .update({ circle_config: config, updated_at: new Date().toISOString() })
      .eq('event_id', eventId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await db.from('event_share_settings').insert({
    event_id: eventId,
    tenant_id: tenantId,
    circle_config: config,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function logSourcingEvent(
  eventId: string,
  input: {
    ingredient: string
    newStatus: DinnerCircleIngredientStatus
    reason: string
    sourceName?: string
  }
): Promise<{ success: true }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  await assertEventOwner(db, eventId, tenantId)
  const config = await getDinnerCircleConfig(eventId)

  const adaptive = config.adaptive ?? {
    availabilityItems: [],
    clientExpectationNote: '',
    changeWindowNote: '',
    pricingAdjustmentPolicy: '',
    substitutionValidationNotes: '',
    finalValidationLocked: false,
    finalValidationNotes: '',
  }

  // Find existing item (case-insensitive)
  const existingIdx = adaptive.availabilityItems.findIndex(
    (item) => item.ingredient.toLowerCase() === input.ingredient.toLowerCase()
  )
  const previousStatus: DinnerCircleIngredientStatus =
    existingIdx >= 0 ? adaptive.availabilityItems[existingIdx].status : 'pending'

  // Update or create availability item
  if (existingIdx >= 0) {
    adaptive.availabilityItems[existingIdx].status = input.newStatus
    if (input.sourceName) {
      adaptive.availabilityItems[existingIdx].sourceName = input.sourceName
    }
  } else {
    adaptive.availabilityItems.push({
      ingredient: input.ingredient,
      status: input.newStatus,
      sourceName: input.sourceName,
    })
  }

  // Append sourcing event (cap at 100)
  const sourcingEvent: DinnerCircleSourcingEvent = {
    id: crypto.randomUUID(),
    ingredient: input.ingredient,
    previousStatus,
    newStatus: input.newStatus,
    reason: input.reason,
    sourceName: input.sourceName,
    loggedAt: new Date().toISOString(),
  }
  const log = adaptive.sourcingLog ?? []
  log.push(sourcingEvent)
  adaptive.sourcingLog = log.slice(-100)

  // Circle notification for unavailable or substitution_pending (non-blocking)
  if (input.newStatus === 'unavailable' || input.newStatus === 'substitution_pending') {
    try {
      const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
      await circleFirstNotify({
        eventId,
        inquiryId: null,
        notificationType: 'menu_shared',
        body: `Sourcing update: ${input.ingredient} is now ${input.newStatus.replace(/_/g, ' ')}. ${input.reason}`,
        metadata: { ingredient: input.ingredient, status: input.newStatus },
        actionUrl: `/my-events/${eventId}`,
        actionLabel: 'View Event',
      })
    } catch (err) {
      console.error('[non-blocking] Circle notification failed', err)
    }
  }

  config.adaptive = adaptive
  await upsertCircleConfig(db, eventId, tenantId, config)
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function proposeSubstitution(
  eventId: string,
  input: {
    originalIngredient: string
    proposedSubstitute: string
    reason: string
  }
): Promise<{ success: true }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  await assertEventOwner(db, eventId, tenantId)
  const config = await getDinnerCircleConfig(eventId)

  const adaptive = config.adaptive ?? {
    availabilityItems: [],
    clientExpectationNote: '',
    changeWindowNote: '',
    pricingAdjustmentPolicy: '',
    substitutionValidationNotes: '',
    finalValidationLocked: false,
    finalValidationNotes: '',
  }

  // Look up cost data for both ingredients
  let costDeltaCents: number | null = null
  try {
    const { data: origRow } = await db
      .from('ingredients')
      .select('last_price_cents')
      .ilike('name', input.originalIngredient)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    const { data: subRow } = await db
      .from('ingredients')
      .select('last_price_cents')
      .ilike('name', input.proposedSubstitute)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (origRow?.last_price_cents != null && subRow?.last_price_cents != null) {
      costDeltaCents = subRow.last_price_cents - origRow.last_price_cents
    }
  } catch {
    // cost lookup is best-effort
  }

  // Create proposal (cap at 50)
  const proposal: DinnerCircleSubstitutionProposal = {
    id: crypto.randomUUID(),
    originalIngredient: input.originalIngredient,
    proposedSubstitute: input.proposedSubstitute,
    reason: input.reason,
    costDeltaCents,
    status: 'proposed',
    proposedAt: new Date().toISOString(),
  }
  const proposals = adaptive.substitutionProposals ?? []
  proposals.push(proposal)
  adaptive.substitutionProposals = proposals.slice(-50)

  // Update availability item
  const existingIdx = adaptive.availabilityItems.findIndex(
    (item) => item.ingredient.toLowerCase() === input.originalIngredient.toLowerCase()
  )
  if (existingIdx >= 0) {
    adaptive.availabilityItems[existingIdx].status = 'substitution_pending'
    adaptive.availabilityItems[existingIdx].substitution = input.proposedSubstitute
  } else {
    adaptive.availabilityItems.push({
      ingredient: input.originalIngredient,
      status: 'substitution_pending',
      substitution: input.proposedSubstitute,
    })
  }

  // Circle notification (non-blocking)
  try {
    const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
    await circleFirstNotify({
      eventId,
      inquiryId: null,
      notificationType: 'menu_shared',
      body: `Substitution proposed: ${input.originalIngredient} -> ${input.proposedSubstitute}. ${input.reason}`,
      metadata: { original: input.originalIngredient, substitute: input.proposedSubstitute },
      actionUrl: `/my-events/${eventId}`,
      actionLabel: 'View Event',
    })
  } catch (err) {
    console.error('[non-blocking] Circle notification failed', err)
  }

  config.adaptive = adaptive
  await upsertCircleConfig(db, eventId, tenantId, config)
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function respondToSubstitution(
  eventId: string,
  proposalId: string,
  response: 'acknowledged' | 'flagged',
  clientNote?: string
): Promise<{ success: true }> {
  await requireAuth()
  const db: any = createServerClient({ admin: true })

  const config = await getDinnerCircleConfig(eventId)
  const adaptive = config.adaptive
  if (!adaptive) throw new Error('No adaptive config')

  const proposals = adaptive.substitutionProposals ?? []
  const proposalIdx = proposals.findIndex((p) => p.id === proposalId)
  if (proposalIdx < 0) throw new Error('Proposal not found')

  const proposal = proposals[proposalIdx]
  proposal.status = response
  proposal.respondedAt = new Date().toISOString()
  if (clientNote) proposal.clientNote = clientNote

  // Update availability item status based on response
  const itemIdx = adaptive.availabilityItems.findIndex(
    (item) => item.ingredient.toLowerCase() === proposal.originalIngredient.toLowerCase()
  )
  if (itemIdx >= 0) {
    adaptive.availabilityItems[itemIdx].status =
      response === 'acknowledged' ? 'confirmed' : 'flexible'
  }

  // Use admin client to get tenant_id from event_share_settings
  const { data: share } = await db
    .from('event_share_settings')
    .select('tenant_id')
    .eq('event_id', eventId)
    .maybeSingle()

  config.adaptive = adaptive
  await upsertCircleConfig(db, eventId, share?.tenant_id ?? '', config)
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function getAdaptiveSourcingStatus(eventId: string): Promise<{
  availabilityItems: DinnerCircleAvailabilityItem[]
  sourcingLog: DinnerCircleSourcingEvent[]
  substitutionProposals: DinnerCircleSubstitutionProposal[]
  priceFlexibilityPercent: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  await assertEventOwner(db, eventId, user.tenantId!)

  const config = await getDinnerCircleConfig(eventId)
  return {
    availabilityItems: config.adaptive?.availabilityItems ?? [],
    sourcingLog: config.adaptive?.sourcingLog ?? [],
    substitutionProposals: config.adaptive?.substitutionProposals ?? [],
    priceFlexibilityPercent: config.adaptive?.priceFlexibilityPercent ?? 15,
  }
}

export async function updatePriceFlexibility(
  eventId: string,
  percent: number
): Promise<{ success: true }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  await assertEventOwner(db, eventId, tenantId)
  const config = await getDinnerCircleConfig(eventId)

  const clamped = Math.max(0, Math.min(50, percent))

  const adaptive = config.adaptive ?? {
    availabilityItems: [],
    clientExpectationNote: '',
    changeWindowNote: '',
    pricingAdjustmentPolicy: '',
    substitutionValidationNotes: '',
    finalValidationLocked: false,
    finalValidationNotes: '',
  }
  adaptive.priceFlexibilityPercent = clamped

  config.adaptive = adaptive
  await upsertCircleConfig(db, eventId, tenantId, config)
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
