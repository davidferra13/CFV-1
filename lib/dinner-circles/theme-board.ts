'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireClient, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function getCallerProfile(db: any, userId: string, entityId: string): Promise<string> {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .or(`auth_user_id.eq.${userId},client_id.eq.${entityId}`)
    .maybeSingle()
  if (!profile) throw new Error('Hub profile not found')
  return profile.id as string
}

async function assertMembership(
  db: any,
  circleId: string,
  profileId: string
): Promise<{ role: string }> {
  const { data: member } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', circleId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (!member) throw new Error('You are not a member of this circle')
  return member as { role: string }
}

async function getCircleTenantId(db: any, circleId: string): Promise<string> {
  const { data: circle } = await db
    .from('hub_groups')
    .select('tenant_id')
    .eq('id', circleId)
    .maybeSingle()
  if (!circle) throw new Error('Circle not found')
  if (!circle.tenant_id) throw new Error('Circle missing tenant context')
  return circle.tenant_id as string
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ColorEntrySchema = z.object({
  hex: z.string().max(7),
  label: z.string().max(100).optional(),
})

const DecorIdeaSchema = z.object({
  idea: z.string().max(500),
  imageUrl: z.string().url().optional(),
  source: z.string().max(200).optional(),
})

const UpsertThemeBoardSchema = z.object({
  circleId: z.string().uuid(),
  moodDescription: z.string().max(1000).optional(),
  colorPalette: z.array(ColorEntrySchema).max(8).optional(),
  decorIdeas: z.array(DecorIdeaSchema).max(20).optional(),
  playlistNotes: z.string().max(1000).optional(),
  playlistUrl: z.string().url().optional().or(z.literal('')),
  atmosphereNotes: z.string().max(1000).optional(),
  menuAestheticNotes: z.string().max(1000).optional(),
})

const AddContributionSchema = z.object({
  circleId: z.string().uuid(),
  contributionType: z.enum(['color', 'decor', 'mood', 'playlist', 'atmosphere']),
  content: z.string().min(1).max(500),
  imageUrl: z.string().url().optional(),
})

const UpdateChefVisibilitySchema = z.object({
  circleId: z.string().uuid(),
  chefVisibility: z.enum(['full', 'summary', 'none']),
})

const GetThemeBoardSchema = z.object({
  circleId: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Upsert the theme board for a circle.
 * Members can contribute (with can_post). Hosts can edit all fields.
 */
export async function upsertThemeBoard(input: z.infer<typeof UpsertThemeBoardSchema>) {
  const user = await requireClient()
  const validated = UpsertThemeBoardSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: memberRow } = await db
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.circleId)
    .eq('profile_id', profileId)
    .maybeSingle()

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost && !memberRow?.can_post) {
    throw new Error('You do not have permission to edit the theme board')
  }

  // Check for existing board
  const { data: existing } = await db
    .from('dinner_circle_theme_boards')
    .select('id')
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const payload: Record<string, unknown> = {
    circle_id: validated.circleId,
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
  }

  if (validated.moodDescription !== undefined) payload.mood_description = validated.moodDescription
  if (validated.colorPalette !== undefined) payload.color_palette = validated.colorPalette
  if (validated.decorIdeas !== undefined) payload.decor_ideas = validated.decorIdeas
  if (validated.playlistNotes !== undefined) payload.playlist_notes = validated.playlistNotes
  if (validated.playlistUrl !== undefined) payload.playlist_url = validated.playlistUrl || null
  if (validated.atmosphereNotes !== undefined) payload.atmosphere_notes = validated.atmosphereNotes
  if (validated.menuAestheticNotes !== undefined)
    payload.menu_aesthetic_notes = validated.menuAestheticNotes

  if (existing) {
    const { error } = await db
      .from('dinner_circle_theme_boards')
      .update(payload)
      .eq('id', existing.id)
      .eq('circle_id', validated.circleId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(`Failed to update theme board: ${error.message}`)
  } else {
    const { error } = await db.from('dinner_circle_theme_boards').insert(payload)
    if (error) throw new Error(`Failed to create theme board: ${error.message}`)
  }

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Add a member contribution to the theme board (appends to contributions JSONB array). */
export async function addContribution(input: z.infer<typeof AddContributionSchema>) {
  const user = await requireClient()
  const validated = AddContributionSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  // Get existing board (or create shell first)
  const { data: board } = await db
    .from('dinner_circle_theme_boards')
    .select('id, contributions')
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const contribution = {
    id: crypto.randomUUID(),
    contributor_id: profileId,
    type: validated.contributionType,
    content: validated.content,
    image_url: validated.imageUrl ?? null,
    created_at: new Date().toISOString(),
  }

  if (board) {
    const existing: unknown[] = Array.isArray(board.contributions) ? board.contributions : []
    const updated = [...existing, contribution]

    const { error } = await db
      .from('dinner_circle_theme_boards')
      .update({ contributions: updated, updated_at: new Date().toISOString() })
      .eq('id', board.id)
      .eq('circle_id', validated.circleId)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(`Failed to add contribution: ${error.message}`)
  } else {
    // Create board with just this contribution
    const { error } = await db.from('dinner_circle_theme_boards').insert({
      circle_id: validated.circleId,
      tenant_id: tenantId,
      contributions: [contribution],
    })
    if (error) throw new Error(`Failed to create board with contribution: ${error.message}`)
  }

  revalidatePath(`/my-hub/g`)
  return { success: true, contributionId: contribution.id }
}

/** Chef sets their visibility preference for this circle's theme board. */
export async function updateChefVisibility(input: z.infer<typeof UpdateChefVisibilitySchema>) {
  const user = await requireChef()
  const validated = UpdateChefVisibilitySchema.parse(input)
  const db: any = createServerClient()

  // Verify chef owns the circle
  const tenantId = await getCircleTenantId(db, validated.circleId)
  if (user.tenantId !== tenantId) throw new Error('Unauthorized')

  const { data: board } = await db
    .from('dinner_circle_theme_boards')
    .select('id')
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (board) {
    const { error } = await db
      .from('dinner_circle_theme_boards')
      .update({
        chef_visibility: validated.chefVisibility,
        last_chef_review_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', board.id)
      .eq('circle_id', validated.circleId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(`Failed to update visibility: ${error.message}`)
  } else {
    const { error } = await db.from('dinner_circle_theme_boards').insert({
      circle_id: validated.circleId,
      tenant_id: tenantId,
      chef_visibility: validated.chefVisibility,
      last_chef_review_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Failed to set visibility: ${error.message}`)
  }

  revalidatePath(`/circles`)
  return { success: true }
}

/** Get the theme board for a circle. Respects chef_visibility for chef callers. */
export async function getThemeBoard(input: z.infer<typeof GetThemeBoardSchema>) {
  // Dual-role: try client first, then chef
  let isChef = false
  let tenantId: string | null = null

  const db: any = createServerClient()

  try {
    const user = await requireClient()
    const profileId = await getCallerProfile(db, user.id, user.entityId)
    await assertMembership(db, input.circleId, profileId)
    tenantId = await getCircleTenantId(db, input.circleId)
  } catch {
    // Try chef path
    try {
      const chefUser = await requireChef()
      tenantId = await getCircleTenantId(db, input.circleId)
      if (chefUser.tenantId !== tenantId) throw new Error('Unauthorized')
      isChef = true
    } catch {
      throw new Error('Unauthorized')
    }
  }

  const validated = GetThemeBoardSchema.parse(input)

  const { data: board, error } = await db
    .from('dinner_circle_theme_boards')
    .select('*')
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId!)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch theme board: ${error.message}`)
  if (!board) return { success: true, board: null }

  // Apply chef visibility filter when a chef is viewing
  if (isChef) {
    const visibility = board.chef_visibility ?? 'summary'

    if (visibility === 'none') {
      return { success: true, board: { chef_visibility: 'none', circle_id: board.circle_id } }
    }

    if (visibility === 'summary') {
      return {
        success: true,
        board: {
          circle_id: board.circle_id,
          chef_visibility: board.chef_visibility,
          mood_description: board.mood_description,
          menu_aesthetic_notes: board.menu_aesthetic_notes,
          color_palette: board.color_palette,
          last_chef_review_at: board.last_chef_review_at,
        },
      }
    }
  }

  return { success: true, board }
}
