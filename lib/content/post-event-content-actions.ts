'use server'

// Post-Event Content Pipeline Actions
// Generates AI-drafted social content from completed events.
// AI drafts only; chef edits and approves everything before external posting.
// Uses Ollama (private data: client details, event info, menus).

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

// ── Types ──────────────────────────────────────────────────────────────────

export type ContentPlatform = 'instagram' | 'story' | 'blog'

export type ContentDraft = {
  id: string
  event_id: string
  tenant_id: string
  platform: ContentPlatform
  draft_text: string
  status: 'draft' | 'approved' | 'posted'
  photo_ids: string[]
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export type ContentReadyEvent = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number
  photo_count: number
  client_name: string
  has_nda: boolean
  photo_permission: string | null
  draft_count: number
}

// ── Schemas ────────────────────────────────────────────────────────────────

const DraftTextSchema = z.object({
  draft: z.string().min(1).max(2200),
})

const SaveDraftSchema = z.object({
  eventId: z.string().uuid(),
  platform: z.enum(['instagram', 'story', 'blog']),
  draftText: z.string().min(1).max(5000),
  photoIds: z.array(z.string().uuid()).optional(),
  aiGenerated: z.boolean().optional(),
})

// ── getContentReadyEvents ──────────────────────────────────────────────────

/**
 * Lists completed events that have photos, suitable for content creation.
 * Includes NDA/privacy flags so the UI can warn before generating content.
 */
export async function getContentReadyEvents(): Promise<ContentReadyEvent[]> {
  const user = await requireChef()
  await requirePro('marketing')
  const supabase: any = createServerClient()

  // Fetch completed events (not demo)
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, guest_count, client_id,
      clients!inner(first_name, last_name, nda_active, photo_permission),
      is_demo
    `)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .eq('is_demo', false)
    .is('deleted_at', null)
    .order('event_date', { ascending: false })
    .limit(30)

  if (error || !events?.length) {
    if (error) console.error('[getContentReadyEvents] Error:', error)
    return []
  }

  const eventIds = events.map((e: any) => e.id)

  // Get photo counts per event
  const { data: photoRows } = await supabase
    .from('event_photos')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  const photoCountMap: Record<string, number> = {}
  for (const row of photoRows ?? []) {
    photoCountMap[row.event_id] = (photoCountMap[row.event_id] ?? 0) + 1
  }

  // Get existing draft counts per event
  const { data: draftRows } = await supabase
    .from('event_content_drafts')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('tenant_id', user.tenantId!)

  const draftCountMap: Record<string, number> = {}
  for (const row of draftRows ?? []) {
    draftCountMap[row.event_id] = (draftCountMap[row.event_id] ?? 0) + 1
  }

  // Only return events that have at least 1 photo
  return events
    .filter((e: any) => (photoCountMap[e.id] ?? 0) > 0)
    .map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      event_date: e.event_date,
      guest_count: e.guest_count,
      photo_count: photoCountMap[e.id] ?? 0,
      client_name: e.clients
        ? `${e.clients.first_name ?? ''} ${e.clients.last_name ?? ''}`.trim()
        : 'Unknown',
      has_nda: e.clients?.nda_active === true,
      photo_permission: e.clients?.photo_permission ?? 'none',
      draft_count: draftCountMap[e.id] ?? 0,
    }))
}

// ── generateContentDraft ───────────────────────────────────────────────────

/**
 * Uses Ollama to generate a content draft for a completed event.
 * Checks NDA/privacy restrictions before including client details.
 * Throws OllamaOfflineError if Ollama is not running.
 */
export async function generateContentDraft(
  eventId: string,
  platform: ContentPlatform
): Promise<
  { success: true; draft: string; aiGenerated: true } | { success: false; error: string }
> {
  const user = await requireChef()
  await requirePro('marketing')
  const supabase: any = createServerClient()

  // Fetch event + client privacy info
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, guest_count, service_style, location_city,
      special_requests, course_count, client_id, status,
      clients(first_name, nda_active, nda_coverage, photo_permission)
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.status !== 'completed') {
    return { success: false, error: 'Only completed events can generate content' }
  }

  // Check NDA / privacy restrictions
  const clientHasNda = event.clients?.nda_active === true
  const photoPermission = event.clients?.photo_permission ?? 'none'
  const isRestricted = clientHasNda || photoPermission === 'none'

  // Fetch menu highlights if available
  let menuInfo: string | null = null
  const { data: menu } = await supabase
    .from('menus')
    .select('name, cuisine_type')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (menu) {
    menuInfo = [menu.name, menu.cuisine_type].filter(Boolean).join(' - ')
  }

  // Build context for the AI (anonymize if restricted)
  const contextParts: string[] = []

  if (event.occasion && !isRestricted) {
    contextParts.push(`Occasion: ${event.occasion}`)
  } else if (event.occasion) {
    contextParts.push('Occasion: private event')
  }

  contextParts.push(`Date: ${event.event_date}`)

  // Anonymize guest count to a range for privacy
  const guestRange = event.guest_count <= 10
    ? 'an intimate gathering'
    : event.guest_count <= 30
      ? 'a mid-size event'
      : 'a large celebration'
  contextParts.push(`Scale: ${guestRange}`)

  if (event.service_style) contextParts.push(`Style: ${event.service_style}`)
  if (event.location_city && !isRestricted) contextParts.push(`City: ${event.location_city}`)
  if (menuInfo) contextParts.push(`Menu: ${menuInfo}`)
  if (event.course_count) contextParts.push(`Courses: ${event.course_count}`)

  const eventContext = contextParts.join('\n')

  // Platform-specific instructions
  const platformInstructions: Record<ContentPlatform, string> = {
    instagram:
      'Write an Instagram caption. Keep it 2-4 sentences. No hashtags (chef adds their own). Warm, genuine, first-person voice.',
    story:
      'Write a short Instagram Story overlay text. 1-2 punchy sentences max. Casual and engaging. Think captions over a photo.',
    blog:
      'Write a short blog-style paragraph (4-6 sentences). More detailed and reflective. First person, professional but personable.',
  }

  const privacyNote = isRestricted
    ? 'IMPORTANT: This client has privacy restrictions (NDA or no photo permission). Do NOT mention the client name, specific location, or any identifying details. Keep the content focused on the food, the craft, and the general experience.'
    : 'Do not mention the client by name for privacy. Focus on the food, the moment, or the craft.'

  const systemPrompt = [
    'You are a private chef writing social media content about a recent event you cooked for.',
    platformInstructions[platform],
    privacyNote,
    'RULES:',
    '- Write from first person',
    '- Do NOT use em dashes (the long dash character). Use commas, periods, or separate sentences instead.',
    '- Do NOT sound like AI',
    '- Be warm, genuine, and proud of your work',
    '- No hashtags',
    '- Return JSON: { "draft": "your text here" }',
  ].join('\n')

  const userContent = `Write content for this event:\n${eventContext}`

  try {
    const result = await parseWithOllama(systemPrompt, userContent, DraftTextSchema, {
      modelTier: 'fast',
      maxTokens: platform === 'blog' ? 512 : 256,
      timeoutMs: 20000,
    })

    return { success: true, draft: result.draft, aiGenerated: true }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      throw err // Let the UI handle this with "Start Ollama" message
    }
    console.error('[generateContentDraft] AI error:', err)
    return { success: false, error: 'Failed to generate draft. Please try again.' }
  }
}

// ── saveContentDraft ───────────────────────────────────────────────────────

/**
 * Saves a content draft (either AI-generated or manually written by the chef).
 */
export async function saveContentDraft(input: {
  eventId: string
  platform: ContentPlatform
  draftText: string
  photoIds?: string[]
  aiGenerated?: boolean
}): Promise<{ success: true; draft: ContentDraft } | { success: false; error: string }> {
  const user = await requireChef()
  await requirePro('marketing')
  const supabase: any = createServerClient()

  const parsed = SaveDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const { eventId, platform, draftText, photoIds, aiGenerated } = parsed.data

  // Verify event belongs to this tenant and is completed
  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  if (event.status !== 'completed') {
    return { success: false, error: 'Only completed events can have content drafts' }
  }

  const { data: draft, error } = await supabase
    .from('event_content_drafts')
    .insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      platform,
      draft_text: draftText,
      status: 'draft',
      photo_ids: photoIds ?? [],
      ai_generated: aiGenerated ?? false,
    })
    .select()
    .single()

  if (error || !draft) {
    console.error('[saveContentDraft] Error:', error)
    return { success: false, error: 'Failed to save draft' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/content')

  return { success: true, draft }
}

// ── updateContentDraft ─────────────────────────────────────────────────────

/**
 * Updates the text of an existing draft (chef editing).
 */
export async function updateContentDraft(
  draftId: string,
  draftText: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  await requirePro('marketing')
  const supabase: any = createServerClient()

  const { data: draft, error } = await supabase
    .from('event_content_drafts')
    .update({ draft_text: draftText })
    .eq('id', draftId)
    .eq('tenant_id', user.tenantId!)
    .select('event_id')
    .single()

  if (error || !draft) {
    console.error('[updateContentDraft] Error:', error)
    return { success: false, error: 'Failed to update draft' }
  }

  revalidatePath(`/events/${draft.event_id}`)
  revalidatePath('/content')
  return { success: true }
}

// ── updateDraftStatus ──────────────────────────────────────────────────────

/**
 * Updates draft status: draft -> approved -> posted.
 * "posted" means the chef has manually posted externally (we never auto-post).
 */
export async function updateDraftStatus(
  draftId: string,
  status: 'draft' | 'approved' | 'posted'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  await requirePro('marketing')
  const supabase: any = createServerClient()

  const { data: draft, error } = await supabase
    .from('event_content_drafts')
    .update({ status })
    .eq('id', draftId)
    .eq('tenant_id', user.tenantId!)
    .select('event_id')
    .single()

  if (error || !draft) {
    console.error('[updateDraftStatus] Error:', error)
    return { success: false, error: 'Failed to update status' }
  }

  revalidatePath(`/events/${draft.event_id}`)
  revalidatePath('/content')
  return { success: true }
}

// ── getEventContentDrafts ──────────────────────────────────────────────────

/**
 * Get all content drafts for a specific event.
 */
export async function getEventContentDrafts(eventId: string): Promise<ContentDraft[]> {
  const user = await requireChef()
  await requirePro('marketing')
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_content_drafts')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getEventContentDrafts] Error:', error)
    return []
  }

  return data ?? []
}

// ── deleteContentDraft ─────────────────────────────────────────────────────

/**
 * Permanently deletes a content draft.
 */
export async function deleteContentDraft(
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  await requirePro('marketing')
  const supabase: any = createServerClient()

  const { data: draft, error: fetchError } = await supabase
    .from('event_content_drafts')
    .select('event_id')
    .eq('id', draftId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !draft) {
    return { success: false, error: 'Draft not found' }
  }

  const { error } = await supabase
    .from('event_content_drafts')
    .delete()
    .eq('id', draftId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteContentDraft] Error:', error)
    return { success: false, error: 'Failed to delete draft' }
  }

  revalidatePath(`/events/${draft.event_id}`)
  revalidatePath('/content')
  return { success: true }
}
