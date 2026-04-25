'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  deriveHandoffStatusFromRecipientStatuses as deriveHandoffStatusFromRecipients,
  hasCollabHandoffExpired,
  isCollabHandoffActionable,
  scoreCollabRecipientSuggestion as scoreCollabSuggestion,
  type CollabAvailabilityStatus,
  type CollabHandoffRecipientStatus,
  type CollabHandoffStatus,
  type CollabTrustLevel,
} from '@/lib/network/collab-logic'
import { computeCollabMetrics, type CollabMetrics } from '@/lib/network/collab-metrics'
export type { CollabMetrics } from '@/lib/network/collab-metrics'

type TrustLevel = CollabTrustLevel
type HandoffType = 'lead' | 'event_backup' | 'client_referral'
type HandoffSourceType = 'inquiry' | 'event' | 'manual'
type HandoffVisibility = 'trusted_circle' | 'selected_chefs' | 'connections'
type HandoffStatus = CollabHandoffStatus
export type HandoffRecipientStatus = CollabHandoffRecipientStatus
type AvailabilityStatus = CollabAvailabilityStatus
type CollabSocialNotificationType =
  | 'collab_handoff_received'
  | 'collab_handoff_accepted'
  | 'collab_handoff_rejected'
  | 'collab_handoff_converted'
  | 'collab_handoff_cancelled'

export type CollabChefCard = {
  chef_id: string
  display_name: string | null
  business_name: string
  profile_image_url: string | null
  city: string | null
  state: string | null
}

export type TrustedCircleMember = {
  id: string
  trust_level: TrustLevel
  notes: string | null
  created_at: string
  chef: CollabChefCard
}

export type CollabAvailabilitySignal = {
  id: string
  date_start: string
  date_end: string
  region_text: string | null
  cuisines: string[]
  max_guest_count: number | null
  status: AvailabilityStatus
  share_with_trusted_only: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export type IncomingCollabHandoff = {
  recipient_row_id: string
  handoff_id: string
  title: string
  handoff_type: HandoffType
  source_entity_type: HandoffSourceType | null
  source_entity_id: string | null
  status: HandoffStatus
  recipient_status: HandoffRecipientStatus
  response_note: string | null
  event_date: string | null
  occasion: string | null
  guest_count: number | null
  location_text: string | null
  budget_cents: number | null
  private_note: string | null
  client_context: Record<string, any>
  expires_at: string | null
  created_at: string
  viewed_at: string | null
  responded_at: string | null
  from_chef: CollabChefCard
}

export type OutgoingCollabHandoff = {
  handoff_id: string
  title: string
  handoff_type: HandoffType
  source_entity_type: HandoffSourceType | null
  source_entity_id: string | null
  status: HandoffStatus
  event_date: string | null
  occasion: string | null
  guest_count: number | null
  location_text: string | null
  budget_cents: number | null
  private_note: string | null
  client_context: Record<string, any>
  expires_at: string | null
  visibility_scope: HandoffVisibility
  created_at: string
  recipients: Array<{
    recipient_row_id: string
    recipient_status: HandoffRecipientStatus
    response_note: string | null
    viewed_at: string | null
    responded_at: string | null
    chef: CollabChefCard
  }>
}

export type CollabInbox = {
  incoming: IncomingCollabHandoff[]
  outgoing: OutgoingCollabHandoff[]
}

export type CollabRecipientSuggestion = {
  chef: CollabChefCard
  trust_level: TrustLevel | null
  score: number
  reasons: string[]
  has_active_signal: boolean
}

export type CollabHandoffTimelineEvent = {
  id: string
  handoff_id: string
  event_type:
    | 'created'
    | 'viewed'
    | 'accepted'
    | 'rejected'
    | 'withdrawn'
    | 'converted'
    | 'cancelled'
    | 'status_recomputed'
  metadata: Record<string, any>
  created_at: string
  actor: CollabChefCard | null
}

const TrustedChefSchema = z.object({
  trustedChefId: z.string().uuid(),
  trustLevel: z.enum(['partner', 'preferred', 'inner_circle']).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
})

const AvailabilitySignalSchema = z.object({
  id: z.string().uuid().optional(),
  dateStart: z.string().date(),
  dateEnd: z.string().date(),
  regionText: z.string().trim().max(200).optional().nullable(),
  cuisines: z.array(z.string().trim().max(40)).max(30).optional(),
  maxGuestCount: z.number().int().min(1).max(5000).optional().nullable(),
  status: z.enum(['available', 'limited', 'unavailable']),
  shareWithTrustedOnly: z.boolean().optional(),
  note: z.string().trim().max(1000).optional().nullable(),
})

const CreateHandoffSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    handoffType: z.enum(['lead', 'event_backup', 'client_referral']),
    visibilityScope: z
      .enum(['trusted_circle', 'selected_chefs', 'connections'])
      .default('trusted_circle'),
    recipientChefIds: z.array(z.string().uuid()).max(50).optional(),
    sourceEntityType: z.enum(['inquiry', 'event', 'manual']).optional(),
    sourceEntityId: z.string().uuid().optional().nullable(),
    occasion: z.string().trim().max(150).optional().nullable(),
    eventDate: z.string().date().optional().nullable(),
    guestCount: z.number().int().min(1).max(2000).optional().nullable(),
    locationText: z.string().trim().max(200).optional().nullable(),
    budgetCents: z.number().int().min(0).optional().nullable(),
    privateNote: z.string().trim().max(5000).optional().nullable(),
    clientContext: z.record(z.string(), z.any()).optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .superRefine((input, ctx) => {
    if (
      input.visibilityScope === 'selected_chefs' &&
      (!input.recipientChefIds || input.recipientChefIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientChefIds'],
        message: 'Select at least one recipient for selected_chefs visibility.',
      })
    }
    if (input.sourceEntityType !== 'manual' && !input.sourceEntityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceEntityId'],
        message: 'sourceEntityId is required for inquiry/event sourced handoffs.',
      })
    }
  })

const HandoffIdSchema = z.object({
  handoffId: z.string().uuid(),
})

const RespondHandoffSchema = z.object({
  handoffId: z.string().uuid(),
  action: z.enum(['accepted', 'rejected']),
  responseNote: z.string().trim().max(1000).optional().nullable(),
})

const ConvertHandoffSchema = z.object({
  handoffId: z.string().uuid(),
  convertedEventId: z.string().uuid().optional().nullable(),
  convertedInquiryId: z.string().uuid().optional().nullable(),
})

const SuggestRecipientsSchema = z.object({
  eventDate: z.string().date().optional().nullable(),
  guestCount: z.number().int().min(1).max(2000).optional().nullable(),
  locationText: z.string().trim().max(200).optional().nullable(),
  cuisines: z.array(z.string().trim().max(40)).max(20).optional(),
  maxResults: z.number().int().min(1).max(20).optional(),
})

const HandoffTimelineSchema = z.object({
  handoffId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional(),
})

function trustedCircleTable(db: any): any {
  return db.from('chef_trusted_circle')
}

function handoffsTable(db: any): any {
  return db.from('chef_handoffs')
}

function handoffRecipientsTable(db: any): any {
  return db.from('chef_handoff_recipients')
}

function handoffEventsTable(db: any): any {
  return db.from('chef_handoff_events')
}

function availabilitySignalsTable(db: any): any {
  return db.from('chef_availability_signals')
}

function chefConnectionsTable(db: any): any {
  return db.from('chef_connections')
}

function socialNotificationsTable(db: any): any {
  return db.from('chef_social_notifications')
}

async function getConnectedChefIds(db: any, chefId: string): Promise<Set<string>> {
  const { data } = await chefConnectionsTable(db)
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${chefId},addressee_id.eq.${chefId}`)

  const connectedIds = new Set<string>()
  for (const row of (data ?? []) as any[]) {
    connectedIds.add(row.requester_id === chefId ? row.addressee_id : row.requester_id)
  }
  return connectedIds
}

async function getChefCardsById(db: any, chefIds: string[]): Promise<Map<string, CollabChefCard>> {
  const uniqueIds = Array.from(new Set(chefIds.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map()

  const { data } = await db
    .from('chefs')
    .select(
      `id, display_name, business_name, profile_image_url,
       chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)`
    )
    .in('id', uniqueIds)

  const map = new Map<string, CollabChefCard>()
  for (const row of (data ?? []) as any[]) {
    const prefs = Array.isArray(row.chef_preferences)
      ? row.chef_preferences[0]
      : row.chef_preferences
    map.set(row.id, {
      chef_id: row.id,
      display_name: row.display_name ?? null,
      business_name: row.business_name ?? 'Unknown',
      profile_image_url: row.profile_image_url ?? null,
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
    })
  }
  return map
}

async function logHandoffEvent(
  db: any,
  input: {
    handoffId: string
    actorChefId: string
    eventType:
      | 'created'
      | 'viewed'
      | 'accepted'
      | 'rejected'
      | 'withdrawn'
      | 'converted'
      | 'cancelled'
      | 'status_recomputed'
    metadata?: Record<string, any>
  }
) {
  await handoffEventsTable(db).insert({
    handoff_id: input.handoffId,
    actor_chef_id: input.actorChefId,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  })
}

async function createCollabSocialNotifications(
  db: any,
  input: {
    recipients: string[]
    actorChefId: string
    notificationType: CollabSocialNotificationType
    handoffId: string
  }
) {
  if (input.recipients.length === 0) return
  try {
    const rows = input.recipients
      .filter((recipientId) => recipientId !== input.actorChefId)
      .map((recipientId) => ({
        recipient_chef_id: recipientId,
        actor_chef_id: input.actorChefId,
        notification_type: input.notificationType,
        entity_type: 'handoff',
        entity_id: input.handoffId,
      }))

    if (rows.length === 0) return
    await socialNotificationsTable(db).insert(rows)
  } catch (error) {
    console.error('[createCollabSocialNotifications] Non-blocking error:', error)
  }
}

async function recomputeHandoffStatus(
  db: any,
  handoffId: string,
  actorChefId: string
): Promise<void> {
  const { data: handoff } = await handoffsTable(db).select('status').eq('id', handoffId).single()
  if (!handoff) return
  if (handoff.status === 'cancelled' || handoff.status === 'expired') return

  const { data: recipients } = await handoffRecipientsTable(db)
    .select('status')
    .eq('handoff_id', handoffId)

  const statuses: HandoffRecipientStatus[] = (recipients ?? []).map(
    (row: any) => row.status as HandoffRecipientStatus
  )
  const nextStatus = deriveHandoffStatusFromRecipients(statuses)

  if (handoff.status !== nextStatus) {
    await handoffsTable(db).update({ status: nextStatus }).eq('id', handoffId)
    await logHandoffEvent(db, {
      handoffId,
      actorChefId,
      eventType: 'status_recomputed',
      metadata: { status: nextStatus },
    })
  }
}

function chunkValues<T>(values: T[], size: number): T[][] {
  if (values.length === 0) return []
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

async function getExpiredHandoffIdsByCandidateIds(
  db: any,
  candidateIds: string[],
  nowIso: string
): Promise<string[]> {
  const uniqueIds = Array.from(new Set(candidateIds.filter(Boolean)))
  if (uniqueIds.length === 0) return []

  const expiredIds: string[] = []
  for (const idBatch of chunkValues(uniqueIds, 200)) {
    const { data, error } = await handoffsTable(db)
      .select('id')
      .in('id', idBatch)
      .in('status', ['open', 'partially_accepted'])
      .not('expires_at', 'is', null)
      .lt('expires_at', nowIso)

    if (error) {
      console.error('[getExpiredHandoffIdsByCandidateIds] Error:', error)
      continue
    }
    expiredIds.push(...((data ?? []) as any[]).map((row) => row.id))
  }

  return Array.from(new Set(expiredIds))
}

async function expireOverdueHandoffsForChef(
  db: any,
  chefId: string
): Promise<{ expiredIds: string[] }> {
  const nowIso = new Date().toISOString()
  const expiredCandidateIds = new Set<string>()

  const { data: authoredHandoffs, error: authoredError } = await handoffsTable(db)
    .select('id')
    .eq('from_chef_id', chefId)
    .in('status', ['open', 'partially_accepted'])
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)

  if (authoredError) {
    console.error('[expireOverdueHandoffsForChef] authored query error:', authoredError)
  } else {
    for (const row of (authoredHandoffs ?? []) as any[]) expiredCandidateIds.add(row.id)
  }

  const { data: recipientRows, error: recipientError } = await handoffRecipientsTable(db)
    .select('handoff_id')
    .eq('recipient_chef_id', chefId)

  if (recipientError) {
    console.error('[expireOverdueHandoffsForChef] recipient query error:', recipientError)
  } else {
    const recipientHandoffIds = ((recipientRows ?? []) as any[]).map((row) => row.handoff_id)
    const recipientExpiredIds = await getExpiredHandoffIdsByCandidateIds(
      db,
      recipientHandoffIds,
      nowIso
    )
    for (const handoffId of recipientExpiredIds) expiredCandidateIds.add(handoffId)
  }

  const candidateList = Array.from(expiredCandidateIds)
  if (candidateList.length === 0) return { expiredIds: [] }

  const { data: expiredRows, error: expireError } = await handoffsTable(db)
    .update({ status: 'expired' })
    .in('id', candidateList)
    .in('status', ['open', 'partially_accepted'])
    .select('id')

  if (expireError) {
    console.error('[expireOverdueHandoffsForChef] status update error:', expireError)
    return { expiredIds: [] }
  }

  const expiredIds = ((expiredRows ?? []) as any[]).map((row) => row.id)
  if (expiredIds.length === 0) return { expiredIds: [] }

  const { error: recipientWithdrawError } = await handoffRecipientsTable(db)
    .update({ status: 'withdrawn', responded_at: nowIso })
    .in('handoff_id', expiredIds)
    .in('status', ['sent', 'viewed'])

  if (recipientWithdrawError) {
    console.error('[expireOverdueHandoffsForChef] recipient update error:', recipientWithdrawError)
  }

  for (const handoffId of expiredIds) {
    await logHandoffEvent(db, {
      handoffId,
      actorChefId: chefId,
      eventType: 'status_recomputed',
      metadata: { status: 'expired', reason: 'expires_at_passed' },
    })
  }

  return { expiredIds }
}

export async function getTrustedCircle(): Promise<TrustedCircleMember[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data } = await trustedCircleTable(db)
    .select('id, trusted_chef_id, trust_level, notes, created_at')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })

  const trustedRows = (data ?? []) as Array<{
    id: string
    trusted_chef_id: string
    trust_level: TrustLevel
    notes: string | null
    created_at: string
  }>

  if (trustedRows.length === 0) return []
  const chefMap = await getChefCardsById(
    db,
    trustedRows.map((row) => row.trusted_chef_id)
  )

  return trustedRows
    .map((row) => {
      const chef = chefMap.get(row.trusted_chef_id)
      if (!chef) return null
      return {
        id: row.id,
        trust_level: row.trust_level,
        notes: row.notes,
        created_at: row.created_at,
        chef,
      }
    })
    .filter((row): row is TrustedCircleMember => Boolean(row))
}

export async function addTrustedChef(input: z.infer<typeof TrustedChefSchema>) {
  const user = await requireChef()
  const validated = TrustedChefSchema.parse(input)
  const db = createServerClient({ admin: true })

  if (validated.trustedChefId === user.entityId) {
    throw new Error('You cannot add yourself to your trusted circle.')
  }

  const connected = await getConnectedChefIds(db, user.entityId)
  if (!connected.has(validated.trustedChefId)) {
    throw new Error('You can only add accepted connections to your trusted circle.')
  }

  const { error } = await trustedCircleTable(db).upsert(
    {
      chef_id: user.entityId,
      trusted_chef_id: validated.trustedChefId,
      trust_level: validated.trustLevel ?? 'partner',
      notes: validated.notes ?? null,
    },
    { onConflict: 'chef_id,trusted_chef_id' }
  )

  if (error) {
    console.error('[addTrustedChef] Error:', error)
    throw new Error('Failed to update trusted circle.')
  }

  revalidatePath('/network')
  return { success: true }
}

export async function getCollabRecipientSuggestions(
  input: z.infer<typeof SuggestRecipientsSchema>
): Promise<CollabRecipientSuggestion[]> {
  const user = await requireChef()
  const validated = SuggestRecipientsSchema.parse(input)
  const db = createServerClient({ admin: true })

  const connectedIds = Array.from(await getConnectedChefIds(db, user.entityId))
  if (connectedIds.length === 0) return []

  const chefCards = await getChefCardsById(db, connectedIds)
  const trustedRows = await trustedCircleTable(db)
    .select('trusted_chef_id, trust_level')
    .eq('chef_id', user.entityId)
  const trustedMap = new Map<string, TrustLevel>()
  for (const row of (trustedRows.data ?? []) as any[]) {
    trustedMap.set(row.trusted_chef_id, row.trust_level as TrustLevel)
  }

  const boundaryDate =
    validated.eventDate ??
    ((_d) =>
      `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
      new Date()
    )
  const { data: signalRows } = await availabilitySignalsTable(db)
    .select(
      'chef_id, date_start, date_end, region_text, cuisines, max_guest_count, status, share_with_trusted_only, updated_at'
    )
    .in('chef_id', connectedIds)
    .gte('date_end', boundaryDate)
    .order('updated_at', { ascending: false })

  const signalByChef = new Map<string, any[]>()
  for (const row of (signalRows ?? []) as any[]) {
    const trustLevel = trustedMap.get(row.chef_id) ?? null
    if (row.share_with_trusted_only && !trustLevel) continue
    const list = signalByChef.get(row.chef_id) ?? []
    list.push(row)
    signalByChef.set(row.chef_id, list)
  }

  const suggestions: CollabRecipientSuggestion[] = []
  for (const chefId of connectedIds) {
    const chef = chefCards.get(chefId)
    if (!chef) continue

    const trustLevel = trustedMap.get(chefId) ?? null
    const candidateSignals = signalByChef.get(chefId) ?? []
    const baseline = scoreCollabSuggestion({
      trustLevel,
      signal: null,
      eventDate: validated.eventDate ?? null,
      guestCount: validated.guestCount ?? null,
      locationText: validated.locationText ?? null,
      cuisines: validated.cuisines ?? [],
    })

    let best = baseline
    for (const signal of candidateSignals) {
      const current = scoreCollabSuggestion({
        trustLevel,
        signal: {
          date_start: signal.date_start,
          date_end: signal.date_end,
          region_text: signal.region_text ?? null,
          cuisines: signal.cuisines ?? [],
          max_guest_count: signal.max_guest_count ?? null,
          status: signal.status as AvailabilityStatus,
        },
        eventDate: validated.eventDate ?? null,
        guestCount: validated.guestCount ?? null,
        locationText: validated.locationText ?? null,
        cuisines: validated.cuisines ?? [],
      })
      if (current.score > best.score) best = current
    }

    suggestions.push({
      chef,
      trust_level: trustLevel,
      score: best.score,
      reasons: best.reasons.slice(0, 3),
      has_active_signal: best.hasActiveSignal,
    })
  }

  return suggestions
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const nameA = (a.chef.display_name ?? a.chef.business_name).toLowerCase()
      const nameB = (b.chef.display_name ?? b.chef.business_name).toLowerCase()
      return nameA.localeCompare(nameB)
    })
    .slice(0, validated.maxResults ?? 8)
}

export async function getCollabUnreadCount(): Promise<number> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { count, error } = await handoffRecipientsTable(db)
    .select('*', { count: 'exact', head: true })
    .eq('recipient_chef_id', user.entityId)
    .eq('status', 'sent')

  if (error) {
    console.error('[getCollabUnreadCount] Error:', error)
    return 0
  }

  return count ?? 0
}

export async function getCollabMetrics(windowDays = 90): Promise<CollabMetrics> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)
  const safeWindowDays = Math.min(Math.max(windowDays, 7), 365)
  const since = new Date()
  since.setDate(since.getDate() - safeWindowDays)
  const sinceIso = since.toISOString()

  const { data: outgoingHandoffs, error: outgoingError } = await handoffsTable(db)
    .select('id, status, created_at')
    .eq('from_chef_id', user.entityId)
    .gte('created_at', sinceIso)

  if (outgoingError) {
    console.error('[getCollabMetrics] outgoing query error:', outgoingError)
  }

  const outgoingIds = ((outgoingHandoffs ?? []) as any[]).map((row) => row.id)
  const { data: outgoingRecipients, error: recipientError } =
    outgoingIds.length === 0
      ? { data: [] as any[], error: null }
      : await handoffRecipientsTable(db)
          .select('handoff_id, status, responded_at')
          .in('handoff_id', outgoingIds)

  if (recipientError) {
    console.error('[getCollabMetrics] outgoing recipients query error:', recipientError)
  }

  const { data: incomingRecipients, error: incomingError } = await handoffRecipientsTable(db)
    .select('status')
    .eq('recipient_chef_id', user.entityId)
    .gte('created_at', sinceIso)

  if (incomingError) {
    console.error('[getCollabMetrics] incoming recipients query error:', incomingError)
  }

  return computeCollabMetrics({
    windowDays: safeWindowDays,
    outgoingHandoffs: ((outgoingHandoffs ?? []) as any[]).map((row) => ({
      id: row.id,
      status: row.status as HandoffStatus,
      created_at: row.created_at,
    })),
    outgoingRecipients: ((outgoingRecipients ?? []) as any[]).map((row) => ({
      handoff_id: row.handoff_id,
      status: row.status as HandoffRecipientStatus,
      responded_at: row.responded_at ?? null,
    })),
    incomingRecipients: ((incomingRecipients ?? []) as any[]).map((row) => ({
      status: row.status as HandoffRecipientStatus,
    })),
  })
}

export async function getCollabHandoffTimeline(
  input: z.infer<typeof HandoffTimelineSchema>
): Promise<CollabHandoffTimelineEvent[]> {
  const user = await requireChef()
  const validated = HandoffTimelineSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)
  const safeLimit = validated.limit ?? 40

  const { data: handoff } = await handoffsTable(db)
    .select('id, from_chef_id')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff) throw new Error('Handoff not found.')

  let canView = handoff.from_chef_id === user.entityId
  if (!canView) {
    const { data: recipientRow } = await handoffRecipientsTable(db)
      .select('id')
      .eq('handoff_id', validated.handoffId)
      .eq('recipient_chef_id', user.entityId)
      .maybeSingle()
    canView = Boolean(recipientRow)
  }

  if (!canView) throw new Error('Access denied for this handoff timeline.')

  const { data: timelineRows } = await handoffEventsTable(db)
    .select('id, handoff_id, actor_chef_id, event_type, metadata, created_at')
    .eq('handoff_id', validated.handoffId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  const actorIds = Array.from(
    new Set(((timelineRows ?? []) as any[]).map((row) => row.actor_chef_id).filter(Boolean))
  )
  const actorMap = await getChefCardsById(db, actorIds)

  return ((timelineRows ?? []) as any[]).map((row) => ({
    id: row.id,
    handoff_id: row.handoff_id,
    event_type: row.event_type,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    actor: row.actor_chef_id ? (actorMap.get(row.actor_chef_id) ?? null) : null,
  }))
}

export async function removeTrustedChef(trustedChefId: string) {
  const user = await requireChef()
  z.string().uuid().parse(trustedChefId)
  const db = createServerClient({ admin: true })

  const { error } = await trustedCircleTable(db)
    .delete()
    .eq('chef_id', user.entityId)
    .eq('trusted_chef_id', trustedChefId)

  if (error) {
    console.error('[removeTrustedChef] Error:', error)
    throw new Error('Failed to remove trusted chef.')
  }

  revalidatePath('/network')
  return { success: true }
}

export async function getCollabAvailabilitySignals(): Promise<CollabAvailabilitySignal[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data } = await availabilitySignalsTable(db)
    .select('*')
    .eq('chef_id', user.entityId)
    .order('date_start', { ascending: true })

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    date_start: row.date_start,
    date_end: row.date_end,
    region_text: row.region_text ?? null,
    cuisines: row.cuisines ?? [],
    max_guest_count: row.max_guest_count ?? null,
    status: row.status,
    share_with_trusted_only: row.share_with_trusted_only ?? true,
    note: row.note ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function upsertCollabAvailabilitySignal(
  input: z.infer<typeof AvailabilitySignalSchema>
) {
  const user = await requireChef()
  const validated = AvailabilitySignalSchema.parse(input)
  const db = createServerClient({ admin: true })

  if (validated.dateEnd < validated.dateStart) {
    throw new Error('End date must be after start date.')
  }

  if (validated.id) {
    const { error } = await availabilitySignalsTable(db)
      .update({
        date_start: validated.dateStart,
        date_end: validated.dateEnd,
        region_text: validated.regionText ?? null,
        cuisines: (validated.cuisines ?? []).filter(Boolean),
        max_guest_count: validated.maxGuestCount ?? null,
        status: validated.status,
        share_with_trusted_only: validated.shareWithTrustedOnly ?? true,
        note: validated.note ?? null,
      })
      .eq('id', validated.id)
      .eq('chef_id', user.entityId)

    if (error) {
      console.error('[upsertCollabAvailabilitySignal:update] Error:', error)
      throw new Error('Failed to update availability signal.')
    }
  } else {
    const { error } = await availabilitySignalsTable(db).insert({
      chef_id: user.entityId,
      date_start: validated.dateStart,
      date_end: validated.dateEnd,
      region_text: validated.regionText ?? null,
      cuisines: (validated.cuisines ?? []).filter(Boolean),
      max_guest_count: validated.maxGuestCount ?? null,
      status: validated.status,
      share_with_trusted_only: validated.shareWithTrustedOnly ?? true,
      note: validated.note ?? null,
    })

    if (error) {
      console.error('[upsertCollabAvailabilitySignal:insert] Error:', error)
      throw new Error('Failed to create availability signal.')
    }
  }

  revalidatePath('/network')
  return { success: true }
}

export async function deleteCollabAvailabilitySignal(signalId: string) {
  const user = await requireChef()
  z.string().uuid().parse(signalId)
  const db = createServerClient({ admin: true })

  const { error } = await availabilitySignalsTable(db)
    .delete()
    .eq('id', signalId)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[deleteCollabAvailabilitySignal] Error:', error)
    throw new Error('Failed to delete availability signal.')
  }

  revalidatePath('/network')
  return { success: true }
}

async function resolveHandoffRecipients(
  db: any,
  chefId: string,
  input: z.infer<typeof CreateHandoffSchema>
): Promise<string[]> {
  const connected = await getConnectedChefIds(db, chefId)

  if (input.visibilityScope === 'selected_chefs') {
    const selected = Array.from(
      new Set((input.recipientChefIds ?? []).filter((id) => id !== chefId))
    )
    if (selected.length === 0) {
      throw new Error('Select at least one chef for this handoff.')
    }
    const invalid = selected.filter((id) => !connected.has(id))
    if (invalid.length > 0) {
      throw new Error('All selected recipients must be accepted connections.')
    }
    return selected
  }

  if (input.visibilityScope === 'trusted_circle') {
    const { data } = await trustedCircleTable(db).select('trusted_chef_id').eq('chef_id', chefId)
    const trusted = Array.from(new Set(((data ?? []) as any[]).map((row) => row.trusted_chef_id)))
    const validTrusted = trusted.filter((id) => connected.has(id))
    if (validTrusted.length === 0) {
      throw new Error('Your trusted circle is empty. Add trusted chefs first.')
    }
    return validTrusted
  }

  const allConnections = Array.from(connected)
  if (allConnections.length === 0) {
    throw new Error('You need at least one accepted connection to create a collaboration handoff.')
  }
  return allConnections
}

export async function createCollabHandoff(input: z.infer<typeof CreateHandoffSchema>) {
  const user = await requireChef()
  const validated = CreateHandoffSchema.parse({
    ...input,
    sourceEntityType: input.sourceEntityType ?? 'manual',
  })
  const db = createServerClient({ admin: true })

  if (validated.expiresAt && hasCollabHandoffExpired(validated.expiresAt)) {
    throw new Error('Handoff expiration must be in the future.')
  }

  const recipientChefIds = await resolveHandoffRecipients(db, user.entityId, validated)

  const { data: handoff, error: handoffError } = await handoffsTable(db)
    .insert({
      from_chef_id: user.entityId,
      title: validated.title,
      handoff_type: validated.handoffType,
      source_entity_type: validated.sourceEntityType ?? 'manual',
      source_entity_id: validated.sourceEntityId ?? null,
      occasion: validated.occasion ?? null,
      event_date: validated.eventDate ?? null,
      guest_count: validated.guestCount ?? null,
      location_text: validated.locationText ?? null,
      budget_cents: validated.budgetCents ?? null,
      private_note: validated.privateNote ?? null,
      client_context: validated.clientContext ?? {},
      visibility_scope: validated.visibilityScope,
      expires_at: validated.expiresAt ?? null,
    })
    .select('id')
    .single()

  if (handoffError || !handoff) {
    console.error('[createCollabHandoff] handoff insert error:', handoffError)
    throw new Error('Failed to create collaboration handoff.')
  }

  const recipientRows = recipientChefIds.map((recipientChefId) => ({
    handoff_id: handoff.id,
    recipient_chef_id: recipientChefId,
    status: 'sent',
  }))

  const { error: recipientsError } = await handoffRecipientsTable(db).insert(recipientRows)
  if (recipientsError) {
    console.error('[createCollabHandoff] recipient insert error:', recipientsError)
    throw new Error('Failed to assign handoff recipients.')
  }

  await logHandoffEvent(db, {
    handoffId: handoff.id,
    actorChefId: user.entityId,
    eventType: 'created',
    metadata: {
      recipients_count: recipientChefIds.length,
      visibility_scope: validated.visibilityScope,
    },
  })
  await createCollabSocialNotifications(db, {
    recipients: recipientChefIds,
    actorChefId: user.entityId,
    notificationType: 'collab_handoff_received',
    handoffId: handoff.id,
  })

  revalidatePath('/network')
  revalidatePath('/dashboard')
  return { success: true, handoffId: handoff.id, recipients: recipientChefIds.length }
}

export async function getCollabInbox(limit = 50): Promise<CollabInbox> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)
  const safeLimit = Math.min(Math.max(limit, 1), 200)

  const { data: incomingRows } = await handoffRecipientsTable(db)
    .select('id, handoff_id, status, response_note, viewed_at, responded_at, created_at')
    .eq('recipient_chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  const incomingHandoffIds = Array.from(
    new Set(((incomingRows ?? []) as any[]).map((row) => row.handoff_id))
  )
  const incomingHandoffsMap = new Map<string, any>()
  if (incomingHandoffIds.length > 0) {
    const { data: incomingHandoffs } = await handoffsTable(db)
      .select(
        'id, from_chef_id, title, handoff_type, source_entity_type, source_entity_id, status, occasion, event_date, guest_count, location_text, budget_cents, private_note, client_context, expires_at, created_at'
      )
      .in('id', incomingHandoffIds)
    for (const handoff of incomingHandoffs ?? [])
      incomingHandoffsMap.set((handoff as any).id, handoff)
  }

  const incomingSenderIds = Array.from(
    new Set(
      ((incomingRows ?? []) as any[])
        .map((row) => incomingHandoffsMap.get(row.handoff_id)?.from_chef_id)
        .filter(Boolean)
    )
  )
  const incomingSenderMap = await getChefCardsById(db, incomingSenderIds)

  const incoming: IncomingCollabHandoff[] = ((incomingRows ?? []) as any[])
    .map((row) => {
      const handoff = incomingHandoffsMap.get(row.handoff_id)
      if (!handoff) return null
      const sender = incomingSenderMap.get(handoff.from_chef_id)
      if (!sender) return null
      return {
        recipient_row_id: row.id,
        handoff_id: handoff.id,
        title: handoff.title,
        handoff_type: handoff.handoff_type as HandoffType,
        source_entity_type: (handoff.source_entity_type as HandoffSourceType | null) ?? null,
        source_entity_id: handoff.source_entity_id ?? null,
        status: handoff.status as HandoffStatus,
        recipient_status: row.status as HandoffRecipientStatus,
        response_note: row.response_note ?? null,
        event_date: handoff.event_date ?? null,
        occasion: handoff.occasion ?? null,
        guest_count: handoff.guest_count ?? null,
        location_text: handoff.location_text ?? null,
        budget_cents: handoff.budget_cents ?? null,
        private_note: handoff.private_note ?? null,
        client_context: handoff.client_context ?? {},
        expires_at: handoff.expires_at ?? null,
        created_at: handoff.created_at,
        viewed_at: row.viewed_at ?? null,
        responded_at: row.responded_at ?? null,
        from_chef: sender,
      }
    })
    .filter((row): row is IncomingCollabHandoff => Boolean(row))

  const { data: outgoingHandoffs } = await handoffsTable(db)
    .select(
      'id, title, handoff_type, source_entity_type, source_entity_id, status, occasion, event_date, guest_count, location_text, budget_cents, private_note, client_context, expires_at, visibility_scope, created_at'
    )
    .eq('from_chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  const outgoingIds = ((outgoingHandoffs ?? []) as any[]).map((row) => row.id)
  const { data: outgoingRecipientRows } =
    outgoingIds.length === 0
      ? { data: [] }
      : await handoffRecipientsTable(db)
          .select(
            'id, handoff_id, recipient_chef_id, status, response_note, viewed_at, responded_at, created_at'
          )
          .in('handoff_id', outgoingIds)
          .order('created_at', { ascending: true })

  const outgoingRecipientIds = Array.from(
    new Set(((outgoingRecipientRows ?? []) as any[]).map((row) => row.recipient_chef_id))
  )
  const outgoingRecipientMap = await getChefCardsById(db, outgoingRecipientIds)

  const recipientsByHandoff = new Map<string, any[]>()
  for (const row of (outgoingRecipientRows ?? []) as any[]) {
    const current = recipientsByHandoff.get(row.handoff_id) ?? []
    current.push(row)
    recipientsByHandoff.set(row.handoff_id, current)
  }

  const outgoing: OutgoingCollabHandoff[] = ((outgoingHandoffs ?? []) as any[]).map((handoff) => {
    const recipientRows = recipientsByHandoff.get(handoff.id) ?? []
    const recipients = recipientRows
      .map((row) => {
        const chef = outgoingRecipientMap.get(row.recipient_chef_id)
        if (!chef) return null
        return {
          recipient_row_id: row.id,
          recipient_status: row.status as HandoffRecipientStatus,
          response_note: row.response_note ?? null,
          viewed_at: row.viewed_at ?? null,
          responded_at: row.responded_at ?? null,
          chef,
        }
      })
      .filter(
        (
          row
        ): row is {
          recipient_row_id: string
          recipient_status: HandoffRecipientStatus
          response_note: string | null
          viewed_at: string | null
          responded_at: string | null
          chef: CollabChefCard
        } => Boolean(row)
      )

    return {
      handoff_id: handoff.id,
      title: handoff.title,
      handoff_type: handoff.handoff_type as HandoffType,
      source_entity_type: (handoff.source_entity_type as HandoffSourceType | null) ?? null,
      source_entity_id: handoff.source_entity_id ?? null,
      status: handoff.status as HandoffStatus,
      event_date: handoff.event_date ?? null,
      occasion: handoff.occasion ?? null,
      guest_count: handoff.guest_count ?? null,
      location_text: handoff.location_text ?? null,
      budget_cents: handoff.budget_cents ?? null,
      private_note: handoff.private_note ?? null,
      client_context: handoff.client_context ?? {},
      expires_at: handoff.expires_at ?? null,
      visibility_scope: handoff.visibility_scope as HandoffVisibility,
      created_at: handoff.created_at,
      recipients,
    }
  })

  return { incoming, outgoing }
}

export async function markCollabHandoffViewed(input: z.infer<typeof HandoffIdSchema>) {
  const user = await requireChef()
  const validated = HandoffIdSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { data: handoff } = await handoffsTable(db)
    .select('id, status')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff) throw new Error('Handoff not found.')
  if (!isCollabHandoffActionable(handoff.status as HandoffStatus)) {
    return { success: true }
  }

  const { data: recipient } = await handoffRecipientsTable(db)
    .select('id, status')
    .eq('handoff_id', validated.handoffId)
    .eq('recipient_chef_id', user.entityId)
    .maybeSingle()

  if (!recipient) throw new Error('Handoff recipient row not found.')
  if (recipient.status !== 'sent') return { success: true }

  const now = new Date().toISOString()
  await handoffRecipientsTable(db)
    .update({ status: 'viewed', viewed_at: now })
    .eq('id', recipient.id)

  await logHandoffEvent(db, {
    handoffId: validated.handoffId,
    actorChefId: user.entityId,
    eventType: 'viewed',
  })

  await recomputeHandoffStatus(db, validated.handoffId, user.entityId)
  revalidatePath('/network')
  return { success: true }
}

export async function respondToCollabHandoff(input: z.infer<typeof RespondHandoffSchema>) {
  const user = await requireChef()
  const validated = RespondHandoffSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { data: handoff } = await handoffsTable(db)
    .select('id, from_chef_id, status')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff) throw new Error('Handoff not found.')
  if (!isCollabHandoffActionable(handoff.status as HandoffStatus)) {
    throw new Error('This handoff is no longer accepting responses.')
  }

  const { data: recipient } = await handoffRecipientsTable(db)
    .select('id, status')
    .eq('handoff_id', validated.handoffId)
    .eq('recipient_chef_id', user.entityId)
    .maybeSingle()

  if (!recipient) throw new Error('Handoff not found.')
  if (!['sent', 'viewed'].includes(recipient.status)) {
    throw new Error('This handoff has already been responded to.')
  }

  const nextStatus = validated.action === 'accepted' ? 'accepted' : 'rejected'
  const now = new Date().toISOString()
  const { error } = await handoffRecipientsTable(db)
    .update({
      status: nextStatus,
      response_note: validated.responseNote ?? null,
      responded_at: now,
      viewed_at: recipient.status === 'sent' ? now : undefined,
    })
    .eq('id', recipient.id)

  if (error) {
    console.error('[respondToCollabHandoff] Error:', error)
    throw new Error('Failed to respond to handoff.')
  }

  await logHandoffEvent(db, {
    handoffId: validated.handoffId,
    actorChefId: user.entityId,
    eventType: validated.action,
    metadata: { response_note: validated.responseNote ?? null },
  })
  if (handoff.from_chef_id && handoff.from_chef_id !== user.entityId) {
    await createCollabSocialNotifications(db, {
      recipients: [handoff.from_chef_id],
      actorChefId: user.entityId,
      notificationType:
        validated.action === 'accepted' ? 'collab_handoff_accepted' : 'collab_handoff_rejected',
      handoffId: validated.handoffId,
    })
  }

  await recomputeHandoffStatus(db, validated.handoffId, user.entityId)
  revalidatePath('/network')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function cancelCollabHandoff(input: z.infer<typeof HandoffIdSchema>) {
  const user = await requireChef()
  const validated = HandoffIdSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { data: handoff } = await handoffsTable(db)
    .select('id, from_chef_id, status')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff || handoff.from_chef_id !== user.entityId) {
    throw new Error('Handoff not found or access denied.')
  }

  if (handoff.status === 'cancelled' || handoff.status === 'expired') return { success: true }

  const { data: recipientsBeforeCancel } = await handoffRecipientsTable(db)
    .select('recipient_chef_id')
    .eq('handoff_id', validated.handoffId)
    .in('status', ['sent', 'viewed', 'accepted'])

  const now = new Date().toISOString()
  await handoffsTable(db).update({ status: 'cancelled' }).eq('id', validated.handoffId)
  await handoffRecipientsTable(db)
    .update({ status: 'withdrawn', responded_at: now })
    .eq('handoff_id', validated.handoffId)
    .in('status', ['sent', 'viewed'])

  await logHandoffEvent(db, {
    handoffId: validated.handoffId,
    actorChefId: user.entityId,
    eventType: 'cancelled',
  })
  await createCollabSocialNotifications(db, {
    recipients: Array.from(
      new Set(((recipientsBeforeCancel ?? []) as any[]).map((row) => row.recipient_chef_id))
    ),
    actorChefId: user.entityId,
    notificationType: 'collab_handoff_cancelled',
    handoffId: validated.handoffId,
  })

  revalidatePath('/network')
  return { success: true }
}

export async function recordCollabHandoffConversion(input: z.infer<typeof ConvertHandoffSchema>) {
  const user = await requireChef()
  const validated = ConvertHandoffSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { data: handoff } = await handoffsTable(db)
    .select('id, from_chef_id, status')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff) throw new Error('Handoff not found.')
  if (
    (handoff.status as HandoffStatus) === 'cancelled' ||
    (handoff.status as HandoffStatus) === 'expired'
  ) {
    throw new Error('This handoff can no longer be converted.')
  }

  const { data: recipient } = await handoffRecipientsTable(db)
    .select('id, status')
    .eq('handoff_id', validated.handoffId)
    .eq('recipient_chef_id', user.entityId)
    .maybeSingle()

  if (!recipient) throw new Error('Handoff not found.')
  if (!['accepted', 'converted'].includes(recipient.status)) {
    throw new Error('Handoff must be accepted before conversion.')
  }

  const now = new Date().toISOString()
  const { error } = await handoffRecipientsTable(db)
    .update({
      status: 'converted',
      converted_event_id: validated.convertedEventId ?? null,
      converted_inquiry_id: validated.convertedInquiryId ?? null,
      responded_at: recipient.status === 'accepted' ? now : undefined,
    })
    .eq('id', recipient.id)

  if (error) {
    console.error('[recordCollabHandoffConversion] Error:', error)
    throw new Error('Failed to mark handoff conversion.')
  }

  await logHandoffEvent(db, {
    handoffId: validated.handoffId,
    actorChefId: user.entityId,
    eventType: 'converted',
    metadata: {
      converted_event_id: validated.convertedEventId ?? null,
      converted_inquiry_id: validated.convertedInquiryId ?? null,
    },
  })
  if (handoff.from_chef_id && handoff.from_chef_id !== user.entityId) {
    await createCollabSocialNotifications(db, {
      recipients: [handoff.from_chef_id],
      actorChefId: user.entityId,
      notificationType: 'collab_handoff_converted',
      handoffId: validated.handoffId,
    })
  }

  await recomputeHandoffStatus(db, validated.handoffId, user.entityId)
  revalidatePath('/network')
  return { success: true }
}

// ─── Inquiry-to-Handoff Data Extraction ──────────────────────────────────────

export async function getHandoffDataFromInquiry(inquiryId: string): Promise<{
  title: string
  occasion: string | null
  eventDate: string | null
  guestCount: number | null
  locationText: string | null
  budgetCents: number | null
  clientContext: Record<string, unknown> | null
} | null> {
  const chef = await requireChef()
  const db = createServerClient()

  const { data: inquiry } = await db
    .from('inquiries')
    .select(
      'id, confirmed_occasion, confirmed_date, confirmed_guest_count, confirmed_budget_cents, source_message, client_id, clients(full_name, dietary_restrictions)'
    )
    .eq('id', inquiryId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!inquiry) return null

  const clientContext: Record<string, unknown> | null = inquiry.clients
    ? { clientName: inquiry.clients.full_name, dietary: inquiry.clients.dietary_restrictions }
    : null

  let guestPreferences: Array<{
    name: string
    allergies: string[] | null
    dietary: string[] | null
  }> = []

  try {
    const { data: event } = await (db as any)
      .from('events')
      .select('id')
      .eq('inquiry_id', inquiryId)
      .eq('tenant_id', chef.tenantId!)
      .limit(1)
      .maybeSingle()

    let circleQuery: { data: { id: string } | null } | null = null
    if (event?.id) {
      circleQuery = await (db as any)
        .from('hub_groups')
        .select('id')
        .eq('event_id', event.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
    }

    if (!circleQuery?.data) {
      circleQuery = await (db as any)
        .from('hub_groups')
        .select('id')
        .eq('inquiry_id', inquiryId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
    }

    if (circleQuery?.data) {
      const { data: members } = await (db as any)
        .from('hub_group_members')
        .select('profile:hub_guest_profiles(display_name, known_allergies, known_dietary)')
        .eq('group_id', circleQuery.data.id)

      guestPreferences = ((members ?? []) as any[])
        .filter((member) => member.profile)
        .map((member) => ({
          name: member.profile.display_name,
          allergies: member.profile.known_allergies,
          dietary: member.profile.known_dietary,
        }))
        .filter(
          (preference) =>
            (preference.allergies && preference.allergies.length > 0) ||
            (preference.dietary && preference.dietary.length > 0)
        )
    }
  } catch {
    // Non-blocking: if circle lookup fails, handoff still works without preferences.
  }

  return {
    title: inquiry.confirmed_occasion || 'Lead Handoff',
    occasion: inquiry.confirmed_occasion || null,
    eventDate: inquiry.confirmed_date || null,
    guestCount: inquiry.confirmed_guest_count || null,
    locationText: null,
    budgetCents: inquiry.confirmed_budget_cents || null,
    clientContext: clientContext
      ? {
          ...clientContext,
          guestPreferences: guestPreferences.length > 0 ? guestPreferences : undefined,
        }
      : guestPreferences.length > 0
        ? { guestPreferences }
        : null,
  }
}

// ─── Inquiry-to-Handoff Traceability ─────────────────────────────────────────

export async function getHandoffForInquiry(inquiryId: string): Promise<{
  handoffId: string
  title: string
  status: string
  createdAt: string
  recipientCount: number
  conversions: number
} | null> {
  const chef = await requireChef()
  const db = createServerClient()

  const { data: handoff } = await db
    .from('chef_handoffs')
    .select('id, title, status, created_at')
    .eq('from_chef_id', chef.tenantId!)
    .eq('source_entity_type', 'inquiry')
    .eq('source_entity_id', inquiryId)
    .limit(1)
    .single()

  if (!handoff) return null

  const { count: recipientCount } = await db
    .from('chef_collab_handoff_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('handoff_id', handoff.id)

  const { count: conversions } = await db
    .from('chef_collab_handoff_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('handoff_id', handoff.id)
    .eq('status', 'converted')

  return {
    handoffId: handoff.id,
    title: handoff.title || 'Handoff',
    status: handoff.status,
    createdAt: handoff.created_at,
    recipientCount: recipientCount || 0,
    conversions: conversions || 0,
  }
}
