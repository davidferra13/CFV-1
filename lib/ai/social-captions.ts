'use server'

// Social Media Caption Generator
// Generates Instagram/social captions from event details, menu, and tone.
// Routed to local Ollama (Gemma 4). No cloud dependency.
// Output is DRAFT ONLY - chef picks and edits before posting.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import type {
  CaptionTone,
  SocialCaption,
  SocialCaptionsResult,
  SocialPlatform,
} from '@/lib/ai/social-captions-types'

interface MenuComponentRow {
  name: string
  course_type: string | null
  description: string | null
}

interface EventContext {
  event: {
    occasion: string | null
    guest_count: number | null
    service_style: string | null
  }
  chef: {
    display_name: string | null
    business_name: string | null
    tagline: string | null
  } | null
  menu: MenuComponentRow[]
}

const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  instagram: 2200,
  facebook: 63206,
  twitter: 280,
  linkedin: 3000,
}

const PLATFORM_HASHTAG_LIMITS: Record<SocialPlatform, number> = {
  instagram: 12,
  facebook: 4,
  twitter: 2,
  linkedin: 5,
}

const PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'twitter', 'linkedin']

const SocialCaptionsSchema = z.object({
  captions: z.array(
    z.object({
      platform: z.enum(['instagram', 'facebook', 'twitter', 'linkedin']),
      tone: z.enum(['warm_personal', 'elegant_professional', 'playful_casual']),
      caption: z.string(),
      hashtags: z.array(z.string()),
      characterCount: z.number(),
    })
  ),
  instagramFirst: z.string(),
  shortVersion: z.string(),
})

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[\s,.;:!?]+$/, '')
}

function toHashtag(value: string): string | null {
  const words = value
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return null

  const tag = words
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')

  return tag ? `#${tag}` : null
}

function uniqueHashtags(values: string[]): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const value of values) {
    const tag = value.startsWith('#') ? toHashtag(value.slice(1)) : toHashtag(value)
    if (!tag) continue

    const key = tag.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    tags.push(tag)
  }

  return tags
}

function buildHashtags(
  context: EventContext,
  platform: SocialPlatform,
  modelTags: string[]
): string[] {
  const baseTags = [
    'Private Chef',
    'Chef Life',
    context.event.occasion ?? '',
    context.event.service_style ?? '',
    context.chef?.business_name ?? '',
    context.chef?.tagline ?? '',
    ...context.menu.map((item) => item.name),
  ]

  return uniqueHashtags([...modelTags, ...baseTags]).slice(0, PLATFORM_HASHTAG_LIMITS[platform])
}

function composePost(caption: string, hashtags: string[]): string {
  const normalizedCaption = normalizeWhitespace(caption)
  return normalizeWhitespace(
    hashtags.length > 0 ? `${normalizedCaption} ${hashtags.join(' ')}` : normalizedCaption
  )
}

function trimToLimit(caption: string, hashtags: string[], limit: number): string {
  const hashText = hashtags.length > 0 ? ` ${hashtags.join(' ')}` : ''
  const allowedCaptionLength = Math.max(20, limit - hashText.length)
  const normalized = normalizeWhitespace(caption)

  if (normalized.length <= allowedCaptionLength) return normalized

  const shortened = normalized.slice(0, Math.max(0, allowedCaptionLength - 1))
  const lastSpace = shortened.lastIndexOf(' ')
  const trimmed = lastSpace > 80 ? shortened.slice(0, lastSpace) : shortened

  return `${stripTrailingPunctuation(trimmed)}...`
}

function fitPostToLimit(
  caption: string,
  hashtags: string[],
  limit: number
): SocialCaption['hashtags'] {
  const fittingHashtags = [...hashtags]

  while (fittingHashtags.length > 0 && composePost(caption, fittingHashtags).length > limit) {
    fittingHashtags.pop()
  }

  return fittingHashtags
}

function platformFallbackCaption(
  platform: SocialPlatform,
  context: EventContext,
  tone: CaptionTone
): string {
  const chefName = context.chef?.display_name ?? context.chef?.business_name ?? 'Chef'
  const occasion = context.event.occasion ?? 'private event'
  const serviceStyle = context.event.service_style ?? 'private dining'
  const highlights = context.menu
    .map((item) => item.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')

  const menuLine = highlights ? ` Menu highlights included ${highlights}.` : ''

  if (platform === 'twitter') {
    return `${chefName} served a ${serviceStyle} for a ${occasion}.${menuLine}`
  }

  if (platform === 'linkedin') {
    return `A recent ${occasion} brought together planning, hospitality, and precise ${serviceStyle}. ${chefName} focused on a polished guest experience from first plate to final course.${menuLine}`
  }

  if (platform === 'facebook') {
    return `A recent ${occasion} gave ${chefName} the chance to create a thoughtful ${serviceStyle} experience for guests.${menuLine}`
  }

  if (tone === 'playful_casual') {
    return `A lively ${occasion}, a ${serviceStyle} flow, and a menu built for the room.${menuLine}`
  }

  if (tone === 'elegant_professional') {
    return `An elegant ${occasion} shaped around polished ${serviceStyle}, careful timing, and a menu tailored to the guests.${menuLine}`
  }

  return `A warm look back at a recent ${occasion}: thoughtful ${serviceStyle}, good company, and a menu made for the moment.${menuLine}`
}

function normalizeCaptions(
  parsedCaptions: SocialCaption[],
  context: EventContext,
  tone: CaptionTone
): SocialCaptionsResult {
  const captions = PLATFORMS.map((platform) => {
    const source = parsedCaptions.find((caption) => caption.platform === platform)
    const initialHashtags = buildHashtags(context, platform, source?.hashtags ?? [])
    const rawCaption = source?.caption || platformFallbackCaption(platform, context, tone)
    const caption = trimToLimit(rawCaption, initialHashtags, PLATFORM_LIMITS[platform])
    const hashtags = fitPostToLimit(caption, initialHashtags, PLATFORM_LIMITS[platform])
    const characterCount = composePost(caption, hashtags).length

    return {
      platform,
      tone,
      caption,
      hashtags,
      characterCount,
    }
  })

  const instagram = captions.find((caption) => caption.platform === 'instagram')!
  const twitter = captions.find((caption) => caption.platform === 'twitter')!
  const shortVersion = trimToLimit(twitter.caption, [], 140)

  return {
    captions,
    instagramFirst: composePost(instagram.caption, instagram.hashtags),
    shortVersion,
    generatedAt: new Date().toISOString(),
  }
}

export async function generateSocialCaptions(
  eventId: string,
  tone: CaptionTone = 'warm_personal'
): Promise<SocialCaptionsResult> {
  if (!eventId.trim()) throw new Error('Event ID is required')

  const user = await requireChef()
  const db: any = createServerClient()

  const [eventResult, menuResult, chefResult] = await Promise.all([
    db
      .from('events')
      .select('occasion, guest_count, event_date, service_style, location_address')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    (db as any)
      .from('event_menu_components')
      .select('name, course_type, description')
      .eq('event_id', eventId)
      .limit(8),
    db
      .from('chefs')
      .select('display_name, business_name, tagline')
      .eq('id', user.tenantId!)
      .single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menu = (menuResult.data ?? []) as MenuComponentRow[]
  const chef = chefResult.data

  const toneGuide = {
    warm_personal:
      'Warm, personal, storytelling. Use "I" and "my clients". Feel like a handwritten note.',
    elegant_professional: 'Polished, aspirational, elevated. Focus on craft and experience.',
    playful_casual:
      'Fun, approachable, light. Use conversational language. Allowed one emoji per post.',
  }[tone]

  const systemPrompt = `You are a social media strategist for a private chef.
Generate social media captions for a recently completed event.
Do NOT mention the client's name or any identifying information.
Focus on the food, craft, atmosphere, and experience.
Never reveal private event locations or client details.
Never invent dishes, recipes, menu ideas, ingredients, or courses.
Only mention menu highlights explicitly provided by the event data below.

Generate 4 captions:
1. Instagram (150-300 chars + 8-12 hashtags)
2. Facebook (200-400 chars + 2-4 hashtags)
3. Twitter/X (under 240 chars + 1-2 hashtags)
4. LinkedIn (300-700 chars + 3-5 hashtags)

Return JSON: {
  "captions": [
    { "platform": "instagram", "tone": "${tone}", "caption": "...", "hashtags": ["#privatechef", ...], "characterCount": number },
    { "platform": "facebook", "tone": "${tone}", "caption": "...", "hashtags": ["#privatechef", ...], "characterCount": number },
    { "platform": "twitter", "tone": "${tone}", "caption": "...", "hashtags": ["#privatechef"], "characterCount": number },
    { "platform": "linkedin", "tone": "${tone}", "caption": "...", "hashtags": ["#privatechef", ...], "characterCount": number }
  ],
  "instagramFirst": "instagram caption + hashtags as one string",
  "shortVersion": "under 140 chars version"
}`

  const userContent = `Chef: ${chef?.display_name ?? 'Chef'}${chef?.business_name ? ' (' + chef.business_name + ')' : ''}
${chef?.tagline ? 'Brand tagline: ' + chef.tagline : ''}

Event:
  Type: ${event.occasion ?? 'Private Dinner'}
  Guests: ${event.guest_count ?? 'a select group'}
  Style: ${event.service_style ?? 'plated dinner'}

Menu highlights:
${menu.map((m) => `  - ${m.name}${m.description ? ': ' + m.description : ''}`).join('\n') || '  - A custom seasonal menu'}

Tone: ${toneGuide}`

  const parsed = await parseWithOllama(systemPrompt, userContent, SocialCaptionsSchema, {
    temperature: 0.8,
    maxTokens: 1024,
  })

  return normalizeCaptions(parsed.captions as SocialCaption[], { event, chef, menu }, tone)
}
