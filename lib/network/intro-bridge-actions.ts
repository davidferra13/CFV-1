'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Introduction Bridge - Server Actions
// Temporary mixed-party intro thread between two chefs and a client contact.
// Reuses the hub stack (hub_groups, hub_group_members, hub_messages).
// ---------------------------------------------------------------------------

// ---- Types ----

export type IntroBridgeSummary = {
  id: string
  hub_group_id: string
  group_token: string
  handoff_id: string | null
  source_chef_id: string
  target_chef_id: string
  intro_mode: 'shared' | 'observer' | 'transfer'
  status: 'active' | 'source_left' | 'completed' | 'cancelled'
  client_display_name: string
  counterpart_chef_name: string
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
  target_circle_token: string | null
}

export type IntroBridgeDetail = {
  bridge: {
    id: string
    hub_group_id: string
    handoff_id: string | null
    source_chef_id: string
    target_chef_id: string
    intro_mode: 'shared' | 'observer' | 'transfer'
    status: string
    intro_message: string | null
    created_at: string
    completed_at: string | null
    source_left_at: string | null
  }
  group_token: string
  target_circle_token: string | null
  source_circle_token: string | null
  client_display_name: string
  members: Array<{
    profile_id: string
    display_name: string
    avatar_url: string | null
    role: string
  }>
  chef_profile_token: string | null
}

// ---- Schemas ----

const CreateBridgeSchema = z.object({
  handoffId: z.string().uuid(),
  recipientChefId: z.string().uuid(),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email().optional().nullable(),
  introMode: z.enum(['shared', 'observer', 'transfer']).default('shared'),
  introMessage: z.string().max(2000).optional().nullable(),
  copySourceGuests: z.boolean().default(true),
})

// ---- Actions ----

/**
 * Get active and recent intro bridges for the current chef.
 */
export async function getChefIntroBridges(): Promise<IntroBridgeSummary[]> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  const { data: bridges } = await db
    .from('chef_intro_bridges')
    .select('*')
    .or(`source_chef_id.eq.${chefId},target_chef_id.eq.${chefId}`)
    .in('status', ['active', 'source_left', 'completed'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (!bridges?.length) return []

  // Batch-load hub groups, client profiles, and counterpart chef names
  const groupIds = bridges.map((b: any) => b.hub_group_id)
  const clientProfileIds = bridges.map((b: any) => b.primary_client_profile_id)
  const counterpartChefIds = bridges.map((b: any) =>
    b.source_chef_id === chefId ? b.target_chef_id : b.source_chef_id
  )
  const targetCircleGroupIds = bridges.map((b: any) => b.target_circle_group_id).filter(Boolean)

  const [groupsRes, clientsRes, chefsRes, targetCirclesRes] = await Promise.all([
    db
      .from('hub_groups')
      .select('id, group_token, last_message_at, last_message_preview')
      .in('id', groupIds),
    db.from('hub_guest_profiles').select('id, display_name').in('id', clientProfileIds),
    db.from('chefs').select('id, display_name, business_name').in('id', counterpartChefIds),
    targetCircleGroupIds.length > 0
      ? db.from('hub_groups').select('id, group_token').in('id', targetCircleGroupIds)
      : Promise.resolve({ data: [] }),
  ])

  const groupMap = Object.fromEntries((groupsRes.data ?? []).map((g: any) => [g.id, g]))
  const clientMap = Object.fromEntries((clientsRes.data ?? []).map((c: any) => [c.id, c]))
  const chefMap = Object.fromEntries((chefsRes.data ?? []).map((c: any) => [c.id, c]))
  const targetCircleMap = Object.fromEntries(
    (targetCirclesRes.data ?? []).map((g: any) => [g.id, g])
  )

  return bridges.map((b: any) => {
    const group = groupMap[b.hub_group_id]
    const client = clientMap[b.primary_client_profile_id]
    const counterpartId = b.source_chef_id === chefId ? b.target_chef_id : b.source_chef_id
    const counterpart = chefMap[counterpartId]
    const targetCircle = b.target_circle_group_id ? targetCircleMap[b.target_circle_group_id] : null

    return {
      id: b.id,
      hub_group_id: b.hub_group_id,
      group_token: group?.group_token ?? '',
      handoff_id: b.handoff_id,
      source_chef_id: b.source_chef_id,
      target_chef_id: b.target_chef_id,
      intro_mode: b.intro_mode,
      status: b.status,
      client_display_name: client?.display_name ?? 'Client',
      counterpart_chef_name: counterpart?.display_name || counterpart?.business_name || 'Chef',
      last_message_at: group?.last_message_at ?? null,
      last_message_preview: group?.last_message_preview ?? null,
      created_at: b.created_at,
      target_circle_token: targetCircle?.group_token ?? null,
    }
  })
}

/**
 * Create an Introduction Bridge from an accepted handoff.
 */
export async function createIntroductionBridge(
  input: z.infer<typeof CreateBridgeSchema>
): Promise<{
  success: boolean
  bridgeId?: string
  bridgeGroupToken?: string
  targetCircleToken?: string
  error?: string
}> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  try {
    const validated = CreateBridgeSchema.parse(input)

    // 1. Verify current chef owns the handoff
    const { data: handoff } = await db
      .from('chef_handoffs')
      .select('id, from_chef_id, source_entity_type, source_entity_id')
      .eq('id', validated.handoffId)
      .single()

    if (!handoff || handoff.from_chef_id !== chefId) {
      return { success: false, error: 'Handoff not found or not yours.' }
    }

    // 2. Verify recipient accepted
    const { data: recipientRow } = await db
      .from('chef_handoff_recipients')
      .select('id, status')
      .eq('handoff_id', validated.handoffId)
      .eq('recipient_chef_id', validated.recipientChefId)
      .single()

    if (!recipientRow || recipientRow.status !== 'accepted') {
      return { success: false, error: 'Recipient has not accepted this handoff.' }
    }

    // 3. Check for existing bridge (idempotent)
    const { data: existing } = await db
      .from('chef_intro_bridges')
      .select('id, hub_group_id')
      .eq('handoff_id', validated.handoffId)
      .eq('target_chef_id', validated.recipientChefId)
      .maybeSingle()

    if (existing) {
      const { data: existingGroup } = await db
        .from('hub_groups')
        .select('group_token')
        .eq('id', existing.hub_group_id)
        .single()
      return {
        success: true,
        bridgeId: existing.id,
        bridgeGroupToken: existingGroup?.group_token ?? undefined,
      }
    }

    // 4. Resolve source circle (from handoff entity)
    let sourceCircleGroupId: string | null = null
    if (handoff.source_entity_type === 'event' && handoff.source_entity_id) {
      const { getCircleForEvent } = await import('@/lib/hub/circle-lookup')
      const circle = await getCircleForEvent(handoff.source_entity_id)
      if (circle) sourceCircleGroupId = circle.groupId
    } else if (handoff.source_entity_type === 'inquiry' && handoff.source_entity_id) {
      const { getCircleForContext } = await import('@/lib/hub/circle-lookup')
      const circle = await getCircleForContext({ inquiryId: handoff.source_entity_id })
      if (circle) sourceCircleGroupId = circle.groupId
    }

    // 5. Resolve or create hub profiles for all participants
    const { getOrCreateProfile } = await import('@/lib/hub/profile-actions')

    // Source chef profile
    const { data: sourceChef } = await db
      .from('chefs')
      .select('display_name, business_name, auth_user_id')
      .eq('id', chefId)
      .single()

    const sourceProfile = await getOrCreateProfile({
      displayName: sourceChef?.display_name || sourceChef?.business_name || 'Chef',
      email: user.email || null,
      authUserId: sourceChef?.auth_user_id || user.userId,
    })

    // Target chef profile
    const { data: targetChef } = await db
      .from('chefs')
      .select('id, display_name, business_name, auth_user_id')
      .eq('id', validated.recipientChefId)
      .single()

    if (!targetChef) return { success: false, error: 'Target chef not found.' }

    // Get target chef email from auth user
    let targetChefEmail: string | null = null
    if (targetChef.auth_user_id) {
      const { data: authUser } = await db
        .from('auth_users')
        .select('email')
        .eq('id', targetChef.auth_user_id)
        .single()
      targetChefEmail = authUser?.email ?? null
    }

    const targetProfile = await getOrCreateProfile({
      displayName: targetChef.display_name || targetChef.business_name || 'Chef',
      email: targetChefEmail,
      authUserId: targetChef.auth_user_id || null,
    })

    // Client profile
    const clientProfile = await getOrCreateProfile({
      displayName: validated.clientName,
      email: validated.clientEmail || null,
    })

    // 6. Create bridge hub_group (tenant_id = NULL to avoid circle list pollution)
    const sourceChefName = sourceChef?.display_name || sourceChef?.business_name || 'Chef'
    const targetChefName = targetChef.display_name || targetChef.business_name || 'Chef'
    const bridgeGroupName = `Introduction: ${validated.clientName}`

    const { data: bridgeGroup, error: groupErr } = await db
      .from('hub_groups')
      .insert({
        name: bridgeGroupName,
        description: `Intro between ${sourceChefName}, ${targetChefName}, and ${validated.clientName}`,
        tenant_id: null,
        created_by_profile_id: sourceProfile.id,
        group_type: 'bridge',
        visibility: 'secret',
        is_active: true,
        allow_member_invites: false,
        allow_anonymous_posts: false,
      })
      .select('*')
      .single()

    if (groupErr || !bridgeGroup) {
      return { success: false, error: `Failed to create bridge group: ${groupErr?.message}` }
    }

    // 7. Add bridge memberships
    await db.from('hub_group_members').insert([
      {
        group_id: bridgeGroup.id,
        profile_id: sourceProfile.id,
        role: 'chef',
        can_post: true,
        can_invite: false,
        can_pin: true,
      },
      {
        group_id: bridgeGroup.id,
        profile_id: targetProfile.id,
        role: 'chef',
        can_post: true,
        can_invite: false,
        can_pin: true,
      },
      {
        group_id: bridgeGroup.id,
        profile_id: clientProfile.id,
        role: 'member',
        can_post: true,
        can_invite: false,
        can_pin: false,
      },
    ])

    // 8. Create destination Dinner Circle owned by target chef
    const targetCircleName = `Dinner with ${validated.clientName}`
    const { data: targetCircle, error: circleErr } = await db
      .from('hub_groups')
      .insert({
        name: targetCircleName,
        tenant_id: validated.recipientChefId,
        created_by_profile_id: targetProfile.id,
        group_type: 'circle',
        visibility: 'secret',
        is_active: true,
        allow_member_invites: false,
        allow_anonymous_posts: false,
      })
      .select('*')
      .single()

    if (circleErr || !targetCircle) {
      return { success: false, error: `Failed to create target circle: ${circleErr?.message}` }
    }

    // Add target chef + client to target circle
    await db.from('hub_group_members').insert([
      {
        group_id: targetCircle.id,
        profile_id: targetProfile.id,
        role: 'chef',
        can_post: true,
        can_invite: true,
        can_pin: true,
      },
      {
        group_id: targetCircle.id,
        profile_id: clientProfile.id,
        role: 'member',
        can_post: true,
        can_invite: false,
        can_pin: false,
      },
    ])

    // Copy source circle guests if requested
    if (validated.copySourceGuests && sourceCircleGroupId) {
      const { data: sourceMembers } = await db
        .from('hub_group_members')
        .select('profile_id, role')
        .eq('group_id', sourceCircleGroupId)
        .neq('role', 'chef')
        .neq('role', 'owner')

      if (sourceMembers?.length) {
        const existingProfileIds = new Set([targetProfile.id, clientProfile.id])
        const newMembers = sourceMembers
          .filter((m: any) => !existingProfileIds.has(m.profile_id))
          .map((m: any) => ({
            group_id: targetCircle.id,
            profile_id: m.profile_id,
            role: 'member' as const,
            can_post: true,
            can_invite: false,
            can_pin: false,
          }))

        if (newMembers.length > 0) {
          await db.from('hub_group_members').insert(newMembers)
        }
      }
    }

    // 9. Create the chef_intro_bridges lifecycle row
    const { data: bridge, error: bridgeErr } = await db
      .from('chef_intro_bridges')
      .insert({
        hub_group_id: bridgeGroup.id,
        handoff_id: validated.handoffId,
        source_circle_group_id: sourceCircleGroupId,
        target_circle_group_id: targetCircle.id,
        source_chef_id: chefId,
        target_chef_id: validated.recipientChefId,
        initiated_by_chef_id: chefId,
        primary_client_profile_id: clientProfile.id,
        intro_mode: validated.introMode,
        status: 'active',
        intro_message: validated.introMessage || null,
      })
      .select('id')
      .single()

    if (bridgeErr || !bridge) {
      return { success: false, error: `Failed to create bridge: ${bridgeErr?.message}` }
    }

    // 10. Post system message in bridge
    await db.from('hub_messages').insert({
      group_id: bridgeGroup.id,
      author_profile_id: sourceProfile.id,
      message_type: 'system',
      system_event_type: 'bridge_created',
      body: `${sourceChefName} started an introduction between ${targetChefName} and ${validated.clientName}.`,
      system_metadata: {
        bridge_id: bridge.id,
        intro_mode: validated.introMode,
        source_chef_name: sourceChefName,
        target_chef_name: targetChefName,
        client_name: validated.clientName,
      },
    })

    // Post the intro message if provided
    if (validated.introMessage) {
      await db.from('hub_messages').insert({
        group_id: bridgeGroup.id,
        author_profile_id: sourceProfile.id,
        message_type: 'text',
        body: validated.introMessage,
      })

      // Update last message preview on the bridge group
      await db
        .from('hub_groups')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: validated.introMessage.slice(0, 200),
        })
        .eq('id', bridgeGroup.id)
    }

    revalidatePath('/network')
    revalidatePath('/network/bridges')

    return {
      success: true,
      bridgeId: bridge.id,
      bridgeGroupToken: bridgeGroup.group_token,
      targetCircleToken: targetCircle.group_token,
    }
  } catch (err: any) {
    console.error('[createIntroductionBridge] Error:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}

/**
 * Get full detail for a bridge the current chef is involved in.
 */
export async function getIntroductionBridgeForChef(
  bridgeId: string
): Promise<IntroBridgeDetail | null> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  const { data: bridge } = await db
    .from('chef_intro_bridges')
    .select('*')
    .eq('id', bridgeId)
    .single()

  if (!bridge) return null

  // Auth check: must be source or target chef
  if (bridge.source_chef_id !== chefId && bridge.target_chef_id !== chefId) {
    return null
  }

  // Load group, target circle, source circle tokens
  const [groupRes, targetCircleRes, sourceCircleRes] = await Promise.all([
    db.from('hub_groups').select('group_token').eq('id', bridge.hub_group_id).single(),
    bridge.target_circle_group_id
      ? db.from('hub_groups').select('group_token').eq('id', bridge.target_circle_group_id).single()
      : Promise.resolve({ data: null }),
    bridge.source_circle_group_id
      ? db.from('hub_groups').select('group_token').eq('id', bridge.source_circle_group_id).single()
      : Promise.resolve({ data: null }),
  ])

  // Load members with profiles
  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id, role, hub_guest_profiles(display_name, avatar_url)')
    .eq('group_id', bridge.hub_group_id)
    .order('joined_at', { ascending: true })

  // Client display name
  const { data: clientProfile } = await db
    .from('hub_guest_profiles')
    .select('display_name')
    .eq('id', bridge.primary_client_profile_id)
    .single()

  // Current chef's hub profile token
  const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
  const chefHubProfileId = await getChefHubProfileId(chefId)
  let chefProfileToken: string | null = null
  if (chefHubProfileId) {
    const { data: prof } = await db
      .from('hub_guest_profiles')
      .select('profile_token')
      .eq('id', chefHubProfileId)
      .single()
    chefProfileToken = prof?.profile_token ?? null
  }

  return {
    bridge: {
      id: bridge.id,
      hub_group_id: bridge.hub_group_id,
      handoff_id: bridge.handoff_id,
      source_chef_id: bridge.source_chef_id,
      target_chef_id: bridge.target_chef_id,
      intro_mode: bridge.intro_mode,
      status: bridge.status,
      intro_message: bridge.intro_message,
      created_at: bridge.created_at,
      completed_at: bridge.completed_at,
      source_left_at: bridge.source_left_at,
    },
    group_token: groupRes.data?.group_token ?? '',
    target_circle_token: targetCircleRes.data?.group_token ?? null,
    source_circle_token: sourceCircleRes.data?.group_token ?? null,
    client_display_name: clientProfile?.display_name ?? 'Client',
    members: (members ?? []).map((m: any) => ({
      profile_id: m.profile_id,
      display_name: m.hub_guest_profiles?.display_name ?? 'Unknown',
      avatar_url: m.hub_guest_profiles?.avatar_url ?? null,
      role: m.role,
    })),
    chef_profile_token: chefProfileToken,
  }
}

/**
 * Source chef leaves the intro bridge.
 */
export async function leaveIntroductionBridgeAsSource(input: {
  bridgeId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  try {
    const { data: bridge } = await db
      .from('chef_intro_bridges')
      .select('id, source_chef_id, hub_group_id, status')
      .eq('id', input.bridgeId)
      .single()

    if (!bridge) return { success: false, error: 'Bridge not found.' }
    if (bridge.source_chef_id !== chefId) {
      return { success: false, error: 'Only the source chef can leave.' }
    }
    if (bridge.status !== 'active') {
      return { success: false, error: 'Bridge is not active.' }
    }

    // Get source chef's hub profile
    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const profileId = await getChefHubProfileId(chefId)

    if (profileId) {
      // Remove membership
      await db
        .from('hub_group_members')
        .delete()
        .eq('group_id', bridge.hub_group_id)
        .eq('profile_id', profileId)

      // Post system message
      const { data: chef } = await db
        .from('chefs')
        .select('display_name, business_name')
        .eq('id', chefId)
        .single()
      const chefName = chef?.display_name || chef?.business_name || 'Chef'

      await db.from('hub_messages').insert({
        group_id: bridge.hub_group_id,
        author_profile_id: profileId,
        message_type: 'system',
        system_event_type: 'source_left_bridge',
        body: `${chefName} has left the intro thread. Continue your conversation in the Dinner Circle.`,
      })
    }

    // Update bridge status
    await db
      .from('chef_intro_bridges')
      .update({
        status: 'source_left',
        source_left_at: new Date().toISOString(),
      })
      .eq('id', bridge.id)

    revalidatePath('/network')
    return { success: true }
  } catch (err: any) {
    console.error('[leaveIntroductionBridgeAsSource] Error:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}

/**
 * Mark a bridge as completed (either chef can do this).
 */
export async function markIntroductionBridgeComplete(input: {
  bridgeId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.entityId
  const db = createServerClient({ admin: true })

  try {
    const { data: bridge } = await db
      .from('chef_intro_bridges')
      .select('id, source_chef_id, target_chef_id, status')
      .eq('id', input.bridgeId)
      .single()

    if (!bridge) return { success: false, error: 'Bridge not found.' }
    if (bridge.source_chef_id !== chefId && bridge.target_chef_id !== chefId) {
      return { success: false, error: 'Not authorized.' }
    }
    if (bridge.status === 'completed' || bridge.status === 'cancelled') {
      return { success: false, error: 'Bridge already finalized.' }
    }

    await db
      .from('chef_intro_bridges')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', bridge.id)

    revalidatePath('/network')
    return { success: true }
  } catch (err: any) {
    console.error('[markIntroductionBridgeComplete] Error:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}

/**
 * Check if a bridge already exists for a handoff + target chef combo.
 */
export async function getBridgeForHandoff(
  handoffId: string,
  targetChefId: string
): Promise<{ bridgeId: string; groupToken: string } | null> {
  const db = createServerClient({ admin: true })

  const { data: bridge } = await db
    .from('chef_intro_bridges')
    .select('id, hub_group_id')
    .eq('handoff_id', handoffId)
    .eq('target_chef_id', targetChefId)
    .maybeSingle()

  if (!bridge) return null

  const { data: group } = await db
    .from('hub_groups')
    .select('group_token')
    .eq('id', bridge.hub_group_id)
    .single()

  return { bridgeId: bridge.id, groupToken: group?.group_token ?? '' }
}
