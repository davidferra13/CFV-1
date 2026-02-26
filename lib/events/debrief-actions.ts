'use server'

// Post-Event Debrief Actions
// Drives the fill-in-the-blanks capture flow that appears after a dinner.
// Every section saves independently — no one big submit.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logChefActivity } from '@/lib/activity/log-chef'
import { FUN_QA_QUESTIONS, type FunQAAnswers } from '@/lib/clients/fun-qa-constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DebriefRecipeBlank = {
  id: string
  name: string
  category: string
  missingDetailedMethod: boolean
  missingNotes: boolean
  missingTimes: boolean
}

export type DebriefClientBlanks = {
  id: string
  name: string
  missingMilestones: boolean
  missingDietaryInfo: boolean
  missingPreferredName: boolean
  missingVibeNotes: boolean
  missingFunQA: { questionKey: string; questionText: string; emoji: string }[]
  hasAnyBlanks: boolean
}

export type DebriefBlanks = {
  event: {
    id: string
    occasion: string | null
    eventDate: string
    clientId: string | null
    debriefCompletedAt: string | null
    chefOutcomeNotes: string | null
    chefOutcomeRating: number | null
  }
  client: DebriefClientBlanks | null
  recipes: DebriefRecipeBlank[]
  eventPhotoCount: number
}

// ─── getEventDebriefBlanks ────────────────────────────────────────────────────

/**
 * Loads the event + computes what's missing for the debrief flow.
 * Only works for completed events. Returns null if not found or wrong status.
 */
export async function getEventDebriefBlanks(eventId: string): Promise<DebriefBlanks | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      'id, status, client_id, occasion, event_date, debrief_completed_at, chef_outcome_notes, chef_outcome_rating'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) return null
  if (event.status !== 'completed') return null

  // Run client fetch, recipe chain, and photo count in parallel
  const [clientResult, menuResult, photoCountResult] = await Promise.all([
    event.client_id
      ? supabase
          .from('clients')
          .select(
            `
            id, full_name, preferred_name, personal_milestones,
            dietary_restrictions, allergies, dislikes,
            vibe_notes, fun_qa_answers
          `
          )
          .eq('id', event.client_id)
          .eq('tenant_id', user.tenantId!)
          .single()
      : Promise.resolve({ data: null, error: null }),

    supabase.from('menus').select('id').eq('event_id', eventId).eq('tenant_id', user.tenantId!),

    supabase
      .from('event_photos')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at', null),
  ])

  // Resolve client blanks
  const client = clientResult.data
  let clientBlanks: DebriefClientBlanks | null = null
  if (client) {
    const milestones = (client.personal_milestones as any[] | null) ?? []
    const dietaryRestrictions = (client.dietary_restrictions as string[] | null) ?? []
    const allergies = (client.allergies as string[] | null) ?? []
    const currentAnswers = ((client as any).fun_qa_answers as FunQAAnswers) ?? {}

    const missingFunQA = FUN_QA_QUESTIONS.filter((q) => !currentAnswers[q.key]).map((q) => ({
      questionKey: q.key,
      questionText: q.question,
      emoji: q.emoji,
    }))

    const missingMilestones = milestones.length === 0
    const missingDietaryInfo = dietaryRestrictions.length === 0 && allergies.length === 0
    const missingPreferredName = !client.preferred_name
    const missingVibeNotes = !client.vibe_notes

    const hasAnyBlanks =
      missingMilestones ||
      missingDietaryInfo ||
      missingPreferredName ||
      missingVibeNotes ||
      missingFunQA.length > 0

    clientBlanks = {
      id: client.id,
      name: client.full_name,
      missingMilestones,
      missingDietaryInfo,
      missingPreferredName,
      missingVibeNotes,
      missingFunQA,
      hasAnyBlanks,
    }
  }

  // Resolve recipe blanks via menus → dishes → components → recipes
  let recipesBlanks: DebriefRecipeBlank[] = []
  const menus = menuResult.data ?? []
  if (menus.length > 0) {
    const menuIds = menus.map((m: { id: string }) => m.id)

    const { data: dishes } = await supabase
      .from('dishes')
      .select('id')
      .in('menu_id', menuIds)
      .eq('tenant_id', user.tenantId!)

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d: { id: string }) => d.id)

      const { data: components } = await supabase
        .from('components')
        .select('recipe_id')
        .in('dish_id', dishIds)
        .eq('tenant_id', user.tenantId!)
        .not('recipe_id', 'is', null)

      if (components && components.length > 0) {
        const recipeIds = [
          ...new Set(
            components
              .map((c: { recipe_id: string | null }) => c.recipe_id)
              .filter((id): id is string => id !== null)
          ),
        ]

        const { data: recipes } = await supabase
          .from('recipes')
          .select(
            'id, name, category, method_detailed, notes, prep_time_minutes, cook_time_minutes'
          )
          .in('id', recipeIds)
          .eq('tenant_id', user.tenantId!)

        if (recipes) {
          recipesBlanks = recipes
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              category: r.category,
              missingDetailedMethod: !r.method_detailed,
              missingNotes: !r.notes,
              missingTimes: !r.prep_time_minutes && !r.cook_time_minutes,
            }))
            // Only surface recipes with text-field blanks the chef can fill in the debrief.
            // Missing photo is excluded: dish photos go in the gallery section above.
            .filter(
              (r: DebriefRecipeBlank) => r.missingDetailedMethod || r.missingNotes || r.missingTimes
            )
        }
      }
    }
  }

  return {
    event: {
      id: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      clientId: event.client_id,
      debriefCompletedAt: event.debrief_completed_at ?? null,
      chefOutcomeNotes: event.chef_outcome_notes ?? null,
      chefOutcomeRating: event.chef_outcome_rating ?? null,
    },
    client: clientBlanks,
    recipes: recipesBlanks,
    eventPhotoCount: photoCountResult.count ?? 0,
  }
}

// ─── saveClientInsights ───────────────────────────────────────────────────────

/**
 * Chef saves client insights learned during the event.
 * Fun Q&A answers are merged — existing answers are never overwritten.
 */
export async function saveClientInsights(
  eventId: string,
  clientId: string,
  data: {
    personal_milestones?: { type: string; date: string; description: string }[]
    dietary_restrictions?: string[]
    allergies?: string[]
    preferred_name?: string
    vibe_notes?: string
    fun_qa_answers?: Partial<Record<string, string>>
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify the event belongs to this tenant (prevents cross-tenant client writes)
  const { data: event } = await supabase
    .from('events')
    .select('id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event || event.client_id !== clientId) {
    return { success: false, error: 'Event or client not found' }
  }

  const updatePayload: Record<string, unknown> = {}

  if (data.personal_milestones !== undefined) {
    updatePayload.personal_milestones = data.personal_milestones
  }
  if (data.dietary_restrictions !== undefined) {
    updatePayload.dietary_restrictions = data.dietary_restrictions
  }
  if (data.allergies !== undefined) {
    updatePayload.allergies = data.allergies
  }
  if (data.preferred_name !== undefined) {
    updatePayload.preferred_name = data.preferred_name || null
  }
  if (data.vibe_notes !== undefined) {
    updatePayload.vibe_notes = data.vibe_notes || null
  }

  // Merge fun_qa_answers — never obliterate previously set answers
  if (data.fun_qa_answers && Object.keys(data.fun_qa_answers).length > 0) {
    const { data: current } = await supabase
      .from('clients')
      .select('fun_qa_answers')
      .eq('id', clientId)
      .eq('tenant_id', user.tenantId!)
      .single()

    const existing = ((current as any)?.fun_qa_answers ?? {}) as Record<string, string>
    const merged: Record<string, string> = { ...existing }

    for (const [k, v] of Object.entries(data.fun_qa_answers)) {
      if (typeof v === 'string' && v.trim()) merged[k] = v.trim()
    }

    updatePayload.fun_qa_answers = merged
  }

  if (Object.keys(updatePayload).length === 0) {
    return { success: true }
  }

  const { error } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[saveClientInsights] Error:', error)
    return { success: false, error: 'Failed to save client insights' }
  }

  revalidatePath(`/events/${eventId}/debrief`)
  revalidatePath(`/clients/${clientId}`)

  logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'client_updated',
    domain: 'client',
    entityType: 'client',
    entityId: clientId,
    summary: 'Updated client profile from post-event debrief',
    context: { eventId, fields: Object.keys(updatePayload) },
    clientId,
  }).catch(() => {})

  return { success: true }
}

// ─── saveRecipeDebrief ────────────────────────────────────────────────────────

/**
 * Chef adds notes/photo/times to a recipe used at this event.
 * Only updates fields that are provided. Security: verifies the recipe
 * is actually linked to this event before writing.
 */
export async function saveRecipeDebrief(
  eventId: string,
  recipeId: string,
  data: {
    notes?: string
    method_detailed?: string
    prep_time_minutes?: number
    cook_time_minutes?: number
    photo_url?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  // Verify the recipe is actually linked to this event (security check)
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!menus || menus.length === 0) {
    return { success: false, error: 'No menus found for event' }
  }

  const menuIds = menus.map((m: { id: string }) => m.id)

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .in('menu_id', menuIds)
    .eq('tenant_id', user.tenantId!)

  if (!dishes || dishes.length === 0) {
    return { success: false, error: 'Recipe not linked to this event' }
  }

  const dishIds = dishes.map((d: { id: string }) => d.id)

  const { data: linkCheck } = await supabase
    .from('components')
    .select('id')
    .in('dish_id', dishIds)
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .limit(1)
    .maybeSingle()

  if (!linkCheck) {
    return { success: false, error: 'Recipe not linked to this event' }
  }

  // Build update payload — only include provided fields
  const updatePayload: Record<string, unknown> = {}
  if (data.notes !== undefined) updatePayload.notes = data.notes || null
  if (data.method_detailed !== undefined)
    updatePayload.method_detailed = data.method_detailed || null
  if (data.prep_time_minutes !== undefined)
    updatePayload.prep_time_minutes = data.prep_time_minutes || null
  if (data.cook_time_minutes !== undefined)
    updatePayload.cook_time_minutes = data.cook_time_minutes || null
  if (data.photo_url !== undefined) updatePayload.photo_url = data.photo_url || null

  if (Object.keys(updatePayload).length === 0) return { success: true }

  const { error } = await supabase
    .from('recipes')
    .update(updatePayload)
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[saveRecipeDebrief] Error:', error)
    return { success: false, error: 'Failed to save recipe notes' }
  }

  revalidatePath(`/events/${eventId}/debrief`)

  logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'recipe_updated',
    domain: 'recipe',
    entityType: 'recipe',
    entityId: recipeId,
    summary: 'Updated recipe notes from post-event debrief',
    context: { eventId, fields: Object.keys(updatePayload) },
  }).catch(() => {})

  return { success: true }
}

// ─── saveDebriefReflection ────────────────────────────────────────────────────

/**
 * Chef saves their outcome notes and star rating.
 * Autosaves on blur / on star click — called frequently.
 */
export async function saveDebriefReflection(
  eventId: string,
  data: {
    chef_outcome_notes?: string
    chef_outcome_rating?: number
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  if (data.chef_outcome_rating !== undefined) {
    const rating = data.chef_outcome_rating
    if (rating !== null && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      return { success: false, error: 'Rating must be between 1 and 5' }
    }
  }

  const updatePayload: Record<string, unknown> = {}
  if (data.chef_outcome_notes !== undefined) {
    updatePayload.chef_outcome_notes = data.chef_outcome_notes || null
  }
  if (data.chef_outcome_rating !== undefined) {
    updatePayload.chef_outcome_rating = data.chef_outcome_rating
  }

  if (Object.keys(updatePayload).length === 0) return { success: true }

  const { error } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[saveDebriefReflection] Error:', error)
    return { success: false, error: 'Failed to save reflection' }
  }

  revalidatePath(`/events/${eventId}/debrief`)
  return { success: true }
}

// ─── completeDebrief ──────────────────────────────────────────────────────────

/**
 * Marks the debrief as complete. Sets debrief_completed_at = now().
 * Idempotent — safe to call if already completed.
 */
export async function completeDebrief(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, client_id, occasion, debrief_completed_at')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.debrief_completed_at) {
    // Already complete — idempotent
    return { success: true }
  }

  const { error } = await supabase
    .from('events')
    .update({ debrief_completed_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[completeDebrief] Error:', error)
    return { success: false, error: 'Failed to complete debrief' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/debrief`)

  logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'debrief_completed',
    domain: 'operational',
    entityType: 'event',
    entityId: eventId,
    summary: `Completed post-event debrief for ${event.occasion || 'event'}`,
    context: { eventId },
    clientId: event.client_id ?? undefined,
  }).catch(() => {})

  return { success: true }
}

// ─── AI Draft — Reflection Notes ─────────────────────────────────────────────

/**
 * Generate a draft of the chef's outcome/reflection notes using AI.
 * NEVER writes to the database. Returns text for the chef to edit and save.
 * Aligned with AI Policy: draft-only, chef must explicitly save.
 */
export async function generateDebriefDraft(
  eventId: string
): Promise<{ draft: string } | { error: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  if (!process.env.GEMINI_API_KEY) {
    return { error: 'AI not configured' }
  }

  // Fetch context to ground the draft
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      occasion, event_date, guest_count, special_requests,
      client:clients(full_name, vibe_notes),
      menus(
        dishes(course_name, name)
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return { error: 'Event not found' }

  const clientName = (event.client as any)?.full_name ?? 'the client'
  const occasion = event.occasion ?? 'dinner'
  const guestCount = event.guest_count ?? 0
  const date = new Date(event.event_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  // Build a menu summary
  const dishes = (event.menus as unknown as any[])?.[0]?.dishes ?? []
  const menuLines = dishes
    .slice(0, 8)
    .map((d: { course_name: string; name: string }) => `${d.course_name}: ${d.name}`)
    .join(', ')

  const prompt = `You are helping a private chef write private reflection notes after a dinner service. Write 2-3 sentences in the first person, casual and honest, as if jotting a quick note to yourself right after the event. Focus on the experience — what went well, what to remember next time.

Event details:
- Client: ${clientName}
- Occasion: ${occasion}
- Date: ${date}
- Guests: ${guestCount}
${menuLines ? `- Menu: ${menuLines}` : ''}

Write only the reflection notes. No greeting, no sign-off, no quotes. Just the notes.`

  try {
    const { GoogleGenAI } = await import('@google/genai')
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })
    const text = (response.text ?? '') as string
    return { draft: text.trim() }
  } catch (err) {
    console.error('[debrief] generateDebriefDraft error:', err)
    return { error: 'Failed to generate draft' }
  }
}
