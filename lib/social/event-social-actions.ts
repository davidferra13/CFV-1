'use server'

// Event-to-Social Pipeline Actions
// Creates social_posts entries linked to completed events.
// Caption generation uses Ollama (private data: client names, event details).
// Falls back to a simple template if Ollama is offline.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import type { SocialPlatform } from './types'

// ─── Input Schemas ──────────────────────────────────────────────────────────

const CreatePostFromEventSchema = z.object({
  eventId: z.string().uuid(),
  photoIds: z.array(z.string().uuid()),
  caption: z.string().min(1).max(2200),
  platforms: z
    .array(
      z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'x', 'pinterest', 'youtube_shorts'])
    )
    .min(1),
})

// ─── Types ──────────────────────────────────────────────────────────────────

export type UnpostedEvent = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number
  client_name: string
  photo_count: number
  location_city: string
}

export type EventSocialPost = {
  id: string
  event_id: string | null
  title: string
  caption_master: string
  platforms: SocialPlatform[]
  published_to_platforms: SocialPlatform[]
  status: string
  created_at: string
  schedule_at: string
}

// ─── createPostFromEvent ────────────────────────────────────────────────────

export async function createPostFromEvent(input: {
  eventId: string
  photoIds: string[]
  caption: string
  platforms: string[]
}): Promise<{ success: true; postId: string } | { success: false; error: string }> {
  const user = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const parsed = CreatePostFromEventSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const { eventId, photoIds, caption, platforms } = parsed.data

  // Verify event belongs to this tenant
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, occasion, event_date, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  // Generate a unique post code
  const now = new Date()
  const weekNum = Math.ceil(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
  )
  const postCode = `EVT-${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`

  // Insert the social post
  const { data: post, error: insertError } = await db
    .from('social_posts')
    .insert({
      tenant_id: user.tenantId!,
      created_by: user.id,
      event_id: eventId,
      post_code: postCode,
      target_year: now.getFullYear(),
      week_number: weekNum,
      slot_number: 0,
      schedule_at: now.toISOString(),
      pillar: 'social_proof' as const,
      status: 'draft' as const,
      media_type: photoIds.length > 1 ? 'carousel' : photoIds.length === 1 ? 'image' : 'text',
      title: event.occasion ? `${event.occasion} recap` : 'Event recap',
      caption_master: caption,
      platforms: platforms as SocialPlatform[],
    })
    .select('id')
    .single()

  if (insertError || !post) {
    console.error('[createPostFromEvent] Insert error:', insertError)
    return { success: false, error: 'Failed to create social post' }
  }

  // Link selected photos as social post assets
  if (photoIds.length > 0) {
    const assetLinks = photoIds.map((photoId, idx) => ({
      post_id: post.id,
      asset_id: photoId,
      display_order: idx,
    }))

    // Try linking. social_post_assets might not exist for event_photos.
    // We store the photo IDs in the post notes field as a fallback.
    try {
      await db.from('social_post_assets').insert(assetLinks)
    } catch {
      // Fallback: store photo IDs in notes so the chef can find them
      await db
        .from('social_posts')
        .update({ notes: `Event photos: ${photoIds.join(', ')}` })
        .eq('id', post.id)
    }
  }

  revalidatePath('/social')
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/social/compose/' + eventId)

  return { success: true, postId: post.id }
}

// ─── generateCaption ────────────────────────────────────────────────────────

const CaptionSchema = z.object({
  caption: z.string().min(1).max(2200),
})

export async function generateCaption(
  eventId: string
): Promise<
  { success: true; caption: string; aiGenerated: boolean } | { success: false; error: string }
> {
  const user = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  // Fetch event details
  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, guest_count, service_style, location_city,
      special_requests, course_count, client_id
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  // Get client name
  let clientName = 'my client'
  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    if (client?.full_name) {
      clientName = client.full_name.split(' ')[0] || client.full_name
    }
  }

  // Get menu name if linked
  let menuName: string | null = null
  const { data: menu } = await db
    .from('menus')
    .select('name, cuisine_type')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (menu) {
    menuName = menu.name
  }

  // Build context for the AI
  const eventContext = [
    event.occasion ? `Occasion: ${event.occasion}` : null,
    `Date: ${event.event_date}`,
    `Guests: ${event.guest_count}`,
    event.service_style ? `Style: ${event.service_style}` : null,
    event.location_city ? `City: ${event.location_city}` : null,
    event.course_count ? `Courses: ${event.course_count}` : null,
    menuName ? `Menu: ${menuName}` : null,
    menu?.cuisine_type ? `Cuisine: ${menu.cuisine_type}` : null,
    event.special_requests ? `Special touches: ${event.special_requests}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  // Try Ollama first, fall back to template
  try {
    const systemPrompt = `You are a private chef writing a social media caption about a recent event you cooked for. Write from first person. Be warm, genuine, and brief (2-4 sentences max). Do NOT use hashtags. Do NOT sound like AI. Do NOT use em dashes. Write like a real person sharing a moment they're proud of. Do not mention the client by name for privacy. Focus on the food, the moment, or the craft.`

    const userContent = `Write a short social media caption for this event:\n${eventContext}`

    const result = await parseWithOllama(systemPrompt, userContent, CaptionSchema, {
      modelTier: 'fast',
      maxTokens: 256,
      timeoutMs: 15000,
    })

    return { success: true, caption: result.caption, aiGenerated: true }
  } catch (err) {
    // If Ollama is offline, provide a template instead of failing
    if (err instanceof OllamaOfflineError) {
      const template = buildFallbackCaption(event, menuName)
      return { success: true, caption: template, aiGenerated: false }
    }
    console.error('[generateCaption] AI error:', err)
    const template = buildFallbackCaption(event, menuName)
    return { success: true, caption: template, aiGenerated: false }
  }
}

function buildFallbackCaption(
  event: {
    occasion: string | null
    guest_count: number
    service_style: string
    location_city: string | null
    course_count: number
  },
  menuName: string | null
): string {
  const parts: string[] = []

  if (event.occasion) {
    parts.push(`Had the pleasure of cooking for a ${event.occasion.toLowerCase()} recently.`)
  } else {
    parts.push('Another wonderful evening in the kitchen.')
  }

  if (menuName) {
    parts.push(`Served up the ${menuName} for ${event.guest_count} guests.`)
  } else if (event.course_count > 1) {
    parts.push(`${event.course_count}-course experience for ${event.guest_count} guests.`)
  } else {
    parts.push(`Cooked for ${event.guest_count} guests.`)
  }

  if (event.location_city) {
    parts.push(`${event.location_city}.`)
  }

  return parts.join(' ')
}

// ─── getEventSocialPosts ────────────────────────────────────────────────────

export async function getEventSocialPosts(eventId: string): Promise<EventSocialPost[]> {
  const user = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data, error } = await db
    .from('social_posts')
    .select(
      'id, event_id, title, caption_master, platforms, published_to_platforms, status, created_at, schedule_at'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getEventSocialPosts] Error:', error)
    return []
  }

  return data ?? []
}

// ─── getUnpostedEvents ──────────────────────────────────────────────────────

export async function getUnpostedEvents(): Promise<UnpostedEvent[]> {
  const user = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  // Get completed events that have no social posts linked
  const { data: events, error } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, location_city, client_id,
      clients!inner(full_name),
      is_demo
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .eq('is_demo', false)
    .is('deleted_at', null)
    .order('event_date', { ascending: false })
    .limit(20)

  if (error || !events) {
    console.error('[getUnpostedEvents] Error:', error)
    return []
  }

  // Get event IDs that already have social posts
  const eventIds = events.map((e: any) => e.id)
  const { data: existingPosts } = await db
    .from('social_posts')
    .select('event_id')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  const postedEventIds = new Set((existingPosts ?? []).map((p: any) => p.event_id))

  // Get photo counts for unposted events
  const unpostedIds = eventIds.filter((id: string) => !postedEventIds.has(id))
  if (unpostedIds.length === 0) return []

  const { data: photoCounts } = await db
    .from('event_photos')
    .select('event_id')
    .in('event_id', unpostedIds)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  const photoCountMap: Record<string, number> = {}
  for (const row of photoCounts ?? []) {
    photoCountMap[row.event_id] = (photoCountMap[row.event_id] ?? 0) + 1
  }

  return events
    .filter((e: any) => !postedEventIds.has(e.id))
    .map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      event_date: e.event_date,
      guest_count: e.guest_count,
      client_name: e.clients?.full_name ?? 'Unknown',
      photo_count: photoCountMap[e.id] ?? 0,
      location_city: e.location_city ?? '',
    }))
}

// ─── markPostPublished ──────────────────────────────────────────────────────

export async function markPostPublished(
  postId: string,
  platform: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  // Fetch current published platforms
  const { data: post, error: fetchError } = await db
    .from('social_posts')
    .select('published_to_platforms, platforms, status')
    .eq('id', postId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !post) {
    return { success: false, error: 'Post not found' }
  }

  const currentPublished: string[] = post.published_to_platforms ?? []
  if (currentPublished.includes(platform)) {
    return { success: true } // Already marked
  }

  const updatedPublished = [...currentPublished, platform]

  // If all target platforms are published, mark post as published
  const allPlatforms: string[] = post.platforms ?? []
  const allPublished = allPlatforms.every((p: string) => updatedPublished.includes(p))

  const { error: updateError } = await db
    .from('social_posts')
    .update({
      published_to_platforms: updatedPublished,
      last_publish_at: new Date().toISOString(),
      status: allPublished ? 'published' : post.status,
      updated_by: user.id,
    })
    .eq('id', postId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[markPostPublished] Error:', updateError)
    return { success: false, error: 'Failed to update post' }
  }

  revalidatePath('/social')
  return { success: true }
}

// ─── copyPostToClipboard ────────────────────────────────────────────────────

export async function getPostCaptionText(
  postId: string
): Promise<{ success: true; text: string } | { success: false; error: string }> {
  const user = await requireChef()
  await requirePro('marketing')
  const db: any = createServerClient()

  const { data: post, error } = await db
    .from('social_posts')
    .select('caption_master, title')
    .eq('id', postId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !post) {
    return { success: false, error: 'Post not found' }
  }

  return { success: true, text: post.caption_master || post.title }
}
