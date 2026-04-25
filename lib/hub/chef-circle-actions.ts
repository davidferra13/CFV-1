'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Chef Circle Actions
// Server actions for the chef's circle dashboard/inbox.
// ---------------------------------------------------------------------------

export type PipelineStage =
  | 'new_inquiry'
  | 'awaiting_client'
  | 'awaiting_chef'
  | 'quoted'
  | 'accepted'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'expired'
  | 'active' // community/dinner club circles with no event

export interface ChefCircleSummary {
  id: string
  name: string
  emoji: string | null
  group_token: string
  group_type: string
  event_id: string | null
  inquiry_id: string | null
  last_message_at: string | null
  last_message_preview: string | null
  message_count: number
  member_count: number
  unread_count: number
  is_active: boolean
  created_at: string
  linked_event_count?: number
  // Pipeline enrichment
  pipeline_stage: PipelineStage
  client_name: string | null
  event_date: string | null
  event_status: string | null
  inquiry_status: string | null
  guest_count: number | null
  needs_attention: boolean
  attention_reason: string | null
  urgency_score: number
  response_gap_hours: number | null
  estimated_value_cents: number | null
  days_in_stage: number
}

/**
 * Get Dinner Circles for the current chef, with unread counts.
 * When limit is set, caps results and uses a fast boolean has_unread check
 * instead of per-circle COUNT queries (avoids N+1 for dashboard preview).
 */
export async function getChefCircles(options?: { limit?: number }): Promise<ChefCircleSummary[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Get chef's hub profile
  const { data: chefProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  // Get tenant-scoped circles (business circles)
  let groupQuery = db
    .from('hub_groups')
    .select(
      'id, name, emoji, group_token, group_type, event_id, inquiry_id, last_message_at, last_message_preview, message_count, is_active, created_at'
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (options?.limit) {
    groupQuery = groupQuery.limit(options.limit)
  }

  const { data: tenantGroups } = await groupQuery

  // Also get community circles the chef is a member of (tenant_id=null)
  let communityGroups: any[] = []
  if (chefProfile) {
    const { data: communityMemberships } = await db
      .from('hub_group_members')
      .select('group_id')
      .eq('profile_id', chefProfile.id)

    if (communityMemberships?.length) {
      const memberGroupIds = communityMemberships.map((m: any) => m.group_id)
      const { data: cGroups } = await db
        .from('hub_groups')
        .select(
          'id, name, emoji, group_token, group_type, event_id, inquiry_id, last_message_at, last_message_preview, message_count, is_active, created_at'
        )
        .in('id', memberGroupIds)
        .eq('is_active', true)
        .is('tenant_id', null)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (cGroups) communityGroups = cGroups
    }
  }

  // Merge and deduplicate, sort by last_message_at
  const allGroups = [...(tenantGroups ?? []), ...communityGroups]
  const seen = new Set<string>()
  const groups = allGroups
    .filter((g: any) => {
      if (seen.has(g.id)) return false
      seen.add(g.id)
      return true
    })
    .sort((a: any, b: any) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return bTime - aTime
    })

  if (options?.limit) groups.splice(options.limit)

  if (groups.length === 0) return []

  // Get member counts + chef's last_read_at for each group
  const groupIds = groups.map((g: any) => g.id)

  // --- Pipeline enrichment: batch-fetch event + inquiry + client data ---
  const eventIds = groups.map((g: any) => g.event_id).filter(Boolean)
  const inquiryIds = groups.map((g: any) => g.inquiry_id).filter(Boolean)

  const eventMap: Record<string, { status: string; event_date: string | null; client_id: string | null; guest_count: number | null; occasion: string | null; total_price: number | null }> = {}
  const inquiryMap: Record<string, { status: string; client_id: string | null; event_date: string | null; guest_count: number | null }> = {}
  const clientMap: Record<string, string> = {}

  if (eventIds.length > 0) {
    const { data: events } = await db
      .from('events')
      .select('id, status, event_date, client_id, guest_count, occasion, total_price')
      .in('id', eventIds)
    for (const e of events ?? []) {
      eventMap[e.id] = { status: e.status, event_date: e.event_date, client_id: e.client_id, guest_count: e.guest_count, occasion: e.occasion, total_price: e.total_price }
    }
  }

  if (inquiryIds.length > 0) {
    const { data: inquiries } = await db
      .from('inquiries')
      .select('id, status, client_id, event_date, guest_count')
      .in('id', inquiryIds)
    for (const inq of inquiries ?? []) {
      inquiryMap[inq.id] = { status: inq.status, client_id: inq.client_id, event_date: inq.event_date, guest_count: inq.guest_count }
    }
  }

  // Collect all client IDs and batch-fetch names
  const allClientIds = new Set<string>()
  for (const e of Object.values(eventMap)) { if (e.client_id) allClientIds.add(e.client_id) }
  for (const inq of Object.values(inquiryMap)) { if (inq.client_id) allClientIds.add(inq.client_id) }

  if (allClientIds.size > 0) {
    const { data: clients } = await db
      .from('clients')
      .select('id, full_name')
      .in('id', Array.from(allClientIds))
    for (const c of clients ?? []) {
      clientMap[c.id] = c.full_name
    }
  }

  const { data: memberCounts } = await db
    .from('hub_group_members')
    .select('group_id')
    .in('group_id', groupIds)

  const countMap: Record<string, number> = {}
  for (const m of memberCounts ?? []) {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
  }

  // Get chef's last_read_at per group
  let readMap: Record<string, string | null> = {}
  if (chefProfile) {
    const { data: memberships } = await db
      .from('hub_group_members')
      .select('group_id, last_read_at')
      .eq('profile_id', chefProfile.id)
      .in('group_id', groupIds)

    for (const m of memberships ?? []) {
      readMap[m.group_id] = m.last_read_at
    }
  }

  const useFastUnread = !!options?.limit
  const responseGapMap: Record<string, { gap_hours: number | null }> = {}

  if (!useFastUnread && chefProfile) {
    for (const group of groups) {
      if (!group.last_message_at) {
        responseGapMap[group.id] = { gap_hours: null }
        continue
      }

      const { data: lastMsg } = await db
        .from('hub_messages')
        .select('author_profile_id, created_at')
        .eq('group_id', group.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastMsg && lastMsg.author_profile_id !== chefProfile.id) {
        const hoursSince = (Date.now() - new Date(lastMsg.created_at).getTime()) / 3600000
        responseGapMap[group.id] = { gap_hours: Math.round(hoursSince) }
      } else {
        responseGapMap[group.id] = { gap_hours: null }
      }
    }
  }

  // Count unread messages per group
  const results: ChefCircleSummary[] = []
  for (const group of groups) {
    let unreadCount = 0
    const lastRead = readMap[group.id]

    if (useFastUnread) {
      // Fast path: boolean check only (no per-circle COUNT query)
      if (!lastRead && group.message_count > 0) {
        unreadCount = group.message_count
      } else if (lastRead && group.last_message_at) {
        if (new Date(group.last_message_at) > new Date(lastRead)) {
          unreadCount = 1 // Signal "has unread" without exact count
        }
      }
    } else {
      // Full path: exact unread count per circle
      if (lastRead && group.last_message_at) {
        if (new Date(group.last_message_at) > new Date(lastRead)) {
          const { count } = await db
            .from('hub_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .is('deleted_at', null)
            .gt('created_at', lastRead)

          unreadCount = count ?? 0
        }
      } else if (!lastRead && group.message_count > 0) {
        unreadCount = group.message_count
      }
    }

    // Derive pipeline stage from event or inquiry status
    const evt = group.event_id ? eventMap[group.event_id] : null
    const inq = group.inquiry_id ? inquiryMap[group.inquiry_id] : null
    const eventStatus = evt?.status ?? null
    const inquiryStatus = inq?.status ?? null
    const clientId = evt?.client_id ?? inq?.client_id ?? null
    const clientName = clientId ? (clientMap[clientId] ?? null) : null
    const eventDate = evt?.event_date ?? inq?.event_date ?? null
    const guestCount = evt?.guest_count ?? inq?.guest_count ?? null

    const pipeline = derivePipelineStage(eventStatus, inquiryStatus, group.group_type)
    const responseGap = responseGapMap[group.id]?.gap_hours ?? null
    const valueCents = evt?.total_price != null ? Math.round(evt.total_price * 100) : null
    const stageEntryDate = group.last_message_at || group.created_at
    const daysInStage = Math.floor((Date.now() - new Date(stageEntryDate).getTime()) / 86400000)
    const attention = deriveAttention(pipeline, unreadCount, eventDate, responseGap)
    const urgency = computeUrgencyScore({
      pipeline_stage: pipeline,
      unread_count: unreadCount,
      response_gap_hours: responseGap,
      event_date: eventDate,
      estimated_value_cents: valueCents,
      days_in_stage: daysInStage,
      needs_attention: attention.needs,
    })

    results.push({
      ...group,
      member_count: countMap[group.id] ?? 0,
      unread_count: unreadCount,
      pipeline_stage: pipeline,
      client_name: clientName,
      event_date: eventDate,
      event_status: eventStatus,
      inquiry_status: inquiryStatus,
      guest_count: guestCount,
      needs_attention: attention.needs,
      attention_reason: attention.reason,
      urgency_score: urgency,
      response_gap_hours: responseGap,
      estimated_value_cents: valueCents,
      days_in_stage: daysInStage,
    })
  }

  results.sort((a, b) => b.urgency_score - a.urgency_score)

  return results
}

// ---------------------------------------------------------------------------
// Pipeline Stage Derivation
// ---------------------------------------------------------------------------

function derivePipelineStage(
  eventStatus: string | null,
  inquiryStatus: string | null,
  groupType: string
): PipelineStage {
  // Event status takes priority (further along in lifecycle)
  if (eventStatus) {
    switch (eventStatus) {
      case 'draft': return inquiryStatus === 'quoted' ? 'quoted' : 'new_inquiry'
      case 'proposed': return 'quoted'
      case 'accepted': return 'accepted'
      case 'paid': return 'paid'
      case 'confirmed': return 'confirmed'
      case 'in_progress': return 'in_progress'
      case 'completed': return 'completed'
      case 'cancelled': return 'cancelled'
      default: return 'new_inquiry'
    }
  }

  // Fall back to inquiry status
  if (inquiryStatus) {
    switch (inquiryStatus) {
      case 'new': return 'new_inquiry'
      case 'awaiting_client': return 'awaiting_client'
      case 'awaiting_chef': return 'awaiting_chef'
      case 'quoted': return 'quoted'
      case 'confirmed': return 'confirmed'
      case 'declined': return 'declined'
      case 'expired': return 'expired'
      default: return 'new_inquiry'
    }
  }

  // Community circles / dinner clubs with no event
  return 'active'
}

function deriveAttention(
  stage: PipelineStage,
  unreadCount: number,
  eventDate: string | null,
  responseGapHours?: number | null
): { needs: boolean; reason: string | null } {
  // Response gap: client waiting for chef reply
  if (responseGapHours !== null && responseGapHours !== undefined) {
    if (responseGapHours >= 48) {
      return { needs: true, reason: `No reply in ${Math.round(responseGapHours / 24)}d` }
    }
    if (responseGapHours >= 24 && ['new_inquiry', 'awaiting_chef', 'quoted'].includes(stage)) {
      return { needs: true, reason: 'Client waiting 24h+' }
    }
  }

  // Unread messages always need attention
  if (unreadCount > 0 && ['new_inquiry', 'awaiting_chef', 'awaiting_client', 'quoted', 'accepted'].includes(stage)) {
    return { needs: true, reason: 'Unread messages' }
  }

  // Stages that inherently need chef action
  if (stage === 'new_inquiry') return { needs: true, reason: 'New inquiry' }
  if (stage === 'awaiting_chef') return { needs: true, reason: 'Awaiting your response' }

  // Upcoming events within 3 days
  if (eventDate && ['paid', 'confirmed'].includes(stage)) {
    const daysUntil = Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86400000)
    if (daysUntil >= 0 && daysUntil <= 3) {
      return { needs: true, reason: daysUntil === 0 ? 'Event today' : `Event in ${daysUntil}d` }
    }
  }

  return { needs: false, reason: null }
}

/**
 * Compute urgency score (0-100) from multiple signals.
 * Higher means more urgent. Used for sorting circles by what needs action first.
 */
function computeUrgencyScore(input: {
  pipeline_stage: PipelineStage
  unread_count: number
  response_gap_hours: number | null
  event_date: string | null
  estimated_value_cents: number | null
  days_in_stage: number
  needs_attention: boolean
}): number {
  let score = 0

  const stageUrgency: Partial<Record<PipelineStage, number>> = {
    new_inquiry: 15,
    awaiting_chef: 20,
    awaiting_client: 5,
    quoted: 10,
    accepted: 8,
    paid: 12,
    confirmed: 6,
    in_progress: 18,
    completed: 0,
    cancelled: 0,
    declined: 0,
    expired: 0,
    active: 2,
  }
  score += stageUrgency[input.pipeline_stage] ?? 0

  if (input.unread_count > 0) {
    score += Math.min(input.unread_count * 5, 20)
  }

  if (input.response_gap_hours !== null) {
    if (input.response_gap_hours >= 72) score += 30
    else if (input.response_gap_hours >= 48) score += 25
    else if (input.response_gap_hours >= 24) score += 15
    else if (input.response_gap_hours >= 12) score += 8
    else if (input.response_gap_hours >= 4) score += 4
  }

  if (input.event_date) {
    const daysUntil = Math.ceil((new Date(input.event_date).getTime() - Date.now()) / 86400000)
    if (daysUntil <= 0) score += 20
    else if (daysUntil <= 1) score += 18
    else if (daysUntil <= 3) score += 14
    else if (daysUntil <= 7) score += 8
    else if (daysUntil <= 14) score += 4
  }

  if (input.estimated_value_cents !== null && input.estimated_value_cents > 0) {
    if (input.estimated_value_cents >= 500000) score += 10
    else if (input.estimated_value_cents >= 200000) score += 7
    else if (input.estimated_value_cents >= 100000) score += 4
    else if (input.estimated_value_cents >= 50000) score += 2
  }

  if (input.days_in_stage > 14 && ['quoted', 'accepted'].includes(input.pipeline_stage)) {
    score += 5
  }
  if (input.days_in_stage > 3 && input.pipeline_stage === 'new_inquiry') {
    score += 10
  }

  return Math.min(score, 100)
}

/**
 * Get total unread message count across all circles for the current chef.
 * Lightweight query for nav badge polling.
 */
export async function getCirclesUnreadCount(): Promise<number> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Get chef's hub profile
  const { data: chefProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  if (!chefProfile) return 0

  // Get tenant-scoped groups with activity
  const { data: tenantGroups } = await db
    .from('hub_groups')
    .select('id, last_message_at, message_count')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('last_message_at', 'is', null)

  // Also get community circles chef is a member of
  let communityGroups: any[] = []
  const { data: communityMemberships } = await db
    .from('hub_group_members')
    .select('group_id')
    .eq('profile_id', chefProfile.id)

  if (communityMemberships?.length) {
    const memberGroupIds = communityMemberships.map((m: any) => m.group_id)
    const { data: cGroups } = await db
      .from('hub_groups')
      .select('id, last_message_at, message_count')
      .in('id', memberGroupIds)
      .eq('is_active', true)
      .is('tenant_id', null)
      .not('last_message_at', 'is', null)
    communityGroups = cGroups ?? []
  }

  // Merge and deduplicate
  const seen = new Set<string>()
  const groups: any[] = []
  for (const g of [...(tenantGroups ?? []), ...communityGroups]) {
    if (!seen.has(g.id)) {
      seen.add(g.id)
      groups.push(g)
    }
  }

  if (groups.length === 0) return 0

  const groupIds = groups.map((g: any) => g.id)

  // Get chef's last_read_at per group
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('group_id, last_read_at')
    .eq('profile_id', chefProfile.id)
    .in('group_id', groupIds)

  const readMap: Record<string, string | null> = {}
  for (const m of memberships ?? []) {
    readMap[m.group_id] = m.last_read_at
  }

  let total = 0
  for (const group of groups) {
    const lastRead = readMap[group.id]
    if (!lastRead) {
      total += group.message_count
    } else if (group.last_message_at && new Date(group.last_message_at) > new Date(lastRead)) {
      const { count } = await db
        .from('hub_messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)
        .is('deleted_at', null)
        .gt('created_at', lastRead)
      total += count ?? 0
    }
  }

  return total
}

export async function getOrCreateChefHubProfileToken(): Promise<string | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const { data: existingByAuth } = await db
    .from('hub_guest_profiles')
    .select('profile_token')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  if (existingByAuth?.profile_token) {
    return existingByAuth.profile_token
  }

  if (user.email) {
    const normalizedEmail = user.email.toLowerCase().trim()
    const { data: existingByEmail } = await db
      .from('hub_guest_profiles')
      .select('id, profile_token, auth_user_id')
      .eq('email_normalized', normalizedEmail)
      .maybeSingle()

    if (existingByEmail?.profile_token) {
      if (!existingByEmail.auth_user_id) {
        await db
          .from('hub_guest_profiles')
          .update({
            auth_user_id: user.userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingByEmail.id)
      }

      return existingByEmail.profile_token
    }
  }

  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const displayName = chef?.display_name || chef?.business_name || 'Chef'

  const { data: created, error } = await db
    .from('hub_guest_profiles')
    .insert({
      display_name: displayName,
      email: user.email || null,
      auth_user_id: user.userId,
    })
    .select('profile_token')
    .single()

  if (error) {
    throw new Error(`Failed to create chef profile: ${error.message}`)
  }

  return created?.profile_token ?? null
}

/**
 * Create a circle manually for an event that doesn't have one.
 */
export async function createCircleForEvent(eventId: string): Promise<{ groupToken: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Check if circle already exists
  const { data: existing } = await db
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existing) return { groupToken: existing.group_token }

  // Also check via inquiry
  const { data: inquiry } = await db
    .from('inquiries')
    .select('id')
    .eq('converted_to_event_id', eventId)
    .maybeSingle()

  if (inquiry) {
    const { data: inquiryCircle } = await db
      .from('hub_groups')
      .select('group_token')
      .eq('inquiry_id', inquiry.id)
      .maybeSingle()

    if (inquiryCircle) return { groupToken: inquiryCircle.group_token }
  }

  // Load event for naming
  const { data: event } = await db
    .from('events')
    .select('event_date, occasion, client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) throw new Error('Event not found')

  // Load client name
  let clientName = 'Guest'
  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    if (client) clientName = client.full_name.split(' ')[0]
  }

  // Get or create chef hub profile
  const { getOrCreateProfile } = await import('./profile-actions')
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Chef'
  const chefEmail = user.email || null

  const chefProfile = await getOrCreateProfile({
    email: chefEmail,
    displayName: chefName,
    authUserId: user.userId,
  })

  const groupName = event.occasion
    ? `${event.occasion} with ${clientName}`
    : `Dinner with ${clientName}`

  // Create the group
  const { createHubGroup } = await import('./group-actions')
  const group = await createHubGroup({
    name: groupName,
    event_id: eventId,
    tenant_id: tenantId,
    created_by_profile_id: chefProfile.id,
    emoji: '🍽️',
  })

  // Add chef as chef role (creator is already owner, update role)
  await db
    .from('hub_group_members')
    .update({ role: 'chef' })
    .eq('group_id', group.id)
    .eq('profile_id', chefProfile.id)

  // Add client if they have a hub profile
  if (event.client_id) {
    const { data: clientProfile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('client_id', event.client_id)
      .maybeSingle()

    if (clientProfile) {
      await db.from('hub_group_members').insert({
        group_id: group.id,
        profile_id: clientProfile.id,
        role: 'member',
        can_post: true,
        can_invite: true,
        can_pin: false,
      })
    }
  }

  return { groupToken: group.group_token }
}

export async function getOrCreateChefCircleTokenForEvent(eventId: string): Promise<string | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const { data: event } = await db
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event || event.status === 'cancelled') {
    return null
  }

  const { data: existing } = await db
    .from('hub_groups')
    .select('group_token')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()

  if (existing?.group_token) {
    return existing.group_token
  }

  const created = await createCircleForEvent(eventId)
  return created.groupToken
}

/**
 * Archive (deactivate) a circle.
 */
export async function archiveCircle(groupId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  await db
    .from('hub_groups')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
}

/**
 * Restore an archived circle.
 */
export async function restoreCircle(groupId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  await db
    .from('hub_groups')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
}

// ---------------------------------------------------------------------------
// Multi-Event Circles (Dinner Clubs / Recurring Groups)
// ---------------------------------------------------------------------------

/**
 * Create a dinner club or multi-event circle.
 */
export async function createDinnerClub(input: {
  name: string
  description?: string
  emoji?: string
}): Promise<{ groupToken: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Get or create chef hub profile
  const { getOrCreateProfile } = await import('./profile-actions')
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Chef'

  const chefProfile = await getOrCreateProfile({
    email: user.email || null,
    displayName: chefName,
    authUserId: user.userId,
  })

  const { createHubGroup } = await import('./group-actions')
  const group = await createHubGroup({
    name: input.name,
    description: input.description ?? null,
    tenant_id: tenantId,
    created_by_profile_id: chefProfile.id,
    emoji: input.emoji || null,
    group_type: 'dinner_club',
  })

  // Set chef role
  await db
    .from('hub_group_members')
    .update({ role: 'chef' })
    .eq('group_id', group.id)
    .eq('profile_id', chefProfile.id)

  return { groupToken: group.group_token }
}

/**
 * Link an event to a multi-event circle.
 */
export async function linkEventToCircle(input: {
  groupId: string
  eventId: string
}): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify group belongs to tenant
  const { data: group } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', input.groupId)
    .eq('tenant_id', tenantId)
    .single()

  if (!group) throw new Error('Circle not found')

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', input.eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) throw new Error('Event not found')

  // Insert (ignore duplicate)
  const { error } = await db.from('hub_group_events').insert({
    group_id: input.groupId,
    event_id: input.eventId,
  })

  if (error && error.code !== '23505') {
    throw new Error(`Failed to link event: ${error.message}`)
  }
}

/**
 * Unlink an event from a multi-event circle.
 */
export async function unlinkEventFromCircle(input: {
  groupId: string
  eventId: string
}): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify group belongs to tenant
  const { data: group } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', input.groupId)
    .eq('tenant_id', tenantId)
    .single()

  if (!group) throw new Error('Circle not found')

  await db
    .from('hub_group_events')
    .delete()
    .eq('group_id', input.groupId)
    .eq('event_id', input.eventId)
}

/**
 * Get events linked to a multi-event circle.
 */
export async function getCircleEvents(groupId: string): Promise<
  {
    id: string
    event_id: string
    event_date: string | null
    occasion: string | null
    status: string
  }[]
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('hub_group_events')
    .select('id, event_id, events(event_date, occasion, status)')
    .eq('group_id', groupId)

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    event_id: row.event_id,
    event_date: row.events?.event_date ?? null,
    occasion: row.events?.occasion ?? null,
    status: row.events?.status ?? 'draft',
  }))
}

// ---------------------------------------------------------------------------
// System-level circle auto-creation (no auth required - called from transitions)
// ---------------------------------------------------------------------------

/**
 * Ensure a circle exists for an event. Called by the event FSM when an event
 * transitions to 'paid' so the coordination channel is always ready before the
 * chef receives the payment confirmation. Idempotent: no-op if circle exists.
 *
 * Uses admin DB client and looks up the chef's auth_user_id from user_roles
 * so it works in system/webhook contexts where there is no active session.
 */
export async function ensureCircleForEvent(
  eventId: string,
  tenantId: string
): Promise<{ groupToken: string } | null> {
  try {
    const db: any = createServerClient({ admin: true })

    // Idempotency check: circle already linked to event
    const { data: existing } = await db
      .from('hub_groups')
      .select('group_token')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (existing) return { groupToken: existing.group_token }

    // Also check via inquiry (inquiry circle may predate the event)
    const { data: inquiry } = await db
      .from('inquiries')
      .select('id')
      .eq('converted_to_event_id', eventId)
      .maybeSingle()

    if (inquiry) {
      const { data: inquiryCircle } = await db
        .from('hub_groups')
        .select('group_token')
        .eq('inquiry_id', inquiry.id)
        .maybeSingle()

      if (inquiryCircle) return { groupToken: inquiryCircle.group_token }
    }

    // Check for bridge-created circles (from Introduction Bridge handoff flow)
    // If target chef created a circle via a bridge, adopt it for this event
    try {
      const { data: bridge } = await db
        .from('chef_intro_bridges')
        .select('target_circle_group_id')
        .eq('target_chef_id', tenantId)
        .not('target_circle_group_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (bridge?.target_circle_group_id) {
        // Check if bridge circle has no event_id yet (available for adoption)
        const { data: bridgeCircle } = await db
          .from('hub_groups')
          .select('id, group_token, event_id')
          .eq('id', bridge.target_circle_group_id)
          .is('event_id', null)
          .maybeSingle()

        if (bridgeCircle) {
          // Adopt: link the bridge circle to this event
          await db.from('hub_groups').update({ event_id: eventId }).eq('id', bridgeCircle.id)
          return { groupToken: bridgeCircle.group_token }
        }
      }
    } catch (err) {
      // Bridge adoption is non-blocking; fall through to create new circle
      console.error('[ensureCircleForEvent] bridge adoption failed (non-blocking)', err)
    }

    // Fetch event for naming
    const { data: event } = await db
      .from('events')
      .select('event_date, occasion, client_id')
      .eq('id', eventId)
      .single()

    if (!event) return null

    // Fetch chef name and auth user id
    const [{ data: chef }, { data: chefUserRole }] = await Promise.all([
      db.from('chefs').select('display_name, business_name, email').eq('id', tenantId).single(),
      db
        .from('user_roles')
        .select('auth_user_id, id')
        .eq('entity_id', tenantId)
        .eq('role', 'chef')
        .single(),
    ])

    if (!chefUserRole) return null

    const chefName = chef?.display_name || chef?.business_name || 'Chef'
    const chefEmail = chef?.email || null

    // Get or create chef hub profile
    const { getOrCreateProfile } = await import('./profile-actions')
    const chefProfile = await getOrCreateProfile({
      email: chefEmail,
      displayName: chefName,
      authUserId: chefUserRole.auth_user_id,
    })

    // Client first name for circle name
    let clientFirstName = 'Guest'
    if (event.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('full_name')
        .eq('id', event.client_id)
        .single()
      if (client) clientFirstName = client.full_name.split(' ')[0]
    }

    const groupName = event.occasion
      ? `${event.occasion} with ${clientFirstName}`
      : `Dinner with ${clientFirstName}`

    // Create the group
    const { createHubGroup } = await import('./group-actions')
    const group = await createHubGroup({
      name: groupName,
      event_id: eventId,
      tenant_id: tenantId,
      created_by_profile_id: chefProfile.id,
      emoji: '🍽️',
    })

    // Set chef role (creator is already owner - elevate to chef role)
    await db
      .from('hub_group_members')
      .update({ role: 'chef' })
      .eq('group_id', group.id)
      .eq('profile_id', chefProfile.id)

    // Auto-add client if they already have a hub profile
    if (event.client_id) {
      const { data: clientProfile } = await db
        .from('hub_guest_profiles')
        .select('id')
        .eq('client_id', event.client_id)
        .maybeSingle()

      if (clientProfile) {
        await db.from('hub_group_members').insert({
          group_id: group.id,
          profile_id: clientProfile.id,
          role: 'member',
          can_post: true,
          can_invite: true,
          can_pin: false,
        })
      }
    }

    return { groupToken: group.group_token }
  } catch {
    // Non-blocking - circle creation failure must never block payment confirmation
    return null
  }
}
