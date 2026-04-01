'use server'

// Chef Opportunity Network - Server Actions
// Handles creating opportunity posts, expressing interest, and managing responses.
// Opportunity posts are a special post_type on chef_social_posts with a linked
// chef_opportunity_posts record for structured fields.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// TYPES
// ============================================================

export type OpportunityDetail = {
  id: string
  post_id: string
  chef_id: string
  role_title: string
  location_city: string | null
  location_state: string | null
  compensation_type: 'hourly' | 'salary' | 'day_rate' | 'negotiable'
  compensation_low_cents: number | null
  compensation_high_cents: number | null
  duration_type: 'permanent' | 'seasonal' | 'per_event' | 'contract'
  status: 'open' | 'filled' | 'closed'
  interest_count: number
  my_interest_id: string | null
  my_interest_status: string | null
  created_at: string
}

export type OpportunityInterest = {
  id: string
  opportunity_id: string
  chef_id: string
  message: string | null
  status: 'expressed' | 'viewed' | 'connected' | 'declined'
  created_at: string
  chef_display_name: string | null
  chef_business_name: string
  chef_profile_image_url: string | null
  chef_city: string | null
  chef_state: string | null
}

// ============================================================
// SCHEMAS
// ============================================================

const CreateOpportunityPostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  role_title: z.string().trim().min(1).max(200),
  location_city: z.string().trim().max(100).nullable().optional(),
  location_state: z.string().trim().max(2).nullable().optional(),
  compensation_type: z.enum(['hourly', 'salary', 'day_rate', 'negotiable']).default('negotiable'),
  compensation_low_cents: z.number().int().min(0).nullable().optional(),
  compensation_high_cents: z.number().int().min(0).nullable().optional(),
  duration_type: z.enum(['permanent', 'seasonal', 'per_event', 'contract']).default('permanent'),
  visibility: z.enum(['public', 'followers', 'connections', 'private']).default('public'),
  channel_id: z.string().uuid().nullable().optional(),
  media_urls: z.array(z.string()).max(10).default([]),
  media_types: z
    .array(z.enum(['image', 'video']))
    .max(10)
    .default([]),
})

const ExpressInterestSchema = z.object({
  opportunityId: z.string().uuid(),
  message: z.string().trim().max(1000).nullable().optional(),
})

const UpdateInterestStatusSchema = z.object({
  interestId: z.string().uuid(),
  status: z.enum(['viewed', 'connected', 'declined']),
})

const CloseOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  status: z.enum(['filled', 'closed']),
})

// ============================================================
// HELPERS
// ============================================================

function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_]{1,50})/g) || []
  return Array.from(new Set(matches.map((tag) => tag.slice(1).toLowerCase())))
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a structured opportunity post atomically.
 * Both the social post and opportunity detail are inserted in a transaction.
 */
export async function createOpportunityPost(
  input: z.infer<typeof CreateOpportunityPostSchema>
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const user = await requireChef()
  const validated = CreateOpportunityPostSchema.parse(input)

  // Validate compensation range
  if (
    validated.compensation_low_cents != null &&
    validated.compensation_high_cents != null &&
    validated.compensation_low_cents > validated.compensation_high_cents
  ) {
    return { success: false, error: 'Minimum compensation cannot exceed maximum.' }
  }

  const hashtags = extractHashtags(validated.content)

  try {
    // Use a raw SQL transaction so both inserts are atomic
    const result = await pgClient.begin(async (txSql: any) => {
      // Insert the social post
      const rows = await txSql`
        INSERT INTO chef_social_posts (
          chef_id, content, media_urls, media_types, post_type,
          visibility, channel_id, hashtags, location_tag
        ) VALUES (
          ${user.entityId},
          ${validated.content},
          ${txSql.array(validated.media_urls as string[])},
          ${txSql.array(validated.media_types as string[])},
          'opportunity',
          ${validated.visibility},
          ${validated.channel_id ?? null},
          ${txSql.array(hashtags as string[])},
          ${null}
        )
        RETURNING id, created_at
      `
      const post = rows[0]

      // Insert the structured opportunity detail
      await txSql`
        INSERT INTO chef_opportunity_posts (
          post_id, chef_id, role_title, location_city, location_state,
          compensation_type, compensation_low_cents, compensation_high_cents,
          duration_type, status
        ) VALUES (
          ${post.id},
          ${user.entityId},
          ${validated.role_title},
          ${validated.location_city ?? null},
          ${validated.location_state ?? null},
          ${validated.compensation_type},
          ${validated.compensation_low_cents ?? null},
          ${validated.compensation_high_cents ?? null},
          ${validated.duration_type},
          'open'
        )
      `

      return post
    })

    revalidatePath('/network')
    revalidatePath('/network/feed')
    return { success: true, postId: (result as any).id }
  } catch (err: any) {
    console.error('[createOpportunityPost]', err)
    return { success: false, error: err.message ?? 'Failed to create opportunity post' }
  }
}

/**
 * Express interest in an opportunity.
 * Chef cannot express interest in their own opportunity.
 * Duplicate interests are rejected with a friendly message.
 */
export async function expressInterest(
  input: z.infer<typeof ExpressInterestSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = ExpressInterestSchema.parse(input)
  const db = createServerClient({ admin: true })

  // Load the opportunity
  const { data: opp, error: oppErr } = await db
    .from('chef_opportunity_posts')
    .select('id, chef_id, status')
    .eq('id', validated.opportunityId)
    .single()

  if (oppErr || !opp) return { success: false, error: 'Opportunity not found.' }
  if ((opp as any).chef_id === user.entityId)
    return { success: false, error: 'You cannot express interest in your own opportunity.' }
  if ((opp as any).status !== 'open')
    return { success: false, error: 'This opportunity is no longer accepting interest.' }

  // Insert interest (UNIQUE constraint prevents duplicates)
  try {
    await db.from('chef_opportunity_interests').insert({
      opportunity_id: validated.opportunityId,
      chef_id: user.entityId,
      message: validated.message ?? null,
      status: 'expressed',
    })
  } catch (err: any) {
    if (
      err?.message?.includes('duplicate') ||
      err?.message?.includes('unique') ||
      err?.code === '23505'
    ) {
      return { success: false, error: "You've already expressed interest in this opportunity." }
    }
    console.error('[expressInterest]', err)
    return { success: false, error: 'Failed to express interest.' }
  }

  // Notify the posting chef (non-blocking side effect)
  try {
    await db.from('chef_social_notifications').insert({
      chef_id: (opp as any).chef_id,
      actor_chef_id: user.entityId,
      notification_type: 'opportunity_interest',
      entity_type: 'opportunity',
      entity_id: validated.opportunityId,
    })
  } catch (notifErr) {
    console.error('[expressInterest] notification failed (non-blocking)', notifErr)
  }

  revalidatePath('/network')
  return { success: true }
}

/**
 * Update the status of an interest (posting chef only).
 * viewed -> connected -> declined
 */
export async function updateInterestStatus(
  input: z.infer<typeof UpdateInterestStatusSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = UpdateInterestStatusSchema.parse(input)
  const db = createServerClient({ admin: true })

  // Load the interest with its opportunity to verify ownership
  const { data: interest, error } = await db
    .from('chef_opportunity_interests')
    .select('id, opportunity_id, chef_id, chef_opportunity_posts!inner(chef_id)')
    .eq('id', validated.interestId)
    .single()

  if (error || !interest) return { success: false, error: 'Interest not found.' }

  const oppChefId = (interest as any).chef_opportunity_posts?.chef_id
  if (oppChefId !== user.entityId)
    return { success: false, error: 'Only the posting chef can update interest status.' }

  const { error: updateErr } = await db
    .from('chef_opportunity_interests')
    .update({ status: validated.status })
    .eq('id', validated.interestId)

  if (updateErr) {
    console.error('[updateInterestStatus]', updateErr)
    return { success: false, error: 'Failed to update status.' }
  }

  revalidatePath('/network')
  return { success: true }
}

/**
 * Close or mark an opportunity as filled (posting chef only).
 */
export async function closeOpportunity(
  input: z.infer<typeof CloseOpportunitySchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = CloseOpportunitySchema.parse(input)
  const db = createServerClient({ admin: true })

  const { data: opp, error: fetchErr } = await db
    .from('chef_opportunity_posts')
    .select('id, chef_id')
    .eq('id', validated.opportunityId)
    .single()

  if (fetchErr || !opp) return { success: false, error: 'Opportunity not found.' }
  if ((opp as any).chef_id !== user.entityId)
    return { success: false, error: 'Only the posting chef can close this opportunity.' }

  const { error: updateErr } = await db
    .from('chef_opportunity_posts')
    .update({ status: validated.status, updated_at: new Date().toISOString() })
    .eq('id', validated.opportunityId)

  if (updateErr) {
    console.error('[closeOpportunity]', updateErr)
    return { success: false, error: 'Failed to close opportunity.' }
  }

  revalidatePath('/network')
  return { success: true }
}

// ============================================================
// QUERIES
// ============================================================

/**
 * Get all interests for one of your opportunities.
 * Only the posting chef can call this.
 */
export async function getOpportunityInterests(
  opportunityId: string
): Promise<OpportunityInterest[]> {
  z.string().uuid().parse(opportunityId)
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  // Verify ownership
  const { data: opp } = await db
    .from('chef_opportunity_posts')
    .select('chef_id')
    .eq('id', opportunityId)
    .single()
  if (!opp || (opp as any).chef_id !== user.entityId) return []

  const { data: interests } = await db
    .from('chef_opportunity_interests')
    .select('id, opportunity_id, chef_id, message, status, created_at')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: true })

  if (!interests?.length) return []

  const chefIds = (interests as any[]).map((i) => i.chef_id)
  const { data: chefs } = await db
    .from('chefs')
    .select(
      `id, display_name, business_name, profile_image_url,
       chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)`
    )
    .in('id', chefIds)

  const chefMap = new Map<string, any>()
  for (const chef of (chefs || []) as any[]) chefMap.set(chef.id, chef)

  return (interests as any[]).map((interest) => {
    const chef = chefMap.get(interest.chef_id)
    const prefs = Array.isArray(chef?.chef_preferences)
      ? chef.chef_preferences[0]
      : chef?.chef_preferences
    return {
      id: interest.id,
      opportunity_id: interest.opportunity_id,
      chef_id: interest.chef_id,
      message: interest.message ?? null,
      status: interest.status,
      created_at: interest.created_at,
      chef_display_name: chef?.display_name ?? null,
      chef_business_name: chef?.business_name ?? 'Unknown',
      chef_profile_image_url: chef?.profile_image_url ?? null,
      chef_city: prefs?.home_city ?? null,
      chef_state: prefs?.home_state ?? null,
    } satisfies OpportunityInterest
  })
}

/**
 * Get the opportunity detail for a post.
 * Returns null if the post is not an opportunity.
 * Includes viewer-context fields (interest count visible to posting chef,
 * my_interest_id for other chefs).
 */
export async function getOpportunityDetail(
  postId: string,
  viewerChefId: string
): Promise<OpportunityDetail | null> {
  z.string().uuid().parse(postId)
  const db = createServerClient({ admin: true })

  const { data: opp } = await db
    .from('chef_opportunity_posts')
    .select('*')
    .eq('post_id', postId)
    .maybeSingle()

  if (!opp) return null

  const oppId = (opp as any).id
  const isOwner = (opp as any).chef_id === viewerChefId

  let interest_count = 0
  let my_interest_id: string | null = null
  let my_interest_status: string | null = null

  if (isOwner) {
    // Posting chef sees total count
    const { data: interests } = await db
      .from('chef_opportunity_interests')
      .select('id')
      .eq('opportunity_id', oppId)
    interest_count = (interests ?? []).length
  } else {
    // Other chefs see their own interest (if any)
    const { data: myInterest } = await db
      .from('chef_opportunity_interests')
      .select('id, status')
      .eq('opportunity_id', oppId)
      .eq('chef_id', viewerChefId)
      .maybeSingle()
    if (myInterest) {
      my_interest_id = (myInterest as any).id
      my_interest_status = (myInterest as any).status
    }
  }

  return {
    id: (opp as any).id,
    post_id: (opp as any).post_id,
    chef_id: (opp as any).chef_id,
    role_title: (opp as any).role_title,
    location_city: (opp as any).location_city ?? null,
    location_state: (opp as any).location_state ?? null,
    compensation_type: (opp as any).compensation_type,
    compensation_low_cents: (opp as any).compensation_low_cents ?? null,
    compensation_high_cents: (opp as any).compensation_high_cents ?? null,
    duration_type: (opp as any).duration_type,
    status: (opp as any).status,
    interest_count,
    my_interest_id,
    my_interest_status,
    created_at: (opp as any).created_at,
  }
}

/**
 * Get opportunity posts feed, optionally filtered by state and status.
 * Returns public opportunity posts, most recent first.
 */
export async function getOpportunityFeed(filters?: {
  state?: string
  status?: 'open' | 'filled' | 'closed'
}): Promise<Array<{ postId: string; opportunity: OpportunityDetail }>> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  let query = db
    .from('chef_opportunity_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  } else {
    query = query.eq('status', 'open')
  }

  if (filters?.state) {
    query = query.eq('location_state', filters.state)
  }

  const { data: opps } = await query
  if (!opps?.length) return []

  return (opps as any[]).map((opp) => ({
    postId: opp.post_id,
    opportunity: {
      id: opp.id,
      post_id: opp.post_id,
      chef_id: opp.chef_id,
      role_title: opp.role_title,
      location_city: opp.location_city ?? null,
      location_state: opp.location_state ?? null,
      compensation_type: opp.compensation_type,
      compensation_low_cents: opp.compensation_low_cents ?? null,
      compensation_high_cents: opp.compensation_high_cents ?? null,
      duration_type: opp.duration_type,
      status: opp.status,
      interest_count: 0,
      my_interest_id: null,
      my_interest_status: null,
      created_at: opp.created_at,
    } satisfies OpportunityDetail,
  }))
}
